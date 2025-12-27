const { app } = require('@azure/functions');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

// =====================================================
// CONFIGURATION
// =====================================================
const config = {
    // Microsoft Graph (Azure AD App B)
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    
    // Users whose calendars to check (comma-separated emails)
    calendarUsers: (process.env.CALENDAR_USERS || '').split(',').map(u => u.trim()).filter(u => u),
    
    // Telegram Bot
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
};

// =====================================================
// IN-MEMORY STORAGE
// For production, use Azure Table Storage or Cosmos DB
// =====================================================
let contacts = [];
let notificationSettings = {
    reminder1: { enabled: true, hours: 24 },
    reminder2: { enabled: true, hours: 2 },
    reminder3: { enabled: false, hours: 0.5 },
    reminderTodo: false
};
const sentNotifications = new Map();

// =====================================================
// TELEGRAM API
// =====================================================
async function sendTelegramMessage(chatId, message) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            }
        );
        
        const result = await response.json();
        if (!result.ok) {
            console.error(`Telegram error for ${chatId}:`, result.description);
            return false;
        }
        console.log(`Telegram sent to ${chatId}`);
        return true;
    } catch (error) {
        console.error(`Error sending Telegram to ${chatId}:`, error.message);
        return false;
    }
}

// =====================================================
// MICROSOFT GRAPH
// =====================================================
function getGraphClient() {
    const credential = new ClientSecretCredential(
        config.tenantId,
        config.clientId,
        config.clientSecret
    );

    return Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => {
                const token = await credential.getToken('https://graph.microsoft.com/.default');
                return token.token;
            }
        }
    });
}

async function getUpcomingEvents(graphClient, userEmail) {
    const now = new Date();
    // Look ahead based on max reminder time (1 week = 168 hours + buffer)
    const maxHours = Math.max(
        notificationSettings.reminder1?.hours || 0,
        notificationSettings.reminder2?.hours || 0,
        notificationSettings.reminder3?.hours || 0,
        25 // minimum 25 hours
    );
    const endTime = new Date(now.getTime() + (maxHours + 1) * 60 * 60 * 1000);
    
    try {
        const events = await graphClient
            .api(`/users/${userEmail}/calendarView`)
            .query({
                startDateTime: now.toISOString(),
                endDateTime: endTime.toISOString(),
                $orderby: 'start/dateTime',
                $top: 100
            })
            .get();
        
        return events.value || [];
    } catch (error) {
        console.error(`Error fetching events for ${userEmail}:`, error.message);
        return [];
    }
}

// =====================================================
// NOTIFICATION LOGIC
// =====================================================
function getEnabledContacts() {
    return contacts.filter(c => c.enabled);
}

function getEnabledReminders() {
    const reminders = [];
    if (notificationSettings.reminder1?.enabled) {
        reminders.push(notificationSettings.reminder1.hours);
    }
    if (notificationSettings.reminder2?.enabled) {
        reminders.push(notificationSettings.reminder2.hours);
    }
    if (notificationSettings.reminder3?.enabled) {
        reminders.push(notificationSettings.reminder3.hours);
    }
    return reminders;
}

function shouldSendNotification(event, hoursBeforeEvent) {
    const eventStart = new Date(event.start.dateTime + 'Z');
    const now = new Date();
    const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);
    
    // Check if within 15-minute window (or 5 min for reminders < 1 hour)
    const windowSize = hoursBeforeEvent < 1 ? 0.08 : 0.25; // ~5 min or ~15 min
    const windowStart = hoursBeforeEvent - windowSize;
    const windowEnd = hoursBeforeEvent + windowSize;
    
    if (hoursUntilEvent >= windowStart && hoursUntilEvent <= windowEnd) {
        const notificationKey = `${event.id}_${hoursBeforeEvent}`;
        if (!sentNotifications.has(notificationKey)) {
            return true;
        }
    }
    return false;
}

function formatEventMessage(event, hoursBeforeEvent) {
    const eventStart = new Date(event.start.dateTime + 'Z');
    const timeString = eventStart.toLocaleTimeString('nl-BE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Brussels'
    });
    const dateString = eventStart.toLocaleDateString('nl-BE', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        timeZone: 'Europe/Brussels'
    });
    
    // Format the time label based on hours
    let timeLabel;
    if (hoursBeforeEvent >= 168) {
        timeLabel = `📅 *Over ${Math.round(hoursBeforeEvent / 24)} dagen*`;
    } else if (hoursBeforeEvent >= 48) {
        timeLabel = `📅 *Over ${Math.round(hoursBeforeEvent / 24)} dagen*`;
    } else if (hoursBeforeEvent >= 24) {
        timeLabel = `📅 *Morgen*`;
    } else if (hoursBeforeEvent >= 12) {
        timeLabel = `⏰ *Over ${Math.round(hoursBeforeEvent)} uur*`;
    } else if (hoursBeforeEvent >= 1) {
        timeLabel = `⏰ *Over ${Math.round(hoursBeforeEvent)} uur*`;
    } else if (hoursBeforeEvent >= 0.5) {
        timeLabel = `🚨 *Over 30 minuten*`;
    } else {
        timeLabel = `🚨 *Over ${Math.round(hoursBeforeEvent * 60)} minuten*`;
    }
    
    const emoji = hoursBeforeEvent >= 24 ? '🔔' : hoursBeforeEvent >= 2 ? '⏰' : '🚨';
    
    let message = `${emoji} *Kalender Herinnering*\n\n`;
    message += `${timeLabel}\n\n`;
    message += `📌 *${event.subject}*\n`;
    message += `🕐 ${timeString} - ${dateString}\n`;
    
    if (event.location?.displayName) {
        message += `📍 ${event.location.displayName}\n`;
    }
    
    if (event.bodyPreview && event.bodyPreview.length > 0) {
        const preview = event.bodyPreview.substring(0, 100).replace(/[*_`]/g, '');
        message += `\n📝 ${preview}${event.bodyPreview.length > 100 ? '...' : ''}`;
    }
    
    return message;
}

// =====================================================
// HTTP ENDPOINTS
// =====================================================

// Telegram webhook - handles /start command
app.http('telegramWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'telegram/webhook',
    handler: async (request, context) => {
        try {
            const update = await request.json();
            
            if (update.message?.text) {
                const chatId = update.message.chat.id;
                const text = update.message.text;
                const firstName = update.message.from.first_name || 'there';
                
                if (text === '/start') {
                    const welcomeMessage = 
                        `👋 *Welcome to Family Dashboard Notifications!*\n\n` +
                        `Your Chat ID is: \`${chatId}\`\n\n` +
                        `Share this ID with the dashboard admin to receive calendar reminders.\n\n` +
                        `_You'll receive notifications 24 hours and 2 hours before calendar events._`;
                    
                    await sendTelegramMessage(chatId, welcomeMessage);
                } else if (text === '/status') {
                    const isRegistered = contacts.some(c => c.chatId === String(chatId) && c.enabled);
                    const statusMessage = isRegistered 
                        ? `✅ You are registered and will receive notifications.`
                        : `❌ You are not registered. Ask the admin to add your Chat ID: \`${chatId}\``;
                    
                    await sendTelegramMessage(chatId, statusMessage);
                } else if (text === '/help') {
                    const helpMessage = 
                        `*Available Commands:*\n\n` +
                        `/start - Get your Chat ID\n` +
                        `/status - Check if you're registered\n` +
                        `/help - Show this help message`;
                    
                    await sendTelegramMessage(chatId, helpMessage);
                }
            }
            
            return { status: 200, body: 'OK' };
        } catch (error) {
            context.log('Webhook error:', error);
            return { status: 200, body: 'OK' }; // Always return 200 to Telegram
        }
    }
});

// Get/Update Contacts
app.http('contacts', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        if (request.method === 'GET') {
            return {
                status: 200,
                body: JSON.stringify({ contacts }),
                headers: corsHeaders
            };
        }

        if (request.method === 'POST') {
            try {
                const body = await request.json();
                if (body.contacts && Array.isArray(body.contacts)) {
                    contacts = body.contacts;
                    context.log(`Updated contacts: ${contacts.length} total, ${getEnabledContacts().length} enabled`);
                    return {
                        status: 200,
                        body: JSON.stringify({ 
                            success: true, 
                            totalContacts: contacts.length,
                            enabledContacts: getEnabledContacts().length
                        }),
                        headers: corsHeaders
                    };
                }
                return { status: 400, body: 'Invalid contacts data', headers: corsHeaders };
            } catch (e) {
                return { status: 400, body: 'Invalid JSON', headers: corsHeaders };
            }
        }
    }
});

// Get/Update Settings
app.http('settings', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        if (request.method === 'GET') {
            return {
                status: 200,
                body: JSON.stringify({ settings: notificationSettings }),
                headers: corsHeaders
            };
        }

        if (request.method === 'POST') {
            try {
                const body = await request.json();
                if (body.settings) {
                    notificationSettings = { ...notificationSettings, ...body.settings };
                    return {
                        status: 200,
                        body: JSON.stringify({ success: true, settings: notificationSettings }),
                        headers: corsHeaders
                    };
                }
                return { status: 400, body: 'Invalid settings', headers: corsHeaders };
            } catch (e) {
                return { status: 400, body: 'Invalid JSON', headers: corsHeaders };
            }
        }
    }
});

// Status endpoint
app.http('status', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            body: JSON.stringify({
                status: 'running',
                timestamp: new Date().toISOString(),
                config: {
                    calendarUsers: config.calendarUsers.length,
                    totalContacts: contacts.length,
                    enabledContacts: getEnabledContacts().length,
                    notificationSettings,
                    telegramConfigured: !!config.telegramBotToken,
                    graphConfigured: !!(config.tenantId && config.clientId && config.clientSecret)
                }
            }),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
});

// Test notification endpoint
app.http('testNotification', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        let targetChatIds = [];

        if (request.method === 'POST') {
            try {
                const body = await request.json();
                if (body.contacts && Array.isArray(body.contacts)) {
                    targetChatIds = body.contacts;
                }
            } catch (e) {}
        }

        if (targetChatIds.length === 0) {
            targetChatIds = getEnabledContacts().map(c => c.chatId);
        }

        if (targetChatIds.length === 0) {
            return { 
                status: 400, 
                body: JSON.stringify({ error: 'No contacts to notify' }),
                headers: corsHeaders
            };
        }

        const testMessage = 
            `🧪 *Test Notificatie*\n\n` +
            `Je Family Dashboard notificaties werken! ✅\n\n` +
            `⏰ ${new Date().toLocaleString('nl-BE', { timeZone: 'Europe/Brussels' })}`;

        let sent = 0;
        for (const chatId of targetChatIds) {
            const success = await sendTelegramMessage(chatId, testMessage);
            if (success) sent++;
        }

        return { 
            status: 200, 
            body: JSON.stringify({ 
                success: true, 
                message: `Test sent to ${sent}/${targetChatIds.length} contacts`
            }),
            headers: corsHeaders
        };
    }
});

// CORS preflight handler
app.http('corsHandler', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: '{*path}',
    handler: async () => ({
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-functions-key'
        }
    })
});

// =====================================================
// TIMER - Check calendars and send notifications
// =====================================================
app.timer('calendarNotifications', {
    schedule: '0 */15 * * * *', // Every 15 minutes
    handler: async (myTimer, context) => {
        context.log('Calendar notification check started:', new Date().toISOString());
        
        // Validate config
        if (!config.tenantId || !config.clientId || !config.clientSecret) {
            context.log('Missing Azure AD configuration - skipping');
            return;
        }
        
        if (!config.telegramBotToken) {
            context.log('Missing Telegram bot token - skipping');
            return;
        }
        
        const enabledContacts = getEnabledContacts();
        if (enabledContacts.length === 0) {
            context.log('No enabled contacts - skipping');
            return;
        }
        
        if (config.calendarUsers.length === 0) {
            context.log('No calendar users configured - skipping');
            return;
        }

        // Get enabled reminder times
        const notificationWindows = getEnabledReminders();
        context.log(`Active reminders: ${notificationWindows.join(', ')} hours`);

        if (notificationWindows.length === 0) {
            context.log('No reminders enabled - skipping');
            return;
        }
        
        const graphClient = getGraphClient();
        let notificationsSent = 0;
        
        // Check each user's calendar
        for (const userEmail of config.calendarUsers) {
            context.log(`Checking calendar for: ${userEmail}`);
            
            const events = await getUpcomingEvents(graphClient, userEmail);
            context.log(`Found ${events.length} upcoming events`);
            
            for (const event of events) {
                for (const hours of notificationWindows) {
                    if (shouldSendNotification(event, hours)) {
                        const message = formatEventMessage(event, hours);
                        
                        // Send to all enabled contacts
                        for (const contact of enabledContacts) {
                            context.log(`Sending ${hours}h reminder to ${contact.name} (${contact.chatId})`);
                            const sent = await sendTelegramMessage(contact.chatId, message);
                            if (sent) notificationsSent++;
                        }
                        
                        // Mark as sent
                        sentNotifications.set(`${event.id}_${hours}`, Date.now());
                        context.log(`Notification sent for: ${event.subject} (${hours}h before)`);
                    }
                }
            }
        }
        
        // Cleanup old notification records (1 week+)
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const [key, timestamp] of sentNotifications.entries()) {
            if (timestamp < cutoff) sentNotifications.delete(key);
        }
        
        context.log(`Done. Sent ${notificationsSent} notifications.`);
    }
});

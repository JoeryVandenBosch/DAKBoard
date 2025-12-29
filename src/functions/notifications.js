const { app } = require('@azure/functions');

// =====================================================
// IN-MEMORY STORAGE (resets on cold start)
// For production, use Azure Table Storage or Cosmos DB
// =====================================================
let storedContacts = [];
let storedSettings = {
    reminder1: { enabled: true, hours: 24 },
    reminder2: { enabled: true, hours: 2 },
    reminder3: { enabled: false, hours: 0.5 },
    reminderTodo: false
};
let sentNotifications = new Set();

// =====================================================
// CONFIGURATION - Set these in Azure Function App Settings
// =====================================================
// TELEGRAM_BOT_TOKEN - Your Telegram bot token from @BotFather
// GRAPH_CLIENT_ID - Your Azure AD App B (Backend) Client ID
// GRAPH_CLIENT_SECRET - Your Azure AD App B Client Secret
// GRAPH_TENANT_ID - Your Azure AD Tenant ID
// GRAPH_USER_ID - The user ID or UPN to read calendar from

// =====================================================
// AUTH PROXY ENDPOINTS (avoid CORS issues)
// =====================================================

// Device Code - Step 1: Get a code for user to enter
app.http('authDeviceCode', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'auth/devicecode',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            const { client_id, scope } = body;

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `client_id=${client_id}&scope=${encodeURIComponent(scope)}`
            });

            const data = await response.json();
            return { status: 200, body: JSON.stringify(data), headers: corsHeaders };
        } catch (error) {
            context.log('Device code error:', error);
            return { status: 500, body: JSON.stringify({ error: 'Failed to get device code' }), headers: corsHeaders };
        }
    }
});

// Device Code - Step 2: Poll for token after user signs in
app.http('authToken', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'auth/token',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            const { client_id, device_code } = body;

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${client_id}&device_code=${device_code}`
            });

            const data = await response.json();
            return { status: 200, body: JSON.stringify(data), headers: corsHeaders };
        } catch (error) {
            context.log('Token error:', error);
            return { status: 500, body: JSON.stringify({ error: 'Failed to get token' }), headers: corsHeaders };
        }
    }
});

// Refresh Token
app.http('authRefresh', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'auth/refresh',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            const { client_id, refresh_token, scope } = body;

            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `grant_type=refresh_token&client_id=${client_id}&refresh_token=${refresh_token}&scope=${encodeURIComponent(scope)}`
            });

            const data = await response.json();
            return { status: 200, body: JSON.stringify(data), headers: corsHeaders };
        } catch (error) {
            context.log('Refresh error:', error);
            return { status: 500, body: JSON.stringify({ error: 'Failed to refresh token' }), headers: corsHeaders };
        }
    }
});

// =====================================================
// TELEGRAM ENDPOINTS
// =====================================================

// Telegram webhook - handles /start command
app.http('telegramWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'telegram/webhook',
    handler: async (request, context) => {
        try {
            const update = await request.json();
            context.log('Telegram update:', JSON.stringify(update));

            if (update.message?.text?.startsWith('/start')) {
                const chatId = update.message.chat.id;
                const firstName = update.message.from.first_name || 'there';

                await sendTelegramMessage(chatId,
                    `👋 Hallo ${firstName}!\n\n` +
                    `Je Chat ID is: <code>${chatId}</code>\n\n` +
                    `📋 Kopieer dit nummer en voeg het toe in het Family Dashboard bij Settings → Contacts.\n\n` +
                    `✅ Zodra je bent toegevoegd, ontvang je hier agenda-herinneringen!`
                );
            }

            return { status: 200, body: 'OK' };
        } catch (error) {
            context.log('Webhook error:', error);
            return { status: 200, body: 'OK' };
        }
    }
});

// Store contacts from dashboard
app.http('contacts', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'contacts',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            storedContacts = body.contacts || [];
            context.log(`Stored ${storedContacts.length} contacts`);
            return { status: 200, body: JSON.stringify({ success: true, count: storedContacts.length }), headers: corsHeaders };
        } catch (error) {
            return { status: 500, body: JSON.stringify({ error: error.message }), headers: corsHeaders };
        }
    }
});

// Store settings from dashboard
app.http('settings', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'settings',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            storedSettings = body.settings || storedSettings;
            context.log('Settings updated:', JSON.stringify(storedSettings));
            return { status: 200, body: JSON.stringify({ success: true }), headers: corsHeaders };
        } catch (error) {
            return { status: 500, body: JSON.stringify({ error: error.message }), headers: corsHeaders };
        }
    }
});

// Status endpoint
app.http('status', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'status',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 'running',
                config: {
                    telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
                    graphConfigured: !!(process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET),
                    enabledContacts: storedContacts.filter(c => c.enabled).length,
                    totalContacts: storedContacts.length
                }
            })
        };
    }
});

// Test notification
app.http('testNotification', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'function',
    route: 'testNotification',
    handler: async (request, context) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders };
        }

        try {
            const body = await request.json();
            const chatIds = body.contacts || [];

            for (const chatId of chatIds) {
                await sendTelegramMessage(chatId,
                    `✅ <b>Test Notificatie</b>\n\n` +
                    `Dit is een test van het Van den Boskes Family Dashboard!\n\n` +
                    `📅 Agenda-herinneringen zijn actief.`
                );
            }

            return { status: 200, body: JSON.stringify({ success: true, sent: chatIds.length }), headers: corsHeaders };
        } catch (error) {
            return { status: 500, body: JSON.stringify({ error: error.message }), headers: corsHeaders };
        }
    }
});

// =====================================================
// SCHEDULED NOTIFICATION CHECK (every 5 minutes)
// =====================================================
app.timer('checkNotifications', {
    schedule: '0 */5 * * * *',
    handler: async (myTimer, context) => {
        context.log('Checking for upcoming events...');

        const enabledContacts = storedContacts.filter(c => c.enabled);
        if (!enabledContacts.length) {
            context.log('No enabled contacts');
            return;
        }

        // Check which reminders are enabled
        const enabledReminders = [];
        if (storedSettings.reminder1?.enabled) enabledReminders.push(storedSettings.reminder1.hours);
        if (storedSettings.reminder2?.enabled) enabledReminders.push(storedSettings.reminder2.hours);
        if (storedSettings.reminder3?.enabled) enabledReminders.push(storedSettings.reminder3.hours);

        if (!enabledReminders.length) {
            context.log('No reminders enabled');
            return;
        }

        try {
            const token = await getGraphToken();
            if (!token) {
                context.log('Could not get Graph token');
                return;
            }

            // Get events for the next week
            const now = new Date();
            const maxHours = Math.max(...enabledReminders);
            const endDate = new Date(now.getTime() + (maxHours + 24) * 60 * 60 * 1000);

            const userId = process.env.GRAPH_USER_ID;
            const eventsUrl = `https://graph.microsoft.com/v1.0/users/${userId}/calendarView?startDateTime=${now.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime&$top=50`;

            const response = await fetch(eventsUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                context.log('Graph API error:', response.status);
                return;
            }

            const data = await response.json();
            const events = data.value || [];

            context.log(`Found ${events.length} upcoming events`);

            for (const event of events) {
                const eventStart = new Date(event.start.dateTime + 'Z');
                const hoursUntil = (eventStart - now) / (1000 * 60 * 60);

                // Check each enabled reminder
                for (const reminderHours of enabledReminders) {
                    // Calculate window based on reminder time
                    const windowMinutes = reminderHours < 1 ? 3 : 5;
                    const windowHours = windowMinutes / 60;

                    if (hoursUntil > 0 && hoursUntil <= reminderHours && hoursUntil > (reminderHours - windowHours)) {
                        const notificationKey = `${event.id}-${reminderHours}`;

                        if (!sentNotifications.has(notificationKey)) {
                            await sendEventReminder(event, hoursUntil, enabledContacts, context);
                            sentNotifications.add(notificationKey);

                            // Clean old notifications (keep last 1000)
                            if (sentNotifications.size > 1000) {
                                const arr = Array.from(sentNotifications);
                                sentNotifications = new Set(arr.slice(-500));
                            }
                        }
                    }
                }
            }
        } catch (error) {
            context.log('Notification check error:', error);
        }
    }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function getGraphToken() {
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;
    const tenantId = process.env.GRAPH_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) return null;

    try {
        const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}&scope=https://graph.microsoft.com/.default&grant_type=client_credentials`
        });

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Token error:', error);
        return null;
    }
}

async function sendTelegramMessage(chatId, text) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('Telegram error:', error);
    }
}

async function sendEventReminder(event, hoursUntil, contacts, context) {
    const eventStart = new Date(event.start.dateTime + 'Z');
    const timeStr = eventStart.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
    const dateStr = eventStart.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });

    // Format time until
    let timeUntil;
    if (hoursUntil < 1) {
        timeUntil = `${Math.round(hoursUntil * 60)} minuten`;
    } else if (hoursUntil < 24) {
        const h = Math.floor(hoursUntil);
        const m = Math.round((hoursUntil - h) * 60);
        timeUntil = m > 0 ? `${h} uur en ${m} minuten` : `${h} uur`;
    } else {
        const days = Math.floor(hoursUntil / 24);
        const h = Math.round(hoursUntil % 24);
        timeUntil = h > 0 ? `${days} dag${days > 1 ? 'en' : ''} en ${h} uur` : `${days} dag${days > 1 ? 'en' : ''}`;
    }

    let message = `📅 <b>Agenda Herinnering</b>\n\n`;
    message += `<b>${event.subject}</b>\n`;
    message += `🕐 ${dateStr} om ${timeStr}\n`;
    message += `⏰ Over ${timeUntil}\n`;

    if (event.location?.displayName) {
        message += `📍 ${event.location.displayName}\n`;
    }

    if (event.isOnlineMeeting && event.onlineMeeting?.joinUrl) {
        message += `\n🔗 <a href="${event.onlineMeeting.joinUrl}">Deelnemen aan vergadering</a>`;
    }

    context.log(`Sending reminder for: ${event.subject}`);

    for (const contact of contacts) {
        await sendTelegramMessage(contact.chatId, message);
    }
}

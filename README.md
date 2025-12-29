# 🏠 Van den Boskes Family Dashboard

A beautiful family dashboard that displays your Microsoft 365 calendar and tasks, with Telegram notifications for upcoming events.

## ✨ Features

- 📅 **Microsoft 365 Calendar** - View and create events (30-day view)
- ✅ **Microsoft To Do** - View and complete tasks
- 🌤️ **7-Day Weather Forecast** - Multiple locations support
- 📸 **Family Photos** - iCloud Shared Album or custom URL
- 📱 **Telegram Notifications** - Up to 3 customizable reminders per event
- 🔐 **Device Code Login** - Works on DAKboard and kiosk displays
- 🎨 **Beautiful Dark Theme** - Designed for always-on displays

---

## 📋 What You'll Need

1. **GitHub Account** (to host the dashboard)
2. **Microsoft 365 Account** (personal or work)
3. **Azure Account** (free tier works)
4. **Telegram Account** (for notifications)
5. **DAKboard** (optional, for dedicated display)

---

## 🚀 Complete Setup Guide

### Part 1: Create GitHub Repositories (DO THIS FIRST!)

You need **2 repositories**. Create these first because you'll need the URLs for Azure setup.

#### Repository 1: Dashboard (GitHub Pages)

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `family-dashboard`
3. Make it **Public** (required for GitHub Pages free)
4. ☑️ Check **Add a README file**
5. Click **Create repository**

6. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages** (left sidebar)
   - Source: **Deploy from a branch**
   - Branch: **main** / **(root)**
   - Click **Save**

7. Wait 1-2 minutes. Note your dashboard URL:
   ```
   https://YOUR_USERNAME.github.io/family-dashboard/
   ```

📝 **Write down:**
- [ ] Dashboard URL: `https://____________.github.io/family-dashboard/`

**Don't upload index.html yet** - you'll need to edit it first after getting your Client ID.

#### Repository 2: Azure Function

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `family-dashboard-notifications`
3. Make it **Public** (or Private if you prefer)
4. ☑️ Check **Add a README file**
5. Click **Create repository**

📝 **Write down:**
- [ ] Function Repo: `https://github.com/____________/family-dashboard-notifications`

**Don't upload files yet** - you'll connect this to Azure Function for automatic deployment.

---

### Part 2: Create Telegram Bot

### Part 2: Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: `Van den Boskes Family Bot`
4. Choose a username: `vdbfamilybot` (must end in 'bot')
5. **Save the bot token** - looks like: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxx`

📝 **Write down:**
- [ ] Telegram Bot Token: `___________________________________`

---

### Part 3: Create Azure AD Apps

Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**

#### App A: Frontend (Dashboard)

1. Click **+ New registration**
2. Name: `Family Dashboard - Frontend`
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
4. Redirect URI: 
   - Platform: **Single-page application (SPA)**
   - URL: Your Dashboard URL from Part 1 (e.g., `https://YOUR_USERNAME.github.io/family-dashboard/`)
5. Click **Register**

6. Copy the **Application (client) ID**

7. Go to **Authentication** (left menu):
   - ☑️ Check **Access tokens**
   - ☑️ Check **ID tokens**
   - Scroll down to **Advanced settings**
   - Set **Allow public client flows** to **Yes** ⚠️ IMPORTANT!
   - Click **Save**

8. Go to **API permissions**:
   - Click **+ Add a permission**
   - Choose **Microsoft Graph** → **Delegated permissions**
   - Add: `Calendars.ReadWrite`, `Tasks.ReadWrite`, `User.Read`, `offline_access`
   - Click **Grant admin consent** (if available)

📝 **Write down:**
- [ ] App A Client ID: `___________________________________`

#### App B: Backend (Azure Function)

1. Click **+ New registration**
2. Name: `Family Dashboard - Backend`
3. Supported account types: **Accounts in this organizational directory only**
4. Redirect URI: Leave empty
5. Click **Register**

6. Copy the **Application (client) ID**

7. Go to **Certificates & secrets** (left menu):
   - Click **+ New client secret**
   - Description: `Dashboard Backend`
   - Expires: **24 months**
   - Click **Add**
   - ⚠️ **COPY THE SECRET VALUE NOW** - you can't see it again!

8. Go to **API permissions**:
   - Click **+ Add a permission**
   - Choose **Microsoft Graph** → **Application permissions**
   - Add: `Calendars.Read`, `User.Read.All`
   - Click **Grant admin consent for [your org]**

9. Get your **Tenant ID**:
   - Go to **Overview**
   - Copy the **Directory (tenant) ID**

📝 **Write down:**
- [ ] App B Client ID: `___________________________________`
- [ ] App B Client Secret: `___________________________________`
- [ ] Tenant ID: `___________________________________`
- [ ] Your Email/UPN: `___________________________________` (e.g., joery@jocomm.be)

---

### Part 4: Create Azure Function App

Go to [Azure Portal](https://portal.azure.com) → **Function App** → **+ Create**

#### Basics Tab
| Setting | Value |
|---------|-------|
| Subscription | Your subscription |
| Resource Group | Create new: `rg-FamilyDashboard` |
| Function App name | `family-dashboard-notify` (must be unique) |
| Runtime stack | **Node.js** |
| Version | **22 LTS** |
| Region | **West Europe** |
| Operating System | **Linux** |
| Hosting plan | **Consumption (Serverless)** |

#### Storage Tab
| Setting | Value |
|---------|-------|
| Storage account | Create new (accept default name) |

#### Networking Tab
- Leave defaults (Enable public access: Yes)

#### Monitoring Tab
| Setting | Value |
|---------|-------|
| Enable Application Insights | **Yes** |
| Application Insights | Create new or use existing |

#### Deployment Tab
| Setting | Value |
|---------|-------|
| Enable continuous deployment | **Yes** |
| GitHub account | Connect your GitHub |
| Organization | Your GitHub username |
| Repository | `family-dashboard-notifications` (from Part 1) |
| Branch | `main` |

Click **Review + create** → **Create**

📝 **Write down:**
- [ ] Function App URL: `https://family-dashboard-notify.azurewebsites.net`

---

### Part 5: Upload Azure Function Files

Now upload the function files to your `family-dashboard-notifications` repository:

1. Go to your repo: `https://github.com/YOUR_USERNAME/family-dashboard-notifications`
2. Delete the auto-created `README.md`
3. Click **Add file** → **Upload files**
4. Upload these files from the `azure-function` folder:
   - `package.json` (to root)
   - `host.json` (to root)
5. Create folder structure `src/functions/`:
   - Click **Add file** → **Create new file**
   - Name: `src/functions/notifications.js`
   - Paste the contents of `notifications.js`
   - Click **Commit changes**

The Azure Function will automatically deploy when you push!

---

### Part 6: Configure Azure Function App Settings

1. Go to [Azure Portal](https://portal.azure.com) → Your Function App
2. Click **Settings** → **Environment variables**
3. Add these **Application settings**:

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `GRAPH_CLIENT_ID` | App B Client ID |
| `GRAPH_CLIENT_SECRET` | App B Client Secret |
| `GRAPH_TENANT_ID` | Your Tenant ID |
| `GRAPH_USER_ID` | Your email (e.g., joery@jocomm.be) |

4. Click **Apply** → **Confirm**

---

### Part 7: Get Function Host Key

1. In your Function App, go to **Functions** → Click any function (e.g., `authDeviceCode`)
2. Click **Function Keys** (left menu)
3. Or go to **App keys** for the Host key
4. Copy the **default** host key

📝 **Write down:**
- [ ] Function Host Key: `___________________________________`

---

### Part 8: Set Up Telegram Webhook

Open this URL in your browser (replace the placeholders):

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<FUNCTION_APP_NAME>.azurewebsites.net/api/telegram/webhook
```

Example:
```
https://api.telegram.org/bot7123456789:AAHxxx.../setWebhook?url=https://family-dashboard-notify.azurewebsites.net/api/telegram/webhook
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

---

### Part 9: Upload Dashboard to GitHub Pages

Now that you have your App A Client ID, upload the dashboard:

1. Open `index.html` from this package in a text editor
2. Find line 559:
   ```javascript
   const clientId = "YOUR_CLIENT_ID_HERE";
   ```
3. Replace `YOUR_CLIENT_ID_HERE` with your **App A Client ID** from Part 3
4. Save the file

5. Go to your `family-dashboard` repository on GitHub
6. Delete the auto-created `README.md`
7. Click **Add file** → **Upload files**
8. Upload your edited `index.html`
9. Click **Commit changes**
10. Wait 1-2 minutes for GitHub Pages to update

---

### Part 10: First Login

1. Open your dashboard: `https://YOUR_USERNAME.github.io/family-dashboard/`

2. Click **⚙️ Configure API Settings**

3. Enter:
   - Function URL: `https://family-dashboard-notify.azurewebsites.net`
   - Function Key: Your host key from Part 6

4. Click **Save & Test Connection**

5. Click **Sign in with Microsoft**

6. You'll see a code like `A7XB9KZ2`

7. On your phone, go to: **microsoft.com/devicelogin**

8. Enter the code and sign in

9. Done! Your dashboard should now show your calendar and tasks!

---

### Part 11: Add Family Members (Telegram)

1. Each family member opens Telegram and searches for your bot
2. They send `/start` to the bot
3. The bot replies with their **Chat ID**
4. In the dashboard, go to **⚙️ Settings** → **Contacts**
5. Add each person with their name and Chat ID
6. Click **📱 Send Test Notification** to verify

---

### Part 12: Configure Reminders

1. Go to **⚙️ Settings** → **Reminders**
2. Enable/disable up to 3 reminders
3. Choose timing for each (15 min to 1 week before)
4. Reminders are sent to all enabled contacts

---

### Part 13: Weather & Photos (Optional)

#### Weather Locations
1. Go to **⚙️ Settings** → **Weather**
2. Add cities by name
3. Click "Set Active" to switch locations

#### iCloud Shared Album
1. On iPhone: **Photos** → **Albums** → Create **Shared Album**
2. Add photos you want to display
3. Tap **People** → Enable **Public Website**
4. Copy the link
5. In dashboard: **⚙️ Settings** → **Photos** → **iCloud Shared Album**
6. Paste the URL

---

## 🖥️ DAKboard Setup

1. Log into [dakboard.com](https://dakboard.com)
2. Create a new screen
3. Set resolution to match your display (e.g., 1920x1080)
4. Add a **Custom URL** block
5. URL: `https://YOUR_USERNAME.github.io/family-dashboard/`
6. Set to full screen
7. On your DAKboard device, the dashboard will load
8. Complete the sign-in process using another device (phone/computer)

---

## 📁 File Structure

```
family-dashboard/
├── index.html              ← Dashboard (upload to GitHub Pages)
└── azure-function/         ← Azure Function (upload to separate repo)
    ├── src/
    │   └── functions/
    │       └── notifications.js
    ├── package.json
    ├── host.json
    └── local.settings.json.template
```

---

## 🔧 Troubleshooting

### "Login failed" error
- Check that **Allow public client flows** is set to **Yes** in App A
- Verify the Client ID in `index.html` is correct
- Make sure API settings are configured in the dashboard

### CORS errors in console
- The auth goes through Azure Function to avoid CORS
- Make sure Function URL is correct (no trailing slash)

### No Telegram notifications
- Check bot token in Function App settings
- Verify webhook is set (re-run the webhook URL)
- Check that contacts are enabled in Settings

### Calendar not loading
- Verify you granted permissions during login
- Try signing out and back in

### Function deployment failed
- Check GitHub Actions tab in your repo for errors
- Verify package.json and host.json are in the root

---

## 📝 Quick Reference

| Item | Your Value |
|------|------------|
| Dashboard URL | `https://__________.github.io/family-dashboard/` |
| Function URL | `https://__________.azurewebsites.net` |
| Function Key | `____________________________________` |
| App A Client ID | `____________________________________` |
| App B Client ID | `____________________________________` |
| Telegram Bot Token | `____________________________________` |

---

## 🎉 Enjoy!

Your Van den Boskes Family Dashboard is now ready! Everyone will receive Telegram notifications for upcoming calendar events.

Questions or issues? Check the troubleshooting section above.

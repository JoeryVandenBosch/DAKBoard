# 🏠 Family Dashboard

A gamified chore tracking system for families, designed to run on a wall-mounted display (DAKboard) or any device with a browser.

![Dashboard Preview](https://img.shields.io/badge/version-12.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-any%20browser-orange)

## 🎯 The Problem

If you have kids, you know the daily negotiations:
- "It's not my turn!"
- "But I ALWAYS have to do it!"
- "She did less than me!"

**The dashboard doesn't lie.** Every chore is tracked, every point is counted, and there's no more arguing about who did what.

## ✨ Features

### 🎮 Gamified Chore System
- **Point-based rewards** — Each chore has a point value
- **Weekly scoreboard** — See who's leading this week
- **Yearly tracking** — Monthly breakdown of all points earned
- **Jackpot goals** — Set big rewards (like a trip to Europa Park 🎢) with progress tracking
- **Custom chores** — Add, edit, or remove chores with PIN protection

### 👤 Customizable Avatars
- **Full-body SVG avatars** — Kids can design their own character
- **Gender options** — Boy/girl base with different clothing & accessories
- **6 customization tabs** — Face, Hair, Top, Bottom, Shoes, Extras
- **Lightweight** — ~200 bytes JSON per avatar, ~5KB rendered SVG

### 📅 Microsoft 365 Integration
- **Calendar** — Shows upcoming family events
- **Microsoft To-Do** — Displays tasks from your To-Do lists
- **Secure OAuth 2.0** — Device code flow authentication
- **Token refresh** — Stays logged in automatically

### 🛒 Grocery List
- **Shared list** — Anyone can add items (no PIN required)
- **Check off items** — Mark items as done
- **Email the list** — Send to family members with one tap
- **Persistent storage** — Saves locally and syncs to cloud

### 📲 Telegram Notifications
- **Real-time alerts** — Get notified when a chore is completed
- **Kid's name & points** — Know who did what instantly
- **Works anywhere** — Receive notifications on your phone

### 🌤️ Weather Widget
- **Current conditions** — Temperature and weather icon
- **5-day forecast** — Plan ahead
- **Location-based** — Auto-detects or manually configure

### 🎉 Celebrations
- **Confetti animations** — When points are earned
- **Sound effects** — Satisfying completion sounds
- **Visual feedback** — Kids love the dopamine hit!

### ☁️ Cloud Sync
- **Azure Blob Storage** — Data syncs across all devices
- **Conflict resolution** — Latest data always wins
- **Offline capable** — Works without internet, syncs when back online

## 🖥️ Runs Everywhere

| Device | Status |
|--------|--------|
| DAKboard (Raspberry Pi) | ✅ Optimized for Chromium 70-85 |
| Desktop browsers | ✅ Chrome, Firefox, Edge, Safari |
| Tablets | ✅ iPad, Android tablets |
| Mobile phones | ✅ Responsive design |
| Smart displays | ✅ Any device with a browser |

## 🔧 Tech Stack

- **Frontend:** Single HTML file (~6000 lines), vanilla JavaScript (ES5)
- **Authentication:** Microsoft OAuth 2.0 device code flow
- **APIs:** Microsoft Graph API (Calendar, To-Do, Mail)
- **Backend:** Azure Functions (auth proxy, Telegram bot)
- **Storage:** Azure Blob Storage + localStorage fallback
- **Notifications:** Telegram Bot API

## 🚀 Quick Start

### Option 1: Use GitHub Pages (Easiest)

1. Fork this repository
2. Enable GitHub Pages in Settings → Pages
3. Open `https://[your-username].github.io/DAKBoard/`
4. Sign in with your Microsoft account

### Option 2: Local Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/JoeryVandenBosch/DAKBoard.git
   ```

2. Open `index.html` in your browser

3. Configure your Azure Function URL in Settings (⚙️)

## ⚙️ Configuration

### Microsoft 365 Authentication

The dashboard uses OAuth 2.0 device code flow:

1. Click "Sign In"
2. Enter the code shown on screen at `microsoft.com/devicelogin`
3. Grant permissions for Calendar, To-Do, and Mail
4. Done! Token refreshes automatically

**Required permissions:**
- `Calendars.ReadWrite` — Read/write calendar events
- `Tasks.ReadWrite` — Read/write To-Do tasks
- `User.Read` — Basic profile info
- `Mail.Send` — Send grocery list emails (optional)

### Azure Function Setup

You'll need an Azure Function to proxy the OAuth flow. See `/azure-function` folder for the code.

### Telegram Notifications

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID
3. Configure in Settings → Notifications

## 📁 File Structure

```
DAKBoard/
├── index.html                    # Main dashboard (production)
├── index-performance-test.html   # Performance optimized version
├── index-test-email.html         # With grocery email feature
├── index-test-feedback.html      # With feedback button
└── README.md
```

## 🎨 Customization

### Adding Chores

1. Click the `+` button on the Chores card
2. Enter chore name and point value
3. PIN protected to prevent kids from gaming the system 😉

### Editing Avatars

1. Click any avatar in the scoreboard
2. Choose gender (boy/girl)
3. Customize across 6 tabs
4. Save — changes sync to cloud

### Changing Theme

Edit the CSS variables in `<style>` section:
```css
background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%);
```

## 🔐 Security

- **No passwords stored** — OAuth tokens only
- **PIN protection** — For sensitive actions (edit mode, reset)
- **Token refresh** — Secure, automatic re-authentication
- **HTTPS only** — When hosted on GitHub Pages

## 🤝 Contributing

Ideas, bug reports, and pull requests are welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## 📝 License

MIT License — feel free to use, modify, and share.

## 🙏 Acknowledgments

- **DAKboard** — For the inspiration and hardware
- **Microsoft Graph** — For the excellent API
- **My kids** — For being the best beta testers (and for actually doing their chores now 😄)

---

**Made with ❤️ by a dad who was tired of chore negotiations**

[⭐ Star this repo](https://github.com/JoeryVandenBosch/DAKBoard) if you find it useful!

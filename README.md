# Lap Tracker

A real-time 24-hour relay run lap counter. Add teams, tap **+** on any phone, and every screen updates instantly via Socket.io.

---

## Project structure

```
Lap Tracker/
├── README.md
└── server/
    ├── package.json
    ├── server.js        ← Express + Socket.io backend
    ├── state.json       ← auto-created; persists lap data
    └── public/
        ├── index.html
        ├── style.css
        └── app.js
```

---

## Run locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### Steps

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000** in your browser (or on any device on the same Wi-Fi network using your machine's local IP, e.g. `http://192.168.1.42:3000`).

To find your local IP on macOS:
```bash
ipconfig getifaddr en0
```

### Development (auto-restart on changes)
```bash
npm run dev
```

---

## Deploy to Railway (recommended — free tier available)

Railway gives you a persistent server with a public HTTPS URL so devices on different networks can connect.

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create lap-tracker --public --push --source .
   ```

2. **Create a Railway project**
   - Go to [railway.app](https://railway.app) and sign in with GitHub.
   - Click **New Project → Deploy from GitHub repo** and select your repo.
   - Railway will auto-detect Node.js and run `npm start`.

3. **Set the root directory** (important — the `package.json` is inside `/server`)
   - In Railway → your service → **Settings → Source → Root Directory**, enter `server`.

4. **Get your public URL**
   - Railway → your service → **Settings → Networking → Generate Domain**.
   - Copy the URL (e.g. `https://lap-tracker-production.up.railway.app`).

5. **Done.** Open the URL on any phone — no config changes needed because the frontend connects to the same host by default.

---

## Deploy to Render (alternative)

1. Push to GitHub (same as above).
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo.
3. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Click **Create Web Service**. Render gives you a free `*.onrender.com` URL.

> **Note:** Render's free tier spins down after 15 minutes of inactivity. For a 24-hour event, use the paid tier ($7/mo) or Railway's free tier (which does not sleep).

---

## Changing the server URL (advanced)

If you host the frontend separately from the backend, edit the top of `server/public/app.js`:

```js
const SERVER_URL = 'https://your-backend-url.railway.app';
```

Leave it as `''` (empty string) when the frontend and backend are served from the same host — this is the default and works for both local and Railway/Render deployments.

---

## Features

| Feature | Detail |
|---|---|
| Add teams | Any time during the event; names must be unique |
| Increment laps | Large **+** tap target, optimised for phones |
| Undo last lap | **↩** button on each team card |
| Remove team | ✕ button on the team card (with confirmation) |
| Live leaderboard | Sorted by laps, medals for top 3 |
| Real-time sync | Socket.io — all devices update instantly |
| Persistence | `state.json` survives server restarts |
| Reset all laps | Admin section (collapsible), with confirmation |

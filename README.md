# 🚆 Tågtavlan

A mobile-first web app for live train departures, watching individual departures, and push notifications for delays, track changes, and platform reminders. Built with a [Supabase](https://supabase.com) backend and Trafikverket's open API. The interface is in Swedish — all labels and notifications are in Swedish regardless of the user's device language.

---

## Features

- **Live departure board** — time, train number, track, and destination, straight from Trafikverket
- **Station search** with an optional destination filter (e.g. only trains from Stockholm C towards Uppsala)
- **Delays and cancellations** shown clearly with struck-through scheduled time, new estimated time, and a status badge
- **Watch individual departures** with two notification types:
  * *Disruptions* — delay, track change, or cancellation
  * *Platform reminder* — a notification a configurable number of minutes before departure, calculated against the current (possibly delayed) time, including the track number
- **Per-device notifications** — each phone registers separately and gets its own push notifications
- **Three themes** — Dark, Dim, and Light, saved per device
- **PWA-ready** — can be added to the home screen on iOS and Android for a native app feel, including push notifications on iPhone

---

## Tech Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Frontend      | HTML + vanilla JS + CSS (this repo)               |
| Backend       | Supabase Edge Functions (Deno/TypeScript)         |
| Database      | Supabase (PostgreSQL)                             |
| Notifications | Web Push (VAPID, aes128gcm) — no third parties    |
| Data source   | Trafikverket Open API                             |
| Hosting       | GitHub Pages                                       |
| Fonts         | Google Fonts (DM Sans, DM Mono)                   |

No build tools and no frontend frameworks. The backend runs as three Edge Functions plus a scheduled cron job.

---

## Architecture

```
   Mobile app (home screen)
          │
          │  request with anon key
          ▼
   Supabase Edge Functions
   • proxy      – live queries to Trafikverket (hides the API key)
   • subscribe  – devices, watches, and favorites
   • watcher    – cron job that detects disruptions and sends push
          │                    │
          ▼                    ▼
   Trafikverket API      Web Push (VAPID) → device notifications
```

---

## Getting Started

### 1. Set up Supabase

Create a free project at [supabase.com](https://supabase.com), then run the database schema (`schema.sql`) in the **SQL Editor**. It creates four tables, all prefixed `tt_` to keep them isolated from any other app in the same project: `tt_devices`, `tt_watches`, `tt_favorites`, and `tt_notifications_log`.

### 2. Generate VAPID keys

Web Push requires a VAPID key pair. Generate one with:

```
npx web-push generate-vapid-keys
```

Keep both keys — the public key goes in the client, the private key becomes a Supabase secret.

### 3. Set the backend secrets

Using the Supabase CLI, from the project folder:

```
supabase secrets set TRV_API_KEY="your-trafikverket-key"
supabase secrets set VAPID_PUBLIC_KEY="your-vapid-public"
supabase secrets set VAPID_PRIVATE_KEY="your-vapid-private"
supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
```

### 4. Deploy the Edge Functions

```
supabase functions deploy proxy
supabase functions deploy subscribe
supabase functions deploy watcher
```

### 5. Schedule the watcher

Enable the `pg_cron` and `pg_net` extensions, then schedule the watcher to run every minute (replace the project ref and anon key):

```
select cron.schedule(
  'tagtavlan-watcher',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/watcher',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer your-anon-key'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 6. Configure the app

Open `config.js` and fill in your three client values:

```
window.TT_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  VAPID_PUBLIC_KEY: "your-vapid-public-key",
};
```

### 7. Deploy

Upload the frontend files to GitHub Pages (or any static host) — `index.html`, `app.js`, `config.js`, `sw.js`, `manifest.json`, and the two icons must all be in the same directory. Share the URL with your team.

The app includes a Service Worker that caches resources automatically. When you upload a new version, users receive the update the next time they close and reopen the app — no reinstallation needed.

---

## Usage

1. Open the URL in **Safari** on iPhone (or Chrome on Android)
2. Tap **Share → Add to Home Screen** to install as an app
3. Open the app from the home screen icon, then **Settings → Enable push notifications** → allow
4. Search a station, tap the bell on a departure, and set up a watch

Push notifications on iPhone only work when the app is launched from the home screen, not from a Safari tab.

---

## Security Notes

- The Supabase `anon` key and the VAPID public key are embedded in `config.js`. Since the repo is public, they are visible in source — both are designed to be client-side and safe to expose.
- The Trafikverket API key, the VAPID private key, and the service role key live only as secrets in Supabase and never appear in this repo.
- All database access goes through the Edge Functions; the tables have Row Level Security enabled with no anon policies, so they cannot be read or written directly with the anon key.

---

## Data Source and Caveats

Departure and delay data comes from Trafikverket's open API. Track numbers can change at short notice, especially for commuter and regional trains; the platform reminder shows the last known track and is complemented by a separate track-change notification if the track changes before departure.

---

## Quick Access

Scan the QR code with your phone's camera to open the app:

<img src="tagtavlan-qr.png" alt="QR code for Tågtavlan" width="180">

`https://im4fun.github.io/tagtavlan/`

---

## License

© 2026 CARÅ. All rights reserved.

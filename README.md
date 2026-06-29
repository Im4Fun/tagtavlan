# Tågtavlan

A mobile-friendly web app (PWA) that shows live train departures from Trafikverket's open API, with the ability to watch individual departures and receive push notifications for disruptions plus a reminder when it's time to head to the platform.

Built to be added to the home screen, where it behaves like a native app, including push notifications on iPhone.

## Features

- **Departure board** with live data: time, train number, track, and destination.
- **Station search** against Trafikverket's station registry, with an optional destination filter (e.g. show only trains from Stockholm C towards Uppsala).
- **Delays and cancellations** shown clearly with struck-through scheduled time, new estimated time, and a status badge.
- **Watch individual departures** with two types of notifications:
  - *Disruptions* – delay, track change, or cancellation.
  - *Platform reminder* – a notification a configurable number of minutes before departure, calculated against the current (possibly delayed) time, including the track number.
- **Three themes** – dark, dim, and light. The choice is saved locally.
- **PWA** – added to the home screen, offline-tolerant, and receives push.

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

- **Frontend** (this repo): static files on GitHub Pages.
- **Backend**: Supabase (Postgres + Edge Functions). The API key and the VAPID private key live as secrets in Supabase and are never exposed in the client.
- **Notifications**: standard Web Push with VAPID, encrypted using aes128gcm. No third-party services.

## Files in this repo

| File | Role |
|------|------|
| `index.html` | Interface and all CSS |
| `app.js` | Client logic: search, departure board, watching, push |
| `config.js` | Three client values: Supabase URL, anon key, VAPID public key |
| `sw.js` | Service worker that receives push and shows notifications |
| `manifest.json` | PWA manifest |
| `icon-192.png`, `icon-512.png` | App icons |

The backend code (database schema and Edge Functions) lives outside this repo since it is deployed directly to Supabase.

## Configuration

Fill in `config.js` with your own values:

```js
window.TT_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  VAPID_PUBLIC_KEY: "your-vapid-public-key",
};
```

All three are meant to live in the client. Secrets (Trafikverket key, VAPID private key, service role key) belong as secrets in Supabase, never in the repo.

> **Note on VAPID:** the public key in `config.js` must be the pair to the private key stored as a secret in Supabase. If the key pair is replaced, every device must re-register for notifications.

## Add to the home screen (required for notifications on iPhone)

1. Open the app's URL in **Safari** on iPhone.
2. Share icon → **Add to Home Screen**.
3. Open the app from the home screen icon (not the Safari tab).
4. In the app: **Settings → Enable push notifications** → allow.

Each device registers separately and receives its own notifications.

## Updating the app

- **Frontend** (the files in this repo): upload changed files to GitHub. Since a service worker caches the files, a hard reload may be needed on devices (on iPhone: close the app completely, or remove and re-add it to the home screen).
- **Backend** (Edge Functions): deployed separately to Supabase and takes effect immediately.

## Data source and caveats

Departure and delay data comes from Trafikverket's open API. Track numbers can change at short notice, especially for commuter and regional trains; the platform reminder shows the last known track and is complemented by a separate track-change notification if the track changes before departure.

## Quick access

Scan the QR code with your phone's camera to open the app:

<img src="tagtavlan-qr.png" alt="QR code for Tågtavlan" width="180">

`https://im4fun.github.io/tagtavlan/`

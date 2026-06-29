# Tågtavlan

En mobilanpassad webbapp (PWA) som visar tågavgångar i realtid från Trafikverkets öppna API, med möjlighet att bevaka enskilda avgångar och få push-notiser vid avvikelser samt en påminnelse när det är dags att gå till perrongen.

Byggd för att läggas till på hemskärmen och fungerar då som en app, inklusive push-notiser på iPhone.

## Snabbåtkomst

Skanna QR-koden med mobilkameran för att öppna appen:

![QR-kod till Tågtavlan](tagtavlan-qr.png)

`https://im4fun.github.io/tagtavlan/`

## Funktioner

- **Avgångstavla** med realtidsdata: tid, tågnummer, spår och destination.
- **Stationssök** mot Trafikverkets stationsregister, med valfritt destinationsfilter (visa t.ex. bara tåg från Stockholm C mot Uppsala).
- **Förseningar och inställda tåg** visas tydligt med överstruken tidtabellstid, ny beräknad tid och statusmärke.
- **Bevakning av enskilda avgångar** med två typer av notiser:
  - *Avvikelser* – försening, spårändring eller inställt tåg.
  - *Perrong-påminnelse* – en notis ett valbart antal minuter före avgång, beräknad mot den aktuella (eventuellt försenade) tiden, med spårnummer.
- **Tre teman** – mörkt, dimmigt och ljust. Valet sparas lokalt.
- **PWA** – läggs till på hemskärmen, fungerar offline-tolerant och tar emot push.

## Arkitektur

```
   Mobil-app (hemskärm)
          │
          │  anrop med anon-nyckel
          ▼
   Supabase Edge Functions
   • proxy      – live-frågor mot Trafikverket (döljer API-nyckeln)
   • subscribe  – enheter, bevakningar och favoriter
   • watcher    – cron-jobb som upptäcker avvikelser och skickar push
          │                    │
          ▼                    ▼
   Trafikverkets API      Web Push (VAPID) → mobilernas notiser
```

- **Frontend** (det här repot): statiska filer på GitHub Pages.
- **Backend**: Supabase (Postgres + Edge Functions). API-nyckel och VAPID-privata nyckeln ligger som secrets i Supabase och exponeras aldrig i klienten.
- **Notiser**: standard Web Push med VAPID, krypterat enligt aes128gcm. Inga tredjepartstjänster.

## Filer i repot

| Fil | Roll |
|-----|------|
| `index.html` | Gränssnitt och all CSS |
| `app.js` | Klientlogik: sök, avgångstavla, bevakning, push |
| `config.js` | Tre klientvärden: Supabase-URL, anon-nyckel, VAPID public key |
| `sw.js` | Service worker som tar emot push och visar notiser |
| `manifest.json` | PWA-manifest |
| `icon-192.png`, `icon-512.png` | App-ikoner |

Backend-koden (databasschema och Edge Functions) ligger utanför det här repot eftersom den distribueras direkt till Supabase.

## Konfiguration

Fyll i `config.js` med dina egna värden:

```js
window.TT_CONFIG = {
  SUPABASE_URL: "https://ditt-projekt.supabase.co",
  SUPABASE_ANON_KEY: "din-anon-nyckel",
  VAPID_PUBLIC_KEY: "din-vapid-public-key",
};
```

Samtliga tre är avsedda att ligga i klienten. Hemligheter (Trafikverket-nyckel, VAPID private key, service role-nyckel) hör hemma som secrets i Supabase, aldrig i repot.

> **Notis om VAPID:** public key i `config.js` måste vara paret till private key som ligger som secret i Supabase. Om nyckelparet byts ut måste varje enhet registrera om sina notiser.

## Lägg till på hemskärmen (krävs för notiser på iPhone)

1. Öppna appens URL i **Safari** på iPhone.
2. Dela-ikonen → **Lägg till på hemskärmen**.
3. Öppna appen från hemskärms-ikonen (inte Safari-fliken).
4. I appen: **Inställningar → Aktivera push-notiser** → tillåt.

Varje enhet registreras separat och får sina egna notiser.

## Uppdatera appen

- **Frontend** (filerna i det här repot): ladda upp ändrade filer till GitHub. Eftersom en service worker cachar filerna kan en hård omladdning behövas på enheterna (på iPhone: stäng appen helt, eller ta bort och lägg till på hemskärmen igen).
- **Backend** (Edge Functions): distribueras separat till Supabase och slår igenom direkt.

## Datakälla och förbehåll

Avgångs- och förseningsdata kommer från Trafikverkets öppna API. Spårnummer kan ändras med kort varsel, särskilt för pendel- och regionaltåg; perrong-påminnelsen visar senast kända spår och kompletteras av en separat spårändrings-notis om spåret ändras innan avgång.

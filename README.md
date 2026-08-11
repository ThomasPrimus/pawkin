# Pawkin 🐾

**Tierbetreuung ohne Gebühren – und die Akte, die mit deinem Tier mitreist.**

Live: https://pawkin.eu

## Struktur

- `index.html` – Landingpage (statisch)
- `app.html` – Web-App: HTML-Shell (Markup + Script-Tags), kein Build-Step
- `css/app.css` – Styles der App
- `vendor/supabase.js` – gebundelte Supabase-JS-Library (unverändert, nicht editieren)
- `js/*.js` – App-Code, nach Bereichen aufgeteilt

### js/ – Ladereihenfolge ist bindend

Klassische `<script>`-Tags mit gemeinsamem globalem Scope (keine ES-Module –
die ~100 Inline-`onclick`-Handler im Markup brauchen globale Funktionen).
Die Reihenfolge in `app.html` entspricht dem früheren Single-File-Ablauf:

| Datei | Inhalt |
|---|---|
| `config.js` | Supabase-Client (`sb`), URL + anon key |
| `i18n.js` | Sprachen, `translateNode`, Sprach-Sheet |
| `core.js` | `SERVICES`, globaler `state`, Helfer (`$`, `esc`, `toast`, `go`) |
| `auth.js` | Login, Registrierung, OAuth |
| `boot.js` | `boot()`, Modus-Umschaltung Besitzer/Sitter |
| `data.js` | Laden von Sittern & Tieren, Geocoding |
| `reminders.js` | Erinnerungs-Zentrale, Glocke |
| `search.js` | Suche & Filter |
| `detail.js` | Sitter-Detailansicht |
| `booking.js` | Buchung anlegen |
| `bookings-owner.js` | Buchungen aus Besitzer-Sicht |
| `sitter.js` | Sitter-Bereich |
| `pets.js` | Tierakte: Doks, Medikation, Log, Gewicht |
| `chat.js` | Threads & Konversationen |
| `main.js` | ruft `boot()` – muss zuletzt geladen werden |

Neue Datei? `<script>`-Tag in `app.html` an der passenden Stelle ergänzen.

## Deployment

Hostinger zieht dieses Repository automatisch (hPanel → Erweitert → Git).
Jeder Push auf `main` geht live.

## Backend

Supabase-Projekt `pawkin` (eu-central-1): Auth, Postgres mit RLS, Storage.
Schema-Migrationen laufen über die Supabase-MCP-Integration in Claude.

<!-- auto-deploy test -->


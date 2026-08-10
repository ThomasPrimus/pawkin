# Pawkin 🐾

**Tierbetreuung ohne Gebühren – und die Akte, die mit deinem Tier mitreist.**

Live: https://pawkin.eu

## Struktur

- `index.html` – Landingpage (statisch)
- `app.html` – Web-App (Single-File, verbindet sich mit Supabase-Backend)

## Deployment

Hostinger zieht dieses Repository automatisch (hPanel → Erweitert → Git).
Jeder Push auf `main` geht live.

## Backend

Supabase-Projekt `pawkin` (eu-central-1): Auth, Postgres mit RLS, Storage.
Schema-Migrationen laufen über die Supabase-MCP-Integration in Claude.

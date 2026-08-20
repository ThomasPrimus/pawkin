# Pawkin – neue Oberfläche

Läuft während der Migration unter `/app/` **neben** der alten App, damit
pawkin.eu nie offline ist. Screen für Screen zieht um; Supabase bleibt
unverändert.

## Stack

| | |
|---|---|
| Vite 8 · React 19 · TypeScript 7 | `strict` + `noUncheckedIndexedAccess` |
| TanStack Query | Server-Zustand, Caching, Refetch |
| Zod 4 | das Domänenmodell – siehe `src/domain/pet.ts` |
| Tailwind 4 | CSS-first, Marken-Tokens in `src/styles.css` |
| Vitest + Testing Library | `npm test` |
| Biome | Format + Lint in einem |
| vite-plugin-pwa | Service Worker, Manifest, versionierte Auslieferung |

## Befehle

```bash
npm run dev      # Entwicklung
npm test         # Tests einmal durchlaufen
npm run build    # tsc -b && vite build
npm run format   # Biome schreibt Korrekturen
```

## Warum das Domänenmodell im Mittelpunkt steht

In der Datenbank ist `pets.extra` ein jsonb-Sack mit über 30 Schlüsseln. In
der alten App war das ungetypt – ein Tippfehler erzeugte still einen toten
Schlüssel, und der Datenverlust fiel niemandem auf. `src/domain/pet.ts` ist
jetzt die einzige Wahrheit darüber, was drinstehen darf. `parsePet()` ist die
Grenze zwischen Datenbank und Anwendung: davor rohes `Json`, dahinter alles
typisiert.

Unbekannte Altschlüssel laufen bewusst durch (`.catchall`), damit beim
Speichern nichts verloren geht, was eine frühere Fassung angelegt hat.

## Typen nach einer Migration erneuern

`src/lib/database.types.ts` ist generiert. Nach jeder Schema-Änderung neu
erzeugen (Supabase-MCP oder `supabase gen types typescript`) – nicht von Hand
nachpflegen.

## Routen und Deep-Links

Die App nutzt echte Pfade (`/app/tier/<id>`), damit der Zurück-Knopf auf dem
Handy funktioniert und Profile teilbar sind. Statisch ausgeliefert findet der
Server unter solchen Pfaden keine Datei – deshalb liegt in `public/.htaccess`
eine Rewrite-Regel auf `index.html`. Ohne sie läuft jeder geteilte Link und
jedes Neuladen auf einer Unterseite in einen 404.

Der Service Worker fängt dasselbe später über `navigateFallback` ab, aber erst
nach seiner Installation – beim ersten Besuch greift nur die Server-Regel.

## Umschalten auf die Wurzel

`BASE` in `vite.config.ts` von `/app/` auf `/` ändern. Das Manifest und der
Service-Worker-Scope ziehen automatisch mit.

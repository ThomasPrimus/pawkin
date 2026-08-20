import type { Tables } from '@/lib/database.types'

/**
 * Der Aufenthalt: Zeitraum, Zustand, Reihenfolge.
 *
 * `date_text` war ursprünglich ein Freitextfeld ("z. B. 12.8. – 14.8."),
 * dadurch konnte die App nie wissen, ob eine Betreuung gerade läuft.
 * `starts_on`/`ends_on` sind jetzt die Wahrheit; `date_text` bleibt nur noch
 * die Anzeige für Buchungen ohne Datum.
 */

export type Booking = Tables<'bookings'>

export const SERVICES = [
  { id: 'board', label: '🏠 Übernachtung', unit: 'Nacht' },
  { id: 'day', label: '☀️ Tagesbetreuung', unit: 'Tag' },
  { id: 'walk', label: '🦮 Gassi-Runde', unit: 'Runde' },
  { id: 'visit', label: '🔑 Hausbesuch', unit: 'Besuch' },
] as const

export const serviceLabel = (id: string): string =>
  id === 'meet' ? '🤝 Kennenlernen' : (SERVICES.find((s) => s.id === id)?.label ?? id)

export const STATUS_DE: Record<string, string> = {
  requested: 'Anfrage gesendet',
  confirmed: 'Bestätigt',
  declined: 'Abgelehnt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

/** sv-SE liefert YYYY-MM-DD in Ortszeit. toISOString wäre UTC und würde
 *  abends einen Tag zu weit springen. */
export const heuteISO = (): string => new Date().toLocaleDateString('sv-SE')

/** Mittags interpretieren, damit die Zeitzone das Datum nicht verschiebt. */
const alsDatum = (iso: string) => new Date(`${iso}T12:00:00`)

export const tagKurz = (iso: string): string =>
  alsDatum(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })

export type StayState = 'laeuft' | 'bevorstehend' | 'vorbei' | 'offen'

/** Buchungen ohne Datum ("nach Absprache") sind `offen` – sie dürfen nicht
 *  fälschlich als vorbei einsortiert werden. */
export function stayState(b: Pick<Booking, 'starts_on' | 'ends_on'>): StayState {
  if (!b.starts_on && !b.ends_on) return 'offen'
  const heute = heuteISO()
  if (b.starts_on && heute < b.starts_on) return 'bevorstehend'
  if (b.ends_on && heute > b.ends_on) return 'vorbei'
  return 'laeuft'
}

export function naechte(b: Pick<Booking, 'starts_on' | 'ends_on'>): number {
  if (!b.starts_on || !b.ends_on) return 0
  return Math.round((alsDatum(b.ends_on).getTime() - alsDatum(b.starts_on).getTime()) / 86_400_000)
}

export function zeitraumText(b: Pick<Booking, 'starts_on' | 'ends_on' | 'date_text'>): string {
  if (!b.starts_on) return b.date_text || 'nach Absprache'
  const bis = b.ends_on && b.ends_on !== b.starts_on ? ` – ${tagKurz(b.ends_on)}` : ''
  const n = naechte(b)
  return tagKurz(b.starts_on) + bis + (n ? ` · ${n} ${n === 1 ? 'Nacht' : 'Nächte'}` : '')
}

/** Laufende zuerst, dann bevorstehende, dann offene, zuletzt vergangene. */
const RANG: Record<StayState, number> = { laeuft: 0, bevorstehend: 1, offen: 2, vorbei: 3 }

export function sortiereBuchungen<T extends Pick<Booking, 'starts_on' | 'ends_on'>>(bs: T[]): T[] {
  return [...bs].sort(
    (a, b) =>
      RANG[stayState(a)] - RANG[stayState(b)] ||
      String(a.starts_on ?? '').localeCompare(String(b.starts_on ?? '')),
  )
}

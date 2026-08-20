import type { Tables } from '@/lib/database.types'
import type { Pet } from './pet'

/**
 * Sitter-Suche: Entfernung, Passung, Reihenfolge. Rein und ohne Netz, damit
 * sich das Verhalten testen lässt, ohne einen Geocoder zu befragen.
 */

/** Was ein Sitter können muss – steuert das Matching mit `pets.needs`. */
export const NEED_LABELS: Record<string, string> = {
  med: '💊 Medikamentengabe',
  senior: '👴 Senioren-Erfahrung',
  garden: '🌿 Garten/Auslauf',
  social: '🐶 Verträgt andere Hunde',
  alone: '⏱️ Max. 4 Std. allein',
  shy: '🤫 Geduld mit scheuen Tieren',
  walks: '🦮 Mind. 2 Gassirunden/Tag',
  catx: '🐈 Katzen-Erfahrung',
}

export interface Ort {
  lat: number
  lng: number
}

export interface Sitter extends Tables<'sitters'> {
  profiles: {
    display_name: string
    city: string
    lat: number | null
    lng: number | null
  } | null
}

/** Sitter mit den in der Suche errechneten Zusatzwerten. */
export interface SitterTreffer {
  sitter: Sitter
  /** Luftlinie in km, oder null wenn ein Ort fehlt. */
  distanz: number | null
  /** Anteil der Bedürfnisse des Tiers, die der Sitter abdeckt (0–100). */
  passung: number | null
  preis: number | null
}

/** Haversine – für einen Umkreisfilter genau genug. */
export function distanzKm(
  a: Ort | null,
  // Koordinaten aus der Datenbank sind nullable – deshalb hier ausdrücklich
  // erlaubt, statt am Aufrufer herumzucasten.
  b: { lat: number | null; lng: number | null } | null,
): number | null {
  if (!a || !b || b.lat == null || b.lng == null) return null
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function distanzText(km: number | null): string {
  if (km == null) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

/** Ohne hinterlegte Bedürfnisse gibt es nichts zu matchen – dann lieber
 *  nichts anzeigen als eine erfundene 100-%-Angabe. */
export function passung(sitter: Sitter, pet: Pet | null): number | null {
  if (!pet || pet.needs.length === 0) return null
  const treffer = pet.needs.filter((n) => (sitter.caps ?? []).includes(n)).length
  return Math.round((100 * treffer) / pet.needs.length)
}

const preisVon = (s: Sitter, leistung: string): number | null => {
  const p = (s.services as Record<string, unknown> | null)?.[leistung]
  return typeof p === 'number' ? p : null
}

export interface SucheFilter {
  leistung: string
  tierart: 'dog' | 'cat'
  ort: Ort | null
  /** 0 oder null = kein Umkreisfilter. */
  umkreisKm: number | null
}

/**
 * Filtert und sortiert die Sitterliste. Beste Passung zuerst, bei
 * Gleichstand die kürzere Anfahrt – ohne Tierprofil nur nach Entfernung.
 */
export function sucheSitter(alle: Sitter[], filter: SucheFilter, pet: Pet | null): SitterTreffer[] {
  const treffer = alle
    .filter((s) => (filter.tierart === 'dog' ? s.accepts_dogs : s.accepts_cats))
    .filter((s) => preisVon(s, filter.leistung) != null)
    .map<SitterTreffer>((s) => ({
      sitter: s,
      distanz: distanzKm(filter.ort, s.profiles),
      passung: passung(s, pet),
      preis: preisVon(s, filter.leistung),
    }))

  // Ein Umkreis ohne bekannte Koordinaten würde alles wegfiltern – deshalb
  // greift der Filter nur, wenn ein Suchort gesetzt ist.
  // In eine lokale Konstante ziehen, damit TypeScript den Wert einengt –
  // ein "!" waere hier genau die Zusicherung, die wir vermeiden wollen.
  const umkreis = filter.umkreisKm
  const gefiltert =
    umkreis && filter.ort
      ? treffer.filter((t) => t.distanz != null && t.distanz <= umkreis)
      : treffer

  return gefiltert.sort(
    (a, b) => (b.passung ?? 0) - (a.passung ?? 0) || (a.distanz ?? 9999) - (b.distanz ?? 9999),
  )
}

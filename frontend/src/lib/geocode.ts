import type { Ort } from '@/domain/search'

/**
 * Ortssuche über Nominatim (OpenStreetMap). Bewusst auf DACH begrenzt und
 * auf einen Treffer – es geht nur darum, einen Umkreis zu setzen.
 *
 * Nominatim ist ein fremder, unbezahlter Dienst: bei Fehlern geben wir null
 * zurück, statt die Suche scheitern zu lassen. Ohne Ort funktioniert sie
 * weiterhin, nur eben ohne Entfernungsangabe.
 */
export async function geocode(suche: string): Promise<Ort | null> {
  const q = suche.trim()
  if (!q) return null
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'at,de,ch')
    url.searchParams.set('q', q)
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    const treffer: unknown = await r.json()
    if (!Array.isArray(treffer) || treffer.length === 0) return null
    const erster = treffer[0] as { lat?: string; lon?: string }
    const lat = Number(erster.lat)
    const lng = Number(erster.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}

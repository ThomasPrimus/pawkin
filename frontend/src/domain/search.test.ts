import { describe, expect, it } from 'vitest'
import { type PetRow, parsePet } from './pet'
import { distanzKm, distanzText, passung, type Sitter, sucheSitter } from './search'

const sitter = (over: Partial<Sitter> & { id: string }): Sitter => ({
  accepts_cats: true,
  accepts_dogs: true,
  active: true,
  bio: '',
  caps: [],
  created_at: '',
  level: 1,
  offers_meet: false,
  rating: null,
  rating_count: 0,
  services: { board: 25 },
  profiles: { display_name: 'Renate', city: 'Wien', lat: 48.2, lng: 16.37 },
  ...over,
})

const tier = (needs: string[]) =>
  parsePet({
    id: 'p1',
    owner_id: 'o1',
    name: 'Bella',
    species: 'dog',
    breed: '',
    info: '',
    needs,
    vaccinations: '',
    medication: '',
    food: '',
    quirks: '',
    vet_contact: '',
    emergency_contact: '',
    created_at: '',
    extra: {},
    meds: [],
  } satisfies PetRow)

const wien = { lat: 48.2082, lng: 16.3738 }

describe('distanzKm', () => {
  it('misst die Luftlinie Wien–Graz auf wenige Kilometer genau', () => {
    const graz = { lat: 47.0707, lng: 15.4395 }
    expect(distanzKm(wien, graz)).toBeGreaterThan(140)
    expect(distanzKm(wien, graz)).toBeLessThan(150)
  })
  it('ist null, wenn Koordinaten fehlen', () => {
    expect(distanzKm(wien, { lat: null, lng: 1 })).toBeNull()
    expect(distanzKm(null, wien)).toBeNull()
  })
  it('ist am selben Ort null Kilometer', () => {
    expect(distanzKm(wien, wien)).toBeCloseTo(0, 5)
  })
})

describe('distanzText', () => {
  it('rechnet unter einem Kilometer in Meter um', () => {
    expect(distanzText(0.42)).toBe('420 m')
  })
  it('schreibt Kilometer mit Komma', () => {
    expect(distanzText(3.45)).toBe('3,5 km')
  })
  it('bleibt ohne Entfernung leer', () => {
    expect(distanzText(null)).toBe('')
  })
})

describe('passung', () => {
  it('rechnet den Anteil der abgedeckten Bedürfnisse', () => {
    const s = sitter({ id: 's1', caps: ['med', 'senior'] })
    expect(passung(s, tier(['med', 'senior', 'garden']))).toBe(67)
  })
  it('meldet volle Passung', () => {
    expect(passung(sitter({ id: 's1', caps: ['med'] }), tier(['med']))).toBe(100)
  })
  // Ohne Beduerfnisse waere jede Zahl erfunden.
  it('gibt ohne hinterlegte Bedürfnisse nichts zurück', () => {
    expect(passung(sitter({ id: 's1', caps: ['med'] }), tier([]))).toBeNull()
    expect(passung(sitter({ id: 's1' }), null)).toBeNull()
  })
})

describe('sucheSitter', () => {
  const basis = { leistung: 'board', tierart: 'dog' as const, ort: null, umkreisKm: null }

  it('blendet Sitter aus, die die Tierart nicht annehmen', () => {
    const liste = [sitter({ id: 'nurKatzen', accepts_dogs: false }), sitter({ id: 'beides' })]
    expect(sucheSitter(liste, basis, null).map((t) => t.sitter.id)).toEqual(['beides'])
  })

  it('blendet Sitter ohne Preis für die Leistung aus', () => {
    const liste = [
      sitter({ id: 'ohneGassi', services: { board: 25 } }),
      sitter({ id: 'mitGassi', services: { board: 25, walk: 12 } }),
    ]
    const treffer = sucheSitter(liste, { ...basis, leistung: 'walk' }, null)
    expect(treffer.map((t) => t.sitter.id)).toEqual(['mitGassi'])
    expect(treffer[0]?.preis).toBe(12)
  })

  it('sortiert die beste Passung nach vorn', () => {
    const liste = [
      sitter({ id: 'halb', caps: ['med'] }),
      sitter({ id: 'ganz', caps: ['med', 'senior'] }),
    ]
    const treffer = sucheSitter(liste, basis, tier(['med', 'senior']))
    expect(treffer.map((t) => t.sitter.id)).toEqual(['ganz', 'halb'])
  })

  it('entscheidet bei gleicher Passung nach Entfernung', () => {
    const liste = [
      sitter({ id: 'fern', profiles: { display_name: 'A', city: '', lat: 47.07, lng: 15.44 } }),
      sitter({ id: 'nah', profiles: { display_name: 'B', city: '', lat: 48.21, lng: 16.37 } }),
    ]
    const treffer = sucheSitter(liste, { ...basis, ort: wien }, null)
    expect(treffer.map((t) => t.sitter.id)).toEqual(['nah', 'fern'])
  })

  it('filtert auf den Umkreis, wenn ein Ort gesetzt ist', () => {
    const liste = [
      sitter({ id: 'graz', profiles: { display_name: 'A', city: '', lat: 47.07, lng: 15.44 } }),
      sitter({ id: 'wien', profiles: { display_name: 'B', city: '', lat: 48.21, lng: 16.37 } }),
    ]
    const treffer = sucheSitter(liste, { ...basis, ort: wien, umkreisKm: 25 }, null)
    expect(treffer.map((t) => t.sitter.id)).toEqual(['wien'])
  })

  // Sonst waere die Liste leer, sobald jemand einen Umkreis antippt, ohne
  // vorher einen Ort einzugeben.
  it('ignoriert den Umkreis, solange kein Ort gesetzt ist', () => {
    const liste = [sitter({ id: 'irgendwo' })]
    expect(sucheSitter(liste, { ...basis, umkreisKm: 2 }, null)).toHaveLength(1)
  })

  it('behält Sitter ohne Koordinaten, solange kein Umkreis gilt', () => {
    const liste = [
      sitter({ id: 'ohneOrt', profiles: { display_name: 'A', city: '', lat: null, lng: null } }),
    ]
    const treffer = sucheSitter(liste, { ...basis, ort: wien }, null)
    expect(treffer).toHaveLength(1)
    expect(treffer[0]?.distanz).toBeNull()
  })
})

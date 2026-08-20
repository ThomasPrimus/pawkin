import { describe, expect, it } from 'vitest'
import type { PetExtra } from '@/domain/pet'
import { alterText, draftToRow, type PetDraft } from './usePetMutation'

const entwurf = (over: Partial<PetDraft> = {}): PetDraft => ({
  id: null,
  name: '  Bella  ',
  species: 'dog',
  breed: '',
  quirks: '',
  vaccinations: '',
  needs: [],
  meds: [],
  extra: { health_status: 'healthy' } as PetExtra,
  ...over,
})

describe('draftToRow', () => {
  it('schneidet Leerraum ab und übernimmt die Tierart', () => {
    const row = draftToRow(entwurf(), 'owner-1')
    expect(row.name).toBe('Bella')
    expect(row.species).toBe('dog')
    expect(row.owner_id).toBe('owner-1')
  })

  // Der Gesundheits-Schalter ist die Weiche: wer gesund ist, schleppt keinen
  // Medikationsplan mit, auch wenn vorher mal einer eingetragen war.
  it('verwirft Medikamente, wenn das Tier als gesund markiert ist', () => {
    const row = draftToRow(
      entwurf({
        extra: { health_status: 'healthy' } as PetExtra,
        meds: [{ name: 'Thyronorm', dose: '0,2 ml', times: ['8:00'] }],
      }),
      'o',
    )
    expect(row.meds).toEqual([])
    expect(row.medication).toBe('')
  })

  it('behält Medikamente bei einem kranken Tier und leitet daraus needs ab', () => {
    const row = draftToRow(
      entwurf({
        extra: { health_status: 'condition' } as PetExtra,
        meds: [{ name: 'Thyronorm', dose: '0,2 ml', times: ['8:00', '20:00'] }],
      }),
      'o',
    )
    expect(row.meds).toHaveLength(1)
    expect(row.needs).toContain('med')
    expect(row.medication).toBe('Thyronorm 0,2 ml')
  })

  it('nimmt Medikamente ohne Namen nicht auf', () => {
    const row = draftToRow(
      entwurf({
        extra: { health_status: 'condition' } as PetExtra,
        meds: [
          { name: '', dose: 'x', times: [] },
          { name: 'Metacam', dose: '', times: [] },
        ],
      }),
      'o',
    )
    expect(row.meds).toHaveLength(1)
  })

  it('räumt leere Felder aus dem jsonb, statt leere Strings anzusammeln', () => {
    const row = draftToRow(
      entwurf({
        extra: { health_status: 'healthy', food_what: 'Barf', vet_name: '' } as PetExtra,
      }),
      'o',
    )
    const extra = row.extra as Record<string, unknown>
    expect(extra['food_what']).toBe('Barf')
    expect('vet_name' in extra).toBe(false)
  })

  it('lässt Altschlüssel unangetastet durchlaufen', () => {
    const row = draftToRow(
      entwurf({ extra: { health_status: 'healthy', allergies: 'Huhn' } as PetExtra }),
      'o',
    )
    expect((row.extra as Record<string, unknown>)['allergies']).toBe('Huhn')
  })

  // Solange die alte App unter app.html laeuft, liest sie aus diesen Spalten.
  it('schreibt die alten Textspalten weiter mit', () => {
    const row = draftToRow(
      entwurf({
        extra: {
          health_status: 'healthy',
          food_what: 'Royal Canin',
          vet_name: 'Dr. Wagner',
          vet_phone: '0512 998877',
          emg_name: 'Klaus',
          emg_phone: '0664 5544',
        } as PetExtra,
      }),
      'o',
    )
    expect(row.food).toBe('Royal Canin')
    expect(row.vet_contact).toBe('Dr. Wagner · 0512 998877')
    expect(row.emergency_contact).toBe('Klaus · 0664 5544')
  })

  it('setzt info aus Gewicht und Alter zusammen', () => {
    const row = draftToRow(
      entwurf({ extra: { health_status: 'healthy', weight: 24 } as PetExtra }),
      'o',
    )
    expect(row.info).toBe('24 kg')
  })
})

describe('alterText', () => {
  const vorJahren = (n: number) => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - n)
    return d.toISOString().slice(0, 10)
  }
  it('zählt ganze Jahre', () => expect(alterText(vorJahren(4))).toBe('4 Jahre'))
  it('beugt den Singular richtig', () => expect(alterText(vorJahren(1))).toBe('1 Jahr'))
  it('gibt bei Unsinn nichts zurück', () => expect(alterText('kein datum')).toBe(''))
  it('gibt für ein Datum in der Zukunft nichts zurück', () => {
    const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    expect(alterText(morgen)).toBe('')
  })
})

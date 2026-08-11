import { describe, expect, it } from 'vitest'
import {
  careReadiness,
  careValue,
  dayTasks,
  feedLine,
  splitContact,
  taskBody,
  taskDone,
} from './care'
import { type Pet, type PetRow, parsePet } from './pet'

/** Baut eine Tier-Zeile so, wie sie aus der Datenbank käme. */
function makePet(over: Partial<PetRow> = {}): Pet {
  return parsePet({
    id: 'p1',
    owner_id: 'o1',
    name: 'Bella',
    species: 'dog',
    breed: '',
    info: '',
    needs: [],
    vaccinations: '',
    medication: '',
    food: '',
    quirks: '',
    vet_contact: '',
    emergency_contact: '',
    created_at: '2026-01-01T00:00:00Z',
    extra: {},
    meds: [],
    ...over,
  })
}

describe('parsePet', () => {
  it('macht aus dem jsonb-Sack ein typisiertes Objekt', () => {
    const pet = makePet({ extra: { weight: '24', food_freq: '2× täglich' } })
    expect(pet.extra.weight).toBe(24)
    expect(pet.extra.food_freq).toBe('2× täglich')
    expect(pet.extra.health_status).toBe('healthy')
  })

  it('behält unbekannte Altschlüssel, statt sie beim Lesen zu verlieren', () => {
    const pet = makePet({ extra: { feeding: '8:00, 19:00', allergies: 'Huhn' } })
    expect(pet.extra['feeding']).toBe('8:00, 19:00')
    expect(pet.extra['allergies']).toBe('Huhn')
  })

  it('leeres Gewicht wird undefined und nicht 0 kg', () => {
    expect(makePet({ extra: { weight: '' } }).extra.weight).toBeUndefined()
  })

  it('verwirft nur den kaputten Medikamenteneintrag, nicht die ganze Akte', () => {
    const pet = makePet({
      extra: { food_what: 'Barf' },
      meds: [{ name: 'Thyronorm', dose: '0,2 ml', times: ['8:00'] }, { dose: 'ohne Namen' }],
    })
    expect(pet.meds).toHaveLength(1)
    expect(pet.meds[0]?.name).toBe('Thyronorm')
    expect(pet.extra.food_what).toBe('Barf')
  })

  it('unbekannte Tierart fällt auf Hund zurück', () => {
    expect(makePet({ species: 'wellensittich' }).species).toBe('dog')
  })
})

describe('splitContact', () => {
  it('trennt Name und Nummer aus dem alten Freitextfeld', () => {
    expect(splitContact('Dr. Huber 0512 1234')).toEqual({ name: 'Dr. Huber', phone: '0512 1234' })
  })
  it('lässt reine Namen unangetastet', () => {
    expect(splitContact('Tierklinik Nord')).toEqual({ name: 'Tierklinik Nord', phone: '' })
  })
  it('kommt mit leer und null klar', () => {
    expect(splitContact(null)).toEqual({ name: '', phone: '' })
  })
})

describe('careValue – Altdaten', () => {
  it('liest Futter aus der alten Textspalte', () => {
    expect(careValue(makePet({ food: 'Purina' }), 'food_what')).toBe('Purina')
  })
  it('zieht die Tierarzt-Nummer aus dem alten Kombifeld', () => {
    expect(careValue(makePet({ vet_contact: 'Dr. Huber 0512 1234' }), 'vet_phone')).toBe(
      '0512 1234',
    )
  })
})

describe('careReadiness', () => {
  it('nennt bei leerem Profil alle sechs Lücken', () => {
    const r = careReadiness(makePet())
    expect(r.done).toBe(0)
    expect(r.gaps.map((g) => g.key)).toEqual([
      'food_what',
      'food_amount',
      'food_freq',
      'weight',
      'vet_phone',
      'emg_phone',
    ])
  })

  it('ist vollständig, wenn der Kern steht', () => {
    const pet = makePet({
      extra: {
        food_what: 'Royal Canin',
        food_amount: '200',
        food_freq: '2× täglich',
        weight: '28',
        vet_phone: '+43 660 1234567',
        emg_phone: '+43 664 7654321',
      },
    })
    expect(careReadiness(pet)).toMatchObject({ done: 6, total: 6 })
    expect(careGapsEmpty(pet)).toBe(true)
  })
})
const careGapsEmpty = (p: Pet) => careReadiness(p).gaps.length === 0

describe('feedLine', () => {
  it('fasst Häufigkeit und Menge zu einer Zeile zusammen', () => {
    const pet = makePet({
      extra: {
        food_freq: '2× täglich',
        food_amount: '250',
        food_unit: 'g',
        food_what: 'Wolfsblut',
      },
    })
    expect(feedLine(pet).head).toBe('2× täglich · 250 g pro Mahlzeit')
    expect(feedLine(pet).what).toBe('Wolfsblut')
  })

  it('nennt keine Menge, wenn keine hinterlegt ist', () => {
    expect(feedLine(makePet({ extra: { food_freq: '1× täglich' } })).head).toBe('1× täglich')
  })
})

describe('dayTasks', () => {
  it('macht aus Fütterungszeiten und Gassi-Zeiten einzelne Aufgaben', () => {
    const pet = makePet({
      extra: {
        food_times: '7:00 und 18:00',
        food_amount: '200',
        food_unit: 'g',
        food_what: 'Royal Canin',
        walk_times: '7:30, 12:00, 19:00',
      },
    })
    const t = dayTasks(pet)
    expect(t).toHaveLength(5)
    expect(t[0]).toEqual({ kind: 'feed', at: '7:00', label: '200 g · Royal Canin' })
    expect(t.filter((x) => x.kind === 'walk').map((x) => x.at)).toEqual(['7:30', '12:00', '19:00'])
  })

  it('leitet ohne Uhrzeiten aus der Häufigkeit ab', () => {
    const t = dayTasks(makePet({ extra: { food_freq: '3× täglich', food_what: 'Sheba' } }))
    expect(t.map((x) => x.at)).toEqual(['1. Mahlzeit', '2. Mahlzeit', '3. Mahlzeit'])
  })

  // Regression: die Einheit erschien früher auch ohne Menge, dadurch bekam
  // ein leeres Profil eine Phantom-Aufgabe mit dem Label "g".
  it('erzeugt für ein leeres Profil gar keine Aufgabe', () => {
    expect(dayTasks(makePet())).toEqual([])
  })

  it('hängt die Einheit nur an, wenn es eine Menge gibt', () => {
    const t = dayTasks(makePet({ extra: { food_what: 'Trockenfutter', food_unit: 'g' } }))
    expect(t[0]?.label).toBe('Trockenfutter')
  })

  it('gibt Katzen keine Gassi-Aufgaben', () => {
    const t = dayTasks(
      makePet({ species: 'cat', extra: { food_freq: '1× täglich', walk_times: '8:00' } }),
    )
    expect(t.every((x) => x.kind === 'feed')).toBe(true)
  })

  it('versteht die alten Fütterungszeiten aus extra.feeding', () => {
    const t = dayTasks(makePet({ food: 'Purina', extra: { feeding: '8:00, 19:00' } }))
    expect(t.map((x) => x.at)).toEqual(['8:00', '19:00'])
  })
})

describe('taskDone', () => {
  it('erkennt genau die abgehakte Mahlzeit', () => {
    const tasks = dayTasks(makePet({ extra: { food_times: '7:00 und 18:00', food_what: 'X' } }))
    const first = tasks[0]
    if (!first) throw new Error('Aufgabe fehlt')
    const logs = [{ type: 'feed', body: taskBody(first) }]
    expect(taskDone(first, logs)).toBe(true)
    expect(taskDone(tasks[1] as (typeof tasks)[number], logs)).toBe(false)
  })
})

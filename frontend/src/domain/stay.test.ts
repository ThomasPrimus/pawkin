import { describe, expect, it } from 'vitest'
import { heuteISO, naechte, serviceLabel, sortiereBuchungen, stayState, zeitraumText } from './stay'

const versetzt = (tage: number) => {
  const d = new Date(`${heuteISO()}T12:00:00`)
  d.setDate(d.getDate() + tage)
  return d.toLocaleDateString('sv-SE')
}
const b = (starts_on: string | null, ends_on: string | null, date_text = '') => ({
  starts_on,
  ends_on,
  date_text,
})

describe('stayState', () => {
  it('erkennt einen laufenden Aufenthalt', () => {
    expect(stayState(b(versetzt(-1), versetzt(1)))).toBe('laeuft')
  })

  // Randfaelle: der erste und der letzte Tag gehoeren dazu.
  it('zählt den Anreisetag als laufend', () => {
    expect(stayState(b(heuteISO(), versetzt(3)))).toBe('laeuft')
  })
  it('zählt den Abreisetag als laufend', () => {
    expect(stayState(b(versetzt(-3), heuteISO()))).toBe('laeuft')
  })

  it('erkennt bevorstehend und vorbei', () => {
    expect(stayState(b(versetzt(7), versetzt(10)))).toBe('bevorstehend')
    expect(stayState(b(versetzt(-10), versetzt(-7)))).toBe('vorbei')
  })

  it('behandelt eine Buchung ohne Datum als offen, nicht als vorbei', () => {
    expect(stayState(b(null, null, 'nach Absprache'))).toBe('offen')
  })

  it('gilt mit nur einem Startdatum in der Zukunft als bevorstehend', () => {
    expect(stayState(b(versetzt(2), null))).toBe('bevorstehend')
  })
})

describe('zeitraumText', () => {
  it('nennt Zeitraum und Nächte', () => {
    expect(zeitraumText(b('2026-08-14', '2026-08-17'))).toBe('14.08.26 – 17.08.26 · 3 Nächte')
  })
  it('beugt den Singular richtig', () => {
    expect(zeitraumText(b('2026-08-14', '2026-08-15'))).toContain('1 Nacht')
  })
  it('nennt bei einem eintägigen Aufenthalt keine Nächte', () => {
    expect(zeitraumText(b('2026-08-14', '2026-08-14'))).toBe('14.08.26')
  })
  it('fällt ohne Datum auf den alten Freitext zurück', () => {
    expect(zeitraumText(b(null, null, 'immer montags'))).toBe('immer montags')
  })
  it('sagt „nach Absprache“, wenn auch der Freitext leer ist', () => {
    expect(zeitraumText(b(null, null, ''))).toBe('nach Absprache')
  })

  // Ohne Mittags-Interpretation wuerde die Zeitzone das Datum verschieben.
  it('verschiebt das Datum nicht über die Zeitzone', () => {
    expect(zeitraumText(b('2026-01-01', '2026-01-01'))).toBe('01.01.26')
  })
})

describe('naechte', () => {
  it('zählt die Nächte zwischen zwei Tagen', () => {
    expect(naechte(b('2026-08-14', '2026-08-17'))).toBe(3)
  })
  it('gibt ohne vollständigen Zeitraum null zurück', () => {
    expect(naechte(b('2026-08-14', null))).toBe(0)
  })
})

describe('sortiereBuchungen', () => {
  it('stellt Laufendes nach vorn und Vergangenes nach hinten', () => {
    const liste = [
      { id: 'vorbei', ...b(versetzt(-9), versetzt(-8)) },
      { id: 'offen', ...b(null, null) },
      { id: 'bevorstehend', ...b(versetzt(4), versetzt(6)) },
      { id: 'laeuft', ...b(versetzt(-1), versetzt(2)) },
    ]
    expect(sortiereBuchungen(liste).map((x) => x.id)).toEqual([
      'laeuft',
      'bevorstehend',
      'offen',
      'vorbei',
    ])
  })

  it('sortiert Bevorstehendes nach Startdatum', () => {
    const liste = [
      { id: 'spaeter', ...b(versetzt(10), versetzt(11)) },
      { id: 'frueher', ...b(versetzt(3), versetzt(4)) },
    ]
    expect(sortiereBuchungen(liste).map((x) => x.id)).toEqual(['frueher', 'spaeter'])
  })

  it('lässt die übergebene Liste unangetastet', () => {
    const liste = [
      { id: 'a', ...b(versetzt(5), versetzt(6)) },
      { id: 'b', ...b(versetzt(-1), versetzt(1)) },
    ]
    sortiereBuchungen(liste)
    expect(liste.map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('serviceLabel', () => {
  it('übersetzt bekannte Leistungen', () => {
    expect(serviceLabel('board')).toBe('🏠 Übernachtung')
  })
  it('kennt das Kennenlernen als Sonderfall', () => {
    expect(serviceLabel('meet')).toBe('🤝 Kennenlernen')
  })
  it('gibt Unbekanntes unverändert zurück, statt leer zu bleiben', () => {
    expect(serviceLabel('sonstiges')).toBe('sonstiges')
  })
})

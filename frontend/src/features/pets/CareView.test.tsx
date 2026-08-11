import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { type PetRow, parsePet } from '@/domain/pet'
import { CareView } from './CareView'

const base: PetRow = {
  id: 'p1',
  owner_id: 'o1',
  name: 'Bella',
  species: 'dog',
  breed: 'Golden Retriever',
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
}
const show = (over: Partial<PetRow>) => render(<CareView pet={parsePet({ ...base, ...over })} />)

describe('CareView', () => {
  it('zeigt einem gesunden Tier keinen Medikamenten-Block', () => {
    show({
      extra: {
        food_what: 'Wolfsblut',
        food_amount: '250',
        food_unit: 'g',
        food_freq: '2× täglich',
      },
    })
    expect(screen.getByText('🥣 Fütterung')).toBeDefined()
    expect(screen.queryByText('💊 Medikamente')).toBeNull()
  })

  it('lässt leere Angaben weg, statt „–“ zu zeigen', () => {
    const { container } = show({ extra: { food_what: 'Barf' } })
    expect(container.textContent).not.toContain('–')
  })

  it('macht aus der Tierarzt-Nummer einen Anruf-Link', () => {
    show({ extra: { vet_name: 'Dr. Wagner', vet_phone: '0512 998877' } })
    const link = screen.getByRole('link', { name: /0512 998877/ })
    expect(link.getAttribute('href')).toBe('tel:0512998877')
  })

  it('stellt Warnungen an den Anfang', () => {
    const { container } = show({
      extra: { warn: 'bite', warn_bite: 'nicht beim Fressen anfassen', food_what: 'Barf' },
    })
    expect(container.textContent).toContain('nicht beim Fressen anfassen')
    const warnPos = container.textContent?.indexOf('Bitte beachten') ?? -1
    const feedPos = container.textContent?.indexOf('Fütterung') ?? -1
    expect(warnPos).toBeGreaterThanOrEqual(0)
    expect(warnPos).toBeLessThan(feedPos)
  })

  it('ignoriert unbekannte Warn-Kennungen, statt sie roh anzuzeigen', () => {
    const { container } = show({ extra: { warn: 'bite,quatsch', food_what: 'Barf' } })
    expect(container.textContent).toContain('Schnappt')
    expect(container.textContent).not.toContain('quatsch')
  })

  // Regression zur alten String-Fassung: dort landete photo_url roh in einem
  // src-Attribut. Hier kann ein Wert grundsätzlich kein Markup werden.
  it('rendert eingeschleustes Markup als Text, nicht als HTML', () => {
    const { container } = show({
      extra: { food_what: '<img src=x onerror="alert(1)">', food_freq: '1× täglich' },
    })
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  })

  it('zeigt den Leerzustand, wenn nichts hinterlegt ist', () => {
    show({})
    expect(screen.getByText(/noch keine Betreuungs-Infos/i)).toBeDefined()
  })

  it('bündelt die Ortsangaben in einer Übergabe-Karte', () => {
    show({
      extra: {
        food_where: 'Speis, linkes Regal',
        keys_where: 'Bei Anna, Tür 4',
        food_what: 'Barf',
      },
    })
    expect(screen.getByText('🔑 Wo alles liegt')).toBeDefined()
    expect(screen.getByText('Bei Anna, Tür 4')).toBeDefined()
  })
})

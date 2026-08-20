import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type PetRow, parsePet } from '@/domain/pet'
import { PetList } from './PetList'

const row = (over: Partial<PetRow>): PetRow => ({
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

describe('PetList', () => {
  it('zeigt den Leerzustand ohne Tiere', () => {
    render(<PetList pets={[]} onSelect={() => {}} />)
    expect(screen.getByText(/noch kein tier angelegt/i)).toBeDefined()
  })

  it('benennt bei unvollständigem Profil die erste Lücke', () => {
    render(<PetList pets={[parsePet(row({}))]} onSelect={() => {}} />)
    expect(screen.getByText(/0\/6 · fehlt: Was gefüttert wird \+5/)).toBeDefined()
  })

  it('meldet ein vollständiges Profil als sitter-bereit', () => {
    const pet = parsePet(
      row({
        extra: {
          food_what: 'Barf',
          food_amount: '200',
          food_freq: '2× täglich',
          weight: '28',
          vet_phone: '0512 1',
          emg_phone: '0664 2',
        },
      }),
    )
    render(<PetList pets={[pet]} onSelect={() => {}} />)
    expect(screen.getByText('✓ Sitter-bereit')).toBeDefined()
  })

  it('zählt Medikamente und beugt sie richtig', () => {
    const eins = parsePet(row({ id: 'a', meds: [{ name: 'X', dose: '', times: [] }] }))
    const zwei = parsePet(
      row({
        id: 'b',
        name: 'Mimi',
        meds: [
          { name: 'X', dose: '', times: [] },
          { name: 'Y', dose: '', times: [] },
        ],
      }),
    )
    render(<PetList pets={[eins, zwei]} onSelect={() => {}} />)
    expect(screen.getByText('💊 1 Medikament')).toBeDefined()
    expect(screen.getByText('💊 2 Medikamente')).toBeDefined()
  })

  it('reicht das angetippte Tier nach oben', async () => {
    const onSelect = vi.fn()
    render(<PetList pets={[parsePet(row({ name: 'Rex' }))]} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /Rex/ }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ name: 'Rex' })
  })
})

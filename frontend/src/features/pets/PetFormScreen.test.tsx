import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PetFormScreen } from './PetFormScreen'

const mutate = vi.fn()

vi.mock('@/lib/session', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } }, loading: false }),
}))
vi.mock('./usePets', () => ({ usePets: () => ({ data: [], isPending: false }) }))
vi.mock('@/routes', () => ({
  useGehZu: () => ({ liste: vi.fn(), detail: vi.fn(), bearbeiten: vi.fn(), neu: vi.fn() }),
}))
vi.mock('./usePetMutation', async (orig) => ({
  ...(await orig<typeof import('./usePetMutation')>()),
  usePetMutation: () => ({ mutate, isPending: false, isError: false, error: null }),
}))

const neu = () => render(<PetFormScreen petId={null} />)

describe('PetFormScreen', () => {
  it('benennt oben, was dem Sitter noch fehlt', () => {
    neu()
    expect(screen.getByText(/0 von 6 Kernangaben/)).toBeDefined()
  })

  // Der Kern des Redesigns: ein gesundes Tier bekommt den Medikationsplan
  // gar nicht erst zu sehen.
  it('zeigt den Medikationsplan erst, wenn das Tier als krank markiert ist', async () => {
    neu()
    expect(screen.queryByText('💊 Medikationsplan')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Krank \/ Medikamente/ }))
    expect(screen.getByText('💊 Medikationsplan')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: '💚 Gesund' }))
    expect(screen.queryByText('💊 Medikationsplan')).toBeNull()
  })

  it('tauscht die Alltagsfragen mit der Tierart', async () => {
    neu()
    expect(screen.getByText('🦮 Gassi & Draußen')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: '🐈 Katze' }))
    expect(screen.getByText('🚽 Katzenklo & Freigang')).toBeDefined()
    expect(screen.queryByText('🦮 Gassi & Draußen')).toBeNull()
    // Die Leinen-Frage der Übergabe hängt ebenfalls an der Tierart.
    expect(screen.queryByLabelText(/Leine, Geschirr, Kotbeutel/)).toBeNull()
  })

  it('lässt ohne Namen nicht speichern', async () => {
    neu()
    const knopf = screen.getByRole('button', { name: 'Anlegen' })
    expect(knopf.hasAttribute('disabled')).toBe(true)
    await userEvent.type(screen.getByLabelText('Name *'), 'Rex')
    expect(knopf.hasAttribute('disabled')).toBe(false)
  })

  it('aktualisiert die Lückenanzeige beim Tippen', async () => {
    neu()
    await userEvent.type(screen.getByLabelText('Gewicht (kg)'), '28')
    expect(screen.getByText(/1 von 6 Kernangaben/)).toBeDefined()
    expect(screen.queryByText(/· Gewicht/)).toBeNull()
  })

  it('reicht den Entwurf beim Absenden weiter', async () => {
    neu()
    await userEvent.type(screen.getByLabelText('Name *'), 'Rex')
    await userEvent.click(screen.getByRole('button', { name: 'Anlegen' }))
    expect(mutate).toHaveBeenCalledOnce()
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({ name: 'Rex', species: 'dog' })
  })

  it('zeigt auf Wunsch die Sitter-Ansicht des ungespeicherten Stands', async () => {
    neu()
    await userEvent.type(screen.getByLabelText('Name *'), 'Rex')
    await userEvent.type(screen.getByLabelText(/Was bekommt/), 'Barf')
    await userEvent.click(screen.getByRole('button', { name: /So sieht es dein Sitter/ }))
    expect(screen.getByText(/So sieht Rex beim Sitter aus/)).toBeDefined()
    expect(screen.getByText('Barf')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Zurück zum Bearbeiten' }))
    expect(screen.getByLabelText('Name *')).toHaveProperty('value', 'Rex')
  })
})

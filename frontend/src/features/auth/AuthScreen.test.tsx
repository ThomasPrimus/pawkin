import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'

const signInWithPassword = vi.fn()
const signUp = vi.fn()
const signInWithOAuth = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
      signUp: (...a: unknown[]) => signUp(...a),
      signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a),
    },
  },
}))

const anmelden = async (mail = 'du@example.com', pw = 'geheim123') => {
  await userEvent.type(screen.getByLabelText('E-Mail'), mail)
  await userEvent.type(screen.getByLabelText('Passwort'), pw)
  await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }))
}

describe('AuthScreen', () => {
  beforeEach(() => {
    signInWithPassword.mockReset().mockResolvedValue({ error: null })
    signUp.mockReset().mockResolvedValue({ data: { session: {} }, error: null })
    signInWithOAuth.mockReset().mockResolvedValue({ error: null })
  })

  it('zeichnet den Umschalter als Tabs aus, nicht als zweite Knopfreihe', () => {
    render(<AuthScreen />)
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Anmelden' }).getAttribute('aria-selected')).toBe('true')
    // Genau ein Knopf heisst "Anmelden": der zum Absenden.
    expect(screen.getByRole('button', { name: 'Anmelden' }).getAttribute('type')).toBe('submit')
  })

  it('meldet mit E-Mail und Passwort an', async () => {
    render(<AuthScreen />)
    await anmelden()
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'du@example.com',
      password: 'geheim123',
    })
  })

  // Ohne Uebersetzung bekaeme der Nutzer "Invalid login credentials" zu sehen.
  it('übersetzt Supabase-Fehler ins Deutsche', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
    render(<AuthScreen />)
    await anmelden()
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'E-Mail oder Passwort stimmt nicht.',
    )
  })

  it('reicht unbekannte Fehler unverändert durch, statt sie zu verschlucken', async () => {
    signInWithPassword.mockResolvedValue({ error: new Error('Service unavailable') })
    render(<AuthScreen />)
    await anmelden()
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Service unavailable')
  })

  it('nimmt bei der Registrierung den Namen mit', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('tab', { name: 'Registrieren' }))
    await userEvent.type(screen.getByLabelText('Dein Name'), 'Thomas P.')
    await userEvent.type(screen.getByLabelText('E-Mail'), 'neu@example.com')
    await userEvent.type(screen.getByLabelText('Passwort'), 'geheim123')
    await userEvent.click(screen.getByRole('button', { name: 'Konto erstellen' }))
    expect(signUp).toHaveBeenCalledWith({
      email: 'neu@example.com',
      password: 'geheim123',
      options: { data: { display_name: 'Thomas P.' } },
    })
  })

  // Supabase liefert bei aktiver E-Mail-Bestaetigung keine Session zurueck.
  it('weist auf die Bestätigungs-Mail hin, wenn keine Sitzung entsteht', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('tab', { name: 'Registrieren' }))
    await userEvent.type(screen.getByLabelText('E-Mail'), 'neu@example.com')
    await userEvent.type(screen.getByLabelText('Passwort'), 'geheim123')
    await userEvent.click(screen.getByRole('button', { name: 'Konto erstellen' }))
    expect(await screen.findByText(/bestätige den Link/i)).toBeDefined()
  })

  it('startet den Google-Anmeldeweg', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /Weiter mit Google/ }))
    expect(signInWithOAuth.mock.calls[0]?.[0]).toMatchObject({ provider: 'google' })
  })
})

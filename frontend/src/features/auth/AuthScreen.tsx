import { type FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Modus = 'login' | 'register'

/**
 * Anmeldung und Registrierung. Fehler kommen von Supabase auf Englisch
 * zurück; die häufigsten übersetzen wir, statt dem Nutzer "Invalid login
 * credentials" hinzuwerfen.
 */
const FEHLER_DE: Record<string, string> = {
  'Invalid login credentials': 'E-Mail oder Passwort stimmt nicht.',
  'User already registered': 'Diese E-Mail ist schon registriert – melde dich an.',
  'Password should be at least 6 characters.': 'Das Passwort braucht mindestens 6 Zeichen.',
  'Email not confirmed': 'Bitte bestätige zuerst den Link in deiner E-Mail.',
}
const uebersetze = (m: string) => FEHLER_DE[m] ?? m

export function AuthScreen() {
  const [modus, setModus] = useState<Modus>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [laeuft, setLaeuft] = useState(false)

  async function absenden(e: FormEvent) {
    e.preventDefault()
    setFehler('')
    setHinweis('')
    setLaeuft(true)
    try {
      if (modus === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwort,
          options: { data: { display_name: name.trim() } },
        })
        if (error) throw error
        // Ohne Session ist die E-Mail-Bestätigung aktiv – sonst wäre der
        // Nutzer sofort angemeldet und der Hinweis würde nur verwirren.
        if (!data.session) setHinweis('Fast geschafft – bestätige den Link in deiner E-Mail.')
      }
    } catch (err) {
      setFehler(uebersetze(err instanceof Error ? err.message : 'Unbekannter Fehler'))
    } finally {
      setLaeuft(false)
    }
  }

  async function oauth(provider: 'google' | 'apple') {
    setFehler('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    })
    if (error) setFehler(uebersetze(error.message))
  }

  return (
    <main className="mx-auto max-w-[420px] px-5 py-10">
      <h1 className="text-center font-extrabold text-[30px]">
        Paw<span className="text-accent">kin</span> 🐾
      </h1>
      <p className="mt-1 mb-6 text-center text-[13px] text-muted leading-relaxed">
        Tierbetreuung, die nichts kostet.
        <br />
        <b className="text-ink">0 % Gebühren – Sitter behalten 100 %.</b>
      </p>

      {/* Als echte Tabs ausgezeichnet: sonst hiessen Umschalter und
          Absende-Knopf beide "Anmelden" – fuer Screenreader nicht
          unterscheidbar, und auch sonst mehrdeutig. */}
      <div
        role="tablist"
        aria-label="Anmelden oder registrieren"
        className="mb-5 flex rounded-full bg-brand-light p-1"
      >
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modus === m}
            onClick={() => setModus(m)}
            className={`flex-1 rounded-full py-2.5 font-bold text-[13px] ${
              modus === m ? 'bg-white text-ink shadow-sm' : 'text-brand-dark'
            }`}
          >
            {m === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        ))}
      </div>

      <form onSubmit={absenden} noValidate>
        {modus === 'register' && (
          <Feld id="a-name" label="Dein Name">
            <input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={eingabe}
              placeholder="z. B. Thomas P."
            />
          </Feld>
        )}
        <Feld id="a-mail" label="E-Mail">
          <input
            id="a-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={eingabe}
            placeholder="du@example.com"
          />
        </Feld>
        <Feld id="a-pw" label="Passwort">
          <input
            id="a-pw"
            type="password"
            required
            minLength={6}
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            autoComplete={modus === 'login' ? 'current-password' : 'new-password'}
            className={eingabe}
            placeholder="mind. 6 Zeichen"
          />
        </Feld>

        {fehler && (
          <p role="alert" className="mb-2 text-[12.5px] text-[#c0392b] leading-snug">
            {fehler}
          </p>
        )}
        {hinweis && (
          <p className="mb-2 rounded-xl bg-brand-light px-3 py-2 text-[12.5px] text-brand-dark">
            {hinweis}
          </p>
        )}

        <button type="submit" disabled={laeuft} className={knopfPrimaer}>
          {laeuft ? 'Einen Moment…' : modus === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-[12px] text-muted">
        <div className="h-px flex-1 bg-line" />
        oder
        <div className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => oauth('google')}
        className="mb-2 w-full rounded-xl border-[1.5px] border-line bg-white py-3 font-bold text-[14px]"
      >
        <span className="font-extrabold text-[#4285f4]">G</span> Weiter mit Google
      </button>
      <button
        type="button"
        onClick={() => oauth('apple')}
        className="w-full rounded-xl bg-black py-3 font-bold text-[14px] text-white"
      >
        Weiter mit Apple
      </button>
    </main>
  )
}

const eingabe =
  'w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 py-3 text-[14px] outline-none focus:border-brand'
const knopfPrimaer =
  'w-full rounded-xl bg-brand py-3.5 font-extrabold text-[14px] text-white disabled:opacity-60'

// Explizite Verknuepfung ueber htmlFor/id statt Umschliessen: haelt auch,
// wenn jemand das Feld spaeter umbaut, und ist statisch pruefbar.
function Feld({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1.5 block font-bold text-[12px] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

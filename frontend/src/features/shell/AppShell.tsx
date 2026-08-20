import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * Rahmen um alle Routen: Anmelde-Schranke und Kopfzeile. Alles darunter darf
 * davon ausgehen, dass jemand angemeldet ist.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  // Ohne diesen Zustand blitzt bei jedem Laden kurz die Anmeldemaske auf,
  // obwohl man längst eingeloggt ist.
  if (loading) {
    return <p className="p-10 text-center text-[13px] text-muted">Einen Moment…</p>
  }
  if (!session) return <AuthScreen />

  return (
    <div className="mx-auto max-w-[480px] px-4 pt-6 pb-24">
      <header className="mb-5 flex items-center justify-between">
        <span className="font-extrabold text-[20px]">
          Paw<span className="text-accent">kin</span> 🐾
        </span>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="rounded-full bg-brand-light px-3 py-1.5 font-bold text-[12px] text-brand-dark"
        >
          Abmelden
        </button>
      </header>
      {children}
      <NavLeiste />
    </div>
  )
}

const NAV = [
  { pfad: '/suchen', icon: '🔍', text: 'Suchen' },
  { pfad: '/', icon: '🐾', text: 'Meine Tiere' },
  { pfad: '/buchungen', icon: '📅', text: 'Buchungen' },
  { pfad: '/sitter', icon: '🧑‍🌾', text: 'Sitter' },
] as const

/** Feste Leiste am unteren Rand – auf dem Handy die Stelle, an der der
 *  Daumen ohnehin liegt. Der Abstand unten faengt die Notch ab. */
function NavLeiste() {
  const pfad = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav className="fixed inset-x-0 bottom-0 border-line border-t bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[480px]">
        {NAV.map((n) => {
          // Exakter Vergleich: sonst faerbt /sitter/<id> aus der Suche den
          // Sitter-Bereich ein, obwohl man dort gar nicht ist.
          const aktiv = pfad === n.pfad
          return (
            <Link
              key={n.pfad}
              to={n.pfad}
              aria-current={aktiv ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 font-bold text-[10.5px] ${
                aktiv ? 'text-brand' : 'text-muted'
              }`}
            >
              <span className="text-[19px]">{n.icon}</span>
              {n.text}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

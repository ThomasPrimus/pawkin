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
    <div className="mx-auto max-w-[480px] px-4 py-6">
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
    </div>
  )
}

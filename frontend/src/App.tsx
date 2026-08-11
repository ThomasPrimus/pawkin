import { useState } from 'react'
import type { Pet } from '@/domain/pet'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CareView } from '@/features/pets/CareView'
import { PetList } from '@/features/pets/PetList'
import { usePets } from '@/features/pets/usePets'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

/**
 * Übergangs-Hülle. Die neue App läuft unter /app/ neben der alten, damit wir
 * Screen für Screen umziehen können, ohne dass pawkin.eu je offline ist.
 *
 * Noch ohne Router: solange es nur Liste und Detail gibt, wäre das mehr
 * Gerüst als Nutzen. Sobald Buchungen und Chat dazukommen, kommen echte
 * Routen – dann zählt auch der Zurück-Knopf auf dem Handy.
 */
export function App() {
  const { session, loading } = useSession()
  const [offen, setOffen] = useState<Pet | null>(null)
  const pets = usePets(Boolean(session))

  // Ohne diesen Zustand blitzt bei jedem Laden kurz die Anmeldemaske auf.
  if (loading) {
    return <p className="p-10 text-center text-[13px] text-muted">Einen Moment…</p>
  }
  if (!session) return <AuthScreen />

  return (
    <main className="mx-auto max-w-[480px] px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="font-extrabold text-[20px]">
          Paw<span className="text-accent">kin</span> 🐾
        </h1>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="rounded-full bg-brand-light px-3 py-1.5 font-bold text-[12px] text-brand-dark"
        >
          Abmelden
        </button>
      </header>

      {offen ? (
        <>
          <button
            type="button"
            onClick={() => setOffen(null)}
            className="mb-3 font-bold text-[13px] text-brand"
          >
            ← Meine Tiere
          </button>
          <h2 className="mb-1 font-extrabold text-[19px]">
            {offen.species === 'dog' ? '🐕' : '🐈'} {offen.name}
          </h2>
          <CareView pet={offen} />
        </>
      ) : (
        <>
          <h2 className="mb-3 font-extrabold text-[19px]">Meine Tiere</h2>
          {pets.isPending && <p className="text-[13px] text-muted">Lade…</p>}
          {pets.isError && (
            <p role="alert" className="text-[13px] text-[#c0392b]">
              Konnte die Tiere nicht laden: {pets.error.message}
            </p>
          )}
          {pets.data && <PetList pets={pets.data} onSelect={setOffen} />}
        </>
      )}
    </main>
  )
}

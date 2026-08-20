import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Die Anmeldesitzung. Supabase hält sie selbst im Storage und erneuert das
 * Token im Hintergrund – wir spiegeln hier nur den Zustand.
 *
 * `loading` ist wichtig: beim ersten Rendern weiß noch niemand, ob jemand
 * angemeldet ist. Ohne diesen Zustand blitzt bei jedem Laden kurz die
 * Anmeldemaske auf, obwohl man längst eingeloggt ist.
 */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let aktiv = true

    supabase.auth.getSession().then(({ data }) => {
      if (!aktiv) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!aktiv) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      aktiv = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}

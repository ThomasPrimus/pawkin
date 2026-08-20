import { useQuery } from '@tanstack/react-query'
import { type Pet, parsePet } from '@/domain/pet'
import { supabase } from '@/lib/supabase'

export const petsKey = ['pets'] as const

/**
 * Lädt die Tiere, auf die der angemeldete Nutzer Zugriff hat – eigene und
 * über einen Familien-Code geteilte. Welche das sind, entscheidet RLS in
 * Postgres; die Abfrage hier muss nicht filtern.
 *
 * Jede Zeile geht durch parsePet(), damit ab dieser Grenze alles typisiert
 * ist statt roh aus dem jsonb zu kommen.
 */
export function usePets(enabled: boolean) {
  return useQuery({
    queryKey: petsKey,
    enabled,
    queryFn: async (): Promise<Pet[]> => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map(parsePet)
    },
  })
}

import { useQuery } from '@tanstack/react-query'
import type { Sitter } from '@/domain/search'
import { supabase } from '@/lib/supabase'

export const sittersKey = ['sitters'] as const

/** Alle aktiven Sitter. Gefiltert und sortiert wird im Browser – die Liste
 *  ist klein, und so reagieren Umkreis und Filter ohne neue Abfrage. */
export function useSitters(enabled: boolean) {
  return useQuery({
    queryKey: sittersKey,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Sitter[]> => {
      const { data, error } = await supabase
        .from('sitters')
        .select('*, profiles!inner(display_name, city, lat, lng)')
        .eq('active', true)
      if (error) throw new Error(error.message)
      return (data ?? []) as unknown as Sitter[]
    },
  })
}

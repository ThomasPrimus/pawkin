import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Pet, parsePet } from '@/domain/pet'
import { type Booking, sortiereBuchungen } from '@/domain/stay'
import { supabase } from '@/lib/supabase'

/**
 * Buchungen aus beiden Blickrichtungen. Wer was sehen darf, entscheidet RLS –
 * die Abfragen filtern zusätzlich auf die eigene Rolle, damit ein Sitter, der
 * selbst Tiere hat, nicht seine eigenen Anfragen im Sitter-Bereich sieht.
 */

export interface BuchungAlsBesitzer extends Booking {
  sitters: { profiles: { display_name: string } | null } | null
  pets: { name: string; species: string } | null
}

export interface BuchungAlsSitter extends Booking {
  profiles: { display_name: string; client_rating: number | null } | null
  pet: Pet | null
}

export const bookingsKey = (rolle: 'besitzer' | 'sitter', userId: string) =>
  ['bookings', rolle, userId] as const

export function useBuchungenAlsBesitzer(userId: string | undefined) {
  return useQuery({
    queryKey: bookingsKey('besitzer', userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async (): Promise<BuchungAlsBesitzer[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, sitters!inner(profiles!inner(display_name)), pets(name, species)')
        .eq('owner_id', userId as string)
      if (error) throw new Error(error.message)
      return sortiereBuchungen((data ?? []) as unknown as BuchungAlsBesitzer[])
    },
  })
}

export function useBuchungenAlsSitter(userId: string | undefined) {
  return useQuery({
    queryKey: bookingsKey('sitter', userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async (): Promise<BuchungAlsSitter[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_owner_id_fkey(display_name, client_rating), pets(*)')
        .eq('sitter_id', userId as string)
      if (error) throw new Error(error.message)
      // Das Tier durch dieselbe Grenze schicken wie überall sonst, damit der
      // Sitter dieselbe typisierte Akte sieht wie der Halter.
      const mitTier = (data ?? []).map((b) => {
        const { pets, ...rest } = b as unknown as Omit<BuchungAlsSitter, 'pet'> & {
          pets: unknown
        }
        return { ...rest, pet: pets ? parsePet(pets as Parameters<typeof parsePet>[0]) : null }
      })
      return sortiereBuchungen(mitTier as BuchungAlsSitter[])
    },
  })
}

export function useBuchungStatus(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingsKey('besitzer', userId ?? '') })
      qc.invalidateQueries({ queryKey: bookingsKey('sitter', userId ?? '') })
    },
  })
}

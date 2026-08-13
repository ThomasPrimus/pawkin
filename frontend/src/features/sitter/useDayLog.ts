import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type DayTask, taskBody } from '@/domain/care'
import { heuteISO } from '@/domain/stay'
import { supabase } from '@/lib/supabase'

/**
 * Was heute für ein Tier schon erledigt ist. Fütterungen und Gassi-Runden
 * stehen im pet_log, Medikamentengaben im med_log – beide mit der booking_id,
 * damit daraus später der Aufenthalts-Bericht entsteht, ohne dass jemand
 * etwas zusätzlich erfassen muss.
 */

export const dayLogKey = (petId: string) => ['dayLog', petId, heuteISO()] as const

export interface Tageslog {
  eintraege: { type: string; body: string }[]
  gaben: { med_name: string; due_label: string }[]
}

export function useTageslog(petId: string | undefined) {
  return useQuery({
    queryKey: dayLogKey(petId ?? ''),
    enabled: Boolean(petId),
    queryFn: async (): Promise<Tageslog> => {
      const ab = `${heuteISO()}T00:00:00`
      const [log, med] = await Promise.all([
        supabase
          .from('pet_log')
          .select('type, body')
          .eq('pet_id', petId as string)
          .gte('created_at', ab),
        supabase
          .from('med_log')
          .select('med_name, due_label')
          .eq('pet_id', petId as string)
          .gte('given_at', ab),
      ])
      if (log.error) throw new Error(log.error.message)
      if (med.error) throw new Error(med.error.message)
      return { eintraege: log.data ?? [], gaben: med.data ?? [] }
    },
  })
}

/** Abhaken statt tippen: der Eintrag entsteht aus dem Profil, in demselben
 *  Aufbau, den taskDone() wiedererkennt. */
export function useAufgabeAbhaken(petId: string, bookingId: string, autorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: DayTask) => {
      const { error } = await supabase.from('pet_log').insert({
        pet_id: petId,
        booking_id: bookingId,
        author_id: autorId,
        type: task.kind,
        body: taskBody(task) || task.kind,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dayLogKey(petId) }),
  })
}

export function useMedikamentGeben(petId: string, bookingId: string, gebendeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (gabe: { name: string; dose: string; zeit: string }) => {
      const { error } = await supabase.from('med_log').insert({
        pet_id: petId,
        booking_id: bookingId,
        given_by: gebendeId,
        med_name: gabe.name,
        dose: gabe.dose,
        due_label: gabe.zeit,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dayLogKey(petId) }),
  })
}

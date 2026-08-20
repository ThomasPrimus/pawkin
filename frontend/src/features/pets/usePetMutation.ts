import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Med, type PetExtra, petExtraSchema, type Species } from '@/domain/pet'
import type { Json } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { petsKey } from './usePets'

/** Was das Formular liefert – bewusst getrennt von der Datenbankzeile. */
export interface PetDraft {
  id: string | null
  name: string
  species: Species
  breed: string
  quirks: string
  vaccinations: string
  needs: string[]
  meds: Med[]
  extra: PetExtra
}

/**
 * Baut aus dem Entwurf die Datenbankzeile. Hier liegt der einzige Ort, an dem
 * die alten Textspalten noch mitgeschrieben werden – solange die alte App
 * unter app.html läuft, liest sie von dort.
 */
export function draftToRow(draft: PetDraft, ownerId: string) {
  // Über das Schema schicken, damit nur Bekanntes und bewusst durchgelassene
  // Altschlüssel gespeichert werden. Leere Felder fliegen raus, sonst
  // sammeln sich mit der Zeit leere Strings im jsonb an.
  const geprueft = petExtraSchema.parse(draft.extra)
  const extra = Object.fromEntries(
    Object.entries(geprueft).filter(([, v]) => v !== undefined && v !== ''),
  )

  const gesund = draft.extra.health_status !== 'condition'
  const meds = gesund ? [] : draft.meds.filter((m) => m.name.trim())

  return {
    owner_id: ownerId,
    name: draft.name.trim(),
    species: draft.species,
    breed: draft.breed.trim(),
    quirks: draft.quirks.trim(),
    vaccinations: draft.vaccinations.trim(),
    // "Braucht Medikamentengabe" ergibt sich aus dem Plan, nicht aus einer
    // zweiten Frage ans Gegenüber.
    needs: meds.length ? [...new Set([...draft.needs, 'med'])] : draft.needs,
    meds: meds as unknown as Json,
    extra: extra as Json,
    info: [
      draft.extra.birthdate ? alterText(draft.extra.birthdate) : '',
      draft.extra.weight ? `${draft.extra.weight} kg` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    // Altspalten weiterschreiben, damit die bestehende App nichts verliert.
    food: draft.extra.food_what ?? '',
    vet_contact: [draft.extra.vet_name, draft.extra.vet_phone].filter(Boolean).join(' · '),
    emergency_contact: [draft.extra.emg_name, draft.extra.emg_phone].filter(Boolean).join(' · '),
    medication: meds.map((m) => `${m.name} ${m.dose}`.trim()).join(', '),
  }
}

export function alterText(geburtstag: string): string {
  const b = new Date(geburtstag)
  if (Number.isNaN(b.getTime())) return ''
  const jetzt = new Date()
  let monate = (jetzt.getFullYear() - b.getFullYear()) * 12 + (jetzt.getMonth() - b.getMonth())
  if (jetzt.getDate() < b.getDate()) monate--
  if (monate < 0) return ''
  if (monate < 12) return `${monate} ${monate === 1 ? 'Monat' : 'Monate'}`
  const jahre = Math.floor(monate / 12)
  return `${jahre} ${jahre === 1 ? 'Jahr' : 'Jahre'}`
}

export function usePetMutation(ownerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (draft: PetDraft) => {
      const row = draftToRow(draft, ownerId)
      const { data, error } = draft.id
        ? await supabase.from('pets').update(row).eq('id', draft.id).select().single()
        : await supabase.from('pets').insert(row).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: petsKey }),
  })
}

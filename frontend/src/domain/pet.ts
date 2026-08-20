import { z } from 'zod'
import type { Tables } from '@/lib/database.types'

/**
 * Das Tier-Domänenmodell.
 *
 * In der Datenbank ist `pets.extra` ein jsonb-Sack, in dem inzwischen über
 * 30 Schlüssel liegen. In der alten App war das ungetypt: ein Tippfehler
 * erzeugte still einen toten Schlüssel, und niemand bemerkte den
 * Datenverlust. Hier ist dieses Schema die einzige Wahrheit darüber, was
 * drinstehen darf – alles andere greift nur noch über diese Typen zu.
 */

export const SPECIES = ['dog', 'cat'] as const
export type Species = (typeof SPECIES)[number]

export const FEED_FREQ = ['1× täglich', '2× täglich', '3× täglich', 'Zur freien Verfügung'] as const
export const FEED_UNITS = ['g', 'Dose', 'Becher', 'Beutel', 'Portion'] as const
export const TREAT_RULE = ['Ja, erlaubt', 'Nur begrenzt', 'Nein, gar keine'] as const

/** Sicherheitsrelevantes Verhalten – Dinge, die Tier oder Sitter schaden
 *  können, wenn sie niemand sagt. Bewusst kurz gehalten. */
export const WARN_FLAGS = {
  food_guard: '🍖 Futterneid',
  bite: '😬 Schnappt / beißt',
  escape: '🏃 Ausbruchskünstler',
  dogs: '🐕 Reagiert auf Hunde',
  fear: '⚡ Angst-Trigger',
  scavenge: '🌿 Frisst vom Boden',
  alone: '😿 Verträgt kein Alleinsein',
} as const
export type WarnFlag = keyof typeof WARN_FLAGS

/** Leerstring soll `undefined` ergeben, nicht `0` – sonst wäre ein leeres
 *  Gewichtsfeld plötzlich ein Tier mit 0 kg. */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().positive().optional(),
)
const text = z.string().trim().optional()

export const petExtraSchema = z
  .object({
    // Steckbrief
    weight: optionalNumber,
    birthdate: text,

    // Fütterung – die häufigste Aufgabe im Alltag, deshalb strukturiert
    food_what: text,
    food_amount: text,
    food_unit: z.enum(FEED_UNITS).optional(),
    food_freq: z.enum(FEED_FREQ).optional(),
    food_times: text,
    treats_ok: z.enum(TREAT_RULE).optional(),
    food_forbidden: text,
    food_where: text,

    // Gesundheit – steuert, ob Medikationsfelder überhaupt gelten
    health_status: z.enum(['healthy', 'condition']).default('healthy'),
    condition: text,
    med_how: text,
    symptoms: text,
    emergency_signs: text,
    vacc_due: text,

    // Notfall – getrennt, damit ein Anruf ein Fingertipp ist
    vet_name: text,
    vet_phone: text,
    vet_address: text,
    emg_name: text,
    emg_phone: text,
    vet_budget: text,

    // Sicherheit: kommagetrennte WarnFlags plus je ein Detailfeld warn_<flag>
    warn: text,

    // Tierart-spezifisch
    walk_times: text,
    leash: text,
    offleash: text,
    litter_where: text,
    litter_care: text,
    outdoor: text,

    // Übergabe – am ersten Tag wichtiger als jede Charaktereigenschaft
    leash_where: text,
    docs_where: text,
    keys_where: text,
    carrier_where: text,
    where_other: text,
  })
  // Altschlüssel (feeding, allergies, nofood …) und die warn_<flag>-Details
  // dürfen durchlaufen, statt beim Speichern still verloren zu gehen.
  .catchall(z.string())

export type PetExtra = z.infer<typeof petExtraSchema>

/** Die Schlüssel, die dieses Schema kennt. Der Test in pet.test.ts prüft
 *  damit, dass die Formulare keinen Schlüssel schreiben, den niemand liest. */
export const KNOWN_EXTRA_KEYS = Object.keys(petExtraSchema.shape) as (keyof PetExtra)[]

export const medSchema = z.object({
  name: z.string().trim().min(1),
  dose: z.string().trim().default(''),
  times: z.array(z.string().trim()).default([]),
})
export type Med = z.infer<typeof medSchema>

export type PetRow = Tables<'pets'>

export interface Pet extends Omit<PetRow, 'extra' | 'meds' | 'species'> {
  species: Species
  extra: PetExtra
  meds: Med[]
}

/**
 * Die Grenze zwischen Datenbank und Anwendung. Ab hier ist alles typisiert.
 * Kaputte Einzelteile werden verworfen statt die ganze Akte scheitern zu
 * lassen – ein unbrauchbarer Medikamenteneintrag darf nicht dazu führen,
 * dass ein Sitter gar keine Fütterungsinfo mehr sieht.
 */
export function parsePet(row: PetRow): Pet {
  const extra = petExtraSchema.safeParse(row.extra ?? {})
  const rawMeds = Array.isArray(row.meds) ? row.meds : []
  const meds = rawMeds.flatMap((m) => {
    const parsed = medSchema.safeParse(m)
    return parsed.success ? [parsed.data] : []
  })
  const species: Species = row.species === 'cat' ? 'cat' : 'dog'
  const { extra: _e, meds: _m, species: _s, ...rest } = row
  return {
    ...rest,
    species,
    extra: extra.success ? extra.data : petExtraSchema.parse({}),
    meds,
  }
}

import type { Pet } from './pet'

/**
 * Die Betreuungs-Logik: was ein Sitter wirklich braucht, was heute ansteht.
 * Reine Funktionen ohne DOM und ohne Netz – deshalb vollständig testbar.
 */

/** Kernangaben: ohne die kann ein Sitter den Alltag nicht sicher bestreiten.
 *  Reihenfolge = Wichtigkeit. Nichts davon blockiert das Speichern. */
export const CARE_CORE = [
  { key: 'food_what', label: 'Was gefüttert wird' },
  { key: 'food_amount', label: 'Menge pro Mahlzeit' },
  { key: 'food_freq', label: 'Wie oft am Tag' },
  { key: 'weight', label: 'Gewicht' },
  { key: 'vet_phone', label: 'Tierarzt-Telefon' },
  { key: 'emg_phone', label: 'Notfallkontakt' },
] as const
export type CareCoreKey = (typeof CARE_CORE)[number]['key']

/**
 * Tierarzt und Notfallkontakt waren früher je ein Freitextfeld
 * ("Dr. Huber 0512 1234"). Für einen antippbaren Anruf-Button muss die
 * Nummer da raus – sonst steht der ganze Text auf dem Button.
 */
export function splitContact(raw: string | null | undefined): { name: string; phone: string } {
  const t = (raw ?? '').trim()
  const m = t.match(/[+\d][\d\s/().-]{5,}/)
  const phone = m?.[0]?.trim() ?? ''
  const name = phone
    ? t
        .replace(phone, '')
        .replace(/[·,\-–]\s*$/, '')
        .trim()
    : t
  return { name, phone }
}

/** Liest eine Kernangabe inklusive der Altdaten-Rückfälle auf die
 *  ursprünglichen Textspalten. */
export function careValue(pet: Pet, key: CareCoreKey): string {
  const ex = pet.extra
  switch (key) {
    case 'food_what':
      return (ex.food_what || pet.food || '').trim()
    case 'weight':
      return ex.weight === undefined ? '' : String(ex.weight)
    case 'vet_phone':
      return (ex.vet_phone || splitContact(pet.vet_contact).phone).trim()
    case 'emg_phone':
      return (ex.emg_phone || splitContact(pet.emergency_contact).phone).trim()
    default:
      return (ex[key] ?? '').trim()
  }
}

/** Die Zeiten lagen früher in extra.feeding statt extra.food_times. */
export const feedTimes = (pet: Pet): string =>
  (pet.extra.food_times || pet.extra['feeding'] || '').trim()

export function careGaps(pet: Pet) {
  return CARE_CORE.filter((c) => !careValue(pet, c.key))
}

export function careReadiness(pet: Pet) {
  const gaps = careGaps(pet)
  return { done: CARE_CORE.length - gaps.length, total: CARE_CORE.length, gaps }
}

/** Fütterung in einen Satz, den ein Sitter im Vorbeigehen erfasst. */
export function feedLine(pet: Pet): { head: string; what: string; times: string } {
  const ex = pet.extra
  const parts: string[] = []
  if (ex.food_freq) parts.push(ex.food_freq)
  if (ex.food_amount) parts.push(`${ex.food_amount} ${ex.food_unit ?? 'g'} pro Mahlzeit`)
  return { head: parts.join(' · '), what: careValue(pet, 'food_what'), times: feedTimes(pet) }
}

export type TaskKind = 'feed' | 'walk'
export interface DayTask {
  kind: TaskKind
  /** Uhrzeit oder "2. Mahlzeit"; leer, wenn das Profil keine Taktung nennt. */
  at: string
  label: string
}

export const TASK_ICON: Record<TaskKind, string> = { feed: '🥣', walk: '🦮' }
export const TASK_WORD: Record<TaskKind, string> = { feed: 'Fütterung', walk: 'Gassi' }

/**
 * Leitet aus dem Profil ab, was heute konkret zu tun ist. Der Sitter soll im
 * Moment der Betreuung nicht ins Profil zurückspringen müssen, und jede
 * abgehakte Aufgabe schreibt einen Log-Eintrag – so entsteht die Akte
 * nebenbei statt durch Tippen.
 */
export function dayTasks(pet: Pet): DayTask[] {
  const ex = pet.extra
  const out: DayTask[] = []

  // Einheit nur zusammen mit einer Menge – sonst stünde bei leerem Profil
  // ein blankes "g" als Aufgabe da.
  const amount = ex.food_amount ? `${ex.food_amount} ${ex.food_unit ?? 'g'}` : ''
  const label = [amount, careValue(pet, 'food_what')].filter(Boolean).join(' · ')

  const times = feedTimes(pet)
    .split(/,|;| und /)
    .map((s) => s.trim())
    .filter(Boolean)

  if (times.length) {
    for (const at of times) out.push({ kind: 'feed', at, label })
  } else if (ex.food_freq === 'Zur freien Verfügung') {
    out.push({ kind: 'feed', at: '', label: label || 'steht zur freien Verfügung' })
  } else {
    const n = Number.parseInt(ex.food_freq ?? '', 10)
    if (Number.isFinite(n) && n > 0) {
      for (let i = 0; i < n; i++) out.push({ kind: 'feed', at: `${i + 1}. Mahlzeit`, label })
    } else if (label) {
      out.push({ kind: 'feed', at: '', label })
    }
  }

  if (pet.species === 'dog' && ex.walk_times) {
    for (const at of ex.walk_times
      .split(/,|;/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      out.push({ kind: 'walk', at, label: '' })
    }
  }
  return out
}

/** Beide Seiten schreiben denselben Aufbau: "<Zeit> · <Beschreibung>". */
export const taskBody = (t: DayTask): string => [t.at, t.label].filter(Boolean).join(' · ')

export const taskDone = (t: DayTask, logs: { type: string; body: string }[]): boolean =>
  logs.some((l) => l.type === t.kind && (t.at ? l.body.startsWith(t.at) : true))

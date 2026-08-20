import { type ReactNode, useState } from 'react'
import { careReadiness } from '@/domain/care'
import {
  FEED_FREQ,
  FEED_UNITS,
  type Med,
  type Pet,
  type PetExtra,
  type Species,
  TREAT_RULE,
  WARN_FLAGS,
  type WarnFlag,
} from '@/domain/pet'
import { useSession } from '@/lib/session'
import { useGehZu } from '@/routes'
import { CareView } from './CareView'
import { type PetDraft, usePetMutation } from './usePetMutation'
import { usePets } from './usePets'

/**
 * Tier anlegen und bearbeiten.
 *
 * Der Aufbau folgt der Wichtigkeit für den Sitter, nicht der Datenbank:
 * Steckbrief → Fütterung → Gesundheit → Notfall → Sicherheit → Übergabe →
 * Optionales. Gesperrt wird nichts; was fehlt, wird oben offen benannt.
 */

const leererEntwurf = (): PetDraft => ({
  id: null,
  name: '',
  species: 'dog',
  breed: '',
  quirks: '',
  vaccinations: '',
  needs: [],
  meds: [],
  extra: { health_status: 'healthy' },
})

const ausPet = (pet: Pet): PetDraft => ({
  id: pet.id,
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  quirks: pet.quirks,
  vaccinations: pet.vaccinations,
  needs: pet.needs,
  meds: pet.meds,
  extra: pet.extra,
})

/** Für die Lücken-Anzeige und die Vorschau: der Entwurf als Tier gelesen. */
const alsPet = (d: PetDraft): Pet =>
  ({
    id: d.id ?? 'entwurf',
    owner_id: '',
    created_at: '',
    info: '',
    food: '',
    medication: '',
    vet_contact: '',
    emergency_contact: '',
    name: d.name,
    species: d.species,
    breed: d.breed,
    quirks: d.quirks,
    vaccinations: d.vaccinations,
    needs: d.needs,
    meds: d.meds,
    extra: d.extra,
  }) satisfies Pet

export function PetFormScreen({ petId }: { petId: string | null }) {
  const { session } = useSession()
  const pets = usePets(Boolean(session))
  const gehZu = useGehZu()
  const gefunden = petId ? pets.data?.find((p) => p.id === petId) : undefined

  // Erst rendern, wenn beim Bearbeiten das Tier da ist – sonst startet das
  // Formular leer und überschreibt beim Speichern alles.
  if (petId && !gefunden) {
    if (pets.isPending) return <p className="text-[13px] text-muted">Lade…</p>
    return <p className="text-[13px] text-[#c0392b]">Dieses Tier gibt es nicht (mehr).</p>
  }

  return (
    <Formular
      key={petId ?? 'neu'}
      start={gefunden ? ausPet(gefunden) : leererEntwurf()}
      ownerId={session?.user.id ?? ''}
      onFertig={(id) => gehZu.detail(id)}
      onAbbruch={() => (petId ? gehZu.detail(petId) : gehZu.liste())}
    />
  )
}

function Formular({
  start,
  ownerId,
  onFertig,
  onAbbruch,
}: {
  start: PetDraft
  ownerId: string
  onFertig: (id: string) => void
  onAbbruch: () => void
}) {
  const [draft, setDraft] = useState<PetDraft>(start)
  const [vorschau, setVorschau] = useState(false)
  const speichern = usePetMutation(ownerId)

  const setExtra = <K extends keyof PetExtra>(k: K, v: PetExtra[K]) =>
    setDraft((d) => ({ ...d, extra: { ...d.extra, [k]: v } }))

  const krank = draft.extra.health_status === 'condition'
  const bereit = careReadiness(alsPet(draft))
  const istNeu = draft.id === null

  if (vorschau) {
    return (
      <div>
        <h2 className="mb-1 font-extrabold text-[19px]">
          👀 So sieht {draft.name || 'dein Tier'} beim Sitter aus
        </h2>
        <p className="mb-3 text-[12px] text-muted">
          Ungespeicherter Stand – genau diese Ansicht bekommt der Sitter.
        </p>
        <CareView pet={alsPet(draft)} />
        <button type="button" className={knopf} onClick={() => setVorschau(false)}>
          Zurück zum Bearbeiten
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        speichern.mutate(draft, { onSuccess: (row) => onFertig(row.id) })
      }}
    >
      <h2 className="mb-3 font-extrabold text-[19px]">
        {istNeu ? 'Tier anlegen' : `${start.name} bearbeiten`}
      </h2>

      {bereit.gaps.length > 0 ? (
        <p className="mb-3 rounded-xl bg-accent-light px-3 py-2.5 text-[12.5px] text-[#9a4b33] leading-relaxed">
          <b>
            {bereit.done} von {bereit.total} Kernangaben
          </b>{' '}
          – dein Sitter hätte gern noch:
          <br />
          {bereit.gaps.map((g) => g.label).join(' · ')}
        </p>
      ) : (
        <p className="mb-3 rounded-xl bg-brand-light px-3 py-2.5 text-[12.5px] text-brand-dark">
          <b>✓ Sitter-bereit</b> – alles Wichtige für den Alltag ist da.
        </p>
      )}

      <Gruppe titel="🐾 Steckbrief" offen>
        <Text
          id="name"
          label="Name *"
          wert={draft.name}
          setz={(v) => setDraft((d) => ({ ...d, name: v }))}
        />
        <fieldset className="mb-3">
          <legend className="mb-1.5 font-bold text-[12px] text-muted">Tierart *</legend>
          <div className="flex gap-2">
            {(['dog', 'cat'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={draft.species === s}
                onClick={() => setDraft((d) => ({ ...d, species: s }))}
                className={`flex-1 rounded-xl border-[1.5px] py-3 font-bold text-[13px] ${
                  draft.species === s ? 'border-brand bg-brand-light' : 'border-line bg-white'
                }`}
              >
                {s === 'dog' ? '🐕 Hund' : '🐈 Katze'}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2.5">
          <div className="flex-1">
            <Text
              id="weight"
              label="Gewicht (kg)"
              typ="number"
              wert={draft.extra.weight === undefined ? '' : String(draft.extra.weight)}
              setz={(v) => setExtra('weight', v === '' ? undefined : Number(v.replace(',', '.')))}
              platzhalter="z. B. 28"
            />
          </div>
          <div className="flex-1">
            <Text
              id="birthdate"
              label="Geburtstag"
              typ="date"
              wert={draft.extra.birthdate ?? ''}
              setz={(v) => setExtra('birthdate', v)}
            />
          </div>
        </div>
        <p className="-mt-1 mb-3 text-[11px] text-muted">
          Das Gewicht hilft dem Sitter, Futtermenge und Medikamenten-Dosis einzuordnen.
        </p>
        <Text
          id="breed"
          label="Rasse"
          wert={draft.breed}
          setz={(v) => setDraft((d) => ({ ...d, breed: v }))}
          platzhalter="z. B. Labrador-Mix"
        />
      </Gruppe>

      <Gruppe titel="🥣 Fütterung" offen>
        <Text
          id="food_what"
          label={`Was bekommt ${draft.name || 'dein Tier'}?`}
          wert={draft.extra.food_what ?? ''}
          setz={(v) => setExtra('food_what', v)}
          platzhalter="z. B. Royal Canin Adult, trocken"
        />
        <div className="flex gap-2.5">
          <div className="flex-1">
            <Text
              id="food_amount"
              label="Menge pro Mahlzeit"
              wert={draft.extra.food_amount ?? ''}
              setz={(v) => setExtra('food_amount', v)}
              platzhalter="z. B. 200"
            />
          </div>
          <div className="flex-1">
            <ChipWahl
              label="Einheit"
              werte={FEED_UNITS}
              aktiv={draft.extra.food_unit ?? 'g'}
              setz={(v) => setExtra('food_unit', v)}
            />
          </div>
        </div>
        <ChipWahl
          label="Wie oft am Tag?"
          werte={FEED_FREQ}
          aktiv={draft.extra.food_freq}
          setz={(v) => setExtra('food_freq', v)}
        />
        <Text
          id="food_times"
          label="Um welche Zeit?"
          wert={draft.extra.food_times ?? ''}
          setz={(v) => setExtra('food_times', v)}
          platzhalter="z. B. 7:00 und 18:00"
        />
        <ChipWahl
          label="Leckerli erlaubt?"
          werte={TREAT_RULE}
          aktiv={draft.extra.treats_ok}
          setz={(v) => setExtra('treats_ok', v)}
        />
        <Text
          id="food_forbidden"
          label="Verboten / Unverträglichkeiten"
          wert={draft.extra.food_forbidden ?? ''}
          setz={(v) => setExtra('food_forbidden', v)}
          platzhalter="z. B. Getreide, alles Gewürzte"
          hinweis="Wird dem Sitter als Warnung angezeigt."
        />
        <Text
          id="food_where"
          label="Wo steht das Futter?"
          wert={draft.extra.food_where ?? ''}
          setz={(v) => setExtra('food_where', v)}
          platzhalter="z. B. Speis, linkes Regal"
          hinweis="Klingt banal – ist für den Sitter am ersten Tag Gold wert."
        />
      </Gruppe>

      <Gruppe titel="🩺 Gesundheit" offen={krank}>
        <fieldset className="mb-3">
          <legend className="mb-1.5 font-bold text-[12px] text-muted">
            Wie geht es {draft.name || 'deinem Tier'}?
          </legend>
          <div className="flex gap-2">
            {(
              [
                ['healthy', '💚 Gesund'],
                ['condition', '💊 Krank / Medikamente'],
              ] as const
            ).map(([wert, text]) => (
              <button
                key={wert}
                type="button"
                aria-pressed={draft.extra.health_status === wert}
                onClick={() => setExtra('health_status', wert)}
                className={`flex-1 rounded-xl border-[1.5px] px-2 py-3 font-bold text-[12px] ${
                  draft.extra.health_status === wert
                    ? 'border-brand bg-brand-light'
                    : 'border-line bg-white'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Ein gesundes Tier bekommt den Medikationsplan gar nicht zu sehen. */}
        {krank && (
          <>
            <Text
              id="condition"
              label={`Was hat ${draft.name || 'dein Tier'}?`}
              wert={draft.extra.condition ?? ''}
              setz={(v) => setExtra('condition', v)}
              platzhalter="z. B. Epilepsie, Arthrose"
            />
            <MedPlan meds={draft.meds} setz={(meds) => setDraft((d) => ({ ...d, meds }))} />
            <Text
              id="med_how"
              label="Wie wird es gegeben?"
              wert={draft.extra.med_how ?? ''}
              setz={(v) => setExtra('med_how', v)}
              platzhalter="z. B. in Leberwurst versteckt"
            />
            <Text
              id="symptoms"
              label="Worauf soll der Sitter achten?"
              wert={draft.extra.symptoms ?? ''}
              setz={(v) => setExtra('symptoms', v)}
              platzhalter="z. B. Humpeln, viel Trinken"
            />
            <Text
              id="emergency_signs"
              label="Sofort zum Tierarzt bei"
              wert={draft.extra.emergency_signs ?? ''}
              setz={(v) => setExtra('emergency_signs', v)}
              platzhalter="z. B. Krampfanfall über 2 Minuten"
            />
          </>
        )}
        <Text
          id="vacc_due"
          label="Impfung gültig bis"
          typ="date"
          wert={draft.extra.vacc_due ?? ''}
          setz={(v) => setExtra('vacc_due', v)}
        />
      </Gruppe>

      <Gruppe titel="🚨 Notfall" offen>
        <Text
          id="vet_name"
          label="Tierarzt – Name"
          wert={draft.extra.vet_name ?? ''}
          setz={(v) => setExtra('vet_name', v)}
        />
        <Text
          id="vet_phone"
          label="Tierarzt – Telefon"
          typ="tel"
          wert={draft.extra.vet_phone ?? ''}
          setz={(v) => setExtra('vet_phone', v)}
          platzhalter="z. B. +43 660 1234567"
        />
        <Text
          id="vet_address"
          label="Tierarzt – Adresse"
          wert={draft.extra.vet_address ?? ''}
          setz={(v) => setExtra('vet_address', v)}
        />
        <Text
          id="emg_name"
          label="Notfallkontakt – Name"
          wert={draft.extra.emg_name ?? ''}
          setz={(v) => setExtra('emg_name', v)}
          platzhalter="jemand in der Nähe, der einspringen kann"
        />
        <Text
          id="emg_phone"
          label="Notfallkontakt – Telefon"
          typ="tel"
          wert={draft.extra.emg_phone ?? ''}
          setz={(v) => setExtra('emg_phone', v)}
        />
        <Text
          id="vet_budget"
          label="Behandlung ohne Rückfrage bis (€)"
          wert={draft.extra.vet_budget ?? ''}
          setz={(v) => setExtra('vet_budget', v)}
          platzhalter="z. B. 500"
          hinweis="Ohne diese Freigabe muss der Sitter im Notfall auf deinen Rückruf warten."
        />
      </Gruppe>

      <Gruppe titel="⚠️ Sicherheit & Verhalten" offen={Boolean(draft.extra.warn)}>
        <WarnWahl
          gewaehlt={(draft.extra.warn ?? '').split(',').filter(Boolean) as WarnFlag[]}
          setz={(flags) => setExtra('warn', flags.join(','))}
          detail={(f) => draft.extra[`warn_${f}`] ?? ''}
          setzDetail={(f, v) => setExtra(`warn_${f}`, v)}
        />
        <Text
          id="quirks"
          label="Sonstige Eigenheiten"
          wert={draft.quirks}
          setz={(v) => setDraft((d) => ({ ...d, quirks: v }))}
        />
      </Gruppe>

      <Gruppe titel={draft.species === 'cat' ? '🚽 Katzenklo & Freigang' : '🦮 Gassi & Draußen'}>
        {ARTFELDER[draft.species].map(([k, label, ph]) => (
          <Text
            key={k}
            id={k}
            label={label}
            wert={draft.extra[k] ?? ''}
            setz={(v) => setExtra(k, v)}
            platzhalter={ph}
          />
        ))}
      </Gruppe>

      <Gruppe titel="🔑 Übergabe – wo alles liegt">
        {uebergabeFelder(draft.species).map(([k, label, ph]) => (
          <Text
            key={k}
            id={k}
            label={label}
            wert={draft.extra[k] ?? ''}
            setz={(v) => setExtra(k, v)}
            platzhalter={ph}
          />
        ))}
      </Gruppe>

      {speichern.isError && (
        <p role="alert" className="mb-2 text-[12.5px] text-[#c0392b]">
          Konnte nicht speichern: {speichern.error.message}
        </p>
      )}

      <button type="button" className={knopfLeise} onClick={() => setVorschau(true)}>
        👀 So sieht es dein Sitter
      </button>
      <button type="submit" disabled={!draft.name.trim() || speichern.isPending} className={knopf}>
        {speichern.isPending ? 'Speichere…' : istNeu ? 'Anlegen' : 'Speichern'}
      </button>
      <button type="button" className={knopfLeise} onClick={onAbbruch}>
        Abbrechen
      </button>
    </form>
  )
}

const ARTFELDER = {
  dog: [
    ['walk_times', 'Gassi-Zeiten', 'z. B. 7:00 kurz, 13:00 große Runde'],
    ['leash', 'Leine & Geschirr', 'z. B. Geschirr statt Halsband'],
    ['offleash', 'Freilauf erlaubt?', 'z. B. nur eingezäunt, Rückruf unsicher'],
  ],
  cat: [
    ['litter_where', 'Katzenklo – wo?', 'z. B. Bad, hinter der Tür'],
    ['litter_care', 'Wie oft säubern?', 'z. B. 1× täglich'],
    ['outdoor', 'Freigang?', 'z. B. reine Wohnungskatze'],
  ],
} as const satisfies Record<Species, readonly (readonly [keyof PetExtra, string, string])[]>

// Jeder Schlüssel existiert im Formular genau einmal: food_where steht in der
// Fütterung, litter_where beim Katzenklo. Die Übergabe-Karte zeigt sie
// trotzdem mit an, weil sie beim Ankommen zusammen gebraucht werden.
const uebergabeFelder = (art: Species) =>
  [
    ...(art === 'dog'
      ? ([
          ['leash_where', 'Leine, Geschirr, Kotbeutel', 'z. B. Haken neben der Wohnungstür'],
        ] as const)
      : ([] as const)),
    ['docs_where', 'Impfpass & Papiere', 'z. B. Schublade Flur, oben'] as const,
    ['keys_where', 'Schlüssel & Zugang', 'z. B. Ersatzschlüssel bei Nachbarin Anna'] as const,
    ['carrier_where', 'Transportbox', 'z. B. Keller, Regal rechts'] as const,
    ['where_other', 'Sonstiges', 'z. B. Alarmanlage: Code beim Reingehen'] as const,
  ] satisfies readonly (readonly [keyof PetExtra, string, string])[]

/* ---------- Bausteine ---------- */

const eingabe =
  'w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand'
const knopf =
  'mt-2 w-full rounded-xl bg-brand py-3.5 font-extrabold text-[14px] text-white disabled:opacity-50'
const knopfLeise =
  'mt-2 w-full rounded-xl border-[1.5px] border-line bg-white py-3 font-bold text-[13px]'

function Gruppe({
  titel,
  offen,
  children,
}: {
  titel: string
  offen?: boolean
  children: ReactNode
}) {
  return (
    <details open={offen} className="mb-3 rounded-2xl border-[1.5px] border-line bg-white">
      <summary className="cursor-pointer px-3.5 py-3 font-bold text-[13.5px]">{titel}</summary>
      <div className="px-3.5 pb-3">{children}</div>
    </details>
  )
}

function Text({
  id,
  label,
  wert,
  setz,
  typ = 'text',
  platzhalter,
  hinweis,
}: {
  id: string
  label: string
  wert: string
  setz: (v: string) => void
  typ?: string
  platzhalter?: string
  hinweis?: string
}) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1.5 block font-bold text-[12px] text-muted">
        {label}
      </label>
      <input
        id={id}
        type={typ}
        value={wert}
        placeholder={platzhalter ?? ''}
        onChange={(e) => setz(e.target.value)}
        className={eingabe}
      />
      {hinweis && <p className="mt-1 text-[11px] text-muted">{hinweis}</p>}
    </div>
  )
}

function ChipWahl<T extends string>({
  label,
  werte,
  aktiv,
  setz,
}: {
  label: string
  werte: readonly T[]
  aktiv: T | undefined
  setz: (v: T | undefined) => void
}) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 font-bold text-[12px] text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {werte.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={aktiv === w}
            onClick={() => setz(aktiv === w ? undefined : w)}
            className={`rounded-full border-[1.5px] px-3 py-2 font-semibold text-[12.5px] ${
              aktiv === w ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function WarnWahl({
  gewaehlt,
  setz,
  detail,
  setzDetail,
}: {
  gewaehlt: WarnFlag[]
  setz: (f: WarnFlag[]) => void
  detail: (f: WarnFlag) => string
  setzDetail: (f: WarnFlag, v: string) => void
}) {
  return (
    <>
      <fieldset className="mb-3">
        <legend className="mb-1.5 font-bold text-[12px] text-muted">
          Trifft etwas davon zu? (antippen)
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(WARN_FLAGS) as WarnFlag[]).map((f) => {
            const an = gewaehlt.includes(f)
            return (
              <button
                key={f}
                type="button"
                aria-pressed={an}
                onClick={() => setz(an ? gewaehlt.filter((x) => x !== f) : [...gewaehlt, f])}
                className={`rounded-full border-[1.5px] px-3 py-2 font-semibold text-[12.5px] ${
                  an ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
                }`}
              >
                {WARN_FLAGS[f]}
              </button>
            )
          })}
        </div>
      </fieldset>
      {/* Das Detailfeld erscheint erst, wenn die Angabe zutrifft. */}
      {gewaehlt.map((f) => (
        <Text
          key={f}
          id={`warn_${f}`}
          label={`${WARN_FLAGS[f]} – was genau?`}
          wert={detail(f)}
          setz={(v) => setzDetail(f, v)}
          platzhalter="z. B. beim Fressen nicht anfassen"
        />
      ))}
    </>
  )
}

function MedPlan({ meds, setz }: { meds: Med[]; setz: (m: Med[]) => void }) {
  // Stabile Schluessel je Zeile: mit dem Index als key wuerde beim Loeschen
  // einer Zeile der Eingabezustand auf die falsche Zeile rutschen.
  const [keys, setKeys] = useState<string[]>(() => meds.map(() => crypto.randomUUID()))
  const aendern = (i: number, teil: Partial<Med>) =>
    setz(meds.map((m, j) => (i === j ? { ...m, ...teil } : m)))
  const entfernen = (i: number) => {
    setz(meds.filter((_, j) => j !== i))
    setKeys((k) => k.filter((_, j) => j !== i))
  }
  const hinzufuegen = () => {
    setz([...meds, { name: '', dose: '', times: [] }])
    setKeys((k) => [...k, crypto.randomUUID()])
  }

  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 font-bold text-[12px] text-muted">💊 Medikationsplan</legend>
      {meds.map((m, i) => (
        <div key={keys[i]} className="mb-1.5 flex gap-1.5">
          <input
            aria-label={`Medikament ${i + 1}`}
            value={m.name}
            placeholder="Medikament"
            onChange={(e) => aendern(i, { name: e.target.value })}
            className={`${eingabe} flex-[2]`}
          />
          <input
            aria-label={`Dosis ${i + 1}`}
            value={m.dose}
            placeholder="Dosis"
            onChange={(e) => aendern(i, { dose: e.target.value })}
            className={`${eingabe} flex-[1.5]`}
          />
          <input
            aria-label={`Zeiten ${i + 1}`}
            value={m.times.join(', ')}
            placeholder="Zeiten"
            onChange={(e) =>
              aendern(i, {
                times: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className={`${eingabe} flex-[1.5]`}
          />
          <button
            type="button"
            aria-label={`Medikament ${i + 1} entfernen`}
            onClick={() => entfernen(i)}
            className="px-1 text-[#c66] text-[16px]"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={hinzufuegen}
        className="mt-1 rounded-xl border-[1.5px] border-line bg-white px-3 py-2 font-bold text-[12.5px]"
      >
        ➕ Medikament hinzufügen
      </button>
      <p className="mt-1 text-[11px] text-muted">
        Zeiten mit Komma trennen, z. B. „8:00, 20:00“. Der Sitter hakt jede Gabe einzeln ab.
      </p>
    </fieldset>
  )
}

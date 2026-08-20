import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { distanzText, NEED_LABELS, type Ort, sucheSitter } from '@/domain/search'
import { SERVICES } from '@/domain/stay'
import { usePets } from '@/features/pets/usePets'
import { geocode } from '@/lib/geocode'
import { useSession } from '@/lib/session'
import { useSitters } from './useSitters'

const UMKREISE = [2, 5, 10, 25] as const

export function SearchScreen() {
  const { session } = useSession()
  const angemeldet = Boolean(session)
  const sitters = useSitters(angemeldet)
  const pets = usePets(angemeldet)
  const navigate = useNavigate()

  const [leistung, setLeistung] = useState<string>('board')
  const [tierart, setTierart] = useState<'dog' | 'cat'>('dog')
  const [ortText, setOrtText] = useState('')
  const [ort, setOrt] = useState<Ort | null>(null)
  const [ortFehler, setOrtFehler] = useState('')
  const [sucht, setSucht] = useState(false)
  const [umkreis, setUmkreis] = useState<number | null>(null)

  // Das Matching bezieht sich auf ein konkretes Tier – sinnvollerweise auf
  // eines der gesuchten Tierart.
  const tier = pets.data?.find((p) => p.species === tierart) ?? pets.data?.[0] ?? null

  async function ortSuchen() {
    setOrtFehler('')
    setSucht(true)
    const treffer = await geocode(ortText)
    setSucht(false)
    if (!treffer) {
      setOrt(null)
      setOrtFehler('Diesen Ort konnte ich nicht finden. Die Suche läuft ohne Umkreis weiter.')
      return
    }
    setOrt(treffer)
  }

  const treffer = sucheSitter(
    sitters.data ?? [],
    { leistung, tierart, ort, umkreisKm: umkreis },
    tier,
  )
  const einheit = SERVICES.find((s) => s.id === leistung)?.unit ?? ''

  return (
    <>
      <h2 className="mb-3 font-extrabold text-[19px]">Sitter finden</h2>

      <div className="mb-2 flex gap-2">
        <input
          aria-label="Ort oder PLZ"
          value={ortText}
          onChange={(e) => setOrtText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ortSuchen()}
          placeholder="Deine PLZ oder dein Ort"
          className="flex-1 rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={ortSuchen}
          disabled={sucht}
          className="rounded-xl border-[1.5px] border-line bg-white px-4 text-[17px] disabled:opacity-50"
        >
          {sucht ? '…' : '📍'}
        </button>
      </div>
      {ort && (
        <p className="mb-2 text-[11.5px] text-brand-dark">
          Ort erkannt – Entfernungen beziehen sich darauf.
        </p>
      )}
      {ortFehler && (
        <p role="alert" className="mb-2 text-[11.5px] text-[#9a4b33]">
          {ortFehler}
        </p>
      )}

      <ChipReihe label="Umkreis">
        {UMKREISE.map((r) => (
          <Chip key={r} an={umkreis === r} onClick={() => setUmkreis(umkreis === r ? null : r)}>
            {r} km
          </Chip>
        ))}
        <Chip an={umkreis === null} onClick={() => setUmkreis(null)}>
          egal
        </Chip>
      </ChipReihe>

      <ChipReihe label="Leistung">
        {SERVICES.map((s) => (
          <Chip key={s.id} an={leistung === s.id} onClick={() => setLeistung(s.id)}>
            {s.label}
          </Chip>
        ))}
      </ChipReihe>

      <ChipReihe label="Tierart">
        <Chip an={tierart === 'dog'} onClick={() => setTierart('dog')}>
          🐕 Hund
        </Chip>
        <Chip an={tierart === 'cat'} onClick={() => setTierart('cat')}>
          🐈 Katze
        </Chip>
      </ChipReihe>

      {sitters.isPending && <p className="text-[13px] text-muted">Lade Sitter…</p>}
      {sitters.isError && (
        <p role="alert" className="text-[13px] text-[#c0392b]">
          Konnte die Sitter nicht laden: {sitters.error.message}
        </p>
      )}

      {sitters.data && treffer.length === 0 && (
        <p className="rounded-2xl border border-line border-dashed p-6 text-center text-[13px] text-muted leading-relaxed">
          Keine Sitter mit diesen Filtern.
          <br />
          Vergrößere den Umkreis oder wähle eine andere Leistung.
        </p>
      )}

      <ul className="space-y-2.5">
        {treffer.map(({ sitter, distanz, passung, preis }) => (
          <li key={sitter.id}>
            <button
              type="button"
              onClick={() => navigate({ to: '/sitter/$sitterId', params: { sitterId: sitter.id } })}
              className="w-full rounded-2xl border border-line bg-white p-3.5 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-light font-extrabold text-[13px] text-brand-dark">
                  L{sitter.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[14px]">
                    {sitter.profiles?.display_name ?? '—'}
                  </span>
                  <span className="block text-[12px] text-muted">
                    {sitter.profiles?.city}
                    {distanz != null && ` · 📍 ${distanzText(distanz)}`}
                  </span>
                  <span className="block text-[12px]">
                    ⭐ <b>{sitter.rating ?? '–'}</b>
                    {sitter.rating_count > 0 && ` (${sitter.rating_count})`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-extrabold text-[15px]">{preis} €</span>
                  <span className="block text-[10.5px] text-muted">pro {einheit}</span>
                  <span className="block font-bold text-[10px] text-accent">0 % Gebühren</span>
                </span>
              </div>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {passung !== null && tier && (
                  <span
                    className={`rounded-full px-2 py-1 font-bold text-[10.5px] ${
                      passung === 100
                        ? 'bg-[#fdf3de] text-[#b27b0a]'
                        : 'bg-brand-light text-brand-dark'
                    }`}
                  >
                    🎯 {passung} % Match mit {tier.name}
                  </span>
                )}
                {(sitter.caps ?? []).slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-brand-light px-2 py-1 font-bold text-[10.5px] text-brand-dark"
                  >
                    {NEED_LABELS[c] ?? c}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function ChipReihe({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-2">
      <legend className="mb-1 font-bold text-[11px] text-muted">{label}</legend>
      <div className="flex gap-1.5 overflow-x-auto pb-1">{children}</div>
    </fieldset>
  )
}

function Chip({
  an,
  onClick,
  children,
}: {
  an: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={an}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border-[1.5px] px-3 py-2 font-semibold text-[12.5px] ${
        an ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'
      }`}
    >
      {children}
    </button>
  )
}

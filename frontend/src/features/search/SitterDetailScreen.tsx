import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { NEED_LABELS } from '@/domain/search'
import { heuteISO, SERVICES, zeitraumText } from '@/domain/stay'
import { bookingsKey } from '@/features/bookings/useBookings'
import { usePets } from '@/features/pets/usePets'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { useSitters } from './useSitters'

/**
 * Sitter-Profil und Anfrage in einem. Die Anfrage steht direkt darunter,
 * statt hinter einem weiteren Sheet – wer bis hierher gescrollt hat, will
 * buchen.
 */
export function SitterDetailScreen() {
  const { sitterId } = useParams({ from: '/sitter/$sitterId' })
  const { session } = useSession()
  const userId = session?.user.id
  const sitters = useSitters(Boolean(session))
  const pets = usePets(Boolean(session))
  const navigate = useNavigate()
  const qc = useQueryClient()

  const sitter = sitters.data?.find((s) => s.id === sitterId)
  const preise = (sitter?.services ?? {}) as Record<string, number>
  const angeboten = SERVICES.filter((s) => typeof preise[s.id] === 'number')

  const [leistung, setLeistung] = useState<string>('')
  const [petId, setPetId] = useState<string>('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [nachricht, setNachricht] = useState(
    'Hallo! Wir suchen Betreuung für die angegebenen Tage. Das Tierprofil wird automatisch mitgeschickt.',
  )

  const anfragen = useMutation({
    mutationFn: async () => {
      if (!userId || !sitter) throw new Error('Nicht angemeldet')
      const start = von || null
      const ende = bis || start
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          owner_id: userId,
          sitter_id: sitter.id,
          pet_id: petId || null,
          service: leistung || angeboten[0]?.id || 'board',
          starts_on: start,
          ends_on: ende,
          date_text: start
            ? zeitraumText({ starts_on: start, ends_on: ende, date_text: '' })
            : 'nach Absprache',
          message: nachricht,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      // Die Nachricht landet zusätzlich im Chat, damit der Sitter dort
      // antworten kann, ohne die Buchung zu öffnen.
      await supabase.from('messages').insert({
        booking_id: data.id,
        sender_id: userId,
        recipient_id: sitter.id,
        body: nachricht,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingsKey('besitzer', userId ?? '') })
      navigate({ to: '/buchungen' })
    },
  })

  if (sitters.isPending) return <p className="text-[13px] text-muted">Lade…</p>
  if (!sitter)
    return <p className="text-[13px] text-[#c0392b]">Diesen Sitter gibt es nicht (mehr).</p>

  const gewaehlt = leistung || angeboten[0]?.id || ''
  const keineTiere = (pets.data?.length ?? 0) === 0

  return (
    <>
      <button
        type="button"
        onClick={() => navigate({ to: '/suchen' })}
        className="mb-3 font-bold text-[13px] text-brand"
      >
        ← Zur Suche
      </button>

      <h2 className="font-extrabold text-[19px]">{sitter.profiles?.display_name}</h2>
      <p className="mb-3 text-[12.5px] text-muted">
        {sitter.profiles?.city} · Level {sitter.level} · ⭐ {sitter.rating ?? '–'}
        {sitter.rating_count > 0 && ` (${sitter.rating_count})`}
      </p>

      {sitter.bio && (
        <p className="mb-3 rounded-2xl border border-line bg-white p-3.5 text-[13px] leading-relaxed">
          {sitter.bio}
        </p>
      )}

      {(sitter.caps ?? []).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(sitter.caps ?? []).map((c) => (
            <span
              key={c}
              className="rounded-full bg-brand-light px-2 py-1 font-bold text-[10.5px] text-brand-dark"
            >
              {NEED_LABELS[c] ?? c}
            </span>
          ))}
        </div>
      )}

      <section className="mb-3 rounded-2xl border border-line bg-white p-4">
        <h3 className="mb-2 text-[13px] font-bold">Preise</h3>
        {angeboten.map((s) => (
          <div
            key={s.id}
            className="flex justify-between border-line border-b py-2 text-[13px] last:border-0"
          >
            <span>{s.label}</span>
            <b>
              {preise[s.id]} € / {s.unit}
            </b>
          </div>
        ))}
        <p className="mt-2 rounded-xl bg-brand-light px-3 py-2 text-[12px] text-brand-dark">
          Der Preis geht zu 100 % an den Sitter. Pawkin: 0 €.
        </p>
      </section>

      <h3 className="mb-2 font-extrabold text-[15px]">Anfrage stellen</h3>

      {keineTiere ? (
        <div className="rounded-2xl border border-line border-dashed p-5 text-center">
          <p className="mb-3 text-[13px] text-muted leading-relaxed">
            Damit {sitter.profiles?.display_name?.split(' ')[0]} alles Wichtige weiß, lege bitte
            zuerst das Profil deines Tieres an – es wird mit der Anfrage übermittelt.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/tier/neu' })}
            className="rounded-xl bg-brand px-4 py-2.5 font-extrabold text-[13px] text-white"
          >
            🐾 Tier anlegen
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            anfragen.mutate()
          }}
          className="rounded-2xl border border-line bg-white p-4"
        >
          <Feld id="b-leistung" label="Leistung">
            <select
              id="b-leistung"
              value={gewaehlt}
              onChange={(e) => setLeistung(e.target.value)}
              className={eingabe}
            >
              {angeboten.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} – {preise[s.id]} €/{s.unit}
                </option>
              ))}
            </select>
          </Feld>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <Feld id="b-von" label="Von">
                <input
                  id="b-von"
                  type="date"
                  min={heuteISO()}
                  value={von}
                  onChange={(e) => {
                    setVon(e.target.value)
                    // Ein Ende vor dem Beginn soll gar nicht erst entstehen.
                    if (bis && e.target.value && bis < e.target.value) setBis(e.target.value)
                  }}
                  className={eingabe}
                />
              </Feld>
            </div>
            <div className="flex-1">
              <Feld id="b-bis" label="Bis">
                <input
                  id="b-bis"
                  type="date"
                  min={von || heuteISO()}
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                  className={eingabe}
                />
              </Feld>
            </div>
          </div>
          <p className="-mt-1 mb-3 text-[11.5px] text-muted">
            {von
              ? zeitraumText({ starts_on: von, ends_on: bis || von, date_text: '' })
              : 'Leer lassen = nach Absprache.'}
          </p>

          <Feld id="b-tier" label="Für welches Tier?">
            <select
              id="b-tier"
              value={petId || pets.data?.[0]?.id || ''}
              onChange={(e) => setPetId(e.target.value)}
              className={eingabe}
            >
              {pets.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.species === 'dog' ? '🐕' : '🐈'} {p.name}
                </option>
              ))}
            </select>
          </Feld>

          <Feld id="b-msg" label="Nachricht">
            <textarea
              id="b-msg"
              rows={3}
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              className={eingabe}
            />
          </Feld>

          {anfragen.isError && (
            <p role="alert" className="mb-2 text-[12.5px] text-[#c0392b]">
              Anfrage fehlgeschlagen: {anfragen.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={anfragen.isPending}
            className="w-full rounded-xl bg-brand py-3.5 font-extrabold text-[14px] text-white disabled:opacity-50"
          >
            {anfragen.isPending ? 'Sende…' : 'Anfrage kostenlos senden'}
          </button>
        </form>
      )}
    </>
  )
}

const eingabe =
  'w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand'

function Feld({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1.5 block font-bold text-[12px] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

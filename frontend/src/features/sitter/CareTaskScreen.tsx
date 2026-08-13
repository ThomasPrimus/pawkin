import { useParams } from '@tanstack/react-router'
import { dayTasks, TASK_ICON, TASK_WORD, taskDone } from '@/domain/care'
import { useBuchungenAlsSitter } from '@/features/bookings/useBookings'
import { CareView } from '@/features/pets/CareView'
import { useSession } from '@/lib/session'
import { useAufgabeAbhaken, useMedikamentGeben, useTageslog } from './useDayLog'

/**
 * Was heute für dieses Tier zu tun ist – abgeleitet aus dem Profil, damit der
 * Sitter im Moment der Betreuung nicht erst ins Profil zurückspringen muss.
 * Jedes Abhaken schreibt einen Log-Eintrag: die Akte entsteht nebenbei,
 * statt getippt zu werden.
 */
export function CareTaskScreen() {
  const { bookingId } = useParams({ from: '/betreuung/$bookingId' })
  const { session } = useSession()
  const userId = session?.user.id ?? ''
  const buchungen = useBuchungenAlsSitter(userId)
  const buchung = buchungen.data?.find((b) => b.id === bookingId)
  const pet = buchung?.pet ?? null
  const log = useTageslog(pet?.id)

  const abhaken = useAufgabeAbhaken(pet?.id ?? '', bookingId, userId)
  const geben = useMedikamentGeben(pet?.id ?? '', bookingId, userId)

  if (buchungen.isPending) return <p className="text-[13px] text-muted">Lade…</p>
  if (!buchung || !pet)
    return <p className="text-[13px] text-[#c0392b]">Diese Betreuung gibt es nicht (mehr).</p>

  const aufgaben = dayTasks(pet)
  const eintraege = log.data?.eintraege ?? []
  const gaben = log.data?.gaben ?? []
  const offen = aufgaben.filter((t) => !taskDone(t, eintraege)).length

  const medZeilen = pet.meds.flatMap((m) =>
    (m.times.length ? m.times : ['heute']).map((zeit) => ({ ...m, zeit })),
  )
  const istGegeben = (name: string, zeit: string) =>
    gaben.some((g) => g.med_name === name && g.due_label === zeit)

  return (
    <>
      <h2 className="mb-3 font-extrabold text-[19px]">
        📓 Pflege: {pet.species === 'dog' ? '🐕' : '🐈'} {pet.name}
      </h2>

      {aufgaben.length > 0 && (
        <section className="mb-3 rounded-2xl border border-line bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold">
            Heute zu tun
            {offen > 0 ? (
              <span className="rounded-full bg-[#fdf3de] px-2 py-1 text-[10.5px] text-[#b27b0a]">
                {offen} offen
              </span>
            ) : (
              <span className="rounded-full bg-brand-light px-2 py-1 text-[10.5px] text-brand-dark">
                ✓ alles erledigt
              </span>
            )}
          </h3>
          {aufgaben.map((t) => {
            const fertig = taskDone(t, eintraege)
            return (
              <div
                key={`${t.kind}-${t.at}-${t.label}`}
                className="flex items-center justify-between gap-3 border-line border-b py-2.5 last:border-0"
              >
                <span className="text-[13px]">
                  {TASK_ICON[t.kind]} {t.at || TASK_WORD[t.kind]}
                  {t.label && <span className="block text-[11px] text-muted">{t.label}</span>}
                </span>
                {fertig ? (
                  <b className="whitespace-nowrap text-brand text-[12px]">✓ erledigt</b>
                ) : (
                  <button
                    type="button"
                    onClick={() => abhaken.mutate(t)}
                    disabled={abhaken.isPending}
                    className="whitespace-nowrap rounded-full bg-brand px-3.5 py-1.5 font-extrabold text-[11.5px] text-white disabled:opacity-50"
                  >
                    Abhaken
                  </button>
                )}
              </div>
            )
          })}
        </section>
      )}

      {medZeilen.length > 0 && (
        <section className="mb-3 rounded-2xl border border-line bg-white p-4">
          <h3 className="mb-2 text-[13px] font-bold">💊 Medikamente heute</h3>
          {medZeilen.map((m) => {
            const fertig = istGegeben(m.name, m.zeit)
            return (
              <div
                key={`${m.name}-${m.zeit}`}
                className="flex items-center justify-between gap-3 border-line border-b py-2.5 last:border-0"
              >
                <span className="text-[13px]">
                  {m.zeit} · {m.name} {m.dose}
                </span>
                {fertig ? (
                  <b className="whitespace-nowrap text-brand text-[12px]">✓ gegeben</b>
                ) : (
                  <button
                    type="button"
                    onClick={() => geben.mutate({ name: m.name, dose: m.dose, zeit: m.zeit })}
                    disabled={geben.isPending}
                    className="whitespace-nowrap rounded-full bg-brand px-3.5 py-1.5 font-extrabold text-[11.5px] text-white disabled:opacity-50"
                  >
                    Jetzt geben
                  </button>
                )}
              </div>
            )
          })}
          <p className="mt-2 text-[11px] text-muted">
            Jede Gabe wird mit Zeitstempel protokolliert – der Besitzer sieht sie im Logbuch.
          </p>
        </section>
      )}

      <h3 className="mb-2 font-extrabold text-[15px]">Das Tierprofil</h3>
      <CareView pet={pet} />
    </>
  )
}

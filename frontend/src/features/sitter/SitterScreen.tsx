import { useNavigate } from '@tanstack/react-router'
import { STATUS_DE, serviceLabel, stayState, zeitraumText } from '@/domain/stay'
import { StayBadge } from '@/features/bookings/StayBadge'
import { useBuchungenAlsSitter, useBuchungStatus } from '@/features/bookings/useBookings'
import { useSession } from '@/lib/session'

export function SitterScreen() {
  const { session } = useSession()
  const userId = session?.user.id
  const buchungen = useBuchungenAlsSitter(userId)
  const status = useBuchungStatus(userId)
  const navigate = useNavigate()

  if (buchungen.isPending) return <p className="text-[13px] text-muted">Lade…</p>
  const liste = buchungen.data ?? []

  return (
    <>
      <h2 className="mb-3 font-extrabold text-[19px]">Dein Sitter-Bereich</h2>
      {liste.length === 0 && (
        <p className="rounded-2xl border border-line border-dashed p-6 text-center text-[13px] text-muted leading-relaxed">
          Noch keine Anfragen.
          <br />
          Teile dein Profil, um Klienten einzuladen!
        </p>
      )}
      <ul className="space-y-2.5">
        {liste.map((b) => (
          <li key={b.id} className="rounded-2xl border border-line bg-white p-3.5">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-bold text-[11px] text-muted">
                {STATUS_DE[b.status] ?? b.status}
              </span>
              <StayBadge booking={b} />
            </div>
            <b className="block text-[14px]">
              {serviceLabel(b.service)} · {zeitraumText(b)}
            </b>
            <span className="block text-[12px] text-muted">
              von {b.profiles?.display_name ?? '—'}
              {b.pet ? ` · ${b.pet.species === 'dog' ? '🐕' : '🐈'} ${b.pet.name}` : ''}
            </span>
            {b.message && (
              <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">„{b.message}“</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {b.status === 'requested' && (
                <>
                  <button
                    type="button"
                    onClick={() => status.mutate({ id: b.id, status: 'confirmed' })}
                    className="rounded-xl bg-brand px-3 py-2 font-bold text-[12.5px] text-white"
                  >
                    ✓ Annehmen
                  </button>
                  <button
                    type="button"
                    onClick={() => status.mutate({ id: b.id, status: 'declined' })}
                    className="rounded-xl border-[1.5px] border-line px-3 py-2 font-bold text-[12.5px]"
                  >
                    Ablehnen
                  </button>
                </>
              )}
              {/* Die Pflege-Ansicht nur waehrend des Aufenthalts anbieten –
                  fuer eine Betreuung in drei Wochen waere sie nur Rauschen. */}
              {b.status === 'confirmed' && b.pet && ['laeuft', 'offen'].includes(stayState(b)) && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({ to: '/betreuung/$bookingId', params: { bookingId: b.id } })
                  }
                  className="rounded-xl bg-accent px-3 py-2 font-bold text-[12.5px] text-white"
                >
                  📓 Pflege
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

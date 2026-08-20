import { STATUS_DE, serviceLabel, zeitraumText } from '@/domain/stay'
import { useSession } from '@/lib/session'
import { StayBadge } from './StayBadge'
import { useBuchungenAlsBesitzer, useBuchungStatus } from './useBookings'

export function BookingsScreen() {
  const { session } = useSession()
  const userId = session?.user.id
  const buchungen = useBuchungenAlsBesitzer(userId)
  const status = useBuchungStatus(userId)

  if (buchungen.isPending) return <p className="text-[13px] text-muted">Lade…</p>
  if (buchungen.isError)
    return (
      <p role="alert" className="text-[13px] text-[#c0392b]">
        Konnte die Buchungen nicht laden: {buchungen.error.message}
      </p>
    )

  const liste = buchungen.data ?? []
  if (liste.length === 0)
    return (
      <p className="rounded-2xl border border-line border-dashed p-6 text-center text-[13px] text-muted leading-relaxed">
        Noch keine Buchungen.
        <br />
        Finde unter „Suchen“ den passenden Sitter! 🐾
      </p>
    )

  return (
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
            {serviceLabel(b.service)} bei {b.sitters?.profiles?.display_name ?? '—'}
          </b>
          <span className="block text-[12px] text-muted">
            {zeitraumText(b)}
            {b.pets ? ` · ${b.pets.species === 'dog' ? '🐕' : '🐈'} ${b.pets.name}` : ''}
          </span>
          {b.status === 'requested' && (
            <button
              type="button"
              onClick={() => status.mutate({ id: b.id, status: 'cancelled' })}
              disabled={status.isPending}
              className="mt-2 rounded-xl border-[1.5px] border-line px-3 py-2 font-bold text-[12.5px] disabled:opacity-50"
            >
              Stornieren
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

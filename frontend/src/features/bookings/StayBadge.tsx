import { type Booking, stayState } from '@/domain/stay'

/** Nur der laufende Aufenthalt bekommt ein Abzeichen – alles andere wäre
 *  Rauschen in einer Liste, die ohnehin danach sortiert ist. */
export function StayBadge({ booking }: { booking: Booking }) {
  if (booking.status !== 'confirmed' || stayState(booking) !== 'laeuft') return null
  return (
    <span className="rounded-full bg-brand-light px-2 py-1 font-bold text-[10.5px] text-brand-dark">
      ● läuft gerade
    </span>
  )
}

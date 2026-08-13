import { useParams } from '@tanstack/react-router'
import { useSession } from '@/lib/session'
import { useGehZu } from '@/routes'
import { CareView } from './CareView'
import { usePets } from './usePets'

export function PetDetailScreen() {
  const { petId } = useParams({ from: '/tier/$petId' })
  const { session } = useSession()
  const pets = usePets(Boolean(session))
  const gehZu = useGehZu()
  const pet = pets.data?.find((p) => p.id === petId)

  if (pets.isPending) return <p className="text-[13px] text-muted">Lade…</p>
  if (!pet) return <p className="text-[13px] text-[#c0392b]">Dieses Tier gibt es nicht (mehr).</p>

  return (
    <>
      <button
        type="button"
        onClick={() => gehZu.liste()}
        className="mb-3 font-bold text-[13px] text-brand"
      >
        ← Meine Tiere
      </button>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-extrabold text-[19px]">
          {pet.species === 'dog' ? '🐕' : '🐈'} {pet.name}
        </h2>
        <button
          type="button"
          onClick={() => gehZu.bearbeiten(pet.id)}
          className="rounded-full bg-brand-light px-3 py-1.5 font-bold text-[12px] text-brand-dark"
        >
          ✏️ Bearbeiten
        </button>
      </div>
      <CareView pet={pet} />
    </>
  )
}

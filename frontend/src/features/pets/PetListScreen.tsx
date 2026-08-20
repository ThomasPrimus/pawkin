import { useSession } from '@/lib/session'
import { useGehZu } from '@/routes'
import { PetList } from './PetList'
import { usePets } from './usePets'

export function PetListScreen() {
  const { session } = useSession()
  const pets = usePets(Boolean(session))
  const gehZu = useGehZu()

  return (
    <>
      <h2 className="mb-3 font-extrabold text-[19px]">Meine Tiere</h2>
      {pets.isPending && <p className="text-[13px] text-muted">Lade…</p>}
      {pets.isError && (
        <p role="alert" className="text-[13px] text-[#c0392b]">
          Konnte die Tiere nicht laden: {pets.error.message}
        </p>
      )}
      {pets.data && <PetList pets={pets.data} onSelect={(p) => gehZu.detail(p.id)} />}
      <button
        type="button"
        onClick={() => gehZu.neu()}
        className="mt-3 w-full rounded-xl bg-brand py-3.5 font-extrabold text-[14px] text-white"
      >
        ➕ Tier anlegen
      </button>
    </>
  )
}

import { careReadiness } from '@/domain/care'
import type { Pet } from '@/domain/pet'

/**
 * Die Tierliste. Der Bereitschafts-Hinweis blockiert nichts – er benennt nur
 * offen, was einem Sitter fehlen würde. Das war die bewusste Entscheidung
 * gegen harte Pflichtfelder.
 */
export function PetList({ pets, onSelect }: { pets: Pet[]; onSelect: (pet: Pet) => void }) {
  if (pets.length === 0) {
    return (
      <p className="rounded-2xl border border-line border-dashed p-6 text-center text-[13px] text-muted leading-relaxed">
        Noch kein Tier angelegt.
        <br />
        Das Tierprofil wird bei jeder Anfrage automatisch an den Sitter übermittelt.
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {pets.map((pet) => {
        const bereit = careReadiness(pet)
        const kopf = [pet.breed, pet.extra.weight ? `${pet.extra.weight} kg` : '']
          .filter(Boolean)
          .join(' · ')
        return (
          <li key={pet.id}>
            <button
              type="button"
              onClick={() => onSelect(pet)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-light text-[22px]">
                {pet.species === 'dog' ? '🐕' : '🐈'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[14px]">{pet.name}</span>
                {kopf && <span className="block text-[12px] text-muted">{kopf}</span>}
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {bereit.gaps.length === 0 ? (
                    <Chip ton="gut">✓ Sitter-bereit</Chip>
                  ) : (
                    <Chip ton="offen">
                      {bereit.done}/{bereit.total} · fehlt: {bereit.gaps[0]?.label}
                      {bereit.gaps.length > 1 ? ` +${bereit.gaps.length - 1}` : ''}
                    </Chip>
                  )}
                  {pet.meds.length > 0 && (
                    <Chip ton="neutral">
                      💊 {pet.meds.length} Medikament{pet.meds.length > 1 ? 'e' : ''}
                    </Chip>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Chip({ ton, children }: { ton: 'gut' | 'offen' | 'neutral'; children: React.ReactNode }) {
  const farben = {
    gut: 'bg-brand-light text-brand-dark',
    offen: 'bg-[#fdf3de] text-[#b27b0a]',
    neutral: 'bg-brand-light text-brand-dark',
  } as const
  return (
    <span className={`rounded-full px-2 py-1 font-bold text-[10.5px] ${farben[ton]}`}>
      {children}
    </span>
  )
}

import { type PetRow, parsePet } from '@/domain/pet'
import { CareView } from '@/features/pets/CareView'

/**
 * Übergangs-Hülle. Die neue App läuft unter /app/ neben der alten, damit wir
 * Screen für Screen umziehen können, ohne dass pawkin.eu je offline ist.
 * Nächster Schritt: Auth und die echte Tierliste aus Supabase.
 */

const beispiel: PetRow = {
  id: 'demo',
  owner_id: 'demo',
  name: 'Bella',
  species: 'dog',
  breed: 'Golden Retriever',
  info: '',
  needs: [],
  vaccinations: 'Tollwut bis 03/2027',
  medication: '',
  food: '',
  quirks: '',
  vet_contact: '',
  emergency_contact: '',
  created_at: new Date().toISOString(),
  meds: [],
  extra: {
    weight: '24',
    food_what: 'Wolfsblut Wild Duck',
    food_amount: '250',
    food_unit: 'g',
    food_freq: '2× täglich',
    food_times: '7:30 und 18:30',
    treats_ok: 'Nur begrenzt',
    food_forbidden: 'Huhn (Allergie)',
    food_where: 'Vorratsraum, blaue Tonne',
    vet_name: 'Dr. Wagner',
    vet_phone: '0512 998877',
    emg_name: 'Klaus (Bruder)',
    emg_phone: '0664 5544',
    vet_budget: '800',
    warn: 'scavenge',
    warn_scavenge: 'Achtung Giftköder im Park',
    leash_where: 'Haken neben der Wohnungstür',
    keys_where: 'Ersatzschlüssel bei Nachbarin Anna, Tür 4',
  },
}

export function App() {
  const pet = parsePet(beispiel)
  return (
    <main className="mx-auto max-w-[480px] px-4 py-6">
      <header className="mb-4">
        <h1 className="font-extrabold text-[22px]">
          Paw<span className="text-accent">kin</span> 🐾
        </h1>
        <p className="text-[12.5px] text-muted">
          Neue Oberfläche · {pet.breed} · {pet.extra.weight} kg
        </p>
      </header>
      <CareView pet={pet} />
    </main>
  )
}

import type { ReactNode } from 'react'
import { feedLine, splitContact } from '@/domain/care'
import { type Pet, WARN_FLAGS, type WarnFlag } from '@/domain/pet'

/**
 * Was ein Sitter über ein Tier sieht: zuerst was schiefgehen kann, dann die
 * Fütterung, dann der Notfall. Leere Angaben fallen weg, statt als "–" Platz
 * zu belegen.
 *
 * Gegenüber der alten Fassung baut das kein HTML mehr aus Strings zusammen –
 * React escaped jeden Wert selbst. Die Stored-XSS-Lücke über photo_url,
 * die es in der String-Variante gab, ist hier gar nicht erst möglich.
 */

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-white p-4">
      <h3 className="mb-2 text-[13px] font-bold">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value?: string | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3 border-line border-b py-2 text-[13px] last:border-0">
      <span className="text-muted">{label}</span>
      <b className="max-w-[60%] text-right">{value}</b>
    </div>
  )
}

function Phone({ icon, name, phone }: { icon: string; name: string; phone: string }) {
  if (!name && !phone) return null
  return (
    <div className="flex items-center justify-between gap-3 border-line border-b py-2 last:border-0">
      <span className="text-[13px]">
        {icon} {name || 'Kontakt'}
      </span>
      {phone && (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, '')}`}
          className="whitespace-nowrap rounded-full bg-brand px-3 py-1.5 font-extrabold text-[11.5px] text-white no-underline"
        >
          📞 {phone}
        </a>
      )}
    </div>
  )
}

const HANDOVER_VIEW = [
  ['food_where', 'Futter & Näpfe'],
  ['leash_where', 'Leine & Geschirr'],
  ['litter_where', 'Katzenklo & Streu'],
  ['carrier_where', 'Transportbox'],
  ['docs_where', 'Impfpass & Papiere'],
  ['keys_where', 'Schlüssel & Zugang'],
  ['where_other', 'Sonstiges'],
] as const

export function CareView({ pet }: { pet: Pet }) {
  const ex = pet.extra
  const feed = feedLine(pet)
  const warns = (ex.warn ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is WarnFlag => s in WARN_FLAGS)

  const vet = { name: ex.vet_name || splitContact(pet.vet_contact).name, phone: ex.vet_phone ?? '' }
  const emg = {
    name: ex.emg_name || splitContact(pet.emergency_contact).name,
    phone: ex.emg_phone ?? '',
  }
  const handover = HANDOVER_VIEW.filter(([key]) => ex[key])

  const hasAnything =
    warns.length > 0 ||
    feed.what ||
    feed.head ||
    pet.meds.length > 0 ||
    vet.phone ||
    emg.phone ||
    handover.length > 0

  if (!hasAnything) {
    return (
      <p className="rounded-2xl border border-line border-dashed p-6 text-center text-[13px] text-muted">
        Für {pet.name} sind noch keine Betreuungs-Infos hinterlegt.
      </p>
    )
  }

  return (
    <div>
      {warns.length > 0 && (
        <div className="mb-3 rounded-xl bg-accent-light px-3 py-2.5 text-[12px] text-[#9a4b33] leading-relaxed">
          <b>Bitte beachten</b>
          {warns.map((w) => (
            <div key={w}>
              {WARN_FLAGS[w]}
              {ex[`warn_${w}`] ? ` – ${ex[`warn_${w}`]}` : ''}
            </div>
          ))}
        </div>
      )}

      {(feed.head || feed.what || feed.times) && (
        <Card title="🥣 Fütterung">
          {feed.head && (
            <div className="mb-1.5 font-extrabold text-[15px] text-brand-dark">{feed.head}</div>
          )}
          <Row label="Futter" value={feed.what} />
          <Row label="Zeiten" value={feed.times} />
          <Row label="Leckerli" value={ex.treats_ok} />
          <Row label="Wo steht das Futter?" value={ex.food_where} />
          {ex.food_forbidden && (
            <div className="mt-2 rounded-xl bg-accent-light px-3 py-2 text-[12px] text-[#9a4b33]">
              ⛔ Auf keinen Fall: {ex.food_forbidden}
            </div>
          )}
          {ex.weight !== undefined && (
            <p className="mt-2 text-[11px] text-muted">
              Zum Einordnen: {pet.name} wiegt {ex.weight} kg.
            </p>
          )}
        </Card>
      )}

      {pet.meds.length > 0 && (
        <Card title="💊 Medikamente">
          {pet.meds.map((m) => (
            <Row
              key={`${m.name}-${m.dose}`}
              label={`${m.name} ${m.dose}`.trim()}
              value={m.times.join(', ') || 'nach Bedarf'}
            />
          ))}
          {ex.med_how && <p className="mt-2 text-[11.5px] text-muted">{ex.med_how}</p>}
        </Card>
      )}

      {(ex.condition || ex.symptoms) && (
        <Card title="🩺 Gesundheit">
          <Row label="Erkrankung" value={ex.condition} />
          <Row label="Worauf achten" value={ex.symptoms} />
          {ex.emergency_signs && (
            <div className="mt-2 rounded-xl bg-accent-light px-3 py-2 text-[12px] text-[#9a4b33]">
              🚨 Sofort Tierarzt bei: {ex.emergency_signs}
            </div>
          )}
        </Card>
      )}

      {(vet.name || vet.phone || emg.name || emg.phone) && (
        <Card title="🚨 Notfall">
          <Phone icon="🩺" name={vet.name} phone={vet.phone} />
          <Row label="Adresse" value={ex.vet_address} />
          <Phone icon="👤" name={emg.name} phone={emg.phone} />
          {ex.vet_budget && (
            <div className="mt-2 rounded-xl bg-brand-light px-3 py-2 text-[12px] text-brand-dark">
              Behandlung bis {ex.vet_budget} € ohne Rückfrage freigegeben.
            </div>
          )}
        </Card>
      )}

      {handover.length > 0 && (
        <Card title="🔑 Wo alles liegt">
          {handover.map(([key, label]) => (
            <Row key={key} label={label} value={ex[key]} />
          ))}
        </Card>
      )}
    </div>
  )
}

// ---------- Aufenthalts-Bericht ----------
// Schliesst die Schleife: Profil → Tagesaufgaben → Bericht.
// Alles, was während einer Buchung protokolliert wurde, trägt deren
// booking_id – daraus entsteht der Bericht, ohne dass jemand etwas
// zusätzlich erfassen muss. Beide Seiten dürfen ihn lesen (RLS: Besitzer
// über pets.owner_id, Sitter über die Buchung bzw. eigene Einträge).

const zeitFmt = ts => new Date(ts).toLocaleString('de-DE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
const tagFmt  = ts => new Date(ts).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
const LOG_WORT = {feed:'Fütterung', walk:'Gassi', note:'Notiz', incident:'Vorfall', weight:'Gewicht'};
const LOG_ICON = {feed:'🥣', walk:'🦮', note:'📝', incident:'🚨', weight:'⚖️'};

window.openStayReport = async (bid) => {
  $('sheet').innerHTML = '<div class="spinner">Bericht wird erstellt…</div>';
  $('ov').classList.add('show');

  const [{data:b}, {data:logs}, {data:meds}] = await Promise.all([
    sb.from('bookings').select('*, pets(*)').eq('id', bid).single(),
    sb.from('pet_log').select('*').eq('booking_id', bid).order('created_at'),
    sb.from('med_log').select('*').eq('booking_id', bid).order('given_at'),
  ]);
  if(!b){ $('sheet').innerHTML = '<div class="empty">Buchung nicht gefunden.</div><button class="ghost" onclick="closeSheet()">Schließen</button>'; return; }

  const eintraege = logs||[], gaben = meds||[];
  const zaehl = t => eintraege.filter(e=>e.type===t).length;
  const name = b.pets?.name || 'Tier';

  // Kennzahlen zuerst – der Besitzer will in zwei Sekunden wissen, ob alles lief.
  const kacheln = [
    ['🥣', zaehl('feed'), 'Mahlzeiten'],
    ...(b.pets?.species==='dog' ? [['🦮', zaehl('walk'), 'Gassi-Runden']] : []),
    ...(gaben.length ? [['💊', gaben.length, 'Medi-Gaben']] : []),
  ];
  const vorfaelle = eintraege.filter(e=>e.type==='incident');
  const notizen   = eintraege.filter(e=>e.type==='note');
  const gewichte  = eintraege.filter(e=>e.type==='weight');

  // Nach Tagen gruppieren, damit ein längerer Aufenthalt lesbar bleibt.
  const proTag = {};
  eintraege.filter(e=>e.type==='feed'||e.type==='walk').forEach(e=>{
    const t = tagFmt(e.created_at); (proTag[t] = proTag[t] || []).push(e);
  });

  $('sheet').innerHTML = `
    <h3>📋 Aufenthalt: ${esc(name)}</h3>
    <p style="font-size:12.5px;color:var(--muted);margin:-6px 0 12px">${esc(SVC_LABEL(b.service))} · ${esc(zeitraumText(b))}</p>

    ${eintraege.length||gaben.length ? `
      <div style="display:flex;gap:8px;margin-bottom:12px">
        ${kacheln.map(([ic,n,l])=>`<div class="section" style="flex:1;margin:0;padding:12px 8px;text-align:center;box-shadow:none;border:1px solid var(--line)">
          <div style="font-size:20px">${ic}</div>
          <div style="font-size:20px;font-weight:800;color:var(--brand-dark)">${n}</div>
          <div style="font-size:10.5px;color:var(--muted)">${l}</div></div>`).join('')}
      </div>` : `<div class="empty">Für diesen Aufenthalt wurde noch nichts protokolliert.</div>`}

    ${vorfaelle.length?`<div class="note" style="margin:0 0 12px"><b>🚨 ${vorfaelle.length} Vorfall${vorfaelle.length>1?'/-fälle':''}</b><br>
      ${vorfaelle.map(v=>`${zeitFmt(v.created_at)} – ${esc(v.body)}`).join('<br>')}</div>`:''}

    ${gaben.length?careCard('💊 Medikamentengaben', gaben.map(g=>
      `<div class="svcrow"><span>${esc(g.med_name)} ${esc(g.dose||'')}${g.due_label?` <span style="color:var(--muted)">(geplant ${esc(g.due_label)})</span>`:''}</span><b>${zeitFmt(g.given_at)}</b></div>`).join('') +
      `<p style="font-size:11px;color:var(--muted);margin-top:7px">Jede Gabe mit Zeitstempel – so, wie es dein Tierarzt sehen will.</p>`):''}

    ${Object.keys(proTag).length?careCard('🗓️ Versorgung pro Tag', Object.entries(proTag).map(([tag, es])=>
      `<div class="svcrow"><span>${esc(tag)}</span><b>${es.map(e=>LOG_ICON[e.type]).join(' ')}</b></div>`).join('')):''}

    ${gewichte.length?careCard('⚖️ Gewicht', gewichte.map(g=>
      `<div class="svcrow"><span>${zeitFmt(g.created_at)}</span><b>${esc(g.body)} kg</b></div>`).join('')):''}

    ${notizen.length?careCard('📝 Notizen vom Sitter', notizen.map(n=>
      `<div style="padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px;line-height:1.5">
        <span style="color:var(--muted);font-size:11px">${zeitFmt(n.created_at)}</span><br>${esc(n.body)}
        ${n.photo_url?`<br><img src="${esc(n.photo_url)}" style="max-width:100%;border-radius:10px;margin-top:6px">`:''}
      </div>`).join('')):''}

    ${eintraege.length||gaben.length?`<button class="primary" onclick="shareStayReport()">Als Text teilen</button>`:''}
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;

  // Für das Teilen den fertigen Text vorhalten, statt das DOM auszulesen.
  window.__stayReport = [
    `📋 Aufenthalts-Bericht: ${name}`,
    `${SVC_LABEL(b.service)} · ${zeitraumText(b)}`,
    '',
    ...kacheln.map(([ic,n,l])=>`${ic} ${n} ${l}`),
    ...(gaben.length?['', '💊 Medikamentengaben:', ...gaben.map(g=>`  ${zeitFmt(g.given_at)} – ${g.med_name} ${g.dose||''}`)]:[]),
    ...(gewichte.length?['', '⚖️ Gewicht:', ...gewichte.map(g=>`  ${zeitFmt(g.created_at)} – ${g.body} kg`)]:[]),
    ...(notizen.length?['', '📝 Notizen:', ...notizen.map(n=>`  ${zeitFmt(n.created_at)} – ${n.body}`)]:[]),
    ...(vorfaelle.length?['', '🚨 Vorfälle:', ...vorfaelle.map(v=>`  ${zeitFmt(v.created_at)} – ${v.body}`)]:[]),
    '', 'Erstellt mit Pawkin 🐾',
  ].join('\n');
};

window.shareStayReport = () => {
  const text = window.__stayReport || '';
  if(navigator.share){ navigator.share({text}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text); toast('Bericht kopiert 📋'); }
};

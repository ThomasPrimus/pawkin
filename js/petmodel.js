// ---------- Tier-Modell: was ein Sitter wirklich braucht ----------
// Einzige Quelle der Wahrheit für die Trennung Kern / bedingt / optional.
// Genutzt vom Besitzer-Formular (pets.js) und der Sitter-Ansicht (sitter.js),
// damit beide Seiten dieselbe Vorstellung von "wichtig" haben.

// Kernangaben: ohne die kann ein Sitter den Alltag nicht sicher bestreiten.
// Reihenfolge = Wichtigkeit. Nichts davon blockiert das Speichern – fehlt
// etwas, sagen wir es offen, statt den Halter auszusperren.
const CARE_CORE = [
  {k:'food_what',   label:'Was gefüttert wird',  jump:'g-feed'},
  {k:'food_amount', label:'Menge pro Mahlzeit',  jump:'g-feed'},
  {k:'food_freq',   label:'Wie oft am Tag',      jump:'g-feed'},
  {k:'weight',      label:'Gewicht',             jump:'g-basic'},
  {k:'vet_phone',   label:'Tierarzt-Telefon',    jump:'g-emg'},
  {k:'emg_phone',   label:'Notfallkontakt',      jump:'g-emg'},
];

// Tierarzt und Notfallkontakt waren früher je ein Freitextfeld ("Dr. Huber 0512 1234").
// Für einen antippbaren Anruf-Button muss die Nummer da raus – sonst steht der
// ganze Text auf dem Button und die Zeile zeigt ihn doppelt.
const splitContact = s => {
  const t = String(s||'').trim();
  const m = t.match(/[+\d][\d\s/().-]{5,}/);
  const phone = m ? m[0].trim() : '';
  const name = phone ? t.replace(phone,'').replace(/[·,\-–]\s*$/,'').trim() : t;
  return {name, phone};
};

// Altdaten: früher steckte die ganze Fütterung in einem Freitextfeld (pets.food)
// und die Zeiten in extra.feeding. Beides gilt weiter als "was" bzw. "wann".
const careVal = (p, k) => {
  const ex = p.extra||{};
  if(k==='food_what')  return (ex.food_what||p.food||'').trim();
  if(k==='food_times') return (ex.food_times||ex.feeding||'').trim();
  if(k==='vet_phone')  return (ex.vet_phone||splitContact(p.vet_contact).phone).trim();
  if(k==='emg_phone')  return (ex.emg_phone||splitContact(p.emergency_contact).phone).trim();
  return String(ex[k]||'').trim();
};
const careGaps = p => CARE_CORE.filter(c => !careVal(p, c.k));
const careReady = p => ({done: CARE_CORE.length - careGaps(p).length, total: CARE_CORE.length, gaps: careGaps(p)});

// Fütterung ist die häufigste Aufgabe im Alltag – deshalb strukturiert
// statt als ein Freitextfeld.
const FEED_FREQ  = ['1× täglich','2× täglich','3× täglich','Zur freien Verfügung'];
const FEED_UNITS = ['g','Dose','Becher','Beutel','Portion'];
const TREAT_RULE = ['Ja, erlaubt','Nur begrenzt','Nein, gar keine'];

// Sicherheitsrelevantes Verhalten. Das sind die Dinge, die einem Sitter
// (oder dem Tier) tatsächlich schaden können, wenn sie niemand sagt –
// nicht Lieblingsspielzeug. Jede Angabe kann ein Detailfeld bekommen.
const WARN_FLAGS = {
  food_guard: '🍖 Futterneid',
  bite:       '😬 Schnappt / beißt',
  escape:     '🏃 Ausbruchskünstler',
  dogs:       '🐕 Reagiert auf Hunde',
  fear:       '⚡ Angst-Trigger',
  scavenge:   '🌿 Frisst vom Boden',
  alone:      '😿 Verträgt kein Alleinsein',
};

// Tierart-abhängig: eine Wohnungskatze braucht keine Leinenfrage,
// ein Hund kein Katzenklo.
const SPECIES_FIELDS = {
  dog: [
    ['walk_times','Gassi-Zeiten','z. B. 7:00 kurz, 13:00 große Runde, 21:00'],
    ['leash','Leine & Geschirr','z. B. Geschirr statt Halsband, zieht anfangs'],
    ['offleash','Freilauf erlaubt?','z. B. nur eingezäunt, Rückruf unsicher'],
  ],
  cat: [
    ['litter_where','Katzenklo – wo?','z. B. Bad, hinter der Tür'],
    ['litter_care','Wie oft säubern?','z. B. 1× täglich, Streu im Schrank daneben'],
    ['outdoor','Freigang?','z. B. reine Wohnungskatze, Balkontür zu lassen'],
  ],
};

// Alles hier drunter ist ehrlich optional: es macht die Betreuung schöner,
// aber niemand ist in Gefahr, wenn es fehlt.
const NICE_GROUPS = [
  {title:'🎾 Spiel & Beschäftigung', fields:[
    ['games','Lieblingsspiele','z. B. Ball holen, Zergel, Suchspiele'],
    ['games_how','So funktionieren sie','z. B. Ball gegen Leckerli tauschen, nie aus dem Maul nehmen'],
    ['toys','Lieblingsspielzeug','was ist dabei / wo liegt es?'],
    ['game_taboo','Was beim Spielen nicht geht','z. B. wildes Raufen macht ihn zu wuschig']]},
  {title:'🏠 Hausregeln', fields:[
    ['bed','Bett & Sofa','z. B. Sofa ja, Bett tabu'],
    ['sleep','Schlafplatz','z. B. eigenes Körbchen im Wohnzimmer'],
    ['table','Vom Tisch füttern?','z. B. niemals – auch wenn er bettelt'],
    ['begging','Betteln & Hochspringen','wie reagieren? z. B. ignorieren']]},
  {title:'🧠 Soziales & Kommandos', fields:[
    ['dogs_ok','Mit anderen Hunden','entspannt / wählerisch / lieber nicht'],
    ['cats_ok','Mit Katzen',''],
    ['kids_ok','Mit Kindern',''],
    ['commands','Bekannte Kommandos (antippen)','','chips'],
    ['commands_other','Weitere Signale','z. B. Pfeife für Rückruf, Handzeichen']]},
  {title:'🩺 Verwaltung', fields:[
    ['chip','Chip-Nummer',''],
    ['neutered','Kastriert / sterilisiert','ja / nein'],
    ['insurance','Tierkrankenversicherung','Anbieter + Polizzennummer']]},
];
const COMMANDS = ['Sitz','Platz','Bleib','Hier / Komm','Aus','Nein','Warte','Fuß','Pfote','Such','Ins Körbchen','Dreh dich'];

// Fütterung in einen Satz, den ein Sitter im Vorbeigehen erfassen kann.
function feedLine(p){
  const ex = p.extra||{};
  const what = careVal(p,'food_what');
  const amt  = [ex.food_amount, ex.food_unit||'g'].filter(Boolean).join(' ');
  const freq = ex.food_freq||'';
  const bits = [];
  if(freq) bits.push(freq);
  if(ex.food_amount) bits.push(amt+' pro Mahlzeit');
  return {head: bits.join(' · '), what, times: careVal(p,'food_times')};
}

// ---------- Pflege-Ansicht ----------
// Dieselbe Darstellung für Sitter und für die Vorschau des Halters:
// zuerst was heute zu tun ist, dann der Notfall, dann Hintergrund.
// Leere Angaben werden weggelassen statt als "–" gezeigt.
const careTel = s => 'tel:'+String(s||'').replace(/[^\d+]/g,'');
const careCard = (title, inner) => `<div class="section" style="box-shadow:none;border:1px solid var(--line)"><h3 style="font-size:13px">${title}</h3>${inner}</div>`;
const careRow = (k, v) => v ? `<div class="svcrow"><span>${k}</span><b style="text-align:right;max-width:60%">${esc(v)}</b></div>` : '';

function careCardsHtml(p){
  const ex = p.extra||{}, isDog = p.species==='dog';
  const f = feedLine(p);
  let out = '';

  // Warnungen zuerst – das ist das, was schiefgehen kann.
  const warns = (ex.warn||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(warns.length){
    out += `<div class="note" style="margin-top:0;margin-bottom:11px"><b>Bitte beachten</b><br>`+
      warns.map(w=>`${WARN_FLAGS[w]||w}${ex['warn_'+w]?' – '+esc(ex['warn_'+w]):''}`).join('<br>')+`</div>`;
  }

  // Fütterung – die häufigste Aufgabe, deshalb ganz oben und ausführlich.
  if(f.what || f.head || f.times){
    let inner = '';
    if(f.head) inner += `<div style="font-size:15px;font-weight:800;color:var(--brand-dark);margin-bottom:6px">${esc(f.head)}</div>`;
    inner += careRow('Futter', f.what) + careRow('Zeiten', f.times) +
             careRow('Leckerli', ex.treats_ok) + careRow('Wo steht das Futter?', ex.food_where);
    if(ex.food_forbidden) inner += `<div class="note" style="margin-top:8px">⛔ Auf keinen Fall: ${esc(ex.food_forbidden)}</div>`;
    if(ex.weight) inner += `<p style="font-size:11px;color:var(--muted);margin-top:7px">Zum Einordnen: ${esc(p.name)} wiegt ${esc(ex.weight)} kg.</p>`;
    out += careCard('🥣 Fütterung', inner);
  }

  // Medikamente nur, wenn es welche gibt.
  if((p.meds||[]).length){
    out += careCard('💊 Medikamente', (p.meds||[]).map(m=>
      `<div class="svcrow"><span>${esc(m.name)} ${esc(m.dose||'')}</span><b>${esc((m.times||[]).join(', ')||'nach Bedarf')}</b></div>`).join('') +
      (ex.med_how?`<p style="font-size:11.5px;color:var(--muted);margin-top:7px">${esc(ex.med_how)}</p>`:''));
  }
  if(ex.condition || ex.symptoms){
    out += careCard('🩺 Gesundheit', careRow('Erkrankung', ex.condition) + careRow('Worauf achten', ex.symptoms) +
      (ex.emergency_signs?`<div class="note" style="margin-top:8px">🚨 Sofort Tierarzt bei: ${esc(ex.emergency_signs)}</div>`:''));
  }

  // Notfall: im Ernstfall muss das ein Fingertipp sein, kein Abtippen.
  const vetName = ex.vet_name || splitContact(p.vet_contact).name, vetTel = careVal(p,'vet_phone');
  const emgName = ex.emg_name || splitContact(p.emergency_contact).name, emgTel = careVal(p,'emg_phone');
  if(vetName || vetTel || emgName || emgTel){
    let inner = '';
    if(vetName || vetTel) inner += `<div class="svcrow"><span>🩺 ${esc(vetName||'Tierarzt')}</span>${vetTel?`<a href="${careTel(vetTel)}" style="background:var(--brand);color:#fff;border-radius:99px;padding:6px 13px;font-size:11.5px;font-weight:800;text-decoration:none">📞 ${esc(vetTel)}</a>`:''}</div>`;
    if(ex.vet_address) inner += careRow('Adresse', ex.vet_address);
    if(emgName || emgTel) inner += `<div class="svcrow"><span>👤 ${esc(emgName||'Notfallkontakt')}</span>${emgTel?`<a href="${careTel(emgTel)}" style="background:var(--brand);color:#fff;border-radius:99px;padding:6px 13px;font-size:11.5px;font-weight:800;text-decoration:none">📞 ${esc(emgTel)}</a>`:''}</div>`;
    if(ex.vet_budget) inner += `<div class="note g" style="margin-top:8px">Behandlung bis ${esc(ex.vet_budget)} € ohne Rückfrage freigegeben.</div>`;
    out += careCard('🚨 Notfall', inner);
  }

  // Tierart-spezifischer Alltag.
  const spec = (SPECIES_FIELDS[p.species]||[]).map(f=>careRow(f[1], ex[f[0]])).join('');
  if(spec.replace(/\s/g,'')) out += careCard(isDog?'🦮 Gassi & Draußen':'🚽 Katzenklo & Freigang', spec);

  // Hintergrund – schön zu wissen, aber weggeklappt.
  let nice = '';
  for(const g of NICE_GROUPS){
    const rows = g.fields.filter(fl=>ex[fl[0]]).map(fl=>careRow(fl[1], ex[fl[0]])).join('');
    if(rows) nice += `<div style="font-size:12px;font-weight:800;color:var(--muted);margin:10px 0 2px">${g.title}</div>`+rows;
  }
  if(p.quirks) nice = careRow('Eigenheiten', p.quirks) + nice;
  if(p.vaccinations) nice = careRow('Impfungen', p.vaccinations) + nice;
  if(nice) out += `<details class="grp"><summary>Mehr über ${esc(p.name)}</summary><div class="inner">${nice}</div></details>`;

  if(!out) out = `<div class="empty">Für ${esc(p.name)} sind noch keine Betreuungs-Infos hinterlegt.</div>`;
  return out;
}

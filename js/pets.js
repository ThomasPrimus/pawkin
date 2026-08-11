// ---------- Tiere ----------
window.addMedRow = () => {
  const div = document.createElement('div');
  div.className = 'medrow'; div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px';
  div.innerHTML = '<input class="m-name" placeholder="Medikament" style="flex:2"><input class="m-dose" placeholder="Dosis" style="flex:1.5"><input class="m-times" placeholder="Zeiten" style="flex:1.5"><button onclick="this.parentNode.remove()" style="border:none;background:none;color:#C66;font-size:16px;cursor:pointer">✕</button>';
  $('medRows').appendChild(div);
};
async function loadDocs(petId){
  const {data} = await sb.from('pet_docs').select('*').eq('pet_id', petId).order('created_at');
  const el = $('docList'); if(!el) return;
  if(!data?.length){el.innerHTML = '<span style="font-size:12px;color:var(--muted)">Noch keine Dokumente.</span>';return;}
  el.innerHTML = data.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px">
    <span style="flex:1">📄 ${esc(d.name)}</span>
    <button onclick="openDoc('${d.path}')" style="border:none;background:var(--brand-light);color:var(--brand-dark);border-radius:99px;padding:5px 10px;font-size:11.5px;font-weight:700;cursor:pointer">Öffnen</button>
    <button onclick="delDoc('${d.id}','${d.path}','${petId}')" style="border:none;background:none;color:#C66;cursor:pointer">✕</button>
  </div>`).join('');
}
window.uploadDoc = async (petId) => {
  const f = $('docFile').files[0]; if(!f) return;
  toast('Lade Dokument hoch…');
  const path = petId+'/'+Date.now()+'-'+f.name.replace(/[^a-zA-Z0-9.]/g,'_');
  const {error} = await sb.storage.from('docs').upload(path, f);
  if(error){toast('Upload-Fehler: '+error.message);return;}
  await sb.from('pet_docs').insert({pet_id: petId, name: f.name, path});
  loadDocs(petId);
  toast('Dokument gespeichert – privat & verschlüsselt abgelegt 📄');
};
window.openDoc = async (path) => {
  const {data, error} = await sb.storage.from('docs').createSignedUrl(path, 300);
  if(error){toast('Fehler: '+error.message);return;}
  window.open(data.signedUrl, '_blank');
};
window.delDoc = async (id, path, petId) => {
  await sb.storage.from('docs').remove([path]);
  await sb.from('pet_docs').delete().eq('id', id);
  loadDocs(petId);
};
function calcAge(dateStr){
  if(!dateStr) return '';
  const b = new Date(dateStr); if(isNaN(b)) return '';
  const now = new Date();
  let months = (now.getFullYear()-b.getFullYear())*12 + (now.getMonth()-b.getMonth());
  if(now.getDate() < b.getDate()) months--;
  if(months < 0) return '';
  if(months < 12) return months + (months===1?' Monat':' Monate');
  const years = Math.floor(months/12);
  return years + (years===1?' Jahr':' Jahre');
}
function vaccWarn(p){
  const due = p.extra?.vacc_due; if(!due) return '';
  const d = new Date(due); if(isNaN(d)) return '';
  const days = Math.round((d - new Date())/86400000);
  if(days < 0) return `<span class="tag" style="background:#FDE4E1;color:#B3402F">💉 Impfung überfällig!</span>`;
  if(days <= 60) return `<span class="tag" style="background:#FDF3DE;color:#B27B0A">💉 Impfung fällig in ${days} Tagen</span>`;
  return '';
}
function renderPets(){
  if(!state.pets.length){$('petlist').innerHTML='<div class="empty">Noch kein Tier angelegt.<br>Das Tierprofil wird bei jeder Anfrage automatisch an den Sitter übermittelt.</div>';return;}
  $('petlist').innerHTML = state.pets.map(p=>{
    const own = p.owner_id === me.id;
    return `
    <div class="card" data-pid="${p.id}">
      <div class="srow" ${own?`style="cursor:pointer" onclick="openPetForm(state.pets.find(x=>x.id==='${p.id}'))"`:''}>
        <div class="avatar" style="font-size:26px">${p.species==='dog'?'🐕':'🐈'}</div>
        <div style="min-width:0"><div class="sname">${esc(p.name)}${own?'':' <span class="tag" style="font-size:9.5px">👨‍👩‍👧 geteilt</span>'}</div>
          <div class="smeta">${esc(p.breed||'')} · ${esc(p.info||'')}</div>
          <div class="stags">${vaccWarn(p)}${(p.meds||[]).length?`<span class="tag">💊 ${p.meds.length} Medikament${p.meds.length>1?'e':''}</span>`:''}${(p.needs||[]).slice(0,2).map(n=>`<span class="tag">${NEED_LABELS[n]}</span>`).join('')}</div>
        </div>
        ${own?'<div class="sprice" style="align-self:center">✏️</div>':''}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <button class="askupd" style="margin-top:0;flex:1;min-width:70px" onclick="openCareOwner('${p.id}')">💊 Heute</button>
        <button class="askupd" style="margin-top:0;flex:1;min-width:70px" onclick="openLogbook('${p.id}')">📓 Logbuch</button>
        <button class="askupd" style="margin-top:0;flex:1;min-width:70px" onclick="shareEmergency('${p.id}')">🆘 Notfall</button>
        <button class="askupd" style="margin-top:0;flex:1;min-width:70px" onclick="openChecklist('${p.id}')">🧳 Checkliste</button>
        ${own?`<button class="askupd" style="margin-top:0;flex:1;min-width:70px" onclick="openFamily('${p.id}')">👨‍👩‍👧 Familie</button>`:''}
      </div>
    </div>`;}).join('');
}
window.openFamily = async (petId) => {
  const p = state.pets.find(x=>x.id===petId);
  let {data:shares} = await sb.from('pet_shares').select('*, profiles!pet_shares_member_id_fkey(display_name)').eq('pet_id', petId);
  shares = shares||[];
  let openF = shares.find(s=>!s.member_id && s.role==='family');
  let openV = shares.find(s=>!s.member_id && s.role==='vet');
  const mkCode = () => Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
  if(!openF){ const {data:ns} = await sb.from('pet_shares').insert({pet_id: petId, code: mkCode(), role:'family'}).select().single(); if(ns){openF=ns;} }
  if(!openV){ const {data:ns} = await sb.from('pet_shares').insert({pet_id: petId, code: mkCode(), role:'vet'}).select().single(); if(ns){openV=ns;} }
  const members = shares.filter(s=>s.member_id);
  $('sheet').innerHTML = `<h3>👨‍👩‍👧 Teilen: ${esc(p.name)}</h3>
    <p style="font-size:12.5px;color:var(--muted);line-height:1.55;margin-bottom:12px">Familie sieht alles und hakt mit ab. Dein Tierarzt bekommt <b>Nur-Lesen-Zugang</b> auf Profil, Logbuch, Gewichtskurve und Medikations-Historie – die perfekte Vorbereitung auf jeden Termin.</p>
    ${members.length?`<div class="fld"><label>Zugriff haben</label>${members.map(m=>`<div class="svcrow"><span>${m.role==='vet'?'🩺':'👤'} ${esc(m.profiles?.display_name||'?')}${m.role==='vet'?' <span class="tag" style="font-size:9px">Tierarzt · nur lesen</span>':''}</span><button onclick="removeShare('${m.id}','${petId}')" style="border:none;background:none;color:#C66;cursor:pointer">Entfernen</button></div>`).join('')}</div>`:''}
    <div class="fld"><label>👨‍👩‍👧 Familien-Code (voller Zugriff)</label>
      <input value="${openF?openF.code:'–'}" readonly onclick="this.select()" style="font-size:19px;letter-spacing:4px;text-align:center;font-weight:800"></div>
    <div class="fld"><label>🩺 Tierarzt-Code (nur lesen)</label>
      <input value="${openV?openV.code:'–'}" readonly onclick="this.select()" style="font-size:19px;letter-spacing:4px;text-align:center;font-weight:800;color:var(--brand-dark)"></div>
    <button class="primary" onclick="shareCode('${esc(p.name)}','${openF?openF.code:''}','family')">Familien-Code teilen</button>
    <button class="primary" style="background:var(--brand-light);color:var(--brand-dark)" onclick="shareCode('${esc(p.name)}','${openV?openV.code:''}','vet')">Tierarzt-Code teilen</button>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
};
window.shareCode = (petName, code, role) => {
  const text = role==='vet'
    ? `Guten Tag! Ich teile die digitale Gesundheitsakte von ${petName} mit Ihnen (Logbuch, Gewichtsverlauf, Medikations-Historie, Dokumente – nur Lesen). Kostenlos registrieren auf Pawkin und unter „Meine Tiere“ diesen Code einlösen: ${code}`
    : `Ich teile ${petName}s Pawkin-Profil mit dir! Registriere dich kostenlos und löse unter „Meine Tiere“ diesen Code ein: ${code}`;
  if(navigator.share){ navigator.share({text}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text); toast('Einladung kopiert 📋'); }
};
window.removeShare = async (id, petId) => { await sb.from('pet_shares').delete().eq('id', id); openFamily(petId); };
window.redeemCode = async () => {
  const code = $('redeemIn').value.trim();
  if(!code){toast('Bitte Code eingeben');return;}
  const {data, error} = await sb.rpc('redeem_share', {share_code: code});
  if(error){toast('Fehler: '+error.message);return;}
  if(!data.ok){toast(data.error||'Code ungültig');return;}
  await loadPets(); renderPets(); closeSheet();
  toast(data.already?'Du bist schon Mitglied ✓':'Willkommen in der Familie! 👨‍👩‍👧');
};
window.openChecklist = (petId) => {
  const p = state.pets.find(x=>x.id===petId); const ex = p.extra||{};
  const items = [
    ['🥣', 'Futter abgemessen'+(ex.feeding?' ('+ex.feeding+')':'')+' + Reserve'],
    ['🦴', 'Leckerlis'+(ex.treats?' – Regel: '+ex.treats:'')],
    ...(p.meds||[]).map(m=>['💊', `${m.name} ${m.dose} – Zeiten: ${(m.times||[]).join(', ')} (Originalverpackung!)`]),
    p.species==='dog'?['🦮','Leine, Geschirr, Halsband + Ersatzleine']:['📦','Transportbox'],
    ['📄','Impfpass / Heimtierausweis'+(''+(p.vaccinations?' ('+p.vaccinations+')':''))],
    ['🧸', ex.toys?'Lieblingsspielzeug: '+ex.toys:'1–2 Lieblingsspielzeuge'],
    ['🛏️','Decke/Körbchen (vertrauter Geruch!)'],
    p.species==='dog'?['💩','Kotbeutel-Vorrat']:['🚽','Katzenstreu + Schaufel'],
    ['🥣','Näpfe (bei Betreuung beim Sitter)'],
    ['🚨','Notfall-Info geteilt? (🆘-Knopf)'],
  ].filter(Boolean);
  $('sheet').innerHTML = `<h3>🧳 Urlaubs-Checkliste: ${esc(p.name)}</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Automatisch aus ${esc(p.name)}s Profil erstellt – zum Abhaken vor der Übergabe.</p>
    ${items.map((it,i)=>`<label class="checkrow" style="margin-bottom:7px"><input type="checkbox"> ${it[0]} <span style="font-size:12.5px;line-height:1.4">${esc(it[1])}</span></label>`).join('')}
    <button class="primary" onclick="copyChecklist('${esc(p.name)}')">Als Text kopieren</button>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
};
window.copyChecklist = (petName) => {
  const text = '🧳 Urlaubs-Checkliste für '+petName+' (Pawkin 🐾)\n\n' +
    Array.from(document.querySelectorAll('#sheet .checkrow span')).map(s=>'☐ '+s.textContent.trim()).join('\n');
  if(navigator.share){ navigator.share({text}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text); }
  toast('Checkliste kopiert 📋');
};
window.openCareOwner = async (petId) => {
  const pet = state.pets.find(x=>x.id===petId); if(!pet) return;
  const today = new Date().toISOString().slice(0,10);
  const {data:givenToday} = await sb.from('med_log').select('med_name, due_label').eq('pet_id', pet.id).gte('given_at', today+'T00:00:00');
  const isGiven = (name, t) => (givenToday||[]).some(g=>g.med_name===name && g.due_label===t);
  const medRows = (pet.meds||[]).flatMap(m=>(m.times&&m.times.length?m.times:['heute']).map(t=>({m, t})));
  $('sheet').innerHTML = `
    <h3>💊 Heute: ${pet.species==='dog'?'🐕':'🐈'} ${esc(pet.name)}</h3>
    ${medRows.length?`<div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">Medikamente heute</h3>
      ${medRows.map((r,i)=>{
        const done = isGiven(r.m.name, r.t);
        return `<div class="svcrow"><span>${esc(r.t)} · ${esc(r.m.name)} ${esc(r.m.dose)}</span>
          ${done?'<b style="color:var(--brand)">✓ gegeben</b>':`<button id="omed_${i}" onclick="giveMedOwn('${petId}','${esc(r.m.name)}','${esc(r.m.dose)}','${esc(r.t)}',${i})" style="border:none;background:var(--brand);color:#fff;border-radius:99px;padding:6px 12px;font-size:11.5px;font-weight:800;cursor:pointer">✓ Gegeben</button>`}
        </div>`;}).join('')}
    </div>`:'<p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Kein Medikationsplan hinterlegt – leg ihn im Tierprofil an, dann kannst du (und jeder Sitter) Gaben hier abhaken.</p>'}
    <div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">⚖️ Gewicht erfassen</h3>
      <div style="display:flex;gap:8px">
        <input id="oWeight" type="number" step="0.1" placeholder="z. B. 28,5" style="flex:1;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font-size:14px;outline:none">
        <button class="primary" style="margin:0;width:auto;padding:10px 16px" onclick="saveWeight('${petId}')">kg ✓</button>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:5px">Regelmäßig erfasst ergibt das den Gewichtsverlauf im Logbuch – Tierärzte lieben das.</p>
    </div>
    <div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">📝 Eintrag ins Logbuch</h3>
      <div class="petpick" style="margin-bottom:10px" id="oLogType">
        <div class="petopt on" data-t="note" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">📝</span>Notiz</div>
        <div class="petopt" data-t="feed" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">🥣</span>Fütterung</div>
        <div class="petopt" data-t="walk" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">🦮</span>Gassi</div>
      </div>
      <div class="fld"><textarea id="oLogBody" rows="2" placeholder="z. B. Tierarztbesuch: alles ok, 28,5 kg"></textarea></div>
      <button class="primary" onclick="saveLogOwn('${petId}')">Speichern</button>
    </div>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('oLogType').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{$('oLogType').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));el.classList.add('on');});
  $('ov').classList.add('show');
};
window.giveMedOwn = async (petId, name, dose, label, i) => {
  const {error} = await sb.from('med_log').insert({pet_id: petId, med_name: name, dose, due_label: label, given_by: me.id});
  if(error){toast('Fehler: '+error.message);return;}
  const btn = $('omed_'+i); if(btn) btn.outerHTML = '<b style="color:var(--brand)">✓ gegeben</b>';
  toast('Abgehakt ✓ – steht im Logbuch');
};
window.saveWeight = async (petId) => {
  const v = parseFloat($('oWeight').value.replace(',','.'));
  if(isNaN(v) || v<=0){toast('Bitte gültiges Gewicht eingeben');return;}
  const {error} = await sb.from('pet_log').insert({pet_id: petId, author_id: me.id, type:'weight', body: String(v)});
  if(error){toast('Fehler: '+error.message);return;}
  $('oWeight').value='';
  toast('⚖️ '+v+' kg erfasst');
};
window.saveLogOwn = async (petId) => {
  const type = $('oLogType').querySelector('.petopt.on')?.dataset.t || 'note';
  const body = $('oLogBody').value.trim();
  if(!body){toast('Bitte kurz beschreiben');return;}
  const {error} = await sb.from('pet_log').insert({pet_id: petId, author_id: me.id, type, body});
  if(error){toast('Fehler: '+error.message);return;}
  $('oLogBody').value='';
  toast('Gespeichert 📓');
};
window.shareEmergency = (petId) => {
  const p = state.pets.find(x=>x.id===petId); if(!p) return;
  const ex = p.extra||{};
  const lines = [
    `🆘 NOTFALL-INFO: ${p.name} (${p.species==='dog'?'Hund':'Katze'}${p.breed?', '+p.breed:''})`,
    p.info?`Alter/Gewicht: ${p.info}`:null,
    ex.chip?`Chip: ${ex.chip}`:null,
    p.medication?`Medikation: ${p.medication}`:null,
    (p.meds||[]).length?`Medikamente: ${p.meds.map(m=>`${m.name} ${m.dose} (${(m.times||[]).join('/')})`).join('; ')}`:null,
    ex.allergies?`Allergien: ${ex.allergies}`:null,
    p.vet_contact?`Tierarzt: ${p.vet_contact}`:null,
    ex.vet_ok?`Tierarztbesuch: ${ex.vet_ok}`:null,
    ex.budget?`Notfall-Budget: ${ex.budget}`:null,
    p.emergency_contact?`Notfallkontakt: ${p.emergency_contact}`:null,
    'Erstellt mit Pawkin 🐾'
  ].filter(Boolean);
  const text = lines.join('\n');
  if(navigator.share){ navigator.share({title:'Notfall-Info '+p.name, text}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text); toast('Notfall-Info kopiert 📋'); }
  $('sheet').innerHTML = `<h3>🆘 Notfall-Info: ${esc(p.name)}</h3>
    <div class="fld"><textarea rows="10" readonly onclick="this.select()">${esc(text)}</textarea></div>
    <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px">Teile das mit Familie, Nachbarn oder wer gerade aufpasst – auch ganz ohne Buchung. Ein Ausdruck davon gehört an den Kühlschrank.</p>
    <button class="primary" onclick="navigator.clipboard && navigator.clipboard.writeText(this.parentNode.querySelector('textarea').value); toast('Kopiert 📋')">Text kopieren</button>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
};
window.openLogbook = async (petId) => {
  const p = state.pets.find(x=>x.id===petId) || {name:'?'};
  $('sheet').innerHTML = `<h3>📓 Logbuch von ${esc(p.name)}</h3><div id="logEntries"><div class="spinner">Lade…</div></div><button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
  const [{data:logs},{data:meds}] = await Promise.all([
    sb.from('pet_log').select('*, profiles!pet_log_author_id_fkey(display_name)').eq('pet_id', petId).order('created_at',{ascending:false}).limit(60),
    sb.from('med_log').select('*, profiles!med_log_given_by_fkey(display_name)').eq('pet_id', petId).order('given_at',{ascending:false}).limit(60)
  ]);
  const TYPE_ICON = {note:'📝', feed:'🥣', walk:'🦮', med:'💊', incident:'🚨', weight:'⚖️'};
  const all = [...(logs||[]).map(l=>({at:l.created_at, icon:TYPE_ICON[l.type]||'📝', who:l.profiles?.display_name, body:l.type==='weight'?l.body+' kg':l.body, photo:l.photo_url, inc:l.type==='incident'})),
               ...(meds||[]).map(m=>({at:m.given_at, icon:'💊', who:m.profiles?.display_name, body:`${m.med_name} ${m.dose} (${m.due_label}) gegeben ✓`}))]
    .sort((a,b)=>new Date(b.at)-new Date(a.at));
  // Gewichtsverlauf-Sparkline
  const weights = (logs||[]).filter(l=>l.type==='weight').map(l=>({at:new Date(l.created_at), v:parseFloat(l.body)})).filter(w=>!isNaN(w.v)).sort((a,b)=>a.at-b.at);
  let spark = '';
  if(weights.length>=2){
    const vs = weights.map(w=>w.v), min=Math.min(...vs), max=Math.max(...vs), pad=(max-min)||1;
    const pts = weights.map((w,i)=>`${10+i*(280/(weights.length-1))},${52-((w.v-min)/pad)*40}`).join(' ');
    spark = `<div class="section" style="box-shadow:none;border:1px solid var(--line);margin-bottom:10px"><h3 style="font-size:13px">⚖️ Gewichtsverlauf</h3>
      <svg viewBox="0 0 300 60" style="width:100%;height:60px"><polyline points="${pts}" fill="none" stroke="#0E7C6B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${weights.map((w,i)=>`<circle cx="${10+i*(280/(weights.length-1))}" cy="${52-((w.v-min)/pad)*40}" r="3" fill="#FF7A59"/>`).join('')}</svg>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${weights[0].v} kg · ${weights[0].at.toLocaleDateString('de-AT',{month:'2-digit',year:'2-digit'})}</span><b style="color:var(--ink)">${weights[weights.length-1].v} kg aktuell</b></div>
    </div>`;
  }
  $('logEntries').innerHTML = (spark||'') + (all.length ? all.map(e=>`
    <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);${e.inc?'background:#FDF0EE;border-radius:10px;padding:9px':''}">
      <div style="font-size:20px">${e.icon}</div>
      <div style="min-width:0;font-size:12.5px;line-height:1.5">
        <b style="font-size:11px;color:var(--muted)">${new Date(e.at).toLocaleString('de-AT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(e.who||'')}</b><br>${esc(e.body)}
        ${e.photo?`<img src="${e.photo}" style="max-width:100%;border-radius:10px;margin-top:6px">`:''}
      </div>
    </div>`).join('') : '<div class="empty">Noch keine Einträge.<br>Jede Betreuung schreibt hier automatisch Geschichte – Fütterungen, Medikamente, Vorfälle, Notizen.</div>');
};
const EXTRA_GROUPS = [
  {title:'🩺 Gesundheit', fields:[
    ['allergies','Allergien / Unverträglichkeiten','z. B. Getreide, Bienenstiche'],
    ['neutered','Kastriert / sterilisiert','ja / nein'],
    ['chip','Chip-Nummer',''],
    ['insurance','Tierkrankenversicherung','Anbieter + Polizzennummer']]},
  {title:'🍽️ Ernährung & Routine', fields:[
    ['feeding','Fütterungszeiten','z. B. 7:00 und 18:00'],
    ['treats','Leckerlis erlaubt?','was und wie viel'],
    ['likes','Lieblings-Obst & -Gemüse','z. B. Karotten, Gurke, Apfel (ohne Kerne)'],
    ['nofood','Verbotene Lebensmittel','z. B. alles Gewürzte, Käse – zusätzlich zu den üblichen Tabus'],
    ['alone','Alleinsein','wie lange geht gut?']]},
  {title:'🦮 Gassi & Draußen', fields:[
    ['walktimes','Gassi-Zeiten','z. B. 7:00 kurz, 13:00 große Runde, 21:00 Pipirunde'],
    ['watchout','Worauf aufpassen?','z. B. reagiert auf andere Rüden, jagt Katzen'],
    ['leash','Leinenverhalten','z. B. zieht anfangs stark, bitte Geschirr statt Halsband'],
    ['offleash','Freilauf erlaubt?','z. B. nur in eingezäunten Zonen, Rückruf unsicher'],
    ['scavenge','Frisst vom Boden?','z. B. ja, leider – Achtung Giftköder!'],
    ['pickup','Wenn er etwas ins Maul nimmt','z. B. ruhig bleiben, „Aus!“-Kommando, gegen Leckerli tauschen – nie hinterherjagen oder aus dem Maul reißen']]},
  {title:'🎾 Spiel & Beschäftigung', fields:[
    ['games','Lieblingsspiele','z. B. Ball holen, Zergel, Suchspiele, Intelligenzspielzeug'],
    ['games_how','So funktionieren sie','z. B. Ball immer gegen Leckerli tauschen, nie aus dem Maul nehmen; Suchspiel: Leckerli verstecken, „Such!“ sagen'],
    ['toys','Lieblingsspielzeug','was ist dabei / wo liegt es?'],
    ['game_taboo','Was beim Spielen gar nicht geht','z. B. wildes Raufen, Jagdspiele – macht ihn zu wuschig']]},
  {title:'🏠 Hausregeln & Erziehung', fields:[
    ['table','Vom Tisch füttern?','z. B. niemals – auch wenn er bettelt!'],
    ['bed','Bett & Sofa','z. B. Sofa ja, Bett tabu'],
    ['sleep','Schlafplatz','z. B. eigenes Körbchen im Wohnzimmer'],
    ['begging','Betteln & Hochspringen','wie reagieren? z. B. ignorieren, nicht schimpfen'],
    ['other_rules','Weitere Regeln','was zuhause gilt, soll auch beim Sitter gelten']]},
  {title:'🧠 Verhalten & Soziales', fields:[
    ['dogs_ok','Verhalten mit Hunden','entspannt / wählerisch / lieber nicht'],
    ['cats_ok','Verhalten mit Katzen',''],
    ['kids_ok','Verhalten mit Kindern',''],
    ['fears','Ängste & Trigger','z. B. Gewitter, Staubsauger, Männer mit Hut'],
    ['commands','Bekannte Kommandos (antippen)','','chips'],
    ['commands_other','Weitere Kommandos & Signale','z. B. Pfeife für Rückruf, Handzeichen für Platz']]},
  {title:'🚨 Notfall-Vollmachten', fields:[
    ['vet_ok','Tierarztbesuch erlaubt?','ja, im Zweifel immer'],
    ['budget','Notfall-Budget','bis zu welchem Betrag darf ohne Rückfrage behandelt werden?']]},
];
const COMMANDS = ['Sitz','Platz','Bleib','Hier / Komm','Aus','Nein','Warte','Fuß','Pfote','Such','Ins Körbchen','Dreh dich'];
window.openPetForm = (p) => {
  const isNew = !p; p = p||{species:'dog', needs:[], extra:{}};
  const ex = p.extra||{};
  const grpHtml = EXTRA_GROUPS.map((g,gi)=>{
    const filled = g.fields.filter(f=>ex[f[0]]).length;
    return `<details class="grp"${filled?' open':''}><summary>${g.title}${filled?` <span style="color:var(--brand);font-size:11px;font-weight:700;margin-left:auto;margin-right:8px">${filled} ausgefüllt</span>`:''}</summary><div class="inner">`+
      g.fields.map(f=>{
        if(f[3]==='chips'){
          const sel = (ex[f[0]]||'').split(', ').filter(Boolean);
          return `<div class="fld"><label>${f[1]}</label><div class="stags cmdchips" data-k="${f[0]}">${COMMANDS.map(c=>`<span class="tag ${sel.includes(c)?'':'off'}" data-c="${c}" style="cursor:pointer;font-size:12px;padding:7px 11px">${c}</span>`).join('')}</div></div>`;
        }
        return `<div class="fld"><label>${f[1]}</label><input class="pextra" data-k="${f[0]}" value="${esc(ex[f[0]]||'')}" placeholder="${f[2]}"></div>`;
      }).join('')+
    `</div></details>`;
  }).join('');
  $('sheet').innerHTML = `
    <h3>${isNew?'Tier anlegen':'Tier bearbeiten'}</h3>
    <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px">Nur <b>Name und Tierart</b> sind Pflicht. Alles andere ist freiwillig – aber je mehr du ergänzt, desto besser kann sich dein Sitter kümmern.</p>
    <div class="fld"><label>Name *</label><input id="pName" value="${esc(p.name||'')}"></div>
    <div class="fld"><label>Tierart *</label>
      <div class="petpick">
        <div class="petopt ${p.species==='dog'?'on':''}" data-sp="dog"><span class="e">🐕</span>Hund</div>
        <div class="petopt ${p.species==='cat'?'on':''}" data-sp="cat"><span class="e">🐈</span>Katze</div>
      </div></div>
    <div class="fld"><label>Rasse</label><input id="pBreed" list="breedlist" value="${esc(p.breed||'')}" placeholder="Tippen für Vorschläge, z. B. Labrador-Mix"></div>
    <div style="display:flex;gap:10px">
      <div class="fld" style="flex:1"><label>Geburtstag 🎂</label><input id="pBirth" type="date" value="${esc(p.extra?.birthdate||'')}"></div>
      <div class="fld" style="flex:1"><label>Gewicht (kg)</label><input id="pWeight" type="number" step="0.1" min="0" value="${esc(p.extra?.weight||'')}" placeholder="z. B. 28"></div>
    </div>
    <div class="fld"><label>Betreuungs-Bedürfnisse (steuern das Matching)</label>
      <div class="stags" id="pNeeds">${Object.keys(NEED_LABELS).map(n=>`<span class="tag ${p.needs?.includes(n)?'':'off'}" data-n="${n}" style="cursor:pointer;font-size:12px;padding:7px 11px">${NEED_LABELS[n]}</span>`).join('')}</div></div>
    <div class="fld"><label>Impfungen</label><input id="pVacc" value="${esc(p.vaccinations||'')}" placeholder="z. B. Tollwut bis 03/2027"></div>
    <div class="fld"><label>Nächste Impfauffrischung fällig (für Erinnerung)</label><input id="pVaccDue" type="date" value="${esc((p.extra||{}).vacc_due||'')}"></div>
    <div class="fld"><label>💊 Medikationsplan (mit Uhrzeiten – Sitter hakt jede Gabe ab)</label>
      <div id="medRows">${(p.meds||[]).map(m=>`<div class="medrow" style="display:flex;gap:6px;margin-bottom:6px"><input class="m-name" placeholder="Medikament" value="${esc(m.name)}" style="flex:2"><input class="m-dose" placeholder="Dosis" value="${esc(m.dose)}" style="flex:1.5"><input class="m-times" placeholder="Zeiten" value="${esc((m.times||[]).join(', '))}" style="flex:1.5"><button onclick="this.parentNode.remove()" style="border:none;background:none;color:#C66;font-size:16px;cursor:pointer">✕</button></div>`).join('')}</div>
      <button class="askupd" style="margin-top:2px" onclick="addMedRow()">➕ Medikament hinzufügen</button>
      <p style="font-size:11px;color:var(--muted);margin-top:4px">Zeiten mit Komma trennen, z. B. „8:00, 20:00“</p>
    </div>
    <div class="fld"><label>Sonstige Medikation / Hinweise</label><input id="pMed" value="${esc(p.medication||'')}" placeholder="z. B. keine"></div>
    <div class="fld"><label>Futter</label><input id="pFood" value="${esc(p.food||'')}"></div>
    <div class="fld"><label>Eigenheiten</label><textarea id="pQuirks" rows="2">${esc(p.quirks||'')}</textarea></div>
    <div class="fld"><label>Tierarzt</label><input id="pVet" value="${esc(p.vet_contact||'')}"></div>
    <div class="fld"><label>Notfallkontakt</label><input id="pEmg" value="${esc(p.emergency_contact||'')}"></div>
    ${!isNew?`<div class="fld"><label>📄 Dokumente (Impfpass, Heimtierausweis, Befunde …)</label>
      <div id="docList"><span style="font-size:12px;color:var(--muted)">Lade…</span></div>
      <input type="file" id="docFile" style="display:none" onchange="uploadDoc('${p.id}')">
      <button class="askupd" style="margin-top:6px" onclick="$('docFile').click()">📎 Dokument hochladen</button>
      <p style="font-size:11px;color:var(--muted);margin-top:4px">Privat gespeichert – nur du und dein gebuchter Sitter können sie öffnen.</p>
    </div>`:'<p style="font-size:11.5px;color:var(--muted);margin-bottom:10px">📄 Dokumente (Impfpass etc.) kannst du hochladen, sobald das Tier angelegt ist.</p>'}
    <p style="font-size:12.5px;font-weight:700;color:var(--muted);margin:14px 0 8px">Mehr Details (alles optional):</p>
    ${grpHtml}
    <button class="primary" id="pSave">${isNew?'Anlegen':'Speichern'}</button>
    <button class="ghost" onclick="closeSheet()">Abbrechen</button>`;
  if(!isNew) loadDocs(p.id);
  $('sheet').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{$('sheet').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));el.classList.add('on');});
  $('pNeeds').querySelectorAll('.tag').forEach(t=>t.onclick=()=>t.classList.toggle('off'));
  $('sheet').querySelectorAll('.cmdchips .tag').forEach(t=>t.onclick=()=>t.classList.toggle('off'));
  $('pSave').onclick = async () => {
    const rec = {
      owner_id: me.id,
      name: $('pName').value.trim(),
      species: $('sheet').querySelector('.petopt.on')?.dataset.sp||'dog',
      breed: $('pBreed').value.trim(),
      info: [calcAge($('pBirth').value), $('pWeight').value.trim() ? $('pWeight').value.trim()+' kg' : ''].filter(Boolean).join(' · '),
      needs: [...$('pNeeds').querySelectorAll('.tag:not(.off)')].map(t=>t.dataset.n),
      vaccinations: $('pVacc').value.trim(), medication: $('pMed').value.trim(),
      food: $('pFood').value.trim(), quirks: $('pQuirks').value.trim(),
      vet_contact: $('pVet').value.trim(), emergency_contact: $('pEmg').value.trim(),
      extra: Object.fromEntries(Array.from($('sheet').querySelectorAll('.pextra')).map(i=>[i.dataset.k, i.value.trim()]).filter(kv=>kv[1]))
    };
    $('sheet').querySelectorAll('.cmdchips').forEach(el=>{
      const sel = Array.from(el.querySelectorAll('.tag:not(.off)')).map(t=>t.dataset.c);
      if(sel.length) rec.extra[el.dataset.k] = sel.join(', ');
    });
    if($('pVaccDue').value) rec.extra.vacc_due = $('pVaccDue').value;
    if($('pBirth').value) rec.extra.birthdate = $('pBirth').value;
    if($('pWeight').value.trim()) rec.extra.weight = $('pWeight').value.trim();
    rec.meds = Array.from($('medRows').querySelectorAll('.medrow')).map(r=>({
      name: r.querySelector('.m-name').value.trim(),
      dose: r.querySelector('.m-dose').value.trim(),
      times: r.querySelector('.m-times').value.split(',').map(t=>t.trim()).filter(Boolean)
    })).filter(m=>m.name);
    if(!rec.name){toast('Bitte einen Namen angeben');return;}
    const q = isNew ? sb.from('pets').insert(rec) : sb.from('pets').update(rec).eq('id', p.id);
    const {error} = await q;
    if(error){toast('Fehler: '+error.message);return;}
    await loadPets(); renderPets(); renderResults(); closeSheet();
    toast(isNew?`${rec.name} angelegt 🐾`:'Gespeichert');
  };
  $('ov').classList.add('show');
};


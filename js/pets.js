// ---------- Tiere ----------
window.addMedRow = () => $('medRows').insertAdjacentHTML('beforeend', medRowHtml());
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
// Zeigt offen, ob ein Sitter mit diesem Profil arbeiten könnte. Blockiert nichts –
// wer nichts ausfüllt, kann trotzdem buchen, sieht aber woran es fehlt.
function readyTag(p){
  const r = careReady(p);
  if(!r.gaps.length) return `<span class="tag" style="background:var(--brand-light);color:var(--brand-dark)">✓ Sitter-bereit</span>`;
  return `<span class="tag" style="background:#FDF3DE;color:#B27B0A">${r.done}/${r.total} · fehlt: ${esc(r.gaps[0].label)}${r.gaps.length>1?' +'+(r.gaps.length-1):''}</span>`;
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
          <div class="stags">${readyTag(p)}${vaccWarn(p)}${(p.meds||[]).length?`<span class="tag">💊 ${p.meds.length} Medikament${p.meds.length>1?'e':''}</span>`:''}${(p.needs||[]).slice(0,2).map(n=>`<span class="tag">${NEED_LABELS[n]}</span>`).join('')}</div>
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
  const f = feedLine(p);
  const items = [
    ['🥣', 'Futter abgemessen'+(f.head?' ('+f.head+')':'')+' + Reserve'],
    ['🦴', 'Leckerlis'+(ex.treats_ok?' – Regel: '+ex.treats_ok:'')],
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
  // Füttern ist die häufigste Aufgabe des Tages – die stand hier bisher nicht drin.
  const {data:fedToday} = await sb.from('pet_log').select('body, created_at').eq('pet_id', pet.id).eq('type','feed').gte('created_at', today+'T00:00:00');
  const f = feedLine(pet);
  $('sheet').innerHTML = `
    <h3>Heute: ${pet.species==='dog'?'🐕':'🐈'} ${esc(pet.name)}</h3>
    <div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">🥣 Fütterung</h3>
      ${f.head||f.what?`<div style="font-size:13px;line-height:1.5;margin-bottom:8px">${f.head?`<b>${esc(f.head)}</b><br>`:''}${esc(f.what||'')}${f.times?`<br><span style="color:var(--muted)">Zeiten: ${esc(f.times)}</span>`:''}</div>`
        :'<p style="font-size:12px;color:var(--muted);margin-bottom:8px">Noch kein Fütterungsplan hinterlegt – trag ihn im Tierprofil ein.</p>'}
      <div class="svcrow"><span>Heute schon gefüttert</span><b>${(fedToday||[]).length}×</b></div>
      <button class="primary" style="margin-top:8px" onclick="logFeed('${petId}')">🥣 Fütterung abhaken</button>
    </div>
    ${medRows.length?`<div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">Medikamente heute</h3>
      ${medRows.map((r,i)=>{
        const done = isGiven(r.m.name, r.t);
        return `<div class="svcrow"><span>${esc(r.t)} · ${esc(r.m.name)} ${esc(r.m.dose)}</span>
          ${done?'<b style="color:var(--brand)">✓ gegeben</b>':`<button id="omed_${i}" onclick="giveMedOwn('${petId}','${esc(r.m.name)}','${esc(r.m.dose)}','${esc(r.t)}',${i})" style="border:none;background:var(--brand);color:#fff;border-radius:99px;padding:6px 12px;font-size:11.5px;font-weight:800;cursor:pointer">✓ Gegeben</button>`}
        </div>`;}).join('')}
    </div>`:(pet.extra?.health_status==='condition'
      ?'<p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Als krank markiert, aber kein Medikationsplan hinterlegt – trag ihn im Tierprofil ein, dann kann jeder Sitter die Gaben abhaken.</p>'
      :'')}
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
window.logFeed = async (petId) => {
  const pet = state.pets.find(x=>x.id===petId);
  const f = pet ? feedLine(pet) : {head:'',what:''};
  const body = [f.head, f.what].filter(Boolean).join(' · ') || 'gefüttert';
  const {error} = await sb.from('pet_log').insert({pet_id: petId, author_id: me.id, type:'feed', body});
  if(error){toast('Fehler: '+error.message);return;}
  toast('🥣 Fütterung abgehakt');
  openCareOwner(petId);
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
        ${e.photo?`<img src="${esc(e.photo)}" style="max-width:100%;border-radius:10px;margin-top:6px">`:''}
      </div>
    </div>`).join('') : '<div class="empty">Noch keine Einträge.<br>Jede Betreuung schreibt hier automatisch Geschichte – Fütterungen, Medikamente, Vorfälle, Notizen.</div>');
};
// ---------- Tier anlegen / bearbeiten ----------
// Aufbau folgt der Wichtigkeit für den Sitter, nicht der Datenbank:
// Steckbrief → Fütterung → Gesundheit → Notfall → Sicherheit → Tierart → Rest.
// Gesperrt wird nichts; fehlende Kernangaben werden oben offen benannt.
const fGrp = (id, title, inner, open) =>
  `<details class="grp" id="${id}"${open?' open':''}><summary>${title}</summary><div class="inner">${inner}</div></details>`;
const fFld = (label, inner, hint) =>
  `<div class="fld"><label>${label}</label>${inner}${hint?`<p style="font-size:11px;color:var(--muted);margin-top:4px">${hint}</p>`:''}</div>`;
const fInp = (k, val, ph) => `<input class="pextra" data-k="${k}" value="${esc(val||'')}" placeholder="${ph||''}">`;
const fChips = (k, opts, cur) =>
  `<div class="chips pchips" data-k="${k}">${opts.map(o=>`<span class="chip ${cur===o?'on':''}" data-v="${esc(o)}">${esc(o)}</span>`).join('')}</div>`;

window.openPetForm = (p) => {
  // Kein p oder eins ohne id = neues Tier. Die Vorschau kommt mit einem
  // unvollständigen Entwurf zurück, deshalb reicht "!p" hier nicht.
  const isNew = !p || !p.id;
  p = p||{species:'dog', needs:[], extra:{}};
  window.__petId = p.id;
  const ex = p.extra||{};
  const nm = p.name || 'dein Tier';
  const warns = (ex.warn||'').split(',').map(s=>s.trim()).filter(Boolean);
  const sick = ex.health_status === 'condition' || (p.meds||[]).length > 0;

  // 1 · Steckbrief
  const gBasic = fFld('Name *', `<input id="pName" value="${esc(p.name||'')}">`) +
    fFld('Tierart *', `<div class="petpick">
      <div class="petopt ${p.species==='dog'?'on':''}" data-sp="dog"><span class="e">🐕</span>Hund</div>
      <div class="petopt ${p.species==='cat'?'on':''}" data-sp="cat"><span class="e">🐈</span>Katze</div></div>`) +
    `<div style="display:flex;gap:10px">
      <div style="flex:1">${fFld('Gewicht (kg)', `<input id="pWeight" type="number" step="0.1" min="0" value="${esc(ex.weight||'')}" placeholder="z. B. 28">`)}</div>
      <div style="flex:1">${fFld('Geburtstag', `<input id="pBirth" type="date" value="${esc(ex.birthdate||'')}">`)}</div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin:-6px 0 10px">Das Gewicht hilft dem Sitter, die Futtermenge und Medikamenten-Dosis einzuordnen.</p>` +
    fFld('Rasse', `<input id="pBreed" list="breedlist" value="${esc(p.breed||'')}" placeholder="z. B. Labrador-Mix">`) +
    // Steuert, welche Sitter gefunden werden. "Medikamentengabe" fragen wir
    // nicht mehr ab – das ergibt sich aus dem Gesundheits-Abschnitt.
    fFld('Was muss dein Sitter können?',
      `<div class="chips" id="pNeeds">${Object.keys(NEED_LABELS).filter(n=>n!=='med').map(n=>
        `<span class="chip ${p.needs?.includes(n)?'on':''}" data-n="${n}">${NEED_LABELS[n]}</span>`).join('')}</div>`);

  // 2 · Fütterung – der Alltag. Früher ein einziges Freitextfeld.
  const gFeed =
    fFld('Was bekommt ' + esc(nm) + '?', fInp('food_what', careVal(p,'food_what'), 'z. B. Royal Canin Adult, trocken')) +
    `<div style="display:flex;gap:10px">
      <div style="flex:1">${fFld('Menge pro Mahlzeit', fInp('food_amount', ex.food_amount, 'z. B. 200'))}</div>
      <div style="flex:1">${fFld('Einheit', fChips('food_unit', FEED_UNITS, ex.food_unit||'g'))}</div>
    </div>` +
    fFld('Wie oft am Tag?', fChips('food_freq', FEED_FREQ, ex.food_freq)) +
    fFld('Um welche Zeit?', fInp('food_times', careVal(p,'food_times'), 'z. B. 7:00 und 18:00')) +
    fFld('Leckerli erlaubt?', fChips('treats_ok', TREAT_RULE, ex.treats_ok)) +
    fFld('Verboten / Unverträglichkeiten', fInp('food_forbidden', ex.food_forbidden || ex.allergies || ex.nofood, 'z. B. Getreide, alles Gewürzte'),
        'Wird dem Sitter als Warnung angezeigt.') +
    fFld('Wo steht das Futter?', fInp('food_where', ex.food_where, 'z. B. Speis, linkes Regal'),
        'Klingt banal – ist für den Sitter am ersten Tag Gold wert.');

  // 3 · Gesundheit mit Weiche: gesundes Tier bekommt den Medikationsplan gar nicht zu sehen.
  const gHealth = fFld('Wie geht es ' + esc(nm) + '?', `<div class="petpick" id="pHealth">
      <div class="petopt ${sick?'':'on'}" data-h="healthy" style="padding:11px 6px;font-size:12px"><span class="e" style="font-size:20px">💚</span>Gesund</div>
      <div class="petopt ${sick?'on':''}" data-h="condition" style="padding:11px 6px;font-size:12px"><span class="e" style="font-size:20px">💊</span>Krank / Medikamente</div>
    </div>`) +
    `<div id="healthBox" style="display:${sick?'block':'none'}">` +
      fFld('Was hat ' + esc(nm) + '?', fInp('condition', ex.condition, 'z. B. Epilepsie, Arthrose')) +
      fFld('💊 Medikationsplan', `<div id="medRows">${(p.meds||[]).map(m=>medRowHtml(m)).join('')}</div>
        <button class="askupd" style="margin-top:2px" onclick="addMedRow()">➕ Medikament hinzufügen</button>`,
        'Zeiten mit Komma trennen, z. B. „8:00, 20:00“. Der Sitter hakt jede Gabe einzeln ab.') +
      fFld('Wie wird es gegeben?', fInp('med_how', ex.med_how, 'z. B. in Leberwurst versteckt, nach dem Fressen')) +
      fFld('Worauf soll der Sitter achten?', fInp('symptoms', ex.symptoms, 'z. B. Humpeln, viel Trinken')) +
      fFld('Sofort zum Tierarzt bei', fInp('emergency_signs', ex.emergency_signs, 'z. B. Krampfanfall über 2 Minuten')) +
    `</div>` +
    fFld('Impfung gültig bis', `<input id="pVaccDue" type="date" value="${esc(ex.vacc_due||'')}">`) +
    fFld('Impfungen (Details)', `<input id="pVacc" value="${esc(p.vaccinations||'')}" placeholder="z. B. Tollwut bis 03/2027">`);

  // 4 · Notfall – aus der letzten Klappgruppe nach vorne geholt und aufgeteilt,
  // damit der Sitter im Ernstfall auf eine Nummer tippen kann.
  const gEmg =
    fFld('Tierarzt – Name', fInp('vet_name', ex.vet_name || splitContact(p.vet_contact).name, 'z. B. Tierklinik Dr. Müller')) +
    fFld('Tierarzt – Telefon', fInp('vet_phone', careVal(p,'vet_phone'), 'z. B. +43 660 1234567')) +
    fFld('Tierarzt – Adresse', fInp('vet_address', ex.vet_address, 'Straße, Ort')) +
    fFld('Notfallkontakt – Name', fInp('emg_name', ex.emg_name || splitContact(p.emergency_contact).name, 'jemand in der Nähe, der einspringen kann')) +
    fFld('Notfallkontakt – Telefon', fInp('emg_phone', careVal(p,'emg_phone'), '')) +
    fFld('Behandlung ohne Rückfrage bis (€)', fInp('vet_budget', ex.vet_budget || ex.budget, 'z. B. 500'),
        'Ohne diese Freigabe muss der Sitter im Notfall auf deinen Rückruf warten.');

  // 5 · Sicherheit: nur Risiken. Detailfeld erscheint erst, wenn angetippt.
  const gSafe = fFld('Trifft etwas davon zu? (antippen)',
    `<div class="chips" id="pWarn">${Object.entries(WARN_FLAGS).map(([k,l])=>
      `<span class="chip ${warns.includes(k)?'on':''}" data-w="${k}">${l}</span>`).join('')}</div>`) +
    `<div id="warnDetails">${warns.map(w=>warnDetailHtml(w, ex['warn_'+w])).join('')}</div>` +
    fFld('Sonstige Eigenheiten', `<textarea id="pQuirks" rows="2" placeholder="was man sonst über ${esc(nm)} wissen sollte">${esc(p.quirks||'')}</textarea>`);

  // 6 · Tierart-spezifisch
  const spf = SPECIES_FIELDS[p.species] || SPECIES_FIELDS.dog;
  const gSpecies = spf.map(f=>fFld(f[1], fInp(f[0], ex[f[0]], f[2]))).join('');

  // 7 · Übergabe – "wo liegt was", das Wichtigste am ersten Tag
  const gHand = handoverForm(p.species).map(f=>fFld(f[1], fInp(f[0], ex[f[0]], f[2]))).join('');

  // 8 · Optionales
  const gNice = NICE_GROUPS.map(g => fGrp('', g.title, g.fields.map(f=>{
    if(f[3]==='chips'){
      const sel = (ex[f[0]]||'').split(', ').filter(Boolean);
      return fFld(f[1], `<div class="chips cmdchips" data-k="${f[0]}">${COMMANDS.map(c=>
        `<span class="chip ${sel.includes(c)?'on':''}" data-c="${c}">${c}</span>`).join('')}</div>`);
    }
    return fFld(f[1], fInp(f[0], ex[f[0]], f[2]));
  }).join(''))).join('');

  $('sheet').innerHTML = `
    <h3>${isNew?'Tier anlegen':esc(p.name)+' bearbeiten'}</h3>
    <div id="readyBox"></div>
    ${fGrp('g-basic','🐾 Steckbrief', gBasic, true)}
    ${fGrp('g-feed','🥣 Fütterung', gFeed, true)}
    ${fGrp('g-health','🩺 Gesundheit', gHealth, sick)}
    ${fGrp('g-emg','🚨 Notfall', gEmg, true)}
    ${fGrp('g-safe','⚠️ Sicherheit & Verhalten', gSafe, warns.length>0)}
    ${fGrp('g-species', p.species==='cat'?'🚽 Katzenklo & Freigang':'🦮 Gassi & Draußen', gSpecies)}
    ${fGrp('g-hand','🔑 Übergabe – wo alles liegt', gHand)}
    <p style="font-size:12px;color:var(--muted);margin:14px 0 8px">Alles Weitere ist freiwillig – schön für den Sitter, aber nichts geht schief, wenn es fehlt.</p>
    ${gNice}
    ${!isNew?fFld('📄 Dokumente (Impfpass, Befunde …)',
      `<div id="docList"><span style="font-size:12px;color:var(--muted)">Lade…</span></div>
       <input type="file" id="docFile" style="display:none" onchange="uploadDoc('${p.id}')">
       <button class="askupd" style="margin-top:6px" onclick="$('docFile').click()">📎 Dokument hochladen</button>`,
      'Privat gespeichert – nur du und dein gebuchter Sitter können sie öffnen.')
     :'<p style="font-size:11.5px;color:var(--muted);margin-bottom:10px">📄 Dokumente kannst du hochladen, sobald das Tier angelegt ist.</p>'}
    <button class="askupd" style="width:100%;margin-bottom:8px" onclick="previewSitterView()">👀 So sieht es dein Sitter</button>
    <button class="primary" id="pSave">${isNew?'Anlegen':'Speichern'}</button>
    <button class="ghost" onclick="closeSheet()">Abbrechen</button>`;

  if(!isNew) loadDocs(p.id);
  // Merkt sich Übergabe-Eingaben über einen Tierart-Wechsel hinweg.
  const handStash = {};

  // Tierart wechseln blendet den passenden Alltags-Block ein.
  $('sheet').querySelectorAll('.petopt[data-sp]').forEach(el=>el.onclick=()=>{
    $('sheet').querySelectorAll('.petopt[data-sp]').forEach(x=>x.classList.remove('on'));
    el.classList.add('on');
    const sp = el.dataset.sp, g = $('g-species');
    g.querySelector('summary').textContent = sp==='cat'?'🚽 Katzenklo & Freigang':'🦮 Gassi & Draußen';
    g.querySelector('.inner').innerHTML = SPECIES_FIELDS[sp].map(f=>fFld(f[1], fInp(f[0], (p.extra||{})[f[0]], f[2]))).join('');
    // Die Übergabe-Felder hängen ebenfalls an der Tierart (Leine nur beim Hund).
    // handStash überlebt den Umbau, damit Hund→Katze→Hund nichts verschluckt.
    const hb = $('g-hand').querySelector('.inner');
    hb.querySelectorAll('.pextra').forEach(i=>{ if(i.value.trim()) handStash[i.dataset.k] = i.value.trim(); });
    hb.innerHTML = handoverForm(sp).map(f=>fFld(f[1], fInp(f[0], handStash[f[0]] ?? (p.extra||{})[f[0]], f[2]))).join('');
  });
  // Gesundheits-Weiche
  $('pHealth').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{
    $('pHealth').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));
    el.classList.add('on');
    $('healthBox').style.display = el.dataset.h==='condition' ? 'block' : 'none';
  });
  // Einfach-Auswahl-Chips
  $('sheet').querySelectorAll('.pchips').forEach(box=>box.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    const was = c.classList.contains('on');
    box.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
    if(!was) c.classList.add('on');
    updateReady();
  }));
  // Mehrfachauswahl-Chips (Kommandos, Sitter-Anforderungen)
  $('sheet').querySelectorAll('.cmdchips .chip, #pNeeds .chip').forEach(c=>c.onclick=()=>c.classList.toggle('on'));
  // Warn-Chips blenden ihr Detailfeld ein bzw. aus
  $('pWarn').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
    c.classList.toggle('on');
    const k = c.dataset.w, box = $('warnDetails'), cur = box.querySelector(`[data-wd="${k}"]`);
    if(c.classList.contains('on')){ if(!cur) box.insertAdjacentHTML('beforeend', warnDetailHtml(k,'')); }
    else if(cur) cur.remove();
  });
  $('sheet').querySelectorAll('input,textarea').forEach(i=>i.addEventListener('input', updateReady));

  function collect(){
    const rec = {
      owner_id: me.id,
      name: $('pName').value.trim(),
      species: $('sheet').querySelector('.petopt[data-sp].on')?.dataset.sp||'dog',
      breed: $('pBreed').value.trim(),
      info: [calcAge($('pBirth').value), $('pWeight').value.trim()?$('pWeight').value.trim()+' kg':''].filter(Boolean).join(' · '),
      needs: [...$('pNeeds').querySelectorAll('.chip.on')].map(t=>t.dataset.n),
      vaccinations: $('pVacc').value.trim(),
      quirks: $('pQuirks').value.trim(),
      extra: Object.assign({}, p.extra||{})
    };
    $('sheet').querySelectorAll('.pextra').forEach(i=>{
      const v = i.value.trim();
      if(v) rec.extra[i.dataset.k] = v; else delete rec.extra[i.dataset.k];
    });
    $('sheet').querySelectorAll('.pchips').forEach(box=>{
      const on = box.querySelector('.chip.on');
      if(on) rec.extra[box.dataset.k] = on.dataset.v; else delete rec.extra[box.dataset.k];
    });
    $('sheet').querySelectorAll('.cmdchips').forEach(box=>{
      const sel = [...box.querySelectorAll('.chip.on')].map(t=>t.dataset.c);
      if(sel.length) rec.extra[box.dataset.k] = sel.join(', '); else delete rec.extra[box.dataset.k];
    });
    const healthy = $('pHealth').querySelector('.petopt.on')?.dataset.h !== 'condition';
    rec.extra.health_status = healthy ? 'healthy' : 'condition';
    const w = [...$('pWarn').querySelectorAll('.chip.on')].map(c=>c.dataset.w);
    if(w.length) rec.extra.warn = w.join(','); else delete rec.extra.warn;
    if($('pVaccDue').value) rec.extra.vacc_due = $('pVaccDue').value;
    if($('pBirth').value) rec.extra.birthdate = $('pBirth').value;
    if($('pWeight').value.trim()) rec.extra.weight = $('pWeight').value.trim();
    // Gesundes Tier: keine Medikamente mitschleppen.
    rec.meds = healthy ? [] : [...$('medRows').querySelectorAll('.medrow')].map(r=>({
      name: r.querySelector('.m-name').value.trim(),
      dose: r.querySelector('.m-dose').value.trim(),
      times: r.querySelector('.m-times').value.split(',').map(t=>t.trim()).filter(Boolean)
    })).filter(m=>m.name);
    // "Braucht Medikamentengabe" ergibt sich aus dem Plan – nicht nochmal fragen.
    if(!healthy || rec.meds.length) rec.needs = [...new Set([...rec.needs,'med'])];
    // Altschlüssel sind in die neuen Felder vorbefüllt worden und wären sonst
    // eine zweite, veraltete Wahrheit.
    ['feeding','allergies','nofood','treats','budget'].forEach(k=>delete rec.extra[k]);
    // Die alten Textspalten weiter mitschreiben, damit nichts verloren geht.
    rec.food = rec.extra.food_what || '';
    rec.vet_contact = [rec.extra.vet_name, rec.extra.vet_phone].filter(Boolean).join(' · ');
    rec.emergency_contact = [rec.extra.emg_name, rec.extra.emg_phone].filter(Boolean).join(' · ');
    rec.medication = (rec.meds||[]).map(m=>`${m.name} ${m.dose}`).join(', ');
    return rec;
  }
  window.__collectPet = collect;

  function updateReady(){
    const r = careReady(collect());
    $('readyBox').innerHTML = r.gaps.length
      ? `<div class="note" style="margin:0 0 12px"><b>${r.done} von ${r.total} Kernangaben</b> – dein Sitter hätte gern noch:<br>${r.gaps.map(g=>esc(g.label)).join(' · ')}</div>`
      : `<div class="note g" style="margin:0 0 12px"><b>✓ Sitter-bereit</b> – alles Wichtige für den Alltag ist da.</div>`;
  }
  updateReady();

  $('pSave').onclick = async () => {
    const rec = collect();
    if(!rec.name){toast('Bitte einen Namen angeben');return;}
    const q = isNew ? sb.from('pets').insert(rec) : sb.from('pets').update(rec).eq('id', p.id);
    const {error} = await q;
    if(error){toast('Fehler: '+error.message);return;}
    await loadPets(); renderPets(); renderResults(); closeSheet();
    toast(isNew?`${rec.name} angelegt 🐾`:'Gespeichert');
  };
  $('ov').classList.add('show');
};

function medRowHtml(m){
  m = m||{name:'',dose:'',times:[]};
  return `<div class="medrow" style="display:flex;gap:6px;margin-bottom:6px">
    <input class="m-name" placeholder="Medikament" value="${esc(m.name)}" style="flex:2">
    <input class="m-dose" placeholder="Dosis" value="${esc(m.dose)}" style="flex:1.5">
    <input class="m-times" placeholder="Zeiten" value="${esc((m.times||[]).join(', '))}" style="flex:1.5">
    <button onclick="this.parentNode.remove()" style="border:none;background:none;color:#C66;font-size:16px;cursor:pointer">✕</button></div>`;
}
function warnDetailHtml(k, v){
  return `<div class="fld" data-wd="${k}"><label>${WARN_FLAGS[k]||k} – was genau?</label>
    <input class="pextra" data-k="warn_${k}" value="${esc(v||'')}" placeholder="z. B. beim Fressen nicht anfassen"></div>`;
}
// Der Halter soll sehen, was beim Sitter ankommt – das beantwortet
// „reicht das?“ besser als jeder Fortschrittsbalken.
window.previewSitterView = () => {
  const rec = window.__collectPet ? window.__collectPet() : null; if(!rec) return;
  const draft = Object.assign({}, rec, {id: window.__petId});
  $('sheet').innerHTML = `<h3>👀 So sieht ${esc(rec.name||'dein Tier')} beim Sitter aus</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Ungespeicherter Stand – genau diese Ansicht bekommt der Sitter.</p>
    ${careCardsHtml(draft)}
    <button class="primary" id="pBack">Zurück zum Bearbeiten</button>`;
  // Der Entwurf trägt alle Eingaben, das Formular baut sich daraus neu auf.
  $('pBack').onclick = () => openPetForm(draft);
};

// ---------- Sitter-Bereich ----------
async function renderSitterBookings(){
  const {data} = await sb.from('bookings').select('*, profiles!bookings_owner_id_fkey(display_name, client_rating, client_rating_count), pets(*)')
    .eq('sitter_id', me.id).order('created_at', {ascending:false});
  state.sbList = data||[];
  if(!data?.length){$('sitterBookings').innerHTML='<div class="empty">Noch keine Anfragen.<br>Teile dein Profil, um Klienten einzuladen!</div>';return;}
  $('sitterBookings').innerHTML = data.map(b=>`
    <div class="card bk ${b.status}">
      <div class="st">${STATUS_DE[b.status]||b.status}</div>
      <div style="margin-top:6px"><b style="font-size:14px">${SVC_LABEL(b.service)} · ${esc(b.date_text)}</b>
        <div class="smeta">von ${esc(b.profiles?.display_name||'?')} ${b.profiles?.client_rating?`· ⭐ ${b.profiles.client_rating} Klienten-Score (${b.profiles.client_rating_count})`:''}</div>
        ${b.pets?`<div class="smeta">${b.pets.species==='dog'?'🐕':'🐈'} ${esc(b.pets.name)} · ${esc(b.pets.breed||'')}</div>`:''}
        ${b.message?`<p style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.5">„${esc(b.message)}“</p>`:''}
      </div>
      ${b.pets?`<button class="ghost" style="text-align:left;padding:8px 0;color:var(--brand);font-weight:700" onclick='showPetSheet(${JSON.stringify(b.pets).replace(/'/g,"&#39;")})'>🗂️ Tierprofil ansehen</button>`:''}
      <div style="display:flex;gap:8px;margin-top:6px">
        ${b.status==='requested'?`
          <button class="primary" style="margin:0;padding:9px;font-size:12.5px" onclick="setBookingStatus('${b.id}','confirmed')">✓ Annehmen</button>
          <button class="ghost" style="padding:9px;font-size:12.5px" onclick="setBookingStatus('${b.id}','declined')">Ablehnen</button>`:
          `<button class="primary" style="margin:0;padding:9px;font-size:12.5px" onclick="openConv('${b.owner_id}','${esc(b.profiles?.display_name||'')}')">💬 Chat</button>
           ${b.status==='confirmed'&&b.pets?`<button class="primary" style="margin:0;padding:9px;font-size:12.5px;background:var(--accent)" onclick="openCare('${b.id}')">📓 Pflege</button>`:''}`}
      </div>
    </div>`).join('');
}
window.openCare = async (bid) => {
  const b = state.sbList.find(x=>x.id===bid); if(!b || !b.pets) return;
  const pet = b.pets;
  const today = new Date().toISOString().slice(0,10);
  const {data:givenToday} = await sb.from('med_log').select('med_name, due_label').eq('pet_id', pet.id).gte('given_at', today+'T00:00:00');
  const isGiven = (name, t) => (givenToday||[]).some(g=>g.med_name===name && g.due_label===t);
  const medRows = (pet.meds||[]).flatMap(m=>(m.times&&m.times.length?m.times:['heute']).map(t=>({m, t})));
  $('sheet').innerHTML = `
    <h3>📓 Pflege: ${pet.species==='dog'?'🐕':'🐈'} ${esc(pet.name)}</h3>
    ${medRows.length?`<div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">💊 Medikamente heute</h3>
      ${medRows.map((r,i)=>{
        const done = isGiven(r.m.name, r.t);
        return `<div class="svcrow"><span>${esc(r.t)} · ${esc(r.m.name)} ${esc(r.m.dose)}</span>
          ${done?'<b style="color:var(--brand)">✓ gegeben</b>':`<button id="med_${i}" onclick="giveMed('${bid}','${esc(r.m.name)}','${esc(r.m.dose)}','${esc(r.t)}',${i})" style="border:none;background:var(--brand);color:#fff;border-radius:99px;padding:6px 12px;font-size:11.5px;font-weight:800;cursor:pointer">✓ Jetzt geben</button>`}
        </div>`;}).join('')}
      <p style="font-size:11px;color:var(--muted);margin-top:6px">Jede Gabe wird mit Zeitstempel protokolliert – der Besitzer sieht sie live im Logbuch.</p>
    </div>`:''}
    <div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <h3 style="font-size:13px">📝 Logbuch-Eintrag</h3>
      <div class="petpick" style="margin-bottom:10px" id="logType">
        <div class="petopt on" data-t="note" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">📝</span>Notiz</div>
        <div class="petopt" data-t="feed" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">🥣</span>Fütterung</div>
        <div class="petopt" data-t="walk" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">🦮</span>Gassi</div>
        <div class="petopt" data-t="incident" style="padding:8px 4px;font-size:11px"><span class="e" style="font-size:18px">🚨</span>Vorfall</div>
      </div>
      <div class="fld"><textarea id="logBody" rows="2" placeholder="Was gibt's zu berichten?"></textarea></div>
      <button class="primary" onclick="saveLog('${bid}')">Eintrag speichern</button>
    </div>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('logType').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{$('logType').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));el.classList.add('on');});
  $('ov').classList.add('show');
};
window.giveMed = async (bid, name, dose, label, i) => {
  const b = state.sbList.find(x=>x.id===bid);
  const {error} = await sb.from('med_log').insert({pet_id: b.pets.id, booking_id: bid, med_name: name, dose, due_label: label, given_by: me.id});
  if(error){toast('Fehler: '+error.message);return;}
  await sb.from('messages').insert({booking_id: bid, sender_id: me.id, recipient_id: b.owner_id, body: `💊 ${b.pets.name}: ${name} ${dose} (${label}) gegeben ✓`, is_system: true});
  const btn = $('med_'+i); if(btn) btn.outerHTML = '<b style="color:var(--brand)">✓ gegeben</b>';
  toast('Protokolliert ✓ – Besitzer wurde informiert');
};
window.saveLog = async (bid) => {
  const b = state.sbList.find(x=>x.id===bid);
  const type = $('logType').querySelector('.petopt.on')?.dataset.t || 'note';
  const body = $('logBody').value.trim();
  if(!body){toast('Bitte kurz beschreiben');return;}
  const {error} = await sb.from('pet_log').insert({pet_id: b.pets.id, booking_id: bid, author_id: me.id, type, body});
  if(error){toast('Fehler: '+error.message);return;}
  if(type==='incident'){
    await sb.from('messages').insert({booking_id: bid, sender_id: me.id, recipient_id: b.owner_id, body: `🚨 VORFALL – ${b.pets.name}: ${body}`, is_system: false});
    toast('Vorfall gemeldet – Besitzer sofort benachrichtigt 🚨');
  } else toast('Ins Logbuch eingetragen 📓');
  $('logBody').value='';
};
window.editSitterProfile = async () => {
  const {data:s} = await sb.from('sitters').select('*').eq('id', me.id).maybeSingle();
  const sit = s || {bio:'', level:1, caps:[], services:{}, accepts_dogs:true, accepts_cats:true, active:true};
  const svcInput = (id,label) => '<div class="fld"><label>'+label+' – Preis in € (leer = biete ich nicht an)</label><input id="sp_'+id+'" type="number" min="0" step="0.5" value="'+(sit.services && sit.services[id] ? sit.services[id] : '')+'"></div>';
  $('sheet').innerHTML =
    '<h3>⚙️ Mein Sitter-Profil</h3>'+
    '<div class="fld"><label>Über mich (sehen Besitzer in der Suche)</label><textarea id="spBio" rows="3">'+esc(sit.bio||'')+'</textarea></div>'+
    '<div class="fld"><label>Stadt</label><input id="spCity" value="'+esc(myProfile.city||'')+'" placeholder="z. B. Wien"></div>'+
    '<div class="fld"><label>PLZ (für die Umkreis-Suche)</label><input id="spPlz" value="'+esc(myProfile.plz||'')+'" placeholder="z. B. 1070"></div>'+
    '<div class="fld"><label>Ich betreue</label><div class="petpick">'+
      '<div class="petopt '+(sit.accepts_dogs?'on':'')+'" id="spDogs" onclick="this.classList.toggle(\'on\')"><span class="e">🐕</span>Hunde</div>'+
      '<div class="petopt '+(sit.accepts_cats?'on':'')+'" id="spCats" onclick="this.classList.toggle(\'on\')"><span class="e">🐈</span>Katzen</div>'+
    '</div></div>'+
    svcInput('board','🏠 Übernachtung')+svcInput('day','☀️ Tagesbetreuung')+svcInput('walk','🦮 Gassi-Runde')+svcInput('visit','🔑 Hausbesuch')+
    '<label class="checkrow" style="margin-top:2px"><input type="checkbox" id="spMeet" '+(sit.offers_meet!==false?'checked':'')+'> 🤝 Kostenloses Kennenlernen anbieten (empfohlen – senkt die Hürde für Neukunden)</label>'+
    '<div class="fld"><label>Das biete ich an (wichtig fürs Matching)</label>'+
      '<div class="stags" id="spCaps">'+Object.keys(NEED_LABELS).map(n=>'<span class="tag '+((sit.caps||[]).includes(n)?'':'off')+'" data-n="'+n+'" style="cursor:pointer;font-size:12px;padding:7px 11px">'+NEED_LABELS[n]+'</span>').join('')+'</div></div>'+
    '<div class="note g">Dein Level: <b>Level '+(sit.level||1)+'</b>. Höhere Level (Erste-Hilfe-Kurs, Medikamenten-Zertifikat) schalten wir nach Prüfung frei – kostenlos.</div>'+
    '<div class="note">💚 Zur Erinnerung: Was du hier einträgst, bekommst du zu 100 %. Pawkin schlägt nichts drauf und zieht nichts ab.</div>'+
    '<button class="primary" id="spSave">Speichern</button>'+
    '<button class="ghost" onclick="closeSheet()">Abbrechen</button>';
  $('spCaps').querySelectorAll('.tag').forEach(t=>t.onclick=()=>t.classList.toggle('off'));
  $('spSave').onclick = async () => {
    const services = {};
    for(const id of ['board','day','walk','visit']){
      const v = parseFloat($('sp_'+id).value);
      if(!isNaN(v) && v>0) services[id] = v;
    }
    if(!Object.keys(services).length){toast('Bitte mindestens eine Leistung mit Preis angeben');return;}
    const rec = {
      id: me.id,
      bio: $('spBio').value.trim(),
      caps: Array.from($('spCaps').querySelectorAll('.tag:not(.off)')).map(t=>t.dataset.n),
      services,
      accepts_dogs: $('spDogs').classList.contains('on'),
      accepts_cats: $('spCats').classList.contains('on'),
      offers_meet: $('spMeet').checked,
      active: true
    };
    const {error} = await sb.from('sitters').upsert(rec);
    if(error){toast('Fehler: '+error.message);return;}
    const city = $('spCity').value.trim(), plz = $('spPlz').value.trim();
    const profUpd = {city, plz, is_sitter: true};
    if(plz || city){
      const loc = await geocode((plz+' '+city).trim());
      if(loc){ profUpd.lat = loc.lat; profUpd.lng = loc.lng; }
    }
    await sb.from('profiles').update(profUpd).eq('id', me.id);
    myProfile.city = city; myProfile.plz = plz;
    myProfile.is_sitter = true;
    $('becomePill').style.display='none';
    $('modePill').style.display='inline-block';
    await loadSitters(); renderResults(); closeSheet();
    toast('Profil gespeichert – du bist jetzt in der Suche sichtbar ✅');
  };
  $('ov').classList.add('show');
};
window.inviteClient = () => {
  const link = location.href.split('#')[0];
  const text = 'Hallo! Ich verwalte meine Tierbetreuung jetzt über Pawkin – kostenlos für uns beide. Leg dort das Profil deines Tieres an (Impfpass, Futter, Eigenheiten), dann habe ich immer alles Wichtige zur Hand: ' + link;
  if(navigator.share){ navigator.share({title:'Pawkin', text}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(text); toast('Einladungstext kopiert – schick ihn per WhatsApp o.ä. 📋'); }
  $('sheet').innerHTML = '<h3>➕ Klienten einladen</h3>'+
    '<p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:12px">Lade deine bestehenden Kunden ein: Sie legen einmal das Tierprofil an, danach hast du Impfpass, Medikation und Notfallkontakte immer aktuell – und ihr chattet und plant alles an einem Ort. Kostenlos für beide Seiten, für immer.</p>'+
    '<div class="fld"><label>Dein Einladungstext</label><textarea rows="4" readonly onclick="this.select()">'+text.replace(/</g,'&lt;')+'</textarea></div>'+
    '<button class="primary" onclick="navigator.clipboard && navigator.clipboard.writeText(this.parentNode.querySelector(\'textarea\').value); toast(\'Kopiert 📋\')">Text kopieren</button>'+
    '<button class="ghost" onclick="closeSheet()">Schließen</button>';
  $('ov').classList.add('show');
};
window.showPetSheet = (p) => {
  $('sheet').innerHTML = `<h3>${p.species==='dog'?'🐕':'🐈'} ${esc(p.name)}</h3>
    <div class="section" style="box-shadow:none;border:1px solid var(--line)">
      <div class="svcrow"><span>Rasse/Art</span><b>${esc(p.breed||'–')}</b></div>
      <div class="svcrow"><span>Infos</span><b>${esc(p.info||'–')}</b></div>
      <div class="svcrow"><span>Impfungen</span><b>${esc(p.vaccinations||'–')}</b></div>
      <div class="svcrow"><span>Medikation</span><b>${esc(p.medication||'–')}</b></div>
      <div class="svcrow"><span>Futter</span><b>${esc(p.food||'–')}</b></div>
      <div class="svcrow"><span>Eigenheiten</span><b>${esc(p.quirks||'–')}</b></div>
      <div class="svcrow"><span>Tierarzt</span><b>${esc(p.vet_contact||'–')}</b></div>
      <div class="svcrow"><span>Notfall</span><b>${esc(p.emergency_contact||'–')}</b></div>
    </div>
    ${(p.needs||[]).length?`<div class="stags" style="margin-bottom:10px">${p.needs.map(n=>`<span class="tag">${NEED_LABELS[n]||n}</span>`).join('')}</div>`:''}
    ${(function(){
      const ex = p.extra||{}; let out='';
      for(const g of EXTRA_GROUPS){
        const rows = g.fields.filter(f=>ex[f[0]]);
        if(rows.length) out += `<div class="section" style="box-shadow:none;border:1px solid var(--line)"><h3 style="font-size:13px">${g.title}</h3>`+
          rows.map(f=>`<div class="svcrow"><span>${f[1]}</span><b>${esc(ex[f[0]])}</b></div>`).join('')+`</div>`;
      }
      return out;
    })()}
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
};


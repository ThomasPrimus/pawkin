// ---------- Buchungen (Besitzer) ----------
function openMeet(){
  const s = state.cur;
  const first = esc(s.profiles.display_name.split(' ')[0]);
  $('sheet').innerHTML =
    '<h3>🤝 Kennenlernen mit '+first+'</h3>'+
    '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:12px">Ein kurzes, unverbindliches Treffen (~30 Min) vor der ersten Buchung – ihr seht, ob die Chemie stimmt. Kostenlos für alle.</p>'+
    '<div class="fld"><label>Wunschtermin</label><input id="mDates" placeholder="z. B. Samstag Nachmittag oder 2.8. um 16:00"></div>'+
    (state.pets.length?'<div class="fld"><label>Wen lernt '+first+' kennen?</label><div class="petpick">'+state.pets.map((p,i)=>'<div class="petopt '+(i===0?'on':'')+'" data-pid="'+p.id+'"><span class="e">'+(p.species==='dog'?'🐕':'🐈')+'</span>'+esc(p.name)+'</div>').join('')+'</div></div>':'')+
    '<div class="fld"><label>Nachricht</label><textarea id="mMsg" rows="2">Hallo! Wir würden dich gern vor der ersten Buchung kurz kennenlernen.</textarea></div>'+
    '<button class="primary" id="mSend">Kennenlernen anfragen</button>'+
    '<button class="ghost" onclick="closeSheet()">Abbrechen</button>';
  $('sheet').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{$('sheet').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));el.classList.add('on');});
  $('mSend').onclick = async () => {
    const sel = $('sheet').querySelector('.petopt.on');
    $('mSend').textContent='Sende…';
    const {data:bk, error} = await sb.from('bookings').insert({
      owner_id: me.id, sitter_id: s.id, pet_id: sel?sel.dataset.pid:null, service: 'meet',
      date_text: $('mDates').value.trim()||'nach Absprache', message: $('mMsg').value
    }).select().single();
    if(error){toast('Fehler: '+error.message);$('mSend').textContent='Kennenlernen anfragen';return;}
    await sb.from('messages').insert({booking_id:bk.id, sender_id:me.id, recipient_id:s.id, body:$('mMsg').value});
    closeSheet(); toast('Kennenlern-Anfrage gesendet 🤝'); go('v-book',null);
  };
  $('ov').classList.add('show');
}
window.rebook = (sitterId, svc) => {
  const s = state.sitters.find(x=>x.id===sitterId);
  if(!s){toast('Sitter nicht mehr aktiv');return;}
  state.cur = s;
  if(svc && svc!=='meet' && s.services && s.services[svc]) state.svc = svc;
  openBooking();
};
const STATUS_DE = {requested:'Anfrage gesendet', confirmed:'Bestätigt', declined:'Abgelehnt', completed:'Abgeschlossen', cancelled:'Storniert'};
async function renderBookings(){
  $('bookings').innerHTML = '<div class="spinner">Lade…</div>';
  const {data} = await sb.from('bookings').select('*, sitters!inner(id, profiles!inner(display_name)), pets(name, species)')
    .eq('owner_id', me.id).order('created_at', {ascending:false});
  if(!data?.length){$('bookings').innerHTML='<div class="empty">Noch keine Buchungen.<br>Finde unter „Suchen" den passenden Sitter! 🐾</div>';return;}
  $('bookings').innerHTML = data.map(b=>`
    <div class="card bk ${b.status}">
      <div class="st">${STATUS_DE[b.status]||b.status}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:6px">
        <div class="avatar" style="width:42px;height:42px;font-size:17px">${initials(b.sitters.profiles.display_name)}</div>
        <div><b style="font-size:14px">${SVC_LABEL(b.service)} bei ${esc(b.sitters.profiles.display_name)}</b>
        <div class="smeta">${esc(b.date_text)} · ${b.pets?(b.pets.species==='dog'?'🐕 ':'🐈 ')+esc(b.pets.name):''}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="primary" style="margin:0;padding:9px;font-size:12.5px" onclick="openConv('${b.sitter_id}','${esc(b.sitters.profiles.display_name)}')">💬 Chat</button>
        ${['confirmed','completed'].includes(b.status)?`<button class="primary" style="margin:0;padding:9px;font-size:12.5px;background:var(--accent)" onclick="rebook('${b.sitter_id}','${b.service}')">🔁 Erneut buchen</button>`:''}
        ${b.status==='requested'?`<button class="ghost" style="padding:9px;font-size:12.5px" onclick="setBookingStatus('${b.id}','cancelled')">Stornieren</button>`:''}
      </div>
    </div>`).join('');
}
window.setBookingStatus = async (id, st) => {
  await sb.from('bookings').update({status:st}).eq('id', id);
  toast(st==='cancelled'?'Buchung storniert':'Aktualisiert');
  sitterMode ? renderSitterBookings() : renderBookings();
};


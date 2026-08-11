// ---------- Buchung ----------
function openBooking(){
  const s = state.cur;
  if(!state.pets.length){
    $('sheet').innerHTML = `<h3>Zuerst ein Tier anlegen</h3>
      <p style="font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:12px">Damit ${esc(s.profiles.display_name.split(' ')[0])} alles Wichtige weiß, lege bitte zuerst das Profil deines Tieres an – es wird mit der Anfrage sicher übermittelt.</p>
      <button class="primary" onclick="closeSheet();go('v-pets',null)">🐾 Tier anlegen</button>
      <button class="ghost" onclick="closeSheet()">Abbrechen</button>`;
    $('ov').classList.add('show'); return;
  }
  $('sheet').innerHTML = `
    <h3>Anfrage an ${esc(s.profiles.display_name.split(' ')[0])}</h3>
    <div class="fld"><label>Leistung</label>
      <select id="bSvc">${SERVICES.filter(x=>s.services?.[x.id]).map(x=>`<option value="${x.id}" ${x.id===state.svc?'selected':''}>${x.label} – ${s.services[x.id]} €/${x.unit}</option>`).join('')}</select></div>
    <div class="fld"><label>Zeitraum</label><input id="bDates" placeholder="z. B. 12.8. – 14.8."></div>
    <div class="fld"><label>Für welches Tier?</label>
      <div class="petpick">${state.pets.map((p,i)=>`<div class="petopt ${i===0?'on':''}" data-pid="${p.id}"><span class="e">${p.species==='dog'?'🐕':'🐈'}</span>${esc(p.name)}</div>`).join('')}</div></div>
    <div class="fld"><label>Nachricht</label><textarea id="bMsg" rows="3">Hallo! Wir suchen Betreuung für die angegebenen Tage. Das Tierprofil wird automatisch mitgeschickt.</textarea></div>
    <div class="note g" style="margin-bottom:10px">Preis geht zu 100 % an den Sitter. Pawkin: 0 €.</div>
    <button class="primary" id="bSend">Anfrage kostenlos senden</button>
    <button class="ghost" onclick="closeSheet()">Abbrechen</button>`;
  $('sheet').querySelectorAll('.petopt').forEach(el=>el.onclick=()=>{$('sheet').querySelectorAll('.petopt').forEach(x=>x.classList.remove('on'));el.classList.add('on');});
  $('bSend').onclick = confirmBooking;
  $('ov').classList.add('show');
}
async function confirmBooking(){
  const s = state.cur;
  const petId = $('sheet').querySelector('.petopt.on')?.dataset.pid;
  const dates = $('bDates').value.trim() || 'nach Absprache';
  $('bSend').textContent='Sende…';
  const {data:bk, error} = await sb.from('bookings').insert({
    owner_id: me.id, sitter_id: s.id, pet_id: petId, service: $('bSvc').value, date_text: dates, message: $('bMsg').value
  }).select().single();
  if(error){toast('Fehler: '+error.message);$('bSend').textContent='Anfrage kostenlos senden';return;}
  await sb.from('messages').insert({booking_id:bk.id, sender_id:me.id, recipient_id:s.id, body:$('bMsg').value});
  $('sheet').innerHTML = `<div style="text-align:center;padding:16px 6px">
    <div style="font-size:50px;margin-bottom:10px">🎉</div>
    <h3>Anfrage ist raus!</h3>
    <p style="font-size:13px;color:var(--muted);line-height:1.55;margin:8px 0 14px">${esc(s.profiles.display_name.split(' ')[0])} bekommt deine Anfrage samt Tierprofil.<br><b>Kosten: 0 €.</b></p>
    <button class="primary" onclick="closeSheet();go('v-book',null)">Zu meinen Buchungen</button>
    <button class="ghost" onclick="closeSheet()">Weiter stöbern</button></div>`;
}


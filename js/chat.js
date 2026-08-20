// ---------- Chat ----------
async function renderThreads(){
  const {data} = await sb.from('messages').select('*').or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order('created_at',{ascending:false}).limit(200);
  if(!data?.length){$('threads').innerHTML='<div class="empty">Noch keine Nachrichten.</div>';return;}
  const partners = new Map();
  for(const m of data){
    const other = m.sender_id===me.id ? m.recipient_id : m.sender_id;
    if(!partners.has(other)) partners.set(other, m);
  }
  const ids = [...partners.keys()];
  const {data:profs} = await sb.from('profiles').select('id, display_name').in('id', ids);
  const nameOf = id => profs?.find(p=>p.id===id)?.display_name||'?';
  $('threads').innerHTML = ids.map(id=>{
    const m = partners.get(id);
    return `<div class="card click" onclick="openConv('${id}','${esc(nameOf(id))}')">
      <div class="srow" style="align-items:center">
        <div class="avatar" style="width:46px;height:46px;font-size:18px">${initials(nameOf(id))}</div>
        <div style="min-width:0"><b style="font-size:14px">${esc(nameOf(id))}</b>
        <div class="smeta" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px">${m.photo_url?'📷 Foto':esc(m.body)}</div></div>
      </div></div>`;
  }).join('');
}
window.openConv = async (otherId, otherName) => {
  state.convWith = otherId;
  $('v-conv').innerHTML = `
    <button class="back" onclick="go('v-chat',null)">‹ Alle Chats</button>
    <div class="srow" style="align-items:center;margin-bottom:8px">
      <div class="avatar" style="width:44px;height:44px;font-size:17px">${initials(otherName)}</div>
      <b>${esc(otherName)}</b>
    </div>
    <div class="msgs" id="msgs"><div class="spinner">Lade…</div></div>
    <div class="chatin">
      <input type="file" id="cf" accept="image/*" style="display:none">
      <button class="cam" onclick="$('cf').click()">📷</button>
      <input type="text" id="ci" placeholder="Nachricht…">
      <button id="csend">➤</button>
    </div>`;
  go('v-conv', null);
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='v-chat'));
  $('ci').onkeydown = e=>{if(e.key==='Enter')sendMsg();};
  $('csend').onclick = sendMsg;
  $('cf').onchange = sendPhoto;
  await loadConv();
  state.convTimer = setInterval(loadConv, 4000);
};
async function loadConv(){
  const o = state.convWith;
  const {data} = await sb.from('messages').select('*')
    .or(`and(sender_id.eq.${me.id},recipient_id.eq.${o}),and(sender_id.eq.${o},recipient_id.eq.${me.id})`)
    .order('created_at');
  const el = $('msgs'); if(!el) return;
  el.innerHTML = (data||[]).map(m=>{
    if(m.is_system) return `<div class="msg sys">${esc(m.body)}</div>`;
    const mine = m.sender_id===me.id;
    const time = new Date(m.created_at).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'});
    return `<div class="msg ${mine?'me':'them'}">${m.photo_url?`<img src="${esc(m.photo_url)}">`:''}${esc(m.body)}<span class="t">${time}</span></div>`;
  }).join('')||'<div class="empty">Schreib die erste Nachricht 🐾</div>';
  window.scrollTo(0, document.body.scrollHeight);
}
async function sendMsg(){
  const inp = $('ci'); const txt = inp.value.trim(); if(!txt) return;
  inp.value='';
  const {error} = await sb.from('messages').insert({sender_id:me.id, recipient_id:state.convWith, body:txt});
  if(error) toast('Fehler: '+error.message); else loadConv();
}
async function sendPhoto(){
  const f = $('cf').files[0]; if(!f) return;
  toast('Lade Foto hoch…');
  const path = `${me.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
  const {error} = await sb.storage.from('photos').upload(path, f);
  if(error){toast('Upload-Fehler: '+error.message);return;}
  const {data:{publicUrl}} = sb.storage.from('photos').getPublicUrl(path);
  await sb.from('messages').insert({sender_id:me.id, recipient_id:state.convWith, body:'', photo_url:publicUrl});
  loadConv();
  toast('Foto geteilt – bleibt im Betreuungs-Verlauf 📷');
}


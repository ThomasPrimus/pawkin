// ---------- Erinnerungs-Zentrale ----------
function dueReminders(){
  const out = [];
  const now = new Date();
  const hm = now.getHours()*60 + now.getMinutes();
  for(const p of state.pets){
    if(p.owner_id !== me.id && !state.pets.length) continue;
    for(const m of (p.meds||[])){
      for(const t of (m.times||[])){
        const mm = /^(\d{1,2})[:.](\d{2})/.exec(t);
        if(mm && (parseInt(mm[1])*60+parseInt(mm[2])) <= hm){
          out.push({body:`💊 ${p.name}: ${m.name} ${m.dose} (${t}) – heute schon gegeben? Abhaken unter „💊 Heute“.`, kind:'med'});
        }
      }
    }
    const due = p.extra?.vacc_due;
    if(due){ const d=new Date(due); const days=Math.round((d-now)/86400000);
      if(!isNaN(d) && days<=30) out.push({body: days<0?`💉 ${p.name}: Impfauffrischung überfällig!`:`💉 ${p.name}: Impfauffrischung in ${days} Tagen fällig.`, kind:'vacc'});
    }
    const bd = p.extra?.birthdate;
    if(bd){ const b=new Date(bd);
      if(!isNaN(b) && b.getDate()===now.getDate() && b.getMonth()===now.getMonth())
        out.push({body:`🎂 ${p.name} hat heute Geburtstag! ${calcAge(bd)} – Zeit für ein Extra-Leckerli!`, kind:'bday'});
    }
  }
  return out;
}
async function refreshBell(){
  const {data} = await sb.from('notifications').select('id').eq('user_id', me.id).eq('read', false);
  const n = (data||[]).length + dueReminders().length;
  const el = $('bellCount');
  if(n>0){ el.textContent = n>9?'9+':n; el.style.display='block'; } else el.style.display='none';
}
window.openBell = async () => {
  const {data} = await sb.from('notifications').select('*').eq('user_id', me.id).order('created_at',{ascending:false}).limit(30);
  const rem = dueReminders();
  $('sheet').innerHTML = `<h3>🔔 Erinnerungen & Neuigkeiten</h3>
    ${rem.map(r=>`<div class="note g" style="margin-bottom:8px">${esc(r.body)}</div>`).join('')}
    ${(data||[]).map(n=>`<div style="padding:9px 4px;border-bottom:1px solid var(--line);font-size:13px;${n.read?'opacity:.55':''}">
      ${esc(n.body)}<br><span style="font-size:10.5px;color:var(--muted)">${new Date(n.created_at).toLocaleString('de-AT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>`).join('')}
    ${!rem.length && !(data||[]).length ? '<div class="empty">Alles erledigt – keine Erinnerungen 🐾</div>':''}
    <p style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5">Push- und E-Mail-Benachrichtigungen folgen – aktuell siehst du alles hier beim Öffnen der App.</p>
    <button class="ghost" onclick="closeSheet()">Schließen</button>`;
  $('ov').classList.add('show');
  await sb.from('notifications').update({read:true}).eq('user_id', me.id).eq('read', false);
  refreshBell();
};


// ---------- Suche ----------
function renderSvcChips(){
  $('svcChips').innerHTML = SERVICES.map(s=>
    `<button class="chip ${state.svc===s.id?'on':''}" data-svc="${s.id}">${s.label}</button>`).join('');
  $('svcChips').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{state.svc=c.dataset.svc;renderSvcChips();renderResults();});
}
window.setSpecies = (sp,btn)=>{state.species=sp;document.querySelectorAll('.petch').forEach(b=>b.classList.toggle('on',b.dataset.pet===sp));renderResults();};
function activePet(){ return state.pets.find(p=>p.species===state.species) || state.pets[0] || null; }
function matchScore(s, pet){
  if(!pet || !pet.needs?.length) return null;
  const hit = pet.needs.filter(n=>(s.caps||[]).includes(n)).length;
  return Math.round(100*hit/pet.needs.length);
}
function renderResults(){
  const pet = activePet();
  let list = state.sitters.filter(s => (state.species==='dog'?s.accepts_dogs:s.accepts_cats) && s.services?.[state.svc]);
  list.forEach(s => { s._dist = state.myLoc ? distKm(state.myLoc, {lat:s.profiles.lat, lng:s.profiles.lng}) : null; });
  if(state.radius && state.myLoc) list = list.filter(s => s._dist==null ? false : s._dist <= state.radius);
  if(pet) list.sort((a,b)=>(matchScore(b,pet)||0)-(matchScore(a,pet)||0) || (a._dist??999)-(b._dist??999));
  else if(state.myLoc) list.sort((a,b)=>(a._dist??999)-(b._dist??999));
  const u = SERVICES.find(x=>x.id===state.svc).unit;
  if(!list.length){$('results').innerHTML='<div class="empty">Keine Sitter in diesem Umkreis.<br>Vergrößere den Radius oder ändere die Filter.</div>';return;}
  $('results').innerHTML = list.map(s=>{
    const m = pet ? matchScore(s, pet) : null;
    const d = s._dist!=null ? (s._dist<1 ? Math.round(s._dist*1000)+' m' : s._dist.toFixed(1).replace('.',',')+' km') : '';
    return `<div class="card click" data-sid="${s.id}">
      <div class="srow">
        <div class="avatar">${initials(s.profiles.display_name)}<span class="lvl">L${s.level}</span></div>
        <div style="min-width:0">
          <div class="sname">${esc(s.profiles.display_name)} <span style="color:var(--brand)">✓</span></div>
          <div class="smeta">${esc(s.profiles.city||'')}${d?' · 📍 '+d+' entfernt':''}</div>
          <div class="srating">⭐ <b>${s.rating??'–'}</b>${s.rating_count?` (${s.rating_count})`:''}</div>
        </div>
        <div class="sprice"><div class="p">${s.services[state.svc]} €</div><div class="u">pro ${u}</div><div class="z">0 % Gebühren</div></div>
      </div>
      <div class="stags">
        ${m!==null?`<span class="tag ${m===100?'gold':''}">🎯 ${m} % Match mit ${esc(pet.name)}</span>`:''}
        ${(s.caps||[]).slice(0,3).map(c=>`<span class="tag">${NEED_LABELS[c]||c}</span>`).join('')}
        ${s.level>=3?'<span class="tag gold">🎖️ Medikamente zert.</span>':''}
      </div></div>`;
  }).join('');
  $('results').querySelectorAll('.card').forEach(c=>c.onclick=()=>openSitter(c.dataset.sid));
}


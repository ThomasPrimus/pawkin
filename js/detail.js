// ---------- Detail ----------
function openSitter(id){
  const s = state.sitters.find(x=>x.id===id); if(!s) return;
  state.cur = s;
  const pet = activePet();
  const m = pet ? matchScore(s, pet) : null;
  $('v-detail').innerHTML = `
    <button class="back" onclick="go('v-search',null)">‹ Zurück zur Suche</button>
    <div class="srow" style="margin-bottom:14px">
      <div class="avatar" style="width:68px;height:68px;font-size:28px">${initials(s.profiles.display_name)}<span class="lvl">L${s.level}</span></div>
      <div><div class="sname" style="font-size:18px">${esc(s.profiles.display_name)} <span style="color:var(--brand)">✓</span></div>
      <div class="smeta">${esc(s.profiles.city||'')}</div>
      <div class="srating">⭐ <b>${s.rating??'–'}</b>${s.rating_count?` · ${s.rating_count} Bewertungen`:''}</div></div>
    </div>
    <div class="section"><h3>Über mich</h3><p style="font-size:13px;color:var(--muted);line-height:1.55">${esc(s.bio)}</p></div>
    ${pet?`<div class="section"><h3>🎯 Passung zu ${esc(pet.name)} ${m!==null?`(${m} %)`:''}</h3>
      ${(pet.needs||[]).map(n=>`<div class="lvlrow"><span class="${(s.caps||[]).includes(n)?'ok':'no'}">${(s.caps||[]).includes(n)?'✓':'○'}</span><span>${NEED_LABELS[n]||n}</span></div>`).join('')||'<p style="font-size:12px;color:var(--muted)">Keine Bedürfnisse hinterlegt – lege sie unter „Meine Tiere" fest.</p>'}
    </div>`:''}
    <div class="section"><h3>🎖️ Qualifikations-Level</h3>
      ${LEVELS.map((l,i)=>`<div class="lvlrow"><span class="${s.level>=i+1?'ok':'no'}">${s.level>=i+1?'✓':'○'}</span><span style="${s.level>=i+1?'':'color:var(--muted)'}">${l}</span></div>`).join('')}
    </div>
    <div class="section"><h3>Leistungen & Preise</h3>
      ${SERVICES.filter(x=>s.services?.[x.id]).map(x=>`<div class="svcrow"><span>${x.label}</span><b>${s.services[x.id]} € / ${x.unit}</b></div>`).join('')}
      <div class="note g">💚 ${esc(s.profiles.display_name.split(' ')[0])} behält 100 %. Bezahlung direkt – Pawkin kostet nichts.</div>
    </div>
    <button class="cta" id="ctaBook">Kostenlos anfragen</button>
    ${s.offers_meet!==false?'<button class="primary" id="ctaMeet" style="background:#fff;color:var(--brand-dark);border:1.5px solid var(--brand);margin-top:10px">🤝 Erst mal kennenlernen (gratis, ~30 Min)</button>':''}`;
  $('ctaBook').onclick = openBooking;
  if($('ctaMeet')) $('ctaMeet').onclick = openMeet;
  go('v-detail', null);
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v==='v-search'));
}


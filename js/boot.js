// ---------- Boot ----------
async function boot(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session){ return; }
  me = session.user;
  const {data:p} = await sb.from('profiles').select('*').eq('id', me.id).single();
  myProfile = p;
  $('hdr').style.display='flex';
  $('nav').style.display='flex';
  $('v-auth').classList.remove('active');
  if(myProfile?.is_sitter){ $('modePill').style.display='inline-block'; }
  else { $('becomePill').style.display='inline-block'; }
  if(myProfile?.lat != null){ state.myLoc = {lat: myProfile.lat, lng: myProfile.lng}; }
  if(myProfile?.plz){ $('locIn').value = myProfile.plz; }
  refreshBell(); setInterval(refreshBell, 30000);
  renderSvcChips();
  await Promise.all([loadSitters(), loadPets()]);
  renderResults();
  go('v-search', null);
}
window.toggleMode = () => {
  sitterMode = !sitterMode;
  $('modePill').textContent = sitterMode ? '🔁 Besitzer' : '🔁 Sitter';
  $('nav').style.display = sitterMode ? 'none' : 'flex';
  if(sitterMode){ $('sitterHello').textContent = `Hallo ${myProfile.display_name.split(' ')[0]} 👋 Dein Sitter-Bereich`; go('v-sitter', null); }
  else go('v-search', null);
};


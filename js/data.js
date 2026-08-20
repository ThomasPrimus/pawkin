// ---------- Daten laden ----------
async function loadSitters(){
  const {data, error} = await sb.from('sitters').select('*, profiles!inner(display_name, city, client_rating, plz, lat, lng)').eq('active', true);
  if(error){toast('Fehler beim Laden: '+error.message);return;}
  state.sitters = data||[];
}
async function geocode(q){
  try{
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=at,de,ch&q='+encodeURIComponent(q));
    const j = await r.json();
    if(j && j[0]) return {lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon)};
  }catch(e){}
  return null;
}
function distKm(a, b){
  if(!a || a.lat==null || b.lat==null) return null;
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
window.setLoc = async () => {
  const v = $('locIn').value.trim();
  if(!v){toast('Bitte PLZ oder Ort eingeben');return;}
  toast('Suche Standort…');
  const loc = await geocode(v);
  if(!loc){toast('Ort nicht gefunden – versuch z. B. „1070 Wien“');return;}
  state.myLoc = loc;
  await sb.from('profiles').update({plz: v, lat: loc.lat, lng: loc.lng}).eq('id', me.id);
  toast('Standort gesetzt 📍');
  renderResults();
};
window.setRadius = (r, btn) => {
  state.radius = r || null;
  document.querySelectorAll('.radch').forEach(b=>b.classList.toggle('on', b===btn));
  if(state.radius && !state.myLoc){ toast('Setze zuerst deinen Standort (PLZ eingeben + 📍)'); }
  renderResults();
};
async function loadPets(){
  const {data} = await sb.from('pets').select('*').order('created_at'); // RLS liefert eigene + geteilte Tiere
  state.pets = data||[];
}

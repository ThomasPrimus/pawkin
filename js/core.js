
const SERVICES = [
  {id:'board', label:'🏠 Übernachtung', unit:'Nacht'},
  {id:'day',   label:'☀️ Tagesbetreuung', unit:'Tag'},
  {id:'walk',  label:'🦮 Gassi-Runde', unit:'Runde'},
  {id:'visit', label:'🔑 Hausbesuch', unit:'Besuch'},
];
const SVC_LABEL = id => id==='meet' ? '🤝 Kennenlernen' : ((SERVICES.find(x=>x.id===id)||{}).label||id);
const NEED_LABELS = {med:'💊 Medikamentengabe', senior:'👴 Senioren-Erfahrung', garden:'🌿 Garten/Auslauf', social:'🐶 Verträgt andere Hunde', alone:'⏱️ Max. 4 Std. allein', shy:'🤫 Geduld mit scheuen Tieren', walks:'🦮 Mind. 2 Gassirunden/Tag', catx:'🐈 Katzen-Erfahrung'};
const LEVELS = ['Level 1 · Identität & Basis-Check', 'Level 2 · Erste-Hilfe-Kurs für Tiere', 'Level 3 · Zertifiziert für Medikamentengabe'];

let me = null, myProfile = null, authMode = 'login', sitterMode = false;
let state = { svc:'board', species:'dog', sitters:[], pets:[], cur:null, convWith:null, convTimer:null, myLoc:null, radius:null };

const $ = id => document.getElementById(id);
window.$ = $;
const esc = s => (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){const el=$('toast');el.textContent=t;el.style.display='block';setTimeout(()=>el.style.display='none',2800);}
function initials(n){return (n||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function go(v, btn){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  $(v).classList.add('active');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on', b===btn||b.dataset.v===v));
  window.scrollTo(0,0);
  if(state.convTimer && v!=='v-conv'){clearInterval(state.convTimer);state.convTimer=null;}
  if(v==='v-book') renderBookings();
  if(v==='v-chat') renderThreads();
  if(v==='v-pets') renderPets();
  if(v==='v-sitter') renderSitterBookings();
}
window.go = go;
function closeSheet(){$('ov').classList.remove('show');}
window.closeSheet = closeSheet;


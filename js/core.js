
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


// ---------- Aufenthalts-Zeitraum ----------
// date_text bleibt die menschenlesbare Anzeige. starts_on/ends_on sind die
// Wahrheit dafür, ob ein Aufenthalt läuft – ohne sie kann die App nicht
// wissen, ob "Heute zu tun" überhaupt gerade gilt.
// sv-SE liefert YYYY-MM-DD in Ortszeit; toISOString wäre UTC und würde
// abends einen Tag zu weit springen.
const heuteISO = () => new Date().toLocaleDateString('sv-SE');
const dTag = d => new Date(d+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
// Buchungen ohne Datum ("nach Absprache") sind 'offen' – sie dürfen nicht
// fälschlich als vorbei einsortiert werden.
function stayState(b){
  if(!b.starts_on && !b.ends_on) return 'offen';
  const h = heuteISO();
  if(b.starts_on && h < b.starts_on) return 'bevorstehend';
  if(b.ends_on   && h > b.ends_on)   return 'vorbei';
  return 'laeuft';
}
const STAY_BADGE = {
  laeuft:       '<span class="tag" style="background:var(--brand-light);color:var(--brand-dark)">● läuft gerade</span>',
  bevorstehend: '',
  vorbei:       '',
  offen:        '',
};
function zeitraumText(b){
  if(!b.starts_on) return b.date_text || 'nach Absprache';
  const bis = b.ends_on && b.ends_on !== b.starts_on ? ' – '+dTag(b.ends_on) : '';
  const n = naechte(b);
  return dTag(b.starts_on) + bis + (n ? ` · ${n} ${n===1?'Nacht':'Nächte'}` : '');
}
const naechte = b => (b.starts_on && b.ends_on)
  ? Math.round((new Date(b.ends_on) - new Date(b.starts_on))/86400000) : 0;
// Laufende zuerst, dann bevorstehende (nächste oben), dann der Rest.
const stayRank = b => ({laeuft:0, bevorstehend:1, offen:2, vorbei:3})[stayState(b)];

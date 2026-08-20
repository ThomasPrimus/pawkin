// ---------- Auth ----------
window.authTab = m => {
  authMode = m;
  $('tabLogin').classList.toggle('on', m==='login');
  $('tabReg').classList.toggle('on', m==='reg');
  $('fName').style.display = m==='reg'?'block':'none';
  $('fPhone').style.display = m==='reg'?'block':'none';
  $('fSitter').style.display = m==='reg'?'flex':'none';
  $('aBtn').textContent = m==='reg'?'Kostenlos registrieren':'Anmelden';
};
window.doAuth = async () => {
  const email = $('aEmail').value.trim(), pass = $('aPass').value;
  const errEl = $('aErr'); errEl.style.display='none';
  if(!email || pass.length<6){errEl.textContent='Bitte E-Mail und Passwort (mind. 6 Zeichen) angeben.';errEl.style.display='block';return;}
  $('aBtn').textContent = 'Einen Moment…';
  try{
    if(authMode==='reg'){
      const res = await fetch(SUPABASE_URL+'/functions/v1/signup', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+SUPABASE_KEY},
        body: JSON.stringify({email, password:pass, display_name:$('aName').value.trim()||email.split('@')[0], is_sitter:$('aSitter').checked, phone:$('aPhone').value.trim()})
      });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||'Registrierung fehlgeschlagen');
    }
    const {error} = await sb.auth.signInWithPassword({email, password:pass});
    if(error) throw error;
    await boot();
  }catch(e){
    errEl.textContent = e.message==='Invalid login credentials'?'E-Mail oder Passwort falsch.':e.message;
    errEl.style.display='block';
  }
  window.authTab(authMode);
};
window.logout = async () => { await sb.auth.signOut(); location.reload(); };
window.oauth = async (provider) => {
  const {error} = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.href.split('#')[0].split('?')[0] } });
  if(error){
    const errEl = $('aErr');
    errEl.textContent = /not enabled|disabled/i.test(error.message)
      ? (provider==='google'?'Google':'Apple')+'-Login ist noch nicht freigeschaltet – kommt in Kürze! Nutze solange E-Mail & Passwort.'
      : error.message;
    errEl.style.display='block';
  }
};


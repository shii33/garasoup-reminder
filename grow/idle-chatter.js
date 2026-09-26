(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  if(window.__wareraIdleChatterBooted)return;
  window.__wareraIdleChatterBooted=true;

  let nextAt=Date.now()+22000+Math.random()*16000;

  function schedule(min=20000,max=45000){
    nextAt=Date.now()+min+Math.random()*(max-min);
  }

  function canTalk(){
    try{
      if(typeof S==='undefined'||!S)return false;
      if(typeof stage!=='function'||stage()[0]==='egg')return false;
      if(typeof isAsleep==='function'&&isAsleep())return false;
      return !!document.getElementById('g12speech');
    }catch(e){return false}
  }

  async function chatter(){
    if(Date.now()<nextAt)return;
    schedule();
    if(!canTalk())return;

    try{
      const prev=String(S.lastSpeech||'');
      let chosen=null,spoken='';
      for(let i=0;i<5;i++){
        const e=typeof entryFor==='function'?entryFor(typeof idleSpeechKey==='function'?idleSpeechKey():'idle'):null;
        if(!e)continue;
        const sp=typeof earlySpeech==='function'?earlySpeech('idle',e):{text:e.text||'',entry:e};
        const t=String(sp?.text||'').trim();
        if(!t)continue;
        chosen=sp.entry||null;
        spoken=t;
        if(t!==prev)break;
      }
      if(!spoken||spoken===prev)return;

      S.lastSpeech=spoken;
      if(typeof currentSpeechEntry!=='undefined')currentSpeechEntry=chosen;
      if(typeof recordRecent==='function')recordRecent('speech',spoken);
      const el=document.getElementById('g12speech');
      if(el)el.textContent=spoken;
      if(typeof save==='function')await save();
    }catch(e){
      console.warn('idle chatter failed',e);
    }
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-a],[data-e],#g12like,#g12memoryBtn'))schedule(26000,48000);
  },true);

  setInterval(chatter,3000);
})();

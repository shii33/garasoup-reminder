(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  if(window.__wareraAdultMotionBooted)return;
  window.__wareraAdultMotionBooted=true;

  const HOLD_MS=9000;
  const HOLD_FILES=new Set([
    'adult_eat.png','adult_bath.png','adult_toilet.png','adult_head_pat.png','adult_shy.png',
    'adult_cheer.png','adult_angry.png','adult_pout.png','adult_troubled.png','adult_sleep.png',
    'adult_left.png','adult_right.png','adult_front.png'
  ]);

  function isAdult(){
    return !!document.getElementById('g12stage')?.textContent?.includes('おとな');
  }

  function install(){
    if(window.__wareraAdultMotionInstalled)return true;
    if(typeof window.reactionPet!=='function'||typeof window.setPet!=='function'||typeof window.idleOptions!=='function'||typeof window.currentPet!=='function')return false;

    const originalReaction=window.reactionPet;
    const originalSetPet=window.setPet;
    const originalIdleOptions=window.idleOptions;
    const originalCurrentPet=window.currentPet;
    let heldFile='';
    let heldUntil=0;

    function holdActive(){
      if(!heldFile)return false;
      if(Date.now()>=heldUntil){heldFile='';heldUntil=0;return false}
      return true;
    }

    window.reactionPet=function(a,repeat,rare){
      if(!isAdult())return originalReaction(a,repeat,rare);
      const r=Math.random();
      if(a==='feed'){
        if(repeat>=4)return r<.55?'adult_pout.png':'adult_troubled.png';
        return r<.78?'adult_eat.png':r<.91?'adult_cheer.png':'adult_front.png';
      }
      if(a==='bath'){
        if(repeat>=4)return r<.6?'adult_pout.png':'adult_troubled.png';
        return r<.86?'adult_bath.png':r<.94?'adult_cheer.png':'adult_shy.png';
      }
      if(a==='toilet')return r<.86?'adult_toilet.png':r<.94?'adult_troubled.png':'adult_front.png';
      if(a==='pat'){
        if(rare)return'adult_shy.png';
        if(repeat>=5)return r<.55?'adult_angry.png':'adult_pout.png';
        if(repeat>=3)return r<.52?'adult_pout.png':'adult_head_pat.png';
        return r<.58?'adult_head_pat.png':r<.82?'adult_shy.png':'adult_cheer.png';
      }
      if(a==='play'){
        if(repeat>=5)return r<.48?'adult_angry.png':r<.78?'adult_pout.png':'adult_troubled.png';
        if(repeat>=3)return r<.34?'adult_pout.png':r<.67?'adult_left.png':'adult_right.png';
        return r<.38?'adult_cheer.png':r<.69?'adult_left.png':'adult_right.png';
      }
      if(a==='sleep')return'adult_sleep.png';
      return originalReaction(a,repeat,rare);
    };

    window.setPet=function(file,ms=0,anim=''){
      const adult=isAdult();
      const timed=Number(ms)||0;
      if(adult&&timed>0&&HOLD_FILES.has(file)){
        heldFile=file;
        heldUntil=Date.now()+HOLD_MS;
        return originalSetPet(file,HOLD_MS,anim);
      }
      if(adult&&holdActive()&&file!==heldFile){
        return originalSetPet(heldFile,0,'');
      }
      return originalSetPet(file,ms,anim);
    };

    window.currentPet=function(){
      if(isAdult()&&holdActive())return heldFile;
      return originalCurrentPet();
    };

    window.idleOptions=function(){
      if(isAdult()&&holdActive())return[{f:heldFile,a:'idle-breathe',w:1,fx:''}];
      const base=originalIdleOptions();
      if(!isAdult()||!Array.isArray(base))return base;
      return base.concat([
        {f:'adult_cheer.png',a:'bounce',w:.7,fx:'!'},
        {f:'adult_shy.png',a:'squish',w:.45,fx:'♡'},
        {f:'adult_pout.png',a:'idle-doze',w:.55,fx:'…'},
        {f:'adult_sad.png',a:'idle-doze',w:.35,fx:'…'},
        {f:'adult_angry.png',a:'idle-shuffle',w:.18,fx:'!'},
        {f:'adult_cry.png',a:'idle-doze',w:.08,fx:'…'}
      ]);
    };

    window.__wareraAdultMotionInstalled=true;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=80)clearInterval(timer);
  },250);
  setTimeout(install,0);
})();

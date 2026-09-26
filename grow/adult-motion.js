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

  let domLockSrc='';
  let domLockUntil=0;
  let restoring=false;

  function domLockActive(){
    if(!domLockSrc)return false;
    if(Date.now()>=domLockUntil){
      domLockSrc='';
      domLockUntil=0;
      return false;
    }
    return true;
  }

  function releaseDomLock(){
    domLockSrc='';
    domLockUntil=0;
  }

  function restoreLockedPet(){
    if(restoring||!domLockActive())return;
    const img=document.getElementById('g12pet');
    if(!img||img.src===domLockSrc)return;
    restoring=true;
    img.src=domLockSrc;
    queueMicrotask(()=>{restoring=false});
  }

  function lockVisiblePet(){
    if(!isAdult())return;
    const img=document.getElementById('g12pet');
    if(!img?.src)return;
    domLockSrc=img.src;
    domLockUntil=Date.now()+HOLD_MS;
    restoreLockedPet();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('#g12actions [data-a]');
    if(!b||b.disabled||!isAdult())return;
    releaseDomLock();
    window.__wareraAdultMotionReleaseHold?.();
    setTimeout(lockVisiblePet,80);
    setTimeout(lockVisiblePet,220);
  },true);

  const domObserver=new MutationObserver(mutations=>{
    if(!domLockActive())return;
    for(const m of mutations){
      if(m.type==='attributes'&&m.target?.id==='g12pet'&&m.attributeName==='src'){
        restoreLockedPet();
        break;
      }
    }
  });
  domObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['src']});
  setInterval(()=>{if(domLockActive())restoreLockedPet()},250);

  function install(){
    if(window.__wareraAdultMotionInstalled)return true;
    if(typeof window.reactionPet!=='function'||typeof window.setPet!=='function'||typeof window.idleOptions!=='function'||typeof window.currentPet!=='function'||typeof window.act!=='function')return false;

    const originalReaction=window.reactionPet;
    const originalSetPet=window.setPet;
    const originalIdleOptions=window.idleOptions;
    const originalCurrentPet=window.currentPet;
    const originalAct=window.act;
    let heldFile='';
    let heldUntil=0;

    function releaseHold(){
      heldFile='';
      heldUntil=0;
    }
    window.__wareraAdultMotionReleaseHold=releaseHold;

    function holdActive(){
      if(!heldFile)return false;
      if(Date.now()>=heldUntil){releaseHold();return false}
      return true;
    }

    window.act=async function(a){
      let existingPoopDue=0;
      try{
        if(a==='feed'&&typeof S!=='undefined'&&S&&!S.poop){
          const due=Number(S.poopDueAt||0);
          if(due>Date.now())existingPoopDue=due;
        }
      }catch(e){}

      const result=await originalAct(a);

      if(a==='feed'){
        try{
          if(typeof S!=='undefined'&&S&&!S.poop){
            const fasterDue=Date.now()+(45+Math.random()*75)*60000;
            S.poopDueAt=existingPoopDue?Math.min(existingPoopDue,fasterDue):fasterDue;
            if(typeof save==='function')await save();
          }
        }catch(e){console.warn('grow poop schedule adjust failed',e)}
      }
      return result;
    };

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
        if(repeat>=3)return r<.34?'adult_pout.png':r<.70?'adult_cheer.png':r<.85?'adult_front.png':r<.925?'adult_left.png':'adult_right.png';
        return r<.55?'adult_cheer.png':r<.78?'adult_front.png':r<.89?'adult_left.png':'adult_right.png';
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
      const extra=[
        {f:'adult_phone.png',a:'idle-breathe',w:4.5,fx:''},
        {f:'adult_sit_front.png',a:'idle-breathe',w:2.6,fx:''},
        {f:'adult_sit_back.png',a:'idle-peek',w:1.6,fx:''},
        {f:'adult_doze_sit.png',a:'idle-doze',w:2.4,fx:'…'},
        {f:'adult_lie_down.png',a:'idle-breathe',w:2.2,fx:''},
        {f:'adult_cheer.png',a:'bounce',w:.7,fx:'!'},
        {f:'adult_shy.png',a:'squish',w:.45,fx:'♡'},
        {f:'adult_pout.png',a:'idle-doze',w:.55,fx:'…'},
        {f:'adult_sad.png',a:'idle-doze',w:.35,fx:'…'},
        {f:'adult_angry.png',a:'idle-shuffle',w:.18,fx:'!'}
      ];
      try{
        if(typeof minsSince==='function'&&minsSince('pat')>720&&minsSince('play')>600){
          extra.push({f:'adult_cry.png',a:'idle-doze',w:.65,fx:'…'});
        }
      }catch(e){}
      return base.concat(extra);
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

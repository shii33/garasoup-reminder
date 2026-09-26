(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const VER='20260926-v10-3';
  const fallback=()=>{console.warn('われわれ育成所v10の読み込みに失敗');};
  (async()=>{
    try{
      const parts=await Promise.all(Array.from({length:6},(_,i)=>
        fetch(`./ux-v10/part${i+1}.txt?v=${VER}`,{cache:'no-store'}).then(r=>{
          if(!r.ok)throw new Error(`v10 part${i+1}: ${r.status}`);
          return r.text();
        })
      ));
      let src=parts.join('');
      const oldLoad="async function loadCorpus(){try{const scenes=await window.WareraData?.memories?.('../');if(scenes?.length)return buildCorpus(scenes,G)}catch(e){console.warn('grow corpus fallback',e)}return buildCorpus([],G)}";
      const newLoad=`function quizToScenes(q){const out=[];let n=0;for(const x of q?.who||[]){if(!x||!x.quote||!x.answer)continue;out.push({id:'quiz-who-'+(n++),date:x.date||'',lines:[{who:x.answer,text:x.quote}]})}for(const x of q?.next||[]){if(!x)continue;const lines=[];if(x.prompt&&x.prompt_who)lines.push({who:x.prompt_who,text:x.prompt});if(x.answer&&x.answer_who)lines.push({who:x.answer_who,text:x.answer});if(lines.length)out.push({id:'quiz-next-'+(n++),date:x.date||'',lines})}return out}\nfunction mergeQuizCorpus(base,extra){const seen=new Set(Object.entries(base.pools).flatMap(([k,a])=>(a||[]).map(e=>k+'\\0'+e.text)));for(const [k,rows] of Object.entries(extra.pools||{})){if(k==='memory')continue;for(const e of rows||[])addPool(base.pools,k,e,seen)}base.tokens=[...new Set([...(base.tokens||[]),...(extra.tokens||[])])].slice(0,12);base.count=new Set(Object.values(base.pools).flat().map(x=>x.text)).size;return base}\nasync function loadCorpus(){let base=buildCorpus([],G);try{const scenes=await window.WareraData?.memories?.('../');if(scenes?.length)base=buildCorpus(scenes,G)}catch(e){console.warn('grow memories corpus fallback',e)}try{const q=await window.WareraData?.expandedQuiz?.('../');if(q)base=mergeQuizCorpus(base,buildCorpus(quizToScenes(q),G))}catch(e){console.warn('grow full-log corpus fallback',e)}return base}`;
      if(!src.includes(oldLoad))throw new Error('v10 corpus patch target not found');
      src=src.replace(oldLoad,newLoad);

      const oldAsset="const N={み:'みちゃこ',も:'もっち'},ASSET='./assets/pets/common/',ROOM='./assets/room/';";
      const newAsset=`const N={み:'みちゃこ',も:'もっち'},ASSET='./assets/pets/common/',CHAR_ASSET='./assets/pets/characters/',ROOM='./assets/room/';
const ADULT_PET_MAP={
  'adult_front.png':'adult_front','adult_right.png':'adult_right','adult_left.png':'adult_left','adult_back.png':'adult_back',
  'adult_sit_front.png':'adult_sit_front','adult_sit_back.png':'adult_sit_back','adult_cheer.png':'adult_cheer','adult_angry.png':'adult_angry',
  'adult_pout.png':'adult_pout','adult_sad.png':'adult_sad','adult_shy.png':'adult_shy','adult_cry.png':'adult_cry',
  'adult_lie_down.png':'adult_lie_down','adult_sleep.png':'adult_sleep','adult_troubled.png':'adult_troubled','adult_eat.png':'adult_eat',
  'adult_bath.png':'adult_bath','adult_toilet.png':'adult_toilet','adult_head_pat.png':'adult_head_pat','adult_phone.png':'adult_phone','adult_doze_sit.png':'adult_doze_sit',
  'adult_happy.png':'adult_front','adult_cool.png':'adult_pout','adult_tsundere.png':'adult_angry','adult_love.png':'adult_shy',
  'stand_front.png':'adult_front','stand_left.png':'adult_left','quarter_left.png':'adult_right','stand_back.png':'adult_back','sit_sad.png':'adult_sad','crawl_angry.png':'adult_angry',
  'hold_heart.png':'adult_shy','eat_onigiri.png':'adult_eat','eat_fish.png':'adult_eat'
};
const LEGACY_PET_MAP={
  'adult_front.png':'stand_front.png','adult_right.png':'quarter_left.png','adult_left.png':'stand_left.png','adult_back.png':'stand_back.png',
  'adult_sit_front.png':'sit_sad.png','adult_sit_back.png':'stand_back.png','adult_cheer.png':'adult_happy.png','adult_angry.png':'crawl_angry.png',
  'adult_pout.png':'adult_cool.png','adult_sad.png':'sit_sad.png','adult_shy.png':'hold_heart.png','adult_cry.png':'sit_sad.png',
  'adult_lie_down.png':'blanket_rest.png','adult_sleep.png':'blanket_rest.png','adult_troubled.png':'sit_sad.png','adult_eat.png':'eat_onigiri.png',
  'adult_bath.png':'stand_front.png','adult_toilet.png':'stand_front.png','adult_head_pat.png':'hold_heart.png','adult_phone.png':'stand_front.png','adult_doze_sit.png':'sit_sad.png'
};
function targetPetPrefix(){return G==='も'?'mocchi':'michako'}
function legacyPetFile(file){return LEGACY_PET_MAP[file]||file}
function petStageKey(file){
  const st=stage()[0];
  if(st==='egg')return'egg_idle';
  if(st==='baby'){
    const m={'baby_idle.png':'baby_front','baby_front.png':'baby_front','baby_right.png':'baby_right','baby_left.png':'baby_left','baby_back.png':'baby_back','stand_front.png':'baby_front','stand_left.png':'baby_left','quarter_left.png':'baby_right','stand_back.png':'baby_back'};
    return m[file]||null;
  }
  if(st==='child'){
    const m={'child_plain.png':'child_front','child_happy.png':'child_cheer','child_front.png':'child_front','child_right.png':'child_right','child_left.png':'child_left','child_back.png':'child_back','child_cheer.png':'child_cheer','stand_front.png':'child_front','stand_left.png':'child_left','quarter_left.png':'child_right','stand_back.png':'child_back','adult_cheer.png':'child_cheer'};
    if(m[file])return m[file];
    if(['adult_eat.png','eat_onigiri.png','eat_fish.png','adult_head_pat.png','hold_heart.png'].includes(file))return'child_cheer';
    return null;
  }
  return ADULT_PET_MAP[file]||null;
}
function petUrl(file){const key=petStageKey(file);return key?CHAR_ASSET+targetPetPrefix()+'_'+key+'.png':ASSET+legacyPetFile(file)}
function applyPetSrc(el,file){const key=petStageKey(file),fallbackUrl=ASSET+legacyPetFile(file);if(!key){el.onerror=null;el.src=fallbackUrl;return}el.onerror=()=>{el.onerror=null;el.src=fallbackUrl};el.src=CHAR_ASSET+targetPetPrefix()+'_'+key+'.png'}
async function petImage(file){const key=petStageKey(file);if(key){try{return await img(CHAR_ASSET+targetPetPrefix()+'_'+key+'.png')}catch(e){}}return img(ASSET+legacyPetFile(file))}`;
      if(!src.includes(oldAsset))throw new Error('character asset patch target not found');
      src=src.replace(oldAsset,newAsset);

      src=src.replace(/function basePet\(\)\{.*?\}\nfunction currentPet/s,`function basePet(){const st=stage()[0];if(st==='egg')return'egg_idle.png';if(st==='baby')return'baby_front.png';if(st==='child')return S.childType==='affection'?'child_cheer.png':'child_front.png';return'adult_front.png'}\nfunction currentPet`);
      src=src.replace(/function currentPet\(\)\{.*?\}\nfunction reactionPet/s,`function currentPet(){const st=stage()[0];if(st==='egg')return'egg_idle.png';if(isAsleep())return st==='adult'?'adult_sleep.png':'blanket_rest.png';const m=moment();if(m.key==='play'&&minsSince('play')>300)return st==='adult'?'adult_sad.png':basePet();return basePet()}\nfunction reactionPet`);
      src=src.replace(/function reactionPet\(a,repeat,rare\)\{.*?\}\nfunction setPet/s,`function reactionPet(a,repeat,rare){const st=stage()[0];if(st==='egg')return'';if(st==='baby'){if(a==='play')return Math.random()<.5?'baby_left.png':'baby_right.png';return'baby_front.png'}if(st==='child'){if(['feed','play','pat'].includes(a))return'child_cheer.png';if(a==='sleep')return'blanket_rest.png';return'child_front.png'}if(a==='feed')return'adult_eat.png';if(a==='bath')return'adult_bath.png';if(a==='toilet')return'adult_toilet.png';if(a==='pat')return rare?'adult_shy.png':'adult_head_pat.png';if(a==='sleep')return'adult_sleep.png';if(a==='play')return Math.random()<.45?'adult_cheer.png':Math.random()<.5?'adult_left.png':'adult_right.png';if(repeat>=4)return'adult_angry.png';return''}\nfunction setPet`);
      src=src.replace(/function setPet\(file,ms=0,anim=''\)\{.*?\}\nfunction recordRecent/s,`function setPet(file,ms=0,anim=''){const el=$('g12pet');if(!el)return;const shown=stage()[0]==='egg'?'egg_idle.png':file;applyPetSrc(el,shown);if(anim){el.classList.remove('bounce','wiggle','squish');void el.offsetWidth;el.classList.add(anim);setTimeout(()=>el.classList.remove(anim),650)}if(ms)setTimeout(()=>{const x=$('g12pet');if(x)applyPetSrc(x,stage()[0]==='egg'?'egg_idle.png':currentPet())},ms)}\nfunction recordRecent`);

      src=src.replace(/function idleOptions\(\)\{.*?return a\}/s,`function idleOptions(){const st=stage()[0],p=S.personality||'',child=S.childType||'';if(st==='egg')return[{f:'egg_idle.png',a:'wiggle',w:5,fx:''},{f:'egg_idle.png',a:'squish',w:2,fx:'…'},{f:'egg_idle.png',a:'wiggle',w:1,fx:'？'}];if(isAsleep())return[{f:st==='adult'?'adult_sleep.png':'blanket_rest.png',a:'idle-breathe',w:7,fx:''},{f:st==='adult'?'adult_sleep.png':'blanket_rest.png',a:'idle-doze',w:3,fx:'Zzz'},{f:st==='adult'?'adult_sleep.png':'blanket_rest.png',a:'wiggle',w:1,fx:'…'}];if(st==='baby')return[{f:'baby_front.png',a:'idle-breathe',w:7},{f:'baby_left.png',a:'idle-shuffle',w:2},{f:'baby_right.png',a:'idle-shuffle',w:2},{f:'baby_back.png',a:'idle-peek',w:1}];if(st==='child'){const a=[{f:'child_front.png',a:'idle-breathe',w:6},{f:'child_left.png',a:'idle-shuffle',w:2},{f:'child_right.png',a:'idle-shuffle',w:2},{f:'child_back.png',a:'idle-peek',w:1},{f:'child_cheer.png',a:'bounce',w:child==='affection'?2.5:1}];return a}let a=[{f:'adult_front.png',a:'idle-breathe',w:5},{f:'adult_left.png',a:'idle-shuffle',w:2.4},{f:'adult_right.png',a:'idle-shuffle',w:2.4},{f:'adult_back.png',a:'idle-breathe',w:1.2},{f:'adult_sit_front.png',a:'idle-breathe',w:2},{f:'adult_sit_back.png',a:'idle-peek',w:.8},{f:'adult_phone.png',a:'idle-breathe',w:1.5},{f:'adult_doze_sit.png',a:'idle-doze',w:1.4,fx:'…'},{f:'adult_lie_down.png',a:'idle-breathe',w:1},{f:'adult_troubled.png',a:'idle-doze',w:.6,fx:'…'}];if(p==='dere')a.push({f:'adult_shy.png',a:'squish',w:2.6,fx:'♡'},{f:'adult_cheer.png',a:'bounce',w:1.8,fx:'♡'});if(p==='aloof')a.push({f:'adult_back.png',a:'idle-breathe',w:3.5},{f:'adult_left.png',a:'idle-shuffle',w:2.5},{f:'adult_pout.png',a:'idle-doze',w:1.2,fx:'…'},{f:'adult_shy.png',a:'squish',w:.35,fx:'♡'});if(p==='tsundere')a.push({f:'adult_angry.png',a:'idle-shuffle',w:1.4,fx:'…'},{f:'adult_pout.png',a:'idle-doze',w:2},{f:'adult_back.png',a:'idle-breathe',w:2},{f:'adult_shy.png',a:'squish',w:.7,fx:'♡'});return a}`);

      src=src.replace("const pet=await img(ASSET+currentPet());","const pet=await petImage(currentPet());");
      src=src.replace("today=()=>new Date().toISOString().slice(0,10)","today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}");
      src=src.replace("function ageDays(){return Math.max(0,Math.floor((new Date()-new Date((S.born||today())+'T00:00:00'))/864e5))}","function ageDays(){return Math.max(1,Math.floor((new Date()-new Date((S.born||today())+'T00:00:00'))/864e5)+1)}");
      src=src.replace("document.querySelector('.conversation-shell')?.append(x);wire()","(document.querySelector('.conversation-shell')||document.querySelector('main')||document.body).append(x);wire()");
      src=src.replace('ログから拾った反応候補','ログ由来の反応候補');
      const blob=new Blob([src],{type:'text/javascript'}),url=URL.createObjectURL(blob),s=document.createElement('script');
      s.src=url;s.onload=()=>URL.revokeObjectURL(url);s.onerror=()=>{URL.revokeObjectURL(url);fallback()};document.head.append(s);
    }catch(e){console.error(e);fallback()}
  })();
})();
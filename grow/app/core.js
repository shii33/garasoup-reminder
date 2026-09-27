export const NAMES={み:'みちゃこ',も:'もっち'};
export const DB_NAME='warera-grow';
export const STORE='pets';
export const KEY_PREFIX='warera_grow_v1_';
export const ROOM='./assets/room/';
export const COMMON_ASSET='./assets/pets/common/';
export const CHAR_ASSET='./assets/pets/';

const BLOCK=/https?:\/\/|画像は含まれていません|スタンプは含まれていません|ビデオは含まれていません|メッセージをピン留め|アンケート:|音声通話|ビデオ通話|このメッセージは削除されました/i;
const RX={
  morning:/おは|起き|おき|寝た|ねた|朝|お目覚め/,
  sleep:/おやす|ねる|寝る|ねむ|眠|オフトゥン|すや|おふとん/,
  feed:/ごはん|ご飯|飯|食べ|食う|腹|おなか|お腹|うま|おいし|美味|ランチ|おやつ|めし/,
  bath:/風呂|フロ|おふろ|カラダ・アラウ|シャワ|洗う|洗って|湯気/,
  affection:/好き|すき|しゅき|かわい|可愛|愛|メロ|はすはす|ぎゅ|ちゅ|幸せ|会いた|会えて|うれし|嬉し/,
  play:/w{2,}|草|わろ|遊|しょもしょも|ゲーム|おもろ|面白|笑|www|なんやこれ|なにこれ/,
  surprise:/ﾊｯ|ハッ|え[？?！!]|ま[？?]|なんで|はーん|ほう|うそ|マジ|まじ/,
  tease:/やめ|こら|おい|なんや|なにそれ|はいはい|うるさ|近い|しつこ|www|w{3,}/,
  ack:/^(うい|ういー|おけ|おけー|おけけ|りょ|了解|ふむ|ほう|そそ|あーね|なる|なるほど|はい|へい|よし|ん|うん)[！!。ー〜～w\s]*(.*)?$/i,
  return:/おかえり|ただいま|おつ|お疲れ|おつかれ|また明日|きた|来た/,
  comfort:/大丈夫|だいじょ|無理|むり|休|ゆっくり|よしよし|えらい|偉い/,
  rareLove:/大好き|だいすき|好きだ|すきだ|幸せ|しあわせ|会いたい|かわいい|可愛い|愛して|しゅき|メロ/,
};
export {RX};

const FALLBACK={
  み:{idle:['そそ','なある！','あーねw','おけけ','だん！','なんやこれ','もーなにこれ'],morning:['おはよん( ´꒳` )','あーんおはよ( ´꒳` )'],sleep:['おやすみーーん！！','ねるよーー！！'],feed:['おなかすいた','飯！','うまそ'],bath:['フロダン！','カラダ・アラウ'],play:['wwww','しょもしょも…','なんやこれw'],affection:['かわいいってば','ほんとすき','しゅきー'],tease:['やめろw','もーなにこれ'],surprise:['ﾊｯ！！！！！！！','え？'],return:['おかえりー'],comfort:['だいじょぶ','えらい']},
  も:{idle:['ういー','ほう','ふむ','おけー','あーねwww','うぇいよー','そりゃあねぇw'],morning:['おはよーん','おはよーーー！'],sleep:['おやすみね','また明日ねーー','おれもねるだよーーー'],feed:['腹へった','飯たすかる'],bath:['おつだああああん','カラダ・アラウ'],play:['wwww','しょもしょも','楽しい。'],affection:['気が合いますねえ（好き','今日もかわいかったぞ','んふふ'],tease:['はいはいw','近い。','なにw'],surprise:['ﾊｯ','はーーーん？'],return:['おかえりー','おつかれさーん'],comfort:['無理すんなよ','ゆっくりしな']},
};

export const getViewer=()=>{try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch{return'み'}};
export const now=()=>Date.now();
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const cleanText=t=>String(t||'').replace(/[\u200e\u200f]/g,'').trim();
const usable=t=>{t=cleanText(t);return !!t&&t.length<=90&&t.split('\n').length<=3&&!BLOCK.test(t)};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a=0,b=9999)=>Math.max(a,Math.min(b,Number(v)||0));

function openDb(){
  return new Promise((resolve,reject)=>{
    try{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'})};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    }catch(error){reject(error)}
  });
}

function addPool(pools,key,entry,seen){
  if(!pools[key])pools[key]=[];
  const uniqueKey=key+'\0'+entry.text;
  if(seen.has(uniqueKey))return;
  seen.add(uniqueKey);
  pools[key].push(entry);
}

function buildCorpus(scenes,target){
  const pools={idle:[],short:[],morning:[],sleep:[],feed:[],bath:[],play:[],affection:[],rareLove:[],tease:[],surprise:[],ack:[],return:[],comfort:[],memory:[]};
  const seen=new Set();
  const sceneMap=new Map();
  const tokens=new Map();

  for(const scene of scenes||[]){
    sceneMap.set(String(scene.id),scene);
    const lines=(scene.lines||[]).filter(x=>x&&usable(x.text));
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(line.who!==target)continue;
      const text=cleanText(line.text);
      const prev=i?cleanText(lines[i-1]?.text):'';
      const entry={text,date:scene.date||'',sceneId:String(scene.id||''),prev};
      if(text.length<=42)addPool(pools,'idle',entry,seen);
      if(text.length<=16)addPool(pools,'short',entry,seen);
      for(const [key,rx] of Object.entries(RX)){
        if(key==='rareLove')continue;
        if(rx.test(text)||rx.test(prev))addPool(pools,key,entry,seen);
      }
      if(RX.rareLove.test(text)&&text.length<=58)addPool(pools,'rareLove',entry,seen);
      if(text.length<=58)addPool(pools,'memory',entry,seen);
      for(const word of ['おけけ','しょもしょも','オフトゥン','だん','かわいい','好き','すき','www','w','あーね','ほう','ふむ','うい','われわれ','カラダ・アラウ','はすはす','メロ']){
        if(text.includes(word))tokens.set(word,(tokens.get(word)||0)+1);
      }
    }
  }

  for(const key of Object.keys(pools)){
    const limit=key==='idle'?1800:key==='memory'?1200:600;
    if(pools[key].length>limit){
      const step=pools[key].length/limit;
      pools[key]=Array.from({length:limit},(_,i)=>pools[key][Math.floor(i*step)]);
    }
  }

  return{
    pools,
    sceneMap,
    tokens:[...tokens.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]),
    count:new Set(Object.values(pools).flat().map(x=>x.text)).size,
  };
}

function quizToScenes(quiz){
  const out=[];
  let n=0;
  for(const item of quiz?.who||[]){
    if(item?.quote&&item?.answer)out.push({id:'quiz-who-'+n++,date:item.date||'',lines:[{who:item.answer,text:item.quote}]});
  }
  for(const item of quiz?.next||[]){
    if(!item)continue;
    const lines=[];
    if(item.prompt&&item.prompt_who)lines.push({who:item.prompt_who,text:item.prompt});
    if(item.answer&&item.answer_who)lines.push({who:item.answer_who,text:item.answer});
    if(lines.length)out.push({id:'quiz-next-'+n++,date:item.date||'',lines});
  }
  return out;
}

function mergeQuizCorpus(base,extra){
  const seen=new Set(Object.entries(base.pools).flatMap(([key,rows])=>(rows||[]).map(entry=>key+'\0'+entry.text)));
  for(const [key,rows] of Object.entries(extra.pools||{})){
    if(key==='memory')continue;
    for(const entry of rows||[])addPool(base.pools,key,entry,seen);
  }
  base.tokens=[...new Set([...(base.tokens||[]),...(extra.tokens||[])])].slice(0,12);
  base.count=new Set(Object.values(base.pools).flat().map(x=>x.text)).size;
  return base;
}

export class GrowModel{
  constructor(viewer=getViewer()){
    this.viewer=viewer;
    this.target=viewer==='み'?'も':'み';
    this.state=null;
    this.corpus=null;
    this.currentSpeechEntry=null;
  }

  key(){return `${KEY_PREFIX}${this.viewer}_${this.target}`}

  fresh(){
    return{
      id:this.key(),version:20,viewer:this.viewer,target:this.target,born:today(),stageRank:0,experience:0,totalCare:0,
      actions:{},lastActionAt:{},recent:[],traits:{clingy:0,independent:0,overcare:0,playful:0,gentle:0},eggActions:{},
      nights:0,lastNight:'',childType:'',childTypeVersion:0,personality:'',personalityVersion:0,
      favoritePhrases:{},learned:{},lastSpeech:'……',lastVisitAt:now(),manualSleepUntil:0,nightPlayUntil:0,morningWakeDate:'',
      poop:false,poopDueAt:0,updatedAt:now(),
    };
  }

  async readDb(){
    try{
      const db=await openDb();
      const value=await new Promise((resolve,reject)=>{
        const request=db.transaction(STORE,'readonly').objectStore(STORE).get(this.key());
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error);
      });
      db.close();
      return value;
    }catch{return null}
  }

  readLocal(){try{return JSON.parse(localStorage.getItem(this.key())||'null')}catch{return null}}

  async load(){
    const [db,local]=await Promise.all([this.readDb(),Promise.resolve(this.readLocal())]);
    this.state=db&&local?(Number(db.updatedAt||0)>=Number(local.updatedAt||0)?db:local):(db||local)||this.fresh();
    this.migrate();
    await this.loadCorpus();
    this.initializeSpeech();
    await this.save();
    return this;
  }

  async save(){
    const state=this.state;
    state.id=this.key();
    state.viewer=this.viewer;
    state.target=this.target;
    state.version=20;
    state.updatedAt=now();
    try{localStorage.setItem(this.key(),JSON.stringify(state))}catch{}
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const request=db.transaction(STORE,'readwrite').objectStore(STORE).put(state);
        request.onsuccess=()=>resolve();
        request.onerror=()=>reject(request.error);
      });
      db.close();
    }catch{}
  }

  async remove(){
    try{localStorage.removeItem(this.key())}catch{}
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const request=db.transaction(STORE,'readwrite').objectStore(STORE).delete(this.key());
        request.onsuccess=()=>resolve();
        request.onerror=()=>reject(request.error);
      });
      db.close();
    }catch{}
  }

  migrate(){
    const state=this.state||this.fresh();
    const legacyXP=Number(state.growthXP||0);
    if(state.version<20||state.stageRank==null){
      state.stageRank=legacyXP>=520?3:legacyXP>=200?2:legacyXP>=48?1:0;
      state.experience=Math.max(Number(state.experience||0),Math.round(Number(state.totalCare||0)*1.2),state.stageRank===3?48:state.stageRank===2?16:state.stageRank===1?5:0);
    }
    state.version=20;
    state.actions=state.actions||{};
    state.lastActionAt=state.lastActionAt||{};
    state.recent=Array.isArray(state.recent)?state.recent:[];
    state.traits=state.traits||{};
    for(const key of ['clingy','independent','overcare','playful','gentle'])state.traits[key]=Number(state.traits[key]||0);
    if(state.profile){
      state.traits.clingy=Math.max(state.traits.clingy,Number(state.profile.affection||0)*.35);
      state.traits.independent=Math.max(state.traits.independent,Number(state.profile.practical||0)*.22);
      state.traits.overcare=Math.max(state.traits.overcare,Number(state.profile.overcare||0)*.5);
    }
    state.eggActions=state.eggActions||{};
    state.favoritePhrases=state.favoritePhrases||{};
    state.learned=state.learned||{};
    state.nights=Number(state.nights||0);
    state.lastNight=state.lastNight||'';
    state.childType=state.childType||'';
    state.childTypeVersion=Number(state.childTypeVersion||0);
    state.personality=state.personality||'';
    state.personalityVersion=Number(state.personalityVersion||0);
    state.manualSleepUntil=Number(state.manualSleepUntil||state.sleepUntil||0);
    state.nightPlayUntil=Number(state.nightPlayUntil||0);
    state.morningWakeDate=state.morningWakeDate||'';
    state.poop=!!state.poop;
    state.poopDueAt=Number(state.poopDueAt||0);
    state.lastVisitAt=Number(state.lastVisitAt||now());
    state.lastSpeech=state.lastSpeech||'……';
    if(state.memoryEnabled==null)state.memoryEnabled=true;
    this.state=state;
    this.updateReturnTrait();
    this.resolveEvolution();
  }

  updateReturnTrait(){
    const state=this.state;
    const gap=Math.max(0,(now()-Number(state.lastVisitAt||now()))/36e5);
    if(gap>=3)state.traits.independent+=Math.min(2.4,gap/8);
    state.lastVisitAt=now();
  }

  async loadCorpus(){
    let base=buildCorpus([],this.target);
    try{
      const scenes=await window.WareraData?.memories?.('../');
      if(scenes?.length)base=buildCorpus(scenes,this.target);
    }catch(error){console.warn('grow memories corpus fallback',error)}
    try{
      const quiz=await window.WareraData?.expandedQuiz?.('../');
      if(quiz)base=mergeQuizCorpus(base,buildCorpus(quizToScenes(quiz),this.target));
    }catch(error){console.warn('grow full-log corpus fallback',error)}
    this.corpus=base;
  }

  initializeSpeech(){
    const stage=this.stageKey();
    const state=this.state;
    if(stage==='egg'){
      state.lastSpeech='……';
      this.currentSpeechEntry=null;
      return;
    }
    if(stage==='baby'&&(!state.lastSpeech||state.lastSpeech==='……おけけ？'||String(state.lastSpeech).length>18)){
      state.lastSpeech='…';
      this.currentSpeechEntry=null;
      return;
    }
    if(!state.lastSpeech||state.lastSpeech==='……おけけ？'){
      const entry=this.entryFor(new Date().getHours()<10?'morning':'idle');
      state.lastSpeech=entry.text;
      this.currentSpeechEntry=entry;
    }else{
      this.currentSpeechEntry={text:state.lastSpeech,date:'',sceneId:''};
    }
  }

  stage(){return[['egg','たまご'],['baby','あかちゃん'],['child','こども'],['adult','おとな']][clamp(this.state.stageRank,0,3)]}
  stageKey(){return this.stage()[0]}
  ageDays(){return Math.max(1,Math.floor((new Date()-new Date((this.state.born||today())+'T00:00:00'))/864e5)+1)}
  uniqueCare(){return Object.keys(this.state.actions||{}).filter(key=>['feed','play','pat','bath','toilet'].includes(key)&&this.state.actions[key]>0).length}
  topScore(scores){return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0]||''}

  resolveEvolution(){
    const state=this.state;
    if(state.stageRank===0){
      const total=Object.values(state.eggActions||{}).reduce((sum,value)=>sum+Number(value||0),0);
      const unique=Object.keys(state.eggActions||{}).filter(key=>state.eggActions[key]>0).length;
      if(total>=5&&unique>=3)state.stageRank=1;
    }
    if(state.stageRank===1&&state.experience>=16&&this.uniqueCare()>=3)state.stageRank=2;
    if(state.stageRank===2&&state.experience>=48&&this.uniqueCare()>=4)state.stageRank=3;

    const traits=state.traits;
    if(state.stageRank>=2&&Number(state.childTypeVersion||0)<2){
      state.childType=this.topScore({
        affection:traits.clingy+traits.overcare*.30+traits.gentle*.10,
        playful:traits.playful*1.15+traits.clingy*.15,
        calm:traits.gentle*1.10+traits.independent*.12,
        independent:traits.independent*1.12+traits.gentle*.08,
      });
      state.childTypeVersion=2;
    }
    if(state.stageRank===3&&Number(state.personalityVersion||0)<2){
      state.personality=this.topScore({
        amaenbo:traits.clingy*1.35+traits.gentle*.22-traits.independent*.20,
        playful:traits.playful*1.38+traits.clingy*.14+traits.overcare*.08,
        gentle:traits.gentle*1.18+traits.independent*.18-traits.overcare*.08,
        aloof:traits.independent*1.28-traits.clingy*.24,
        tsundere:traits.overcare*1.20+traits.independent*.34+traits.clingy*.08,
        moody:traits.overcare*.72+traits.playful*.58+traits.independent*.28,
        dere:traits.clingy*.92+traits.gentle*.62+traits.playful*.12,
      });
      state.personalityVersion=2;
    }
  }

  localDateKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
  nightKey(date=new Date()){const value=new Date(date);if(value.getHours()<9)value.setDate(value.getDate()-1);return this.localDateKey(value)}
  markNight(){const key=this.nightKey();if(this.state.lastNight!==key){this.state.lastNight=key;this.state.nights++;this.state.experience+=1}}
  canSleepNow(){const hour=new Date().getHours();return hour>=21||hour<9}
  canWakeNow(){const hour=new Date().getHours();return hour>=7&&hour<9}
  isNightPlayActive(){return this.stageKey()!=='egg'&&Number(this.state.nightPlayUntil||0)>now()}
  canNightPlay(){return this.stageKey()!=='egg'&&new Date().getHours()<7&&!this.isNightPlayActive()}
  extendNightPlay(minutes=5){if(this.isNightPlayActive())this.state.nightPlayUntil=now()+minutes*60000}
  nextNine(){const date=new Date();if(date.getHours()>=9)date.setDate(date.getDate()+1);date.setHours(9,0,0,0);return date.getTime()}

  isAsleep(){
    if(this.stageKey()==='egg')return false;
    const hour=new Date().getHours();
    const state=this.state;
    if(this.isNightPlayActive())return false;
    if(hour>=7&&state.nightPlayUntil)state.nightPlayUntil=0;
    const manual=Number(state.manualSleepUntil||0)>now();
    if(hour<7){
      this.markNight();
      state.morningWakeDate='';
      state.manualSleepUntil=Math.max(Number(state.manualSleepUntil||0),this.nextNine());
      return true;
    }
    if(hour>=7&&hour<9){
      this.markNight();
      if(state.morningWakeDate===today())return false;
      if(!manual)state.manualSleepUntil=this.nextNine();
      return true;
    }
    if(hour>=21)return manual;
    if(hour>=9&&hour<21&&state.manualSleepUntil)state.manualSleepUntil=0;
    return false;
  }

  minsSince(action){const timestamp=Number(this.state.lastActionAt?.[action]||0);return timestamp?Math.max(0,(now()-timestamp)/60000):9999}
  updatePoop(){const state=this.state;if(state.poopDueAt&&now()>=state.poopDueAt&&!this.isAsleep()){state.poop=true;state.poopDueAt=0}}

  moment(){
    if(this.isAsleep())return{key:'sleep',emoji:'🌙',label:'すやすや寝てる',action:'sleep'};
    this.updatePoop();
    if(this.state.poop)return{key:'toilet',emoji:'💩',label:'なんか出てる',action:'toilet'};
    const values=[
      ['feed',this.minsSince('feed')/210,'🍚','なんか食べたそう'],
      ['play',this.minsSince('play')/165,'🎮','ひまそう'],
      ['bath',this.minsSince('bath')/540,'🫧','そろそろカラダ・アラウ'],
      ['pat',this.minsSince('pat')/(this.state.traits.clingy>this.state.traits.independent?190:260),'💗','ちょっと構われたそう'],
    ].sort((a,b)=>b[1]-a[1]);
    if(values[0][1]>=1)return{key:values[0][0],emoji:values[0][2],label:values[0][3],action:values[0][0]};
    if(new Date().getHours()>=21)return{key:'sleepSoon',emoji:'🌙',label:'夜になってきた',action:'sleep'};
    const quiet=this.state.traits.independent>this.state.traits.clingy*.95;
    return{key:'fine',emoji:quiet?'☀️':'✨',label:quiet?'ひとりでしょもしょもしてる':'なんでもない。たぶん。',action:''};
  }

  fallbackEntries(key){return(FALLBACK[this.target][key]||FALLBACK[this.target].idle||[]).map(text=>({text,date:'',sceneId:'',prev:''}))}
  recentTexts(){return new Set((this.state.recent||[]).slice(-24).map(x=>x.text).filter(Boolean))}

  weightedPick(rows,key){
    const source=rows?.length?rows:this.fallbackEntries(key);
    const recent=this.recentTexts();
    let pool=source.filter(entry=>!recent.has(entry.text));
    if(!pool.length)pool=source;
    const weighted=[];
    for(const entry of pool){
      const weight=entry.text.length<=18?2:1;
      for(let i=0;i<weight;i++)weighted.push(entry);
    }
    return pick(weighted.length?weighted:pool);
  }

  entryFor(key){return this.weightedPick(this.corpus?.pools?.[key],key)}
  recordRecent(type,text){this.state.recent.push({at:now(),type,text});if(this.state.recent.length>80)this.state.recent=this.state.recent.slice(-80)}

  repeats(action){
    const recent=(this.state.recent||[]).slice(-8).filter(x=>x.type==='action');
    let count=0;
    for(let i=recent.length-1;i>=0;i--){if(recent[i].action===action)count++;else break}
    return count;
  }

  contextualSpeech(action,matched,repeat){
    const stage=this.stageKey();
    const rareChance=stage==='adult'?.055:stage==='child'?.035:.018;
    if(['pat','play'].includes(action)&&this.corpus?.pools?.rareLove?.length&&Math.random()<rareChance)return{entry:this.entryFor('rareLove'),rare:true};
    if(repeat>=4&&this.corpus?.pools?.tease?.length&&Math.random()<.35)return{entry:this.entryFor('tease'),rare:false};

    const map={feed:'feed',play:'play',pat:'affection',bath:'bath',toilet:'ack',sleep:'sleep',wake:'morning',return:'return'};
    const key=map[action]||'idle';
    const actionRx={
      feed:/ごはん|ご飯|飯|食べ|たべ|お腹|おなか|腹減|うま|おいし/,
      play:/遊|あそ|ゲーム|ちょっかい|つつ|暇|ひま|www|笑/,
      pat:/かわい|可愛|好き|すき|撫|なで|愛で|ぎゅ|はすはす/,
      bath:/風呂|おふろ|シャワー|カラダ.?アラウ|洗|あら|湯/,
      toilet:/トイレ|うんこ|💩|便|出た|でた|すっきり/,
      sleep:/眠|ねむ|寝|おやす|オフトゥン|布団/,
      wake:/おはよ|起き|おき|朝/,
      return:/おかえり|ただいま|帰|きた/,
    }[action];
    const rows=this.corpus?.pools?.[key]||[];
    if(actionRx&&rows.length){
      const direct=rows.filter(entry=>{
        actionRx.lastIndex=0;
        const prevHit=actionRx.test(String(entry.prev||''));
        actionRx.lastIndex=0;
        return prevHit||actionRx.test(String(entry.text||''));
      });
      if(direct.length)return{entry:this.weightedPick(direct,key),rare:false};
    }
    return{entry:this.entryFor(key),rare:false};
  }

  earlySpeech(action,entry){
    if(this.stageKey()!=='baby')return{text:entry?.text||'',entry:entry||null};
    const bases={
      idle:['…','ん。','ふむ。'],feed:['もぐ。','んま。','ごはん。'],play:['…！','きゃ。','ふふ。'],pat:['んふ。','…♡','ぬくい。'],
      bath:['ふろ。','ぷは。','ほかほか。'],toilet:['すっきり。','…'],sleep:['ねむ。','…ねる。','すや。'],wake:['おきた。','…ん。'],return:['きた。','…！'],
    };
    const base=pick(bases[action]||bases.idle);
    const raw=cleanText(entry?.text||'').replace(/\s+/g,' ');
    const canMix=raw&&raw.length<=14;
    const rate=action==='idle'?.22:.38;
    if(canMix&&Math.random()<rate)return{text:base+' '+raw,entry};
    return{text:base,entry:null};
  }

  experienceGain(action,matched,repeat){let gain=1;if(matched)gain+=1;if(this.state.recent.slice(-1)[0]?.action!==action)gain+=.5;if(repeat>=2)gain*=.55;return Math.max(.35,gain)}

  applyTraits(action,matched,repeat){
    const traits=this.state.traits;
    if(action==='pat'){
      traits.clingy+=matched?1.8:1;
      traits.gentle+=.5;
      if(!matched||repeat>=2)traits.overcare+=.8+repeat*.15;
    }
    if(action==='play'){
      traits.playful+=matched?1.5:1;
      traits.clingy+=.25;
      if(repeat>=3)traits.overcare+=.4;
    }
    if(['feed','bath','toilet'].includes(action)){
      traits.gentle+=matched?1:.45;
      if(matched)traits.independent+=.55;
      if(!matched&&repeat>=2)traits.overcare+=.35;
    }
    if(action==='sleep')traits.gentle+=.4;
  }

  basePet(){
    const stage=this.stageKey();
    if(stage==='egg')return'egg_idle.png';
    if(stage==='baby')return'baby_front.png';
    if(stage==='child')return this.state.childType==='affection'?'child_cheer.png':'child_front.png';
    return'adult_front.png';
  }

  sleepPet(){
    const stage=this.stageKey();
    if(stage==='adult')return'adult_sleep.png';
    if(stage==='child')return'child_front.png';
    if(stage==='baby')return'baby_front.png';
    return'egg_idle.png';
  }

  currentPet(){
    const stage=this.stageKey();
    if(stage==='egg')return'egg_idle.png';
    if(this.isAsleep())return this.sleepPet();
    const moment=this.moment();
    if(moment.key==='play'&&this.minsSince('play')>300)return stage==='adult'?'adult_sad.png':this.basePet();
    return this.basePet();
  }

  reactionPet(action,repeat,rare){
    const stage=this.stageKey();
    if(stage==='egg')return'';
    if(stage==='baby'){
      if(action==='play')return Math.random()<.5?'baby_left.png':'baby_right.png';
      return'baby_front.png';
    }
    if(stage==='child'){
      if(['feed','play','pat'].includes(action))return'child_cheer.png';
      if(action==='sleep')return this.sleepPet();
      return'child_front.png';
    }

    const roll=Math.random();
    if(action==='feed'){
      if(repeat>=4)return roll<.55?'adult_pout.png':'adult_troubled.png';
      return roll<.78?'adult_eat.png':roll<.91?'adult_cheer.png':'adult_front.png';
    }
    if(action==='bath'){
      if(repeat>=4)return roll<.6?'adult_pout.png':'adult_troubled.png';
      return roll<.86?'adult_bath.png':roll<.94?'adult_cheer.png':'adult_shy.png';
    }
    if(action==='toilet')return roll<.86?'adult_toilet.png':roll<.94?'adult_troubled.png':'adult_front.png';
    if(action==='pat'){
      if(rare)return'adult_shy.png';
      if(repeat>=5)return roll<.55?'adult_angry.png':'adult_pout.png';
      if(repeat>=3)return roll<.52?'adult_pout.png':'adult_head_pat.png';
      return roll<.58?'adult_head_pat.png':roll<.82?'adult_shy.png':'adult_cheer.png';
    }
    if(action==='play'){
      if(repeat>=5)return roll<.48?'adult_angry.png':roll<.78?'adult_pout.png':'adult_troubled.png';
      if(repeat>=3)return roll<.34?'adult_pout.png':roll<.70?'adult_cheer.png':roll<.85?'adult_front.png':roll<.925?'adult_left.png':'adult_right.png';
      return roll<.55?'adult_cheer.png':roll<.78?'adult_front.png':roll<.89?'adult_left.png':'adult_right.png';
    }
    if(action==='sleep')return this.sleepPet();
    return'';
  }

  async act(action){
    const state=this.state;
    const before=this.stageKey();
    if(this.isNightPlayActive())this.extendNightPlay();
    const sleeping=this.isAsleep();

    if(sleeping&&action!=='sleep'){
      const speech=this.earlySpeech('sleep',this.entryFor('sleep'));
      state.lastSpeech=speech.text;
      this.currentSpeechEntry=speech.entry;
      this.recordRecent('speech',state.lastSpeech);
      await this.save();
      return{reaction:'',anim:'',stageChanged:null};
    }

    if(action==='sleep'&&sleeping){
      if(this.canWakeNow()){
        state.manualSleepUntil=0;
        state.morningWakeDate=today();
        const reaction=this.contextualSpeech('wake',true,0);
        const speech=this.earlySpeech('wake',reaction.entry);
        state.lastSpeech=speech.text;
        this.currentSpeechEntry=speech.entry;
        this.recordRecent('speech',state.lastSpeech);
        await this.save();
        return{reaction:this.basePet(),anim:'bounce',stageChanged:null};
      }
      if(this.canNightPlay()){
        this.markNight();
        state.manualSleepUntil=Math.max(Number(state.manualSleepUntil||0),this.nextNine());
        state.nightPlayUntil=now()+5*60000;
        const reaction=this.contextualSpeech('wake',true,0);
        const speech=this.earlySpeech('wake',reaction.entry);
        state.lastSpeech=speech.text;
        this.currentSpeechEntry=speech.entry;
        this.recordRecent('speech',state.lastSpeech);
        await this.save();
        return{reaction:this.basePet(),anim:'bounce',stageChanged:null};
      }
      const speech=this.earlySpeech('sleep',this.entryFor('sleep'));
      state.lastSpeech=speech.text;
      this.currentSpeechEntry=speech.entry;
      this.recordRecent('speech',state.lastSpeech);
      await this.save();
      return{reaction:'',anim:'',stageChanged:null};
    }

    if(action==='sleep'&&!this.canSleepNow()){
      const speech=this.earlySpeech('idle',this.entryFor('idle'));
      state.lastSpeech=speech.text;
      this.currentSpeechEntry=speech.entry;
      this.recordRecent('speech',state.lastSpeech);
      await this.save();
      return{reaction:'',anim:'',stageChanged:null};
    }

    const moment=this.moment();
    const matched=moment.action===action;
    const repeat=this.repeats(action);
    const existingPoopDue=action==='feed'&&!state.poop&&Number(state.poopDueAt||0)>now()?Number(state.poopDueAt):0;

    state.totalCare=Number(state.totalCare||0)+1;
    state.actions[action]=Number(state.actions[action]||0)+1;
    state.lastActionAt[action]=now();
    state.experience=Number(state.experience||0)+this.experienceGain(action,matched,repeat);
    this.applyTraits(action,matched,repeat);

    if(action==='feed'){
      const due=now()+(45+Math.random()*75)*60000;
      state.poopDueAt=existingPoopDue?Math.min(existingPoopDue,due):due;
    }
    if(action==='toilet'){
      state.poop=false;
      state.poopDueAt=0;
    }
    if(action==='sleep'){
      this.markNight();
      state.nightPlayUntil=0;
      state.manualSleepUntil=this.nextNine();
      state.morningWakeDate='';
    }

    const reaction=this.contextualSpeech(action,matched,repeat);
    const speech=this.earlySpeech(action,reaction.entry);
    state.lastSpeech=speech.text;
    this.currentSpeechEntry=speech.entry;
    state.recent.push({at:now(),type:'action',action,text:state.lastSpeech});
    if(state.recent.length>80)state.recent=state.recent.slice(-80);

    this.resolveEvolution();
    const after=this.stageKey();
    if(after!==before)state.lastSpeech={baby:'……でた。',child:'なんか育った。',adult:'これがおとな。'}[after]||state.lastSpeech;
    await this.save();
    return{
      reaction:this.reactionPet(action,repeat,reaction.rare),
      anim:action==='play'?'bounce':action==='pat'?'squish':'wiggle',
      stageChanged:after!==before?{from:before,to:after}:null,
    };
  }

  async eggAct(action){
    const state=this.state;
    const before=this.stageKey();
    state.eggActions[action]=Number(state.eggActions[action]||0)+1;
    state.totalCare=Number(state.totalCare||0)+1;
    state.experience+=1;
    const voices={warm:['……','…ぬく。'],call:['…？','……！'],tap:['ぴく。','…！'],hum:['♪','……♪'],listen:['……','（じー）'],word:['…！','？']}[action]||['……'];
    state.lastSpeech=pick(voices);
    this.currentSpeechEntry=null;
    this.recordRecent('speech',state.lastSpeech);
    this.resolveEvolution();
    const after=this.stageKey();
    if(after!==before)state.lastSpeech='……でた。';
    await this.save();
    return{reaction:this.basePet(),anim:'wiggle',stageChanged:after!==before?{from:before,to:after}:null};
  }
}

const ADULT_MAP={
  'adult_front.png':'adult_front','adult_right.png':'adult_right','adult_left.png':'adult_left','adult_back.png':'adult_back',
  'adult_sit_front.png':'adult_sit_front','adult_sit_back.png':'adult_sit_back','adult_cheer.png':'adult_cheer','adult_angry.png':'adult_angry',
  'adult_pout.png':'adult_pout','adult_sad.png':'adult_sad','adult_shy.png':'adult_shy','adult_cry.png':'adult_cry','adult_lie_down.png':'adult_lie_down',
  'adult_sleep.png':'adult_sleep','adult_troubled.png':'adult_troubled','adult_eat.png':'adult_eat','adult_bath.png':'adult_bath','adult_toilet.png':'adult_toilet',
  'adult_head_pat.png':'adult_head_pat','adult_phone.png':'adult_phone','adult_doze_sit.png':'adult_doze_sit','stand_front.png':'adult_front',
  'stand_left.png':'adult_left','quarter_left.png':'adult_right','stand_back.png':'adult_back','sit_sad.png':'adult_sad','crawl_angry.png':'adult_angry',
  'hold_heart.png':'adult_shy','eat_onigiri.png':'adult_eat','eat_fish.png':'adult_eat',
};

const LEGACY={
  'adult_front.png':'stand_front.png','adult_right.png':'quarter_left.png','adult_left.png':'stand_left.png','adult_back.png':'stand_back.png',
  'adult_sit_front.png':'sit_sad.png','adult_sit_back.png':'stand_back.png','adult_cheer.png':'adult_happy.png','adult_angry.png':'crawl_angry.png',
  'adult_pout.png':'adult_cool.png','adult_sad.png':'sit_sad.png','adult_shy.png':'hold_heart.png','adult_cry.png':'sit_sad.png',
  'adult_lie_down.png':'blanket_rest.png','adult_sleep.png':'blanket_rest.png','adult_troubled.png':'sit_sad.png','adult_eat.png':'eat_onigiri.png',
  'adult_bath.png':'stand_front.png','adult_toilet.png':'stand_front.png','adult_head_pat.png':'hold_heart.png','adult_phone.png':'stand_front.png','adult_doze_sit.png':'sit_sad.png',
};

export function petStageKey(model,file){
  const stage=model.stageKey();
  if(stage==='egg')return'egg_idle';
  if(stage==='baby'){
    return({
      'baby_idle.png':'baby_front','baby_front.png':'baby_front','baby_right.png':'baby_right','baby_left.png':'baby_left','baby_back.png':'baby_back',
      'stand_front.png':'baby_front','stand_left.png':'baby_left','quarter_left.png':'baby_right','stand_back.png':'baby_back',
    })[file]||null;
  }
  if(stage==='child'){
    const map={
      'child_plain.png':'child_front','child_happy.png':'child_cheer','child_front.png':'child_front','child_right.png':'child_right','child_left.png':'child_left',
      'child_back.png':'child_back','child_cheer.png':'child_cheer','stand_front.png':'child_front','stand_left.png':'child_left','quarter_left.png':'child_right',
      'stand_back.png':'child_back','adult_cheer.png':'child_cheer',
    };
    if(map[file])return map[file];
    if(['adult_eat.png','eat_onigiri.png','eat_fish.png','adult_head_pat.png','hold_heart.png'].includes(file))return'child_cheer';
    return null;
  }
  return ADULT_MAP[file]||null;
}

export function petUrl(model,file){
  const key=petStageKey(model,file);
  const prefix=model.target==='も'?'mo/mocchi':'mi/michako';
  return key?CHAR_ASSET+prefix+'_'+key+'.png':COMMON_ASSET+(LEGACY[file]||file);
}

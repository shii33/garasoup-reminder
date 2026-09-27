import {cleanText,now,today} from './core.js?v=20260927-life-6';

const LIMITS={
  inventory:18,
  duplicateWindow:12,
  quizRecent:80,
  statusFreshMs:180000,
  outingIdleMs:240000,
  outingCooldownMs:10800000,
};

const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const pick=a=>a?.length?a[Math.floor(Math.random()*a.length)]:null;
const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const trim=(s,n=24)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s};

const WORD_BASE={
  み:{front:['みちゃこ','今日','われわれ','この子','ガラスープ','なんか'],end:['そそ','なある！','おけけ','なんやこれ','フロダン！','だん！']},
  も:{front:['もっち','今日','われわれ','この子','ガラスープ','なんか'],end:['ういー','ほう','ふむ','おけー','あーねwww','そりゃあねぇw']},
};

const CONNECTORS=['は','が','を','に','で','と','も','から','まで','なら','なのに','だけど'];
const JUNK=[
  ['🥫','ガラスープ','なんで持ってる'],
  ['🪨','いい石','なんか気に入ったらしい'],
  ['📎','なんかのクリップ','用途は不明'],
  ['🧦','片っぽ','もう片方はない'],
  ['🎟️','なんかの券','どこのか分からない'],
  ['🌀','よくわからんやつ','ほんとによく分からない'],
  ['🧃','飲みかけ','いつのかは聞かない'],
  ['🗝️','ちいさい鍵','何の鍵かは知らない'],
];

const CHILD_LABELS={
  affection:'甘えんぼ育ち',
  playful:'いたずら育ち',
  calm:'おだやか育ち',
  independent:'マイペース育ち',
};

const ADULT_LABELS={
  amaenbo:'甘えんぼ系',
  playful:'いたずら系',
  gentle:'おだやか系',
  aloof:'そっけない系',
  tsundere:'ツンデレ系',
  moody:'気分屋系',
  dere:'でれ系',
};

export class CreatureLife{
  constructor(model){
    this.model=model;
    this.quizPromise=null;
    this.ensure();
  }

  ensure(){
    const state=this.model.state;
    const life=state.life&&typeof state.life==='object'?state.life:{};

    life.version=2;
    life.moodDate=life.moodDate||'';
    life.mood=life.mood||'';
    life.inventory=Array.isArray(life.inventory)?life.inventory:[];
    life.lastFindDate=life.lastFindDate||'';
    life.lastOutingAt=Number(life.lastOutingAt||0);
    life.lastInteractionAt=Number(life.lastInteractionAt||0);
    life.quizRecent=Array.isArray(life.quizRecent)?life.quizRecent:[];
    life.lastEvent=life.lastEvent||null;

    const outing=life.outing&&typeof life.outing==='object'?life.outing:{};
    life.outing={
      active:!!outing.active,
      startedAt:Number(outing.startedAt||0),
      returnAt:Number(outing.returnAt||0),
    };

    state.life=life;
    this.rotateMood();
    return life;
  }

  life(){return this.ensure()}

  async initialize(){
    this.ensure();
    let changed=this.maybeDailyFind();
    const returned=await this.tick(false);
    if(returned)changed=true;
    if(changed)await this.model.save();
    return returned;
  }

  rotateMood(){
    const life=this.model.state.life;
    if(life.moodDate===today()&&life.mood)return life.mood;

    const traits=this.model.state.traits||{};
    const personality=this.model.state.personality||'';
    const pool=['quiet','curious','cozy','playful','sleepy','plain'];

    if(traits.playful>traits.gentle)pool.push('playful');
    if(traits.clingy>traits.independent)pool.push('cozy');
    if(traits.independent>traits.clingy)pool.push('quiet');
    if(['aloof','tsundere'].includes(personality))pool.push('quiet');
    if(['amaenbo','dere'].includes(personality))pool.push('cozy');
    if(personality==='playful')pool.push('playful');

    const seed=hash(`${today()}|${this.model.target}|${this.model.state.born||''}`);
    life.mood=pool[seed%pool.length];
    life.moodDate=today();
    return life.mood;
  }

  maturity(){
    if(this.model.stageKey()!=='adult')return 0;
    return Math.min(5,1+Math.floor(Math.max(0,Number(this.model.state.experience||0)-48)/35));
  }

  growthLabel(){
    const stage=this.model.stageKey();
    if(stage==='child')return CHILD_LABELS[this.model.state.childType]||'マイペース育ち';
    if(stage==='adult')return ADULT_LABELS[this.model.state.personality]||'マイペース系';
    return'';
  }

  noteInteraction(){this.life().lastInteractionAt=now()}
  isOuting(){return !!this.life().outing.active}
  finds(){return this.life().inventory.slice().reverse()}
  getItem(id){return this.life().inventory.find(x=>x.id===id)||null}

  removeItem(id){
    const life=this.life();
    const index=life.inventory.findIndex(x=>x.id===id);
    if(index<0)return null;
    return life.inventory.splice(index,1)[0]||null;
  }

  async dropItem(id){
    const item=this.removeItem(id);
    if(item)await this.model.save();
    return item;
  }

  statusText(){
    const life=this.life();
    if(life.outing.active)return'🚪 おでかけ中';
    if(this.model.isAsleep())return'🌙 すやすや寝てる';

    this.model.updatePoop();
    if(this.model.state.poop)return'💩 なんか出てる';
    if(life.lastEvent&&now()-Number(life.lastEvent.at||0)<LIMITS.statusFreshMs&&life.lastEvent.status)return life.lastEvent.status;

    const moment=this.model.moment();
    return`${moment.emoji||'…'} ${moment.label||'ふつうに過ごしてる'}`;
  }

  setEvent(status,kind,pose=''){
    this.life().lastEvent={at:now(),status,kind,pose};
  }

  recordSpeech(entry,babyAction='idle'){
    const speech=this.model.earlySpeech(babyAction,entry);
    this.model.state.lastSpeech=speech.text||'…';
    this.model.currentSpeechEntry=speech.entry||null;
    this.model.recordRecent('speech',this.model.state.lastSpeech);
    return{speech:this.model.state.lastSpeech,entry:this.model.currentSpeechEntry};
  }

  speakKey(key,babyAction='idle'){return this.recordSpeech(this.model.entryFor(key),babyAction)}
  speakEntry(entry,babyAction='idle'){return this.recordSpeech(entry,babyAction)}

  currentEntry(){
    const entry=this.model.currentSpeechEntry;
    const text=cleanText(entry?.text||'');
    return text?{...entry,text}:null;
  }

  isCurrentSpeechSaved(){
    const entry=this.currentEntry();
    return !!(entry&&this.life().inventory.some(x=>x.type==='charm'&&cleanText(x.payload?.text||'')===entry.text));
  }

  canSaveCurrentSpeech(){return !this.isOuting()&&!!this.currentEntry()}

  async saveCurrentSpeech(){
    const entry=this.currentEntry();
    if(!entry)return null;

    const existing=this.life().inventory.find(x=>x.type==='charm'&&cleanText(x.payload?.text||'')===entry.text);
    if(existing)return existing;

    const item={
      id:this.itemId('charm'),
      type:'charm',
      icon:'💘',
      title:`「${trim(entry.text,24)}」`,
      subtitle:'あとで言ってみる',
      origin:'saved',
      createdAt:now(),
      payload:{text:entry.text,date:entry.date||'',sceneId:entry.sceneId||'',prev:entry.prev||''},
    };

    this.addItem(item);
    await this.model.save();
    return item;
  }

  stagePose({adult,child,baby,egg}={}){
    const stage=this.model.stageKey();
    if(stage==='adult')return adult||this.model.basePet();
    if(stage==='child')return child||this.model.basePet();
    if(stage==='baby')return baby||this.model.basePet();
    return egg||this.model.basePet();
  }

  eventCatalog(){
    const stage=this.model.stageKey();

    if(stage==='egg')return[
      {pose:'egg_idle.png',anim:'wiggle',speech:'idle',status:'🥚 中でなんかやってる',w:1},
    ];

    if(this.model.isAsleep()){
      return[{pose:this.stagePose({adult:'adult_sleep.png',child:'child_front.png',baby:'baby_front.png'}),anim:'idle-breathe',speech:'sleep',status:'🌙 すやすや寝てる',w:1}];
    }

    if(stage==='baby')return[
      {pose:'baby_front.png',anim:'idle-breathe',speech:'idle',status:'👀 こっち見てる',w:6},
      {pose:'baby_left.png',anim:'idle-shuffle',speech:'ack',status:'… なんか見てる',w:2},
      {pose:'baby_right.png',anim:'idle-shuffle',speech:'play',status:'✨ ちょっと動いた',w:2},
      {pose:'baby_back.png',anim:'idle-peek',speech:'idle',status:'… 背中向けてる',w:1},
    ];

    if(stage==='child')return[
      {pose:'child_front.png',anim:'idle-breathe',speech:'idle',status:'☀️ ふつうに過ごしてる',w:5},
      {pose:'child_left.png',anim:'idle-shuffle',speech:'ack',status:'👀 なんか見てる',w:2},
      {pose:'child_right.png',anim:'idle-shuffle',speech:'play',status:'🎮 なんかやりたそう',w:2},
      {pose:'child_back.png',anim:'idle-peek',speech:'idle',status:'… ひとりでしょもしょもしてる',w:1.3},
      {pose:'child_cheer.png',anim:'bounce',speech:'play',status:'✨ 妙に元気',w:1},
    ];

    return[
      {kind:'front',pose:'adult_front.png',anim:'idle-breathe',speech:'idle',status:'☀️ ふつうに過ごしてる',w:4.5},
      {kind:'left',pose:'adult_left.png',anim:'idle-shuffle',speech:'ack',status:'👀 なんか見てる',w:2},
      {kind:'right',pose:'adult_right.png',anim:'idle-shuffle',speech:'idle',status:'👀 こっち見たり見なかったり',w:2},
      {kind:'back',pose:'adult_back.png',anim:'idle-breathe',speech:'ack',status:'… 背中向けてる',w:1.4},
      {kind:'sit',pose:'adult_sit_front.png',anim:'idle-breathe',speech:'idle',status:'… 座ってる',w:3.7},
      {kind:'sitback',pose:'adult_sit_back.png',anim:'idle-peek',speech:'ack',status:'… ひとりでなんかしてる',w:1.8},
      {kind:'phone',pose:'adult_phone.png',anim:'idle-breathe',speech:'ack',status:'📱 なんか触ってる',w:5.2},
      {kind:'doze',pose:'adult_doze_sit.png',anim:'idle-doze',speech:'sleep',status:'😪 うつらうつらしてる',fx:'…',w:3},
      {kind:'lie',pose:'adult_lie_down.png',anim:'idle-breathe',speech:'comfort',status:'… ごろごろしてる',w:2.6},
      {kind:'cheer',pose:'adult_cheer.png',anim:'bounce',speech:'play',status:'✨ 妙に元気',fx:'!',w:.8},
      {kind:'shy',pose:'adult_shy.png',anim:'squish',speech:'affection',status:'💗 なんか機嫌いい',fx:'♡',w:.5},
      {kind:'pout',pose:'adult_pout.png',anim:'idle-doze',speech:'tease',status:'… ちょっとむすっとしてる',fx:'…',w:.55},
      {kind:'troubled',pose:'adult_troubled.png',anim:'idle-doze',speech:'comfort',status:'… なんか考えてる',fx:'…',w:.45},
    ];
  }

  eventWeight(event,mood,personality){
    let weight=event.w||1;
    if(mood==='playful'&&['cheer','left','right'].includes(event.kind))weight*=2.2;
    if(mood==='cozy'&&['front','shy','sit'].includes(event.kind))weight*=2;
    if(mood==='quiet'&&['phone','back','sitback','lie'].includes(event.kind))weight*=1.9;
    if(mood==='sleepy'&&['doze','lie','sit'].includes(event.kind))weight*=2.2;
    if(mood==='curious'&&['left','right','phone'].includes(event.kind))weight*=1.7;
    if(personality==='playful'&&event.kind==='cheer')weight*=2;
    if(['amaenbo','dere'].includes(personality)&&event.kind==='shy')weight*=2.4;
    if(personality==='aloof'&&['back','phone','sitback'].includes(event.kind))weight*=2;
    if(personality==='tsundere'&&['pout','back','shy'].includes(event.kind))weight*=1.8;
    return weight;
  }

  weightedEvent(){
    const mood=this.rotateMood();
    const personality=this.model.state.personality||'';
    const rows=this.eventCatalog();
    const pool=[];

    for(const event of rows){
      const weight=this.eventWeight(event,mood,personality);
      for(let i=0;i<Math.max(1,Math.round(weight*10));i++)pool.push(event);
    }

    return pick(pool)||rows[0];
  }

  rareIdleEvent(){
    const chance=.012+this.maturity()*.004;
    if(Math.random()>=chance)return null;

    const rare=this.model.corpus?.pools?.rareLove||[];
    const memory=this.model.corpus?.pools?.memory||[];
    const entry=pick(rare.length?rare:memory);
    if(!entry)return null;

    this.speakEntry(entry,'idle');
    if(Math.random()<.32)this.addItem(this.itemFromEntry(entry,'memory','rare'));

    return{
      pose:this.stagePose({adult:'adult_shy.png'}),
      anim:'squish',
      fx:'♡',
      status:'… なんか思い出した',
      kind:'rare',
    };
  }

  async advanceIdle(){
    this.ensure();
    const returned=await this.tick();
    if(returned)return returned;
    if(this.isOuting())return{outing:true};

    if(this.model.stageKey()==='egg'){
      const event=this.weightedEvent();
      this.model.state.lastSpeech='……';
      this.model.currentSpeechEntry=null;
      this.setEvent(event.status||'🥚 中でなんかやってる','egg',event.pose||'egg_idle.png');
      await this.model.save();
      return{...event,speech:'……'};
    }

    if(this.shouldStartOuting()){
      await this.startOuting();
      return{outing:true,started:true};
    }

    let event=this.rareIdleEvent();
    if(!event){
      event=this.weightedEvent();
      this.speakKey(event.speech||'idle','idle');
    }

    this.setEvent(event.status||'… なんかしてる',event.kind||'idle',event.pose||'');

    let found=null;
    if(Math.random()<.007+this.maturity()*.001){
      found=this.makeItem('idle');
      this.addItem(found);
    }

    await this.model.save();
    return{...event,speech:this.model.state.lastSpeech,found};
  }

  shouldStartOuting(){
    const stage=this.model.stageKey();
    const life=this.life();
    if(!['child','adult'].includes(stage)||life.outing.active||this.model.isAsleep())return false;
    if(now()-life.lastInteractionAt<LIMITS.outingIdleMs)return false;
    if(now()-life.lastOutingAt<LIMITS.outingCooldownMs)return false;

    let chance=.004*(1+this.maturity()*.08);
    if(life.mood==='curious')chance*=1.8;
    if(this.model.state.personality==='aloof')chance*=1.35;
    if(this.model.state.personality==='playful')chance*=1.2;
    return Math.random()<chance;
  }

  async startOuting(){
    const life=this.life();
    const minutes=20+Math.random()*60;
    life.outing={active:true,startedAt:now(),returnAt:now()+minutes*60000};
    life.lastEvent={at:now(),status:'🚪 おでかけ中',kind:'outing',pose:''};
    await this.model.save();
  }

  async tick(save=true){
    const life=this.life();
    this.rotateMood();
    this.maybeDailyFind();
    if(life.outing.active&&life.outing.returnAt&&now()>=life.outing.returnAt)return this.finishOuting(save);
    return null;
  }

  async recallOuting(){
    if(!this.isOuting())return null;
    return this.finishOuting(true);
  }

  async finishOuting(save=true){
    const life=this.life();
    life.outing={active:false,startedAt:0,returnAt:0};
    life.lastOutingAt=now();

    const item=this.makeItem('outing');
    this.addItem(item);
    this.speakKey('return','return');

    const pose=this.stagePose({adult:'adult_cheer.png',child:'child_cheer.png'});
    this.setEvent('🎁 なんか持って帰ってきた','return',pose);
    if(save)await this.model.save();

    return{returned:true,item,pose,anim:'bounce',fx:'🎁',speech:this.model.state.lastSpeech};
  }

  maybeDailyFind(){
    const life=this.life();
    const date=today();
    if(life.lastFindDate===date||this.model.stageKey()==='egg')return false;

    life.lastFindDate=date;
    const first=!life.inventory.length;
    if(first||hash(`${date}|find|${this.model.target}`)%100<72)this.addItem(this.makeItem('daily'));
    return true;
  }

  itemId(type){return`${type}-${now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}

  itemFromEntry(entry,type='memory',origin='daily'){
    const text=cleanText(entry?.text||'');
    return{
      id:this.itemId(type),
      type,
      icon:type==='word'?'📝':'🎫',
      title:type==='word'?`「${trim(text,18)}」`:trim(text,26),
      subtitle:origin==='outing'?'おみやげ':(entry?.date||'古いやつ'),
      origin,
      createdAt:now(),
      payload:{text,date:entry?.date||'',sceneId:entry?.sceneId||'',prev:entry?.prev||''},
    };
  }

  makeItem(origin='daily'){
    const memory=this.model.corpus?.pools?.memory||[];
    const short=this.model.corpus?.pools?.short||[];
    const tokens=this.model.corpus?.tokens||[];
    const roll=Math.random();

    if(memory.length&&roll<.29)return this.itemFromEntry(pick(memory),'memory',origin);
    if((tokens.length||short.length)&&roll<.61){
      const token=pick(tokens)||cleanText(pick(short)?.text||'');
      return this.itemFromEntry({text:token,date:'',sceneId:'',prev:''},'word',origin);
    }
    if(roll<.79)return{id:this.itemId('quiz'),type:'quiz',icon:'❓',title:'つづき問題',subtitle:origin==='outing'?'おみやげ':'なんか持ってた',origin,createdAt:now(),payload:{}};

    const [icon,title,subtitle]=pick(JUNK);
    return{id:this.itemId('junk'),type:'junk',icon,title,subtitle:origin==='outing'?'おみやげ':subtitle,origin,createdAt:now(),payload:{word:title}};
  }

  addItem(item){
    if(!item)return null;
    const life=this.life();
    const duplicate=life.inventory.slice(-LIMITS.duplicateWindow).find(x=>x.type===item.type&&x.title===item.title);
    if(duplicate&&item.type!=='quiz')return duplicate;

    life.inventory.push(item);
    if(life.inventory.length>LIMITS.inventory)life.inventory=life.inventory.slice(-LIMITS.inventory);
    return item;
  }

  wordGame(seed=''){
    const base=WORD_BASE[this.model.target]||WORD_BASE.も;
    const tokens=this.model.corpus?.tokens||[];
    const short=(this.model.corpus?.pools?.short||[]).map(x=>cleanText(x.text)).filter(x=>x&&x.length<=14);
    const seedWord=trim(seed,14);
    const front=uniq([seedWord,...tokens.slice(0,4),...base.front]).slice(0,7);
    const end=uniq([...short.slice(0,10),seedWord,...base.end]).slice(0,7);
    return{front,middle:CONNECTORS,end,seed:seedWord};
  }

  wordPhrase(parts){
    return`${String(parts?.front||'').trim()}${String(parts?.middle||'').trim()}${String(parts?.end||'').trim()}`;
  }

  async completeWordGame(parts){
    const phrase=this.wordPhrase(parts);
    if(!phrase)return null;

    const care=await this.model.act('play');
    const item={id:this.itemId('crafted'),type:'crafted',icon:'💬',title:trim(phrase,30),subtitle:'あとで言ってみる',origin:'play',createdAt:now(),payload:{text:phrase,word:phrase}};
    this.addItem(item);
    this.speakKey(Math.random()<.25?'tease':'play','play');

    const pose=this.stagePose({adult:'adult_cheer.png',child:'child_cheer.png',baby:'baby_right.png'});
    this.setEvent('🎮 なんかできた','wordplay',pose);
    await this.model.save();

    return{phrase,item,pose,anim:'bounce',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null};
  }

  async quizData(){
    if(!this.quizPromise)this.quizPromise=window.WareraData?.expandedQuiz?.('../')||Promise.resolve({next:[]});
    return this.quizPromise;
  }

  quizKey(question){return`${question?.date||''}|${question?.prompt||''}|${question?.answer||''}`}

  async quizQuestion(){
    const data=await this.quizData();
    const all=(data?.next||[]).filter(x=>x?.prompt&&x?.answer&&Array.isArray(x.options)&&x.options.length);
    if(!all.length)return null;

    const recent=new Set(this.life().quizRecent||[]);
    const fresh=all.filter(x=>!recent.has(this.quizKey(x)));
    return pick(fresh.length?fresh:all);
  }

  async answerQuiz(question,index){
    if(!question)return null;

    const choice=question.options?.[Number(index)];
    const ok=choice===question.answer;
    const care=await this.model.act('play');
    const life=this.life();
    const key=this.quizKey(question);
    life.quizRecent=[...(life.quizRecent||[]).filter(x=>x!==key),key].slice(-LIMITS.quizRecent);

    this.speakKey(ok?'play':'tease','play');
    const pose=this.stagePose({adult:ok?'adult_cheer.png':'adult_pout.png',child:ok?'child_cheer.png':'child_front.png',baby:'baby_front.png'});
    this.setEvent(ok?'🎮 当たった':'🎮 ちがった','quiz',pose);
    await this.model.save();

    return{ok,choice,answer:question.answer,date:question.date||'',pose,anim:ok?'bounce':'wiggle',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null};
  }

  async consumeItem(id){
    const item=this.removeItem(id);
    if(item)await this.model.save();
    return item;
  }

  async useWordItem(id){
    const item=await this.consumeItem(id);
    if(!item)return null;
    return{item,game:this.wordGame(item.payload?.text||item.payload?.word||item.title)};
  }

  async useQuizItem(id){
    const item=await this.consumeItem(id);
    if(!item)return null;
    return{item,question:await this.quizQuestion()};
  }

  async useCharmItem(id){
    const item=this.removeItem(id);
    if(!item)return null;

    const care=await this.model.act('pat');
    this.speakKey('affection','pat');
    const pose=this.stagePose({adult:'adult_shy.png',child:'child_cheer.png',baby:'baby_front.png'});
    this.setEvent('💘 メロがってる','charm',pose);
    await this.model.save();

    return{item,pose,anim:'squish',fx:'♡',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null};
  }
}

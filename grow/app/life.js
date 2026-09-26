import {cleanText,now,today} from './core.js?v=20260926-life-2';

const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const pick=a=>a?.length?a[Math.floor(Math.random()*a.length)]:null;
const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const trim=(s,n=24)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s};

const WORD_BASE={
  み:{front:['みちゃこ','今日','われわれ','この子','ガラスープ','なんか'],end:['そそ','なある！','おけけ','なんやこれ','フロダン！','だん！']},
  も:{front:['もっち','今日','われわれ','この子','ガラスープ','なんか'],end:['ういー','ほう','ふむ','おけー','あーねwww','そりゃあねぇw']}
};
const CONNECTORS=['は','が','を','に','で','と','も','から','まで','なら','なのに','だけど'];
const JUNK=[
  ['🥫','ガラスープ','なんで持ってる'],['🪨','いい石','なんか気に入ったらしい'],['📎','なんかのクリップ','用途は不明'],['🧦','片っぽ','もう片方はない'],['🎟️','なんかの券','どこのか分からない'],['🌀','よくわからんやつ','ほんとによく分からない'],['🧃','飲みかけ','いつのかは聞かない'],['🗝️','ちいさい鍵','何の鍵かは知らない']
];

export class CreatureLife{
  constructor(model){this.model=model;this.quizPromise=null;this.ensure()}
  ensure(){
    const s=this.model.state,l=s.life||{};
    l.version=2;l.moodDate=l.moodDate||'';l.mood=l.mood||'';l.inventory=Array.isArray(l.inventory)?l.inventory:[];
    l.lastFindDate=l.lastFindDate||'';l.lastOutingAt=Number(l.lastOutingAt||0);l.lastInteractionAt=Number(l.lastInteractionAt||0);
    l.outing=l.outing&&typeof l.outing==='object'?l.outing:{active:false,startedAt:0,returnAt:0};
    l.outing.active=!!l.outing.active;l.outing.startedAt=Number(l.outing.startedAt||0);l.outing.returnAt=Number(l.outing.returnAt||0);
    l.quizRecent=Array.isArray(l.quizRecent)?l.quizRecent:[];l.lastEvent=l.lastEvent||null;s.life=l;this.rotateMood();return l
  }
  async initialize(){this.ensure();let changed=this.maybeDailyFind();const returned=await this.tick(false);if(returned)changed=true;if(changed)await this.model.save();return returned}
  life(){return this.ensure()}
  rotateMood(){const l=this.model.state.life;if(l.moodDate===today()&&l.mood)return l.mood;const t=this.model.state.traits||{},p=this.model.state.personality||'';let pool=['quiet','curious','cozy','playful','sleepy','plain'];if(t.playful>t.gentle)pool.push('playful');if(t.clingy>t.independent)pool.push('cozy');if(t.independent>t.clingy)pool.push('quiet');if(['aloof','tsundere'].includes(p))pool.push('quiet');if(['amaenbo','dere'].includes(p))pool.push('cozy');if(p==='playful')pool.push('playful');const seed=hash(`${today()}|${this.model.target}|${this.model.state.born||''}`);l.mood=pool[seed%pool.length];l.moodDate=today();return l.mood}
  maturity(){if(this.model.stageKey()!=='adult')return 0;return Math.min(5,1+Math.floor(Math.max(0,Number(this.model.state.experience||0)-48)/35))}
  growthLabel(){const st=this.model.stageKey();if(st==='child')return({affection:'甘えんぼ育ち',playful:'いたずら育ち',calm:'おだやか育ち',independent:'マイペース育ち'})[this.model.state.childType]||'マイペース育ち';if(st==='adult')return({amaenbo:'甘えんぼ系',playful:'いたずら系',gentle:'おだやか系',aloof:'そっけない系',tsundere:'ツンデレ系',moody:'気分屋系',dere:'でれ系'})[this.model.state.personality]||'マイペース系';return''}
  noteInteraction(){this.life().lastInteractionAt=now()}
  isOuting(){return !!this.life().outing.active}
  finds(){return this.life().inventory.slice().reverse()}
  getItem(id){return this.life().inventory.find(x=>x.id===id)||null}
  removeItem(id){const l=this.life(),i=l.inventory.findIndex(x=>x.id===id);if(i<0)return null;return l.inventory.splice(i,1)[0]||null}
  async dropItem(id){const item=this.removeItem(id);if(item)await this.model.save();return item}
  statusText(){const l=this.life();if(l.outing.active)return'🚪 おでかけ中';if(this.model.isAsleep())return'🌙 すやすや寝てる';this.model.updatePoop();if(this.model.state.poop)return'💩 なんか出てる';if(l.lastEvent&&now()-Number(l.lastEvent.at||0)<180000&&l.lastEvent.status)return l.lastEvent.status;const m=this.model.moment();return`${m.emoji||'…'} ${m.label||'ふつうに過ごしてる'}`}
  setEvent(status,kind,pose=''){this.life().lastEvent={at:now(),status,kind,pose}}
  speakKey(key,babyAction='idle'){const e=this.model.entryFor(key),sp=this.model.earlySpeech(babyAction,e);this.model.state.lastSpeech=sp.text||'…';this.model.currentSpeechEntry=sp.entry||null;this.model.recordRecent('speech',this.model.state.lastSpeech);return{speech:this.model.state.lastSpeech,entry:this.model.currentSpeechEntry}}
  speakEntry(entry,babyAction='idle'){const sp=this.model.earlySpeech(babyAction,entry);this.model.state.lastSpeech=sp.text||'…';this.model.currentSpeechEntry=sp.entry||null;this.model.recordRecent('speech',this.model.state.lastSpeech);return{speech:this.model.state.lastSpeech,entry:this.model.currentSpeechEntry}}
  currentEntry(){const e=this.model.currentSpeechEntry,text=cleanText(e?.text||'');return text?{...e,text}:null}
  isCurrentSpeechSaved(){const e=this.currentEntry();return !!(e&&this.life().inventory.some(x=>x.type==='charm'&&cleanText(x.payload?.text||'')===e.text))}
  canSaveCurrentSpeech(){return !this.isOuting()&&!!this.currentEntry()}
  async saveCurrentSpeech(){const e=this.currentEntry();if(!e)return null;const found=this.life().inventory.find(x=>x.type==='charm'&&cleanText(x.payload?.text||'')===e.text);if(found)return found;const item={id:this.itemId('charm'),type:'charm',icon:'💘',title:`「${trim(e.text,24)}」`,subtitle:'この子につかえる',origin:'saved',createdAt:now(),payload:{text:e.text,date:e.date||'',sceneId:e.sceneId||'',prev:e.prev||''}};this.addItem(item);await this.model.save();return item}

  eventCatalog(){
    const st=this.model.stageKey();
    if(st==='egg')return[{pose:'egg_idle.png',anim:'wiggle',speech:'idle',status:'🥚 中でなんかやってる',w:1}];
    if(this.model.isAsleep()){const pose=st==='adult'?'adult_sleep.png':'blanket_rest.png';return[{pose,anim:'idle-breathe',speech:'sleep',status:'🌙 すやすや寝てる',w:1}]}
    if(st==='baby')return[{pose:'baby_front.png',anim:'idle-breathe',speech:'idle',status:'👀 こっち見てる',w:6},{pose:'baby_left.png',anim:'idle-shuffle',speech:'ack',status:'… なんか見てる',w:2},{pose:'baby_right.png',anim:'idle-shuffle',speech:'play',status:'✨ ちょっと動いた',w:2},{pose:'baby_back.png',anim:'idle-peek',speech:'idle',status:'… 背中向けてる',w:1}];
    if(st==='child')return[{pose:'child_front.png',anim:'idle-breathe',speech:'idle',status:'☀️ ふつうに過ごしてる',w:5},{pose:'child_left.png',anim:'idle-shuffle',speech:'ack',status:'👀 なんか見てる',w:2},{pose:'child_right.png',anim:'idle-shuffle',speech:'play',status:'🎮 なんかやりたそう',w:2},{pose:'child_back.png',anim:'idle-peek',speech:'idle',status:'… ひとりでしょもしょもしてる',w:1.3},{pose:'child_cheer.png',anim:'bounce',speech:'play',status:'✨ 妙に元気',w:1}];
    return[
      {kind:'front',pose:'adult_front.png',anim:'idle-breathe',speech:'idle',status:'☀️ ふつうに過ごしてる',w:4.5},{kind:'left',pose:'adult_left.png',anim:'idle-shuffle',speech:'ack',status:'👀 なんか見てる',w:2},{kind:'right',pose:'adult_right.png',anim:'idle-shuffle',speech:'idle',status:'👀 こっち見たり見なかったり',w:2},{kind:'back',pose:'adult_back.png',anim:'idle-breathe',speech:'ack',status:'… 背中向けてる',w:1.4},{kind:'sit',pose:'adult_sit_front.png',anim:'idle-breathe',speech:'idle',status:'… 座ってる',w:3.7},{kind:'sitback',pose:'adult_sit_back.png',anim:'idle-peek',speech:'ack',status:'… ひとりでなんかしてる',w:1.8},{kind:'phone',pose:'adult_phone.png',anim:'idle-breathe',speech:'ack',status:'📱 なんか触ってる',w:5.2},{kind:'doze',pose:'adult_doze_sit.png',anim:'idle-doze',speech:'sleep',status:'😪 うつらうつらしてる',fx:'…',w:3},{kind:'lie',pose:'adult_lie_down.png',anim:'idle-breathe',speech:'comfort',status:'… ごろごろしてる',w:2.6},{kind:'cheer',pose:'adult_cheer.png',anim:'bounce',speech:'play',status:'✨ 妙に元気',fx:'!',w:.8},{kind:'shy',pose:'adult_shy.png',anim:'squish',speech:'affection',status:'💗 なんか機嫌いい',fx:'♡',w:.5},{kind:'pout',pose:'adult_pout.png',anim:'idle-doze',speech:'tease',status:'… ちょっとむすっとしてる',fx:'…',w:.55},{kind:'troubled',pose:'adult_troubled.png',anim:'idle-doze',speech:'comfort',status:'… なんか考えてる',fx:'…',w:.45}
    ]
  }
  weightedEvent(){const mood=this.rotateMood(),p=this.model.state.personality||'',rows=this.eventCatalog(),pool=[];for(const e of rows){let w=e.w||1;if(mood==='playful'&&['cheer','left','right'].includes(e.kind))w*=2.2;if(mood==='cozy'&&['front','shy','sit'].includes(e.kind))w*=2;if(mood==='quiet'&&['phone','back','sitback','lie'].includes(e.kind))w*=1.9;if(mood==='sleepy'&&['doze','lie','sit'].includes(e.kind))w*=2.2;if(mood==='curious'&&['left','right','phone'].includes(e.kind))w*=1.7;if(p==='playful'&&e.kind==='cheer')w*=2;if(['amaenbo','dere'].includes(p)&&e.kind==='shy')w*=2.4;if(p==='aloof'&&['back','phone','sitback'].includes(e.kind))w*=2;if(p==='tsundere'&&['pout','back','shy'].includes(e.kind))w*=1.8;for(let i=0;i<Math.max(1,Math.round(w*10));i++)pool.push(e)}return pick(pool)||rows[0]}
  async advanceIdle(){
    this.ensure();const returned=await this.tick();if(returned)return returned;if(this.isOuting())return{outing:true};
    if(this.model.stageKey()==='egg'){const event=this.weightedEvent();this.model.state.lastSpeech='……';this.model.currentSpeechEntry=null;this.setEvent(event.status||'🥚 中でなんかやってる','egg',event.pose||'egg_idle.png');await this.model.save();return{...event,speech:'……'}}
    if(this.shouldStartOuting()){await this.startOuting();return{outing:true,started:true}}
    const rareChance=.012+this.maturity()*.004;let event=null;
    if(Math.random()<rareChance){const rare=this.model.corpus?.pools?.rareLove||[],mem=this.model.corpus?.pools?.memory||[],entry=pick(rare.length?rare:mem);if(entry){this.speakEntry(entry,'idle');event={pose:this.model.stageKey()==='adult'?'adult_shy.png':this.model.basePet(),anim:'squish',fx:'♡',status:'… なんか思い出した',kind:'rare'};if(Math.random()<.32)this.addItem(this.itemFromEntry(entry,'memory','rare'))}}
    if(!event){event=this.weightedEvent();this.speakKey(event.speech||'idle','idle')}
    this.setEvent(event.status||'… なんかしてる',event.kind||'idle',event.pose||'');let found=null;if(Math.random()<.007+this.maturity()*.001){found=this.makeItem('idle');this.addItem(found)}await this.model.save();return{...event,speech:this.model.state.lastSpeech,found}
  }
  shouldStartOuting(){const st=this.model.stageKey(),l=this.life();if(!['child','adult'].includes(st)||l.outing.active||this.model.isAsleep())return false;if(now()-l.lastInteractionAt<240000)return false;if(now()-l.lastOutingAt<10800000)return false;let chance=.004*(1+this.maturity()*.08);if(l.mood==='curious')chance*=1.8;if(this.model.state.personality==='aloof')chance*=1.35;if(this.model.state.personality==='playful')chance*=1.2;return Math.random()<chance}
  async startOuting(){const l=this.life(),minutes=20+Math.random()*60;l.outing={active:true,startedAt:now(),returnAt:now()+minutes*60000};l.lastEvent={at:now(),status:'🚪 おでかけ中',kind:'outing',pose:''};await this.model.save()}
  async tick(save=true){const l=this.life();this.rotateMood();this.maybeDailyFind();if(l.outing.active&&l.outing.returnAt&&now()>=l.outing.returnAt)return this.finishOuting(save);return null}
  async recallOuting(){if(!this.isOuting())return null;return this.finishOuting(true)}
  async finishOuting(save=true){const l=this.life();l.outing={active:false,startedAt:0,returnAt:0};l.lastOutingAt=now();const item=this.makeItem('outing');this.addItem(item);this.speakKey('return','return');const st=this.model.stageKey(),pose=st==='adult'?'adult_cheer.png':st==='child'?'child_cheer.png':this.model.basePet();this.setEvent('🎁 なんか持って帰ってきた','return',pose);if(save)await this.model.save();return{returned:true,item,pose,anim:'bounce',fx:'🎁',speech:this.model.state.lastSpeech}}
  maybeDailyFind(){const l=this.life(),d=today();if(l.lastFindDate===d||this.model.stageKey()==='egg')return false;l.lastFindDate=d;const first=!l.inventory.length;if(first||hash(`${d}|find|${this.model.target}`)%100<72){this.addItem(this.makeItem('daily'));return true}return true}

  itemId(type){return`${type}-${now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}
  itemFromEntry(entry,type='memory',origin='daily'){const text=cleanText(entry?.text||'');return{id:this.itemId(type),type,icon:type==='word'?'📝':'🎫',title:type==='word'?`「${trim(text,18)}」`:trim(text,26),subtitle:origin==='outing'?'おみやげ':(entry?.date||'古いやつ'),origin,createdAt:now(),payload:{text,date:entry?.date||'',sceneId:entry?.sceneId||'',prev:entry?.prev||''}}}
  makeItem(origin='daily'){const mem=this.model.corpus?.pools?.memory||[],short=this.model.corpus?.pools?.short||[],tokens=this.model.corpus?.tokens||[],r=Math.random();if(mem.length&&r<.29)return this.itemFromEntry(pick(mem),'memory',origin);if((tokens.length||short.length)&&r<.61){const token=pick(tokens)||cleanText(pick(short)?.text||'');return this.itemFromEntry({text:token,date:'',sceneId:'',prev:''},'word',origin)}if(r<.79)return{id:this.itemId('quiz'),type:'quiz',icon:'❓',title:'つづき問題',subtitle:origin==='outing'?'おみやげ':'なんか持ってた',origin,createdAt:now(),payload:{}};const [icon,title,subtitle]=pick(JUNK);return{id:this.itemId('junk'),type:'junk',icon,title,subtitle:origin==='outing'?'おみやげ':subtitle,origin,createdAt:now(),payload:{word:title}}}
  addItem(item){if(!item)return null;const l=this.life(),dup=l.inventory.slice(-12).find(x=>x.type===item.type&&x.title===item.title);if(dup&&item.type!=='quiz')return dup;l.inventory.push(item);if(l.inventory.length>18)l.inventory=l.inventory.slice(-18);return item}

  wordGame(seed=''){const base=WORD_BASE[this.model.target]||WORD_BASE.も,tokens=this.model.corpus?.tokens||[],short=(this.model.corpus?.pools?.short||[]).map(x=>cleanText(x.text)).filter(x=>x&&x.length<=14),seedWord=trim(seed,14);const fronts=uniq([seedWord,...tokens.slice(0,4),...base.front]).slice(0,7),ends=uniq([...short.slice(0,10),seedWord,...base.end]).slice(0,7);return{front:fronts,middle:CONNECTORS,end:ends,seed:seedWord}}
  wordPhrase(parts){return`${String(parts?.front||'').trim()}${String(parts?.middle||'').trim()}${String(parts?.end||'').trim()}`}
  async completeWordGame(parts){const phrase=this.wordPhrase(parts);if(!phrase)return null;const care=await this.model.act('play'),item={id:this.itemId('crafted'),type:'crafted',icon:'💬',title:trim(phrase,30),subtitle:'この子につかえる',origin:'play',createdAt:now(),payload:{text:phrase,word:phrase}};this.addItem(item);this.speakKey(Math.random()<.25?'tease':'play','play');const st=this.model.stageKey(),pose=st==='adult'?'adult_cheer.png':st==='child'?'child_cheer.png':st==='baby'?'baby_right.png':this.model.basePet();this.setEvent('🎮 なんかできた','wordplay',pose);await this.model.save();return{phrase,item,pose,anim:'bounce',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null}}

  async quizData(){if(!this.quizPromise)this.quizPromise=window.WareraData?.expandedQuiz?.('../')||Promise.resolve({next:[]});return this.quizPromise}
  quizKey(q){return`${q?.date||''}|${q?.prompt||''}|${q?.answer||''}`}
  async quizQuestion(){const d=await this.quizData(),all=(d?.next||[]).filter(x=>x?.prompt&&x?.answer&&Array.isArray(x.options)&&x.options.length);if(!all.length)return null;const recent=new Set(this.life().quizRecent||[]),fresh=all.filter(x=>!recent.has(this.quizKey(x)));return pick(fresh.length?fresh:all)}
  async answerQuiz(q,index){if(!q)return null;const choice=q.options?.[Number(index)],ok=choice===q.answer,care=await this.model.act('play'),l=this.life(),key=this.quizKey(q);l.quizRecent=[...(l.quizRecent||[]).filter(x=>x!==key),key].slice(-80);this.speakKey(ok?'play':'tease','play');const st=this.model.stageKey(),pose=st==='adult'?(ok?'adult_cheer.png':'adult_pout.png'):st==='child'?(ok?'child_cheer.png':'child_front.png'):st==='baby'?'baby_front.png':this.model.basePet();this.setEvent(ok?'🎮 当たった':'🎮 ちがった','quiz',pose);await this.model.save();return{ok,choice,answer:q.answer,date:q.date||'',pose,anim:ok?'bounce':'wiggle',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null}}

  async useWordItem(id){const item=this.removeItem(id);if(!item)return null;await this.model.save();return{item,game:this.wordGame(item.payload?.text||item.payload?.word||item.title)}}
  async useQuizItem(id){const item=this.removeItem(id);if(!item)return null;await this.model.save();return{item,question:await this.quizQuestion()}}
  async useCharmItem(id){const item=this.removeItem(id);if(!item)return null;const care=await this.model.act('pat');this.speakKey('affection','pat');const st=this.model.stageKey(),pose=st==='adult'?'adult_shy.png':st==='child'?'child_cheer.png':st==='baby'?'baby_front.png':this.model.basePet();this.setEvent('💘 メロがってる','charm',pose);await this.model.save();return{item,pose,anim:'squish',fx:'♡',speech:this.model.state.lastSpeech,stageChanged:care?.stageChanged||null}}
}

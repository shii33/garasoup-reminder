import {NAMES,petUrl,cleanText} from './core.js?v=20260927-refactor-18';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enc=s=>encodeURIComponent(String(s??''));
const dec=s=>decodeURIComponent(String(s??''));
const uniq=a=>[...new Set((a||[]).map(x=>cleanText(x)).filter(Boolean))];
const shuffled=a=>{const out=[...(a||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
const sample=(a,n)=>shuffled(uniq(a)).slice(0,n);
const usefulEnding=s=>{const t=cleanText(s);return !!t&&t.length<=18&&!/^(?:w+|ｗ+|笑+|草+)$/i.test(t)&&!/^[-ー〜~!?！？。、…・]+$/.test(t)};
const usefulLeft=s=>{const t=cleanText(s);return !!t&&t.length>=2&&t.length<=16&&!/^(?:w+|ｗ+|笑+|草+|うい(?:ー)?|おけ(?:ー|け)?|ほう|ふむ|そそ|あーね|はい|うん|ん)$/i.test(t)&&!/^[-ー〜~!?！？。、…・]+$/.test(t)};
const WORD_EXTRA={
  み:['みちゃこ','もっち','今日','われわれ','この子','ガラスープ','仕事終わり','寝る前','風呂上がり','帰り道','休みの日','朝いち','夜中','さっきの話','この感じ','今日のもっち','われわれ二人','眠いとき','お腹すいたとき','なんか今日','たぶん今日','急に','なんとなく','写真見てたら','LINE見てたら','ゲーム中','もう今日は','いまさらだけど','そういえば'],
  も:['もっち','みちゃこ','今日','われわれ','この子','ガラスープ','仕事終わり','寝る前','風呂上がり','帰り道','休みの日','朝いち','夜中','さっきの話','この感じ','今日のみちゃこ','われわれ二人','眠いとき','お腹すいたとき','なんか今日','たぶん今日','急に','なんとなく','写真見てたら','LINE見てたら','ゲーム中','もう今日は','いまさらだけど','そういえば']
};

export class GrowView{
  constructor(model,sourceLog,life){this.model=model;this.sourceLog=sourceLog;this.life=life;this.heldPose='';this.heldUntil=0;this.idleFxTimer=0;this.activity=null;this.mount();this.bindSourceButton()}
  setModel(model,life){this.model=model;this.life=life;this.releasePose();this.activity=null}
  $(id){return document.getElementById(id)}
  mount(){
    document.getElementById('g12')?.remove();const root=document.createElement('div');root.id='g12';
    root.innerHTML=`<section class="g12shell"><div class="g12top"><div class="g12brand"><span class="egg">🥚</span><div><b>われわれ育成所</b><small>ログからできた、相手っぽい生き物。</small></div></div><div class="g12top-actions"><button class="g12mini" id="g12share">画像にする</button><button class="g12mini g12danger" id="g12farewell">お別れ</button></div></div><div class="g12body"><div class="g12grid"><section class="g12main"><div class="g12head"><div class="g12name" id="g12name"></div><div class="g12stage" id="g12stage"></div></div><div class="g12room" id="g12room"><div class="g12status" id="g12status"></div><div class="g12speech" id="g12speech"></div><div class="g12petbox" id="g12petbox"><img class="g12pet" id="g12pet" alt=""></div><div class="g12outing" id="g12outing" hidden><span>🚪</span><b>おでかけ中</b><small>どっか行った。</small><button type="button" data-recall>呼び戻す</button></div><span class="g12idlefx" id="g12idlefx"></span><span class="g12poop" id="g12poop" hidden>💩</span><div class="g12branch" id="g12branch" hidden></div><button class="g12memory" id="g12memory" hidden></button></div><div class="g12under"><button class="g12like" id="g12like">♡ とっておく</button><span class="g12hint">ひろいものから、また遊べる。</span></div></section><aside class="g12side"><div class="g12sidehead"><h2>ひろいもの</h2><span id="g12findCount"></span></div><div class="g12finds" id="g12finds"></div></aside><section class="g12actions"><div id="g12actions"></div></section></div></div></section><div class="g12modal" id="g12modal" hidden><div class="g12dlg" id="g12dlg"></div></div>`;
    (document.querySelector('.conversation-shell')||document.querySelector('main')||document.body).append(root)
  }
  bindSourceButton(){this.$('g12memory').addEventListener('click',e=>{if(!e.currentTarget.dataset.sourceLog)return;e.preventDefault();e.stopPropagation();this.sourceLog.open()})}
  poseHeld(){if(!this.heldPose)return false;if(Date.now()>=this.heldUntil){this.releasePose();return false}return true}
  releasePose(){this.heldPose='';this.heldUntil=0}
  safePose(file){const st=this.model.stageKey();if(st==='egg')return'egg_idle.png';if(st==='baby')return String(file||'').startsWith('baby_')?file:'baby_front.png';if(st==='child'){if(String(file||'').startsWith('child_'))return file;if(file==='adult_cheer.png')return'child_cheer.png';return'child_front.png'}return file}
  applyPose(file,anim=''){const img=this.$('g12pet'),safe=this.safePose(file);if(!img||!safe)return;img.onerror=()=>{img.onerror=null};img.src=petUrl(this.model,safe);if(anim){img.classList.remove('bounce','wiggle','squish','idle-breathe','idle-peek','idle-doze','idle-shuffle');void img.offsetWidth;img.classList.add(anim);if(!anim.startsWith('idle-'))setTimeout(()=>img.classList.remove(anim),700)}}
  showReaction(file,anim='',holdMs){if(!file||this.life.isOuting())return;const ms=holdMs??7000;this.heldPose=this.safePose(file);this.heldUntil=Date.now()+ms;this.applyPose(file,anim)}
  applyLifeEvent(event){if(!event)return;if(event.speech!=null)this.$('g12speech').textContent=event.speech||'…';if(event.pose&&!this.life.isOuting()){this.releasePose();this.applyPose(event.pose,event.anim||'')}if(event.fx)this.showIdleFx(event.fx)}
  showIdleFx(text){const el=this.$('g12idlefx');if(!el||!text)return;el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(this.idleFxTimer);this.idleFxTimer=setTimeout(()=>el.classList.remove('show'),1900)}
  async render({preservePet=false}={}){
    const m=this.model,s=m.state,st=m.stage(),d=new Date(),outing=this.life.isOuting();m.updatePoop();
    this.$('g12room').classList.toggle('night',d.getHours()<6||d.getHours()>=18);this.$('g12name').textContent=NAMES[m.target];this.$('g12stage').textContent=`${m.ageDays()}日目・${st[1]}`;this.$('g12status').textContent=this.life.statusText();
    this.$('g12speech').textContent=s.lastSpeech||'…';this.$('g12speech').hidden=outing;this.$('g12petbox').hidden=outing;this.$('g12outing').hidden=!outing;
    this.$('g12petbox').className=`g12petbox s-${st[0]}`;if(!outing&&!preservePet&&!this.poseHeld())this.applyPose(m.currentPet());
    const branch=this.life.growthLabel();this.$('g12branch').hidden=!branch||outing;this.$('g12branch').textContent=branch;this.$('g12poop').hidden=outing||!s.poop;this.$('g12actions').innerHTML=this.actionButtons();
    const canSave=this.life.canSaveCurrentSpeech(),saved=this.life.isCurrentSpeechSaved(),keep=this.$('g12like');keep.disabled=!canSave||saved;keep.classList.toggle('liked',saved);keep.textContent=saved?'♥ とってある':'♡ とっておく';
    this.renderFinds();await this.sourceLog.sync({speech:outing?'':s.lastSpeech||'',stageLabel:st[1],target:m.target,button:this.$('g12memory')})
  }
  actionButtons(){
    const m=this.model,s=m.state;if(m.stageKey()==='egg'){const egg={warm:['🫶','あたためる'],call:['📣','名前を呼ぶ'],tap:['👉','つんつん'],hum:['🎵','うたう'],listen:['👂','ようすを見る'],word:['🌀','われわれ語']};return`<div class="g12action-grid">${Object.entries(egg).slice(0,4).map(([k,v])=>`<button class="g12action" data-e="${k}"><i>${v[0]}</i><b>${v[1]}</b></button>`).join('')}</div><div class="g12context">${Object.entries(egg).slice(4).map(([k,v])=>`<button data-e="${k}">${v[0]} ${v[1]}</button>`).join('')}</div>`}
    if(this.life.isOuting())return`<div class="g12recall"><b>おでかけ中。</b><span>呼べばすぐ帰ってくる。</span><button type="button" data-recall>呼び戻す</button></div>`;
    const asleep=m.isAsleep(),actions=[['feed','🍚','ごはん','食べさせる'],['play','🎮','あそぶ','いっしょに遊ぶ'],['pat','💗','愛でる','とりあえず触る'],['bath','🫧','おふろ','カラダ・アラウ']];
    let html=`<div class="g12action-grid">${actions.map(([k,icon,label,sub])=>`<button class="g12action" ${k==='play'?'data-play-menu':'data-a="'+k+'"'} ${asleep?'disabled':''}><i>${icon}</i><b>${label}</b><small>${asleep?'ねてる':sub}</small></button>`).join('')}</div>`;const extra=[];if(s.poop)extra.push('<button data-a="toilet">🚽 かたづける</button>');if(m.canSleepNow()||asleep)extra.push(`<button data-a="sleep">${asleep?(m.canWakeNow()?'☀️ 起こす':m.canNightPlay()?'🌙 今だけ遊ぼ':'😴 ねてる'):'🌙 ねる'}</button>`);if(extra.length)html+=`<div class="g12context">${extra.join('')}</div>`;return html
  }
  renderFinds(){const rows=this.life.finds(),all=rows.length,count=this.$('g12findCount');count.textContent=all?`${all}こ`:'';const box=this.$('g12finds');if(!rows.length){box.innerHTML='<p class="g12empty">まだなんもない。</p>';return}box.innerHTML=rows.map(x=>`<button class="g12find" data-find="${esc(x.id)}"><span class="g12findicon">${esc(x.icon||'•')}</span><span><b>${esc(x.title)}</b><small>${esc(x.subtitle||'')}</small></span><i>›</i></button>`).join('')}
  openModal(html,{lockScroll=false}={}){const modal=this.$('g12modal'),dlg=this.$('g12dlg');dlg.innerHTML=html;dlg.style.overflowY=lockScroll?'hidden':'auto';modal.hidden=false}
  closeModal(){this.$('g12modal').hidden=true;this.activity=null}
  showPlayMenu(){this.activity={type:'menu'};this.openModal(`<div class="g12modalhead"><div><b>あそぶ</b><small>なにする？</small></div><button data-modal-close>×</button></div><div class="g12playmenu"><button data-play-mode="tease"><span>🎮</span><b>いつものちょっかい</b><small>とりあえず構う。</small></button><button data-play-mode="words"><span>💬</span><b>ことばをくっつける</b><small>好きな3つを、押した順でくっつける。</small></button><button data-play-mode="quiz"><span>❓</span><b>続きあて</b><small>この次なんて返した？</small></button></div>`)}
  randomizeWordGame(game){
    const allShort=(this.model.corpus?.pools?.short||[]).map(x=>cleanText(x?.text||''));
    const shortEnds=allShort.filter(usefulEnding),leftPhrases=allShort.filter(usefulLeft),seed=cleanText(game?.seed||'');
    const pool=uniq([...(WORD_EXTRA[this.model.target]||[]),...leftPhrases,...(game?.words||[]),...shortEnds]);
    let choices=sample(pool.filter(v=>cleanText(v)!==seed),30);
    if(seed)choices=[seed,...choices.slice(0,29)];
    return{...game,choices,seed};
  }
  showWordGame(game){const randomized=this.randomizeWordGame(game||{});this.activity={type:'word',game:randomized,selections:[]};this.renderWordGame()}
  renderWordGame(){
    const a=this.activity;if(!a||a.type!=='word')return;
    const selected=a.selections||[],preview=selected.join(''),seed=cleanText(a.game.seed||'');
    const choices=(a.game.choices||[]).map(v=>{const index=selected.indexOf(v),isSeed=!!seed&&cleanText(v)===seed;return`<button class="g12wordchoice${index>=0?' is-selected':''}${isSeed?' is-seed':''}" data-word-choice data-v="${enc(v)}" ${index>=0||selected.length>=3?'disabled':''}>${index>=0?`${index+1}. `:''}${esc(v)}</button>`}).join('');
    const steps=selected.length?selected.map((v,i)=>`<span class="g12wordstep">${i+1} ${esc(v)}</span>`).join(''):'<span class="g12wordhint">候補を3つ、使いたい順に押す。</span>';
    this.openModal(`<div class="g12wordlayout"><div class="g12modalhead g12wordhead"><div><b>ことばをくっつける</b><small>好きな3つを、押した順でくっつける。</small></div><button data-modal-close>×</button></div><div class="g12wordscroll"><div class="g12wordchoices">${choices}</div></div><div class="g12wordfooter"><div class="g12wordstepsrow"><div class="g12wordsteps">${steps}</div><button class="g12wordundo" data-word-undo ${selected.length?'':'disabled'}>↶ ひとつ戻す</button></div><div class="g12wordpreview">${preview?esc(preview):'3つ選ぶとここにできる。'}</div><div class="g12wordbuttons"><button class="g12primary" data-word-finish ${selected.length===3?'':'disabled'}>この子に言ってみる</button><button class="g12wordsave" data-word-save ${selected.length===3?'':'disabled'}>とっておく</button></div></div></div>`,{lockScroll:true})
  }
  chooseWord(value){if(!this.activity||this.activity.type!=='word')return;const choice=dec(value),selected=this.activity.selections||[];if(selected.length<3&&!selected.includes(choice))selected.push(choice);this.activity.selections=selected;this.renderWordGame()}
  undoWord(){if(!this.activity||this.activity.type!=='word')return;this.activity.selections?.pop();this.renderWordGame()}
  wordSelection(){return this.activity?.type==='word'?[...(this.activity.selections||[])]:null}
  showQuiz(q){if(!q){this.openModal(`<div class="g12modalhead"><b>続きあて</b><button data-modal-close>×</button></div><p class="g12empty">問題が見つからなかった。</p>`);return}this.activity={type:'quiz',question:q};const mine=q.prompt_who==='み';this.openModal(`<div class="g12modalhead"><div><b>続きあて</b><small>この次なんて返した？</small></div><button data-modal-close>×</button></div><div class="g12quizprompt ${mine?'mine':'theirs'}"><span>${esc(q.prompt_who||'')}</span><p>${esc(q.prompt).replaceAll('\n','<br>')}</p></div><div class="g12quizchoices">${q.options.map((v,i)=>`<button data-quiz-choice="${i}">${esc(v).replaceAll('\n','<br>')}</button>`).join('')}</div>`)}
  currentQuiz(){return this.activity?.type==='quiz'?this.activity.question:null}
  showQuizResult(r){this.activity={type:'quiz-result'};this.openModal(`<div class="g12modalhead"><div><b>${r.ok?'○ 正解':'× ちがう'}</b><small>${esc(r.date||'')}</small></div><button data-modal-close>×</button></div><div class="g12quizanswer"><small>答え</small><b>${esc(r.answer||'')}</b></div><div class="g12modalactions"><button data-quiz-next>もう1問</button><button data-modal-close>おわる</button></div>`)}
  showFindItem(item,{gift=false}={}){
    if(!item)return;
    this.activity={type:'find',item};
    const rawText=cleanText(item.payload?.text||item.payload?.word||'');
    const titleText=cleanText(String(item.title||'').replace(/^[「『“"]|[」』”"]$/g,''));
    const showQuote=rawText&&rawText!==titleText;
    const action=item.type==='quiz'?`<button class="g12itemprimary" data-item-quiz="${esc(item.id)}">続きあてにつかう</button>`:['charm','crafted'].includes(item.type)?`<button class="g12itemprimary" data-item-say="${esc(item.id)}">この子に言ってみる</button>`:`<button class="g12itemprimary" data-item-word="${esc(item.id)}">ことば遊びにつかう</button>`;
    const kicker=gift?'<span class="g12itemkicker">おかえり。なんか持ってきた。</span>':'';
    this.openModal(`<div class="g12itemdetail">${kicker}<div class="g12itemhead"><span class="g12itemheroicon">${esc(item.icon||'•')}</span><div><b>${esc(item.title||'ひろいもの')}</b><small>${esc(item.subtitle||'')}</small></div><button data-modal-close aria-label="閉じる">×</button></div>${showQuote?`<div class="g12itemquote">${esc(rawText)}</div>`:''}<div class="g12itemactions">${action}<button class="g12itemdrop" data-item-drop="${esc(item.id)}">手放す</button></div></div>`)
  }
  showGift(item){this.showFindItem(item,{gift:true})}
  showStageUp(change){const label=change?.to==='baby'?'あかちゃん':change?.to==='child'?'こども':change?.to==='adult'?'おとな':String(change?.to||'');this.activity={type:'stage'};this.openModal(`<div class="g12stageup"><b>${esc(label)}</b><span>になった。</span><button type="button" data-modal-close>おけ</button></div>`)}
}

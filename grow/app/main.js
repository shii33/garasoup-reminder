import './data-service.js?v=20260926-life-4';
import {GrowModel,getViewer} from './core.js?v=20260926-life-4';
import {CreatureLife} from './life.js?v=20260926-life-4';
import {SourceLog} from './source-log.js?v=20260926-life-4';
import {GrowView} from './view.js?v=20260926-life-4';
import {ShareService} from './share.js?v=20260926-life-4';

let model=null,life=null,view=null;
const sourceLog=new SourceLog();
const share=new ShareService();
let idleTimer=0,heartbeatTimer=0,perspectiveTimer=0;

const rand=(min,max)=>min+Math.random()*(max-min);
const emptyCorpus=()=>({pools:{},sceneMap:new Map(),tokens:[],count:0});
const timeout=(ms,value=null)=>new Promise(resolve=>setTimeout(()=>resolve(value),ms));

function scheduleIdle(min=7000,max=10000){
  clearTimeout(idleTimer);
  idleTimer=setTimeout(async()=>{
    if(!model||!life||!view)return scheduleIdle();
    try{
      const event=await life.advanceIdle();
      await view.render({preservePet:!!event?.pose});
      if(event?.pose||event?.speech!=null||event?.fx)view.applyLifeEvent(event);
      if(event?.found)view.showIdleFx(event.found.icon||'•');
      if(event)share.schedule(350)
    }catch(e){console.warn('grow idle event failed',e)}
    scheduleIdle()
  },rand(min,max))
}
function noteInteraction(){life?.noteInteraction();clearTimeout(idleTimer)}
function settleAfterReaction(){scheduleIdle(7000,10000)}

async function loadModelFast(viewer){
  const next=new GrowModel(viewer);let initial=next.readLocal();
  if(!initial){try{initial=await Promise.race([next.readDb(),timeout(900,null)])}catch{initial=null}}
  next.state=initial||next.fresh();next.corpus=emptyCorpus();next.migrate();next.initializeSpeech();
  setTimeout(async()=>{try{await next.loadCorpus();if(model===next&&view){await view.render({preservePet:true});share.schedule(350)}}catch(e){console.warn('grow corpus background load failed',e)}},0);
  return next
}

async function switchModel(viewer){model=await loadModelFast(viewer);life=new CreatureLife(model);await life.initialize();if(!view)view=new GrowView(model,sourceLog,life);else view.setModel(model,life);await view.render();document.getElementById('growLoading')?.remove();share.schedule(250)}

async function applyActionResult(result,{modal=null}={}){await view.render({preservePet:true});if(result?.reaction)view.showReaction(result.reaction,result.anim);else if(result?.pose)view.applyLifeEvent(result);else if(!life.isOuting())view.applyPose(model.currentPet());if(result?.stageChanged)view.showStageUp(result.stageChanged);else if(modal)modal();settleAfterReaction();share.schedule(500)}

async function handleCare(button){if(button.disabled)return;noteInteraction();view.releasePose();const result=button.dataset.a?await model.act(button.dataset.a):await model.eggAct(button.dataset.e);await applyActionResult(result)}
async function handleUsualPlay(){noteInteraction();view.closeModal();const result=await model.act('play');await applyActionResult(result)}
async function openQuiz(){view.showQuiz(await life.quizQuestion())}

async function handleWordFinish(){const parts=view.wordSelection();if(!parts?.front||!parts?.middle||!parts?.end)return;noteInteraction();const result=await life.completeWordGame(parts);if(!result)return;await view.render({preservePet:true});view.applyLifeEvent(result);if(result?.stageChanged)view.showStageUp(result.stageChanged);else view.showWordResult(result);settleAfterReaction();share.schedule(500)}
async function handleQuizAnswer(index){const q=view.currentQuiz();if(!q)return;noteInteraction();const result=await life.answerQuiz(q,index);if(!result)return;await view.render({preservePet:true});view.applyLifeEvent(result);if(result?.stageChanged)view.showStageUp(result.stageChanged);else view.showQuizResult(result);settleAfterReaction();share.schedule(500)}
async function recall(){const result=await life.recallOuting();if(!result)return;noteInteraction();await view.render({preservePet:true});view.applyLifeEvent(result);view.showGift(result.item);settleAfterReaction();share.schedule(500)}

async function useWordItem(id){const result=await life.useWordItem(id);if(!result)return;await view.render({preservePet:true});view.showWordGame(result.game);share.schedule(350)}
async function useQuizItem(id){const result=await life.useQuizItem(id);if(!result)return;await view.render({preservePet:true});view.showQuiz(result.question);share.schedule(350)}
async function useCharmItem(id){noteInteraction();const result=await life.useCharmItem(id);if(!result)return;await view.render({preservePet:true});view.applyLifeEvent(result);if(result?.stageChanged)view.showStageUp(result.stageChanged);else view.showCharmResult(result);settleAfterReaction();share.schedule(500)}
async function dropItem(id){await life.dropItem(id);view.closeModal();await view.render({preservePet:true});share.schedule(350)}

function bind(){
  const root=document.getElementById('g12');root.addEventListener('click',async e=>{
    if(e.target.closest('[data-modal-close]')){view.closeModal();return}
    const recallButton=e.target.closest('[data-recall]');if(recallButton){e.preventDefault();await recall();return}
    const find=e.target.closest('[data-find]');if(find){e.preventDefault();view.showFindItem(life.getItem(find.dataset.find));return}
    const itemWord=e.target.closest('[data-item-word]');if(itemWord){await useWordItem(itemWord.dataset.itemWord);return}
    const itemQuiz=e.target.closest('[data-item-quiz]');if(itemQuiz){await useQuizItem(itemQuiz.dataset.itemQuiz);return}
    const itemCharm=e.target.closest('[data-item-charm]');if(itemCharm){await useCharmItem(itemCharm.dataset.itemCharm);return}
    const itemDrop=e.target.closest('[data-item-drop]');if(itemDrop){await dropItem(itemDrop.dataset.itemDrop);return}
    const wordChoice=e.target.closest('[data-word-choice]');if(wordChoice){view.chooseWord(wordChoice.dataset.slot,wordChoice.dataset.v);return}
    if(e.target.closest('[data-word-finish]')){await handleWordFinish();return}
    const quizChoice=e.target.closest('[data-quiz-choice]');if(quizChoice){await handleQuizAnswer(quizChoice.dataset.quizChoice);return}
    if(e.target.closest('[data-quiz-next]')){await openQuiz();return}
    if(e.target.closest('[data-play-menu]')){life.noteInteraction();view.showPlayMenu();return}
    const playMode=e.target.closest('[data-play-mode]');if(playMode){const mode=playMode.dataset.playMode;if(mode==='tease')await handleUsualPlay();else if(mode==='words')view.showWordGame(life.wordGame());else if(mode==='quiz')await openQuiz();return}
    const care=e.target.closest('#g12actions [data-a],#g12actions [data-e]');if(care){e.preventDefault();await handleCare(care);return}
    if(e.target.closest('#g12like')){const item=await life.saveCurrentSpeech();if(item){view.showIdleFx('💘');await view.render({preservePet:true});share.schedule(350)}return}
    if(e.target.closest('#g12share')){e.preventDefault();e.stopPropagation();await share.openNative();return}
    if(e.target.closest('#g12farewell')){if(!confirm(`${model.target==='み'?'みちゃこ':'もっち'}とお別れします。\nこの端末の育成データは消えて、たまごから育て直しになります。いい？`))return;await model.remove();view.closeModal();await switchModel(model.viewer);scheduleIdle();return}
  })
}

async function heartbeat(){if(!model||!view||!life)return;const wasPoop=!!model.state.poop,wasSleep=model.isAsleep();model.updatePoop();const returned=await life.tick();const sleep=model.isAsleep(),changed=wasPoop!==!!model.state.poop||wasSleep!==sleep||!!returned;await view.render({preservePet:true});if(returned){view.applyLifeEvent(returned);view.showGift(returned.item);settleAfterReaction()}if(changed)share.schedule(350)}

function showBootError(error){console.error('われわれ育成所の起動に失敗',error);const host=document.querySelector('.conversation-shell')||document.body;document.getElementById('growLoading')?.remove();let p=document.querySelector('.grow-boot-error');if(!p){p=document.createElement('p');p.className='grow-boot-error';host.append(p)}p.textContent=`育成所を読み込めなかった：${error?.message||error||'unknown error'}`}

async function boot(){try{window.wireLock?.('../');await switchModel(getViewer());bind();share.bind();sourceLog.load();scheduleIdle();heartbeatTimer=setInterval(heartbeat,20000);perspectiveTimer=setInterval(async()=>{const v=getViewer();if(model&&v!==model.viewer){view.closeModal();await switchModel(v);scheduleIdle()}},2000)}catch(e){showBootError(e)}}

window.addEventListener('error',e=>{if(!document.getElementById('g12'))showBootError(e.error||e.message)});
window.addEventListener('unhandledrejection',e=>{if(!document.getElementById('g12'))showBootError(e.reason)});
boot();

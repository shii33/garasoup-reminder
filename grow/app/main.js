import './data-service.js?v=20260927-life-6';
import {GrowModel,getViewer} from './core.js?v=20260927-life-6';
import {CreatureLife} from './life.js?v=20260927-life-6';
import {SourceLog} from './source-log.js?v=20260927-life-6';
import {GrowView} from './view.js?v=20260927-life-6';
import {ShareService} from './share.js?v=20260927-life-6';

const TIMING={
  idleMin:7000,
  idleMax:10000,
  dbTimeout:900,
  shareRender:350,
  shareAction:500,
  heartbeat:20000,
  perspective:2000,
};

let model=null;
let life=null;
let view=null;
let idleTimer=0;
let heartbeatTimer=0;
let perspectiveTimer=0;

const sourceLog=new SourceLog();
const share=new ShareService();
const rand=(min,max)=>min+Math.random()*(max-min);
const emptyCorpus=()=>({pools:{},sceneMap:new Map(),tokens:[],count:0});
const timeout=(ms,value=null)=>new Promise(resolve=>setTimeout(()=>resolve(value),ms));
const queueShare=(delay=TIMING.shareRender)=>share.schedule(delay);

function clearIdle(){clearTimeout(idleTimer)}

function scheduleIdle(min=TIMING.idleMin,max=TIMING.idleMax){
  clearIdle();
  idleTimer=setTimeout(runIdle,rand(min,max));
}

async function runIdle(){
  if(!model||!life||!view){scheduleIdle();return}
  try{
    const event=await life.advanceIdle();
    await view.render({preservePet:!!event?.pose});
    if(event?.pose||event?.speech!=null||event?.fx)view.applyLifeEvent(event);
    if(event?.found)view.showIdleFx(event.found.icon||'•');
    if(event)queueShare();
  }catch(error){
    console.warn('grow idle event failed',error);
  }
  scheduleIdle();
}

function noteInteraction(){
  life?.noteInteraction();
  model?.extendNightPlay?.();
  clearIdle();
}

function settleAfterReaction(){scheduleIdle()}

async function loadModelFast(viewer){
  const next=new GrowModel(viewer);
  let initial=next.readLocal();
  if(!initial){
    try{initial=await Promise.race([next.readDb(),timeout(TIMING.dbTimeout,null)])}
    catch{initial=null}
  }
  next.state=initial||next.fresh();
  next.corpus=emptyCorpus();
  next.migrate();
  next.initializeSpeech();

  setTimeout(async()=>{
    try{
      await next.loadCorpus();
      if(model===next&&view){
        await view.render({preservePet:true});
        queueShare();
      }
    }catch(error){
      console.warn('grow corpus background load failed',error);
    }
  },0);

  return next;
}

async function switchModel(viewer){
  model=await loadModelFast(viewer);
  life=new CreatureLife(model);
  await life.initialize();
  if(!view)view=new GrowView(model,sourceLog,life);
  else view.setModel(model,life);
  await view.render();
  document.getElementById('growLoading')?.remove();
  queueShare(250);
}

async function renderActionResult(result,{modal=null}={}){
  await view.render({preservePet:true});
  if(result?.reaction)view.showReaction(result.reaction,result.anim);
  else if(result?.pose)view.applyLifeEvent(result);
  else if(!life.isOuting())view.applyPose(model.currentPet());

  if(result?.stageChanged)view.showStageUp(result.stageChanged);
  else if(modal)modal();

  settleAfterReaction();
  queueShare(TIMING.shareAction);
}

async function renderLifeResult(result,onDone){
  if(!result)return;
  await view.render({preservePet:true});
  view.applyLifeEvent(result);
  if(result.stageChanged)view.showStageUp(result.stageChanged);
  else onDone?.(result);
  settleAfterReaction();
  queueShare(TIMING.shareAction);
}

async function handleCare(button){
  if(button.disabled)return;
  noteInteraction();
  view.releasePose();
  const result=button.dataset.a?await model.act(button.dataset.a):await model.eggAct(button.dataset.e);
  await renderActionResult(result);
}

async function handleUsualPlay(){
  noteInteraction();
  view.closeModal();
  await renderActionResult(await model.act('play'));
}

async function openQuiz(){view.showQuiz(await life.quizQuestion())}

async function handleWordFinish(){
  const parts=view.wordSelection();
  if(!parts?.front||!parts?.middle||!parts?.end)return;
  noteInteraction();
  await renderLifeResult(await life.completeWordGame(parts),result=>view.showWordResult(result));
}

async function handleQuizAnswer(index){
  const question=view.currentQuiz();
  if(!question)return;
  noteInteraction();
  await renderLifeResult(await life.answerQuiz(question,index),result=>view.showQuizResult(result));
}

async function recall(){
  noteInteraction();
  await renderLifeResult(await life.recallOuting(),result=>view.showGift(result.item));
}

async function useWordItem(id){
  const result=await life.useWordItem(id);
  if(!result)return;
  await view.render({preservePet:true});
  view.showWordGame(result.game);
  queueShare();
}

async function useQuizItem(id){
  const result=await life.useQuizItem(id);
  if(!result)return;
  await view.render({preservePet:true});
  view.showQuiz(result.question);
  queueShare();
}

async function useCharmItem(id){
  noteInteraction();
  await renderLifeResult(await life.useCharmItem(id),result=>view.showCharmResult(result));
}

async function dropItem(id){
  await life.dropItem(id);
  view.closeModal();
  await view.render({preservePet:true});
  queueShare();
}

async function saveCurrentSpeech(){
  const item=await life.saveCurrentSpeech();
  if(!item)return;
  view.showIdleFx('💘');
  await view.render({preservePet:true});
  queueShare();
}

async function farewell(){
  const name=model.target==='み'?'みちゃこ':'もっち';
  if(!confirm(`${name}とお別れします。\nこの端末の育成データは消えて、たまごから育て直しになります。いい？`))return;
  await model.remove();
  view.closeModal();
  await switchModel(model.viewer);
  scheduleIdle();
}

async function handleClick(event){
  const target=event.target;

  if(target.closest('[data-modal-close]')){view.closeModal();return}

  const recallButton=target.closest('[data-recall]');
  if(recallButton){event.preventDefault();await recall();return}

  const find=target.closest('[data-find]');
  if(find){event.preventDefault();view.showFindItem(life.getItem(find.dataset.find));return}

  const itemWord=target.closest('[data-item-word]');
  if(itemWord){await useWordItem(itemWord.dataset.itemWord);return}

  const itemQuiz=target.closest('[data-item-quiz]');
  if(itemQuiz){await useQuizItem(itemQuiz.dataset.itemQuiz);return}

  const itemCharm=target.closest('[data-item-charm]');
  if(itemCharm){await useCharmItem(itemCharm.dataset.itemCharm);return}

  const itemDrop=target.closest('[data-item-drop]');
  if(itemDrop){await dropItem(itemDrop.dataset.itemDrop);return}

  const wordChoice=target.closest('[data-word-choice]');
  if(wordChoice){view.chooseWord(wordChoice.dataset.slot,wordChoice.dataset.v);return}

  if(target.closest('[data-word-finish]')){await handleWordFinish();return}

  const quizChoice=target.closest('[data-quiz-choice]');
  if(quizChoice){await handleQuizAnswer(quizChoice.dataset.quizChoice);return}

  if(target.closest('[data-quiz-next]')){await openQuiz();return}

  if(target.closest('[data-play-menu]')){
    noteInteraction();
    view.showPlayMenu();
    return;
  }

  const playMode=target.closest('[data-play-mode]');
  if(playMode){
    const mode=playMode.dataset.playMode;
    if(mode==='tease')await handleUsualPlay();
    else if(mode==='words')view.showWordGame(life.wordGame());
    else if(mode==='quiz')await openQuiz();
    return;
  }

  const care=target.closest('#g12actions [data-a],#g12actions [data-e]');
  if(care){event.preventDefault();await handleCare(care);return}

  if(target.closest('#g12like')){await saveCurrentSpeech();return}

  if(target.closest('#g12share')){
    event.preventDefault();
    event.stopPropagation();
    await share.openNative();
    return;
  }

  if(target.closest('#g12farewell'))await farewell();
}

function bind(){document.getElementById('g12').addEventListener('click',handleClick)}

async function heartbeat(){
  if(!model||!view||!life)return;
  const wasPoop=!!model.state.poop;
  const wasSleep=model.isAsleep();
  model.updatePoop();
  const returned=await life.tick();
  const isSleep=model.isAsleep();
  const changed=wasPoop!==!!model.state.poop||wasSleep!==isSleep||!!returned;
  await view.render({preservePet:true});
  if(returned){
    view.applyLifeEvent(returned);
    view.showGift(returned.item);
    settleAfterReaction();
  }
  if(changed)queueShare();
}

async function checkPerspective(){
  const viewer=getViewer();
  if(!model||viewer===model.viewer)return;
  view.closeModal();
  await switchModel(viewer);
  scheduleIdle();
}

function showBootError(error){
  console.error('われわれ育成所の起動に失敗',error);
  const host=document.querySelector('.conversation-shell')||document.body;
  document.getElementById('growLoading')?.remove();
  let message=document.querySelector('.grow-boot-error');
  if(!message){
    message=document.createElement('p');
    message.className='grow-boot-error';
    host.append(message);
  }
  message.textContent=`育成所を読み込めなかった：${error?.message||error||'unknown error'}`;
}

async function boot(){
  try{
    window.wireLock?.('../');
    await switchModel(getViewer());
    bind();
    share.bind();
    sourceLog.load();
    scheduleIdle();
    heartbeatTimer=setInterval(heartbeat,TIMING.heartbeat);
    perspectiveTimer=setInterval(checkPerspective,TIMING.perspective);
  }catch(error){
    showBootError(error);
  }
}

window.addEventListener('error',event=>{if(!document.getElementById('g12'))showBootError(event.error||event.message)});
window.addEventListener('unhandledrejection',event=>{if(!document.getElementById('g12'))showBootError(event.reason)});
boot();

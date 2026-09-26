import './data-service.js?v=20260926-refactor-4';
import {GrowModel,getViewer} from './core.js?v=20260926-refactor-4';
import {SourceLog} from './source-log.js?v=20260926-refactor-4';
import {GrowView} from './view.js?v=20260926-refactor-4';
import {ShareService} from './share.js?v=20260926-refactor-4';

let model=null,view=null;
const sourceLog=new SourceLog();
const share=new ShareService();
let idlePoseTimer=0,idleSpeechTimer=0,heartbeatTimer=0,perspectiveTimer=0;

const rand=(min,max)=>min+Math.random()*(max-min);
const emptyCorpus=()=>({pools:{},sceneMap:new Map(),tokens:[],count:0});
const timeout=(ms,value=null)=>new Promise(resolve=>setTimeout(()=>resolve(value),ms));
const schedulePose=(min=6500,max=15000)=>{clearTimeout(idlePoseTimer);idlePoseTimer=setTimeout(()=>{if(view?.showIdlePose())share.schedule(350);schedulePose()},rand(min,max))};
const scheduleSpeech=(min=20000,max=45000)=>{clearTimeout(idleSpeechTimer);idleSpeechTimer=setTimeout(async()=>{if(await model?.idleSpeech()){await view.render({preservePet:true});share.schedule(350)}scheduleSpeech()},rand(min,max))};
const afterInteraction=()=>{schedulePose(6500,11000);scheduleSpeech(26000,48000)};

async function loadModelFast(viewer){
  const next=new GrowModel(viewer);
  let initial=next.readLocal();
  if(!initial){
    try{initial=await Promise.race([next.readDb(),timeout(900,null)])}catch{initial=null}
  }
  next.state=initial||next.fresh();
  next.corpus=emptyCorpus();
  next.migrate();
  next.initializeSpeech();

  setTimeout(async()=>{
    try{
      await next.loadCorpus();
      if(model===next&&view){await view.render({preservePet:true});share.schedule(350)}
    }catch(e){console.warn('grow corpus background load failed',e)}
  },0);
  return next;
}

async function switchModel(viewer){model=await loadModelFast(viewer);if(!view)view=new GrowView(model,sourceLog);else view.setModel(model);await view.render({forceObservation:true});document.getElementById('growLoading')?.remove();share.schedule(250)}

async function handleCare(button){if(button.disabled)return;afterInteraction();view.releasePose();let result;if(button.dataset.a)result=await model.act(button.dataset.a);else result=await model.eggAct(button.dataset.e);view.forceObservation();await view.render({preservePet:true,forceObservation:true});if(result?.reaction)view.showReaction(result.reaction,result.anim);else if(!view.poseHeld())view.applyPose(model.currentPet());if(result?.stageChanged)view.showStageUp(result.stageChanged);share.schedule(500)}

function bind(){const root=document.getElementById('g12');root.addEventListener('click',async e=>{const care=e.target.closest('#g12actions [data-a],#g12actions [data-e]');if(care){e.preventDefault();await handleCare(care);return}if(e.target.closest('#g12like')){afterInteraction();await model.likeSpeech();await view.render({preservePet:true});share.schedule(350);return}if(e.target.closest('#g12share')){e.preventDefault();e.stopPropagation();afterInteraction();await share.openNative();return}if(e.target.closest('#g12farewell')){afterInteraction();if(!confirm(`${model.target==='み'?'みちゃこ':'もっち'}とお別れします。\nこの端末の育成データは消えて、たまごから育て直しになります。いい？`))return;await model.remove();await switchModel(model.viewer);schedulePose(5000,9000);scheduleSpeech();return}})}

async function heartbeat(){if(!model||!view)return;const wasPoop=!!model.state.poop,wasSleep=model.isAsleep();model.updatePoop();const sleep=model.isAsleep();const changed=wasPoop!==!!model.state.poop||wasSleep!==sleep;await view.render({preservePet:true,forceObservation:changed});if(changed)share.schedule(350)}

function showBootError(error){console.error('われわれ育成所の起動に失敗',error);const host=document.querySelector('.conversation-shell')||document.body;document.getElementById('growLoading')?.remove();let p=document.querySelector('.grow-boot-error');if(!p){p=document.createElement('p');p.className='grow-boot-error';host.append(p)}p.textContent=`育成所を読み込めなかった：${error?.message||error||'unknown error'}`}

async function boot(){try{window.wireLock?.('../');await switchModel(getViewer());bind();share.bind();sourceLog.load();schedulePose(5000,10000);scheduleSpeech(22000,38000);heartbeatTimer=setInterval(heartbeat,20000);perspectiveTimer=setInterval(async()=>{const v=getViewer();if(model&&v!==model.viewer){await switchModel(v);afterInteraction()}},2000)}catch(e){showBootError(e)}}

window.addEventListener('error',e=>{if(!document.getElementById('g12'))showBootError(e.error||e.message)});
window.addEventListener('unhandledrejection',e=>{if(!document.getElementById('g12'))showBootError(e.reason)});
boot();

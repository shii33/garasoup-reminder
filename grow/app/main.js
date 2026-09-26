import './data-service.js';
import {GrowModel,getViewer} from './core.js';
import {SourceLog} from './source-log.js';
import {GrowView} from './view.js';
import {ShareService} from './share.js';

let model=null,view=null;
const sourceLog=new SourceLog();
const share=new ShareService();
let idlePoseTimer=0,idleSpeechTimer=0,heartbeatTimer=0,perspectiveTimer=0;

const rand=(min,max)=>min+Math.random()*(max-min);
const schedulePose=(min=6500,max=15000)=>{clearTimeout(idlePoseTimer);idlePoseTimer=setTimeout(()=>{if(view?.showIdlePose())share.schedule(350);schedulePose()},rand(min,max))};
const scheduleSpeech=(min=20000,max=45000)=>{clearTimeout(idleSpeechTimer);idleSpeechTimer=setTimeout(async()=>{if(await model?.idleSpeech()){await view.render({preservePet:true});share.schedule(350)}scheduleSpeech()},rand(min,max))};
const afterInteraction=()=>{schedulePose(6500,11000);scheduleSpeech(26000,48000)};

async function switchModel(viewer){model=new GrowModel(viewer);await model.load();if(!view)view=new GrowView(model,sourceLog);else view.setModel(model);await view.render({forceObservation:true});share.schedule(250)}

async function handleCare(button){if(button.disabled)return;afterInteraction();view.releasePose();let result;if(button.dataset.a)result=await model.act(button.dataset.a);else result=await model.eggAct(button.dataset.e);view.forceObservation();await view.render({preservePet:true,forceObservation:true});if(result?.reaction)view.showReaction(result.reaction,result.anim);else if(!view.poseHeld())view.applyPose(model.currentPet());if(result?.stageChanged)view.showStageUp(result.stageChanged);share.schedule(500)}

function bind(){const root=document.getElementById('g12');root.addEventListener('click',async e=>{const care=e.target.closest('#g12actions [data-a],#g12actions [data-e]');if(care){e.preventDefault();await handleCare(care);return}if(e.target.closest('#g12like')){afterInteraction();await model.likeSpeech();await view.render({preservePet:true});share.schedule(350);return}if(e.target.closest('#g12share')){e.preventDefault();e.stopPropagation();afterInteraction();await share.openNative();return}if(e.target.closest('#g12farewell')){afterInteraction();if(!confirm(`${model.target==='み'?'みちゃこ':'もっち'}とお別れします。\nこの端末の育成データは消えて、たまごから育て直しになります。いい？`))return;await model.remove();await switchModel(model.viewer);schedulePose(5000,9000);scheduleSpeech();return}})}

async function heartbeat(){if(!model||!view)return;const wasPoop=!!model.state.poop,wasSleep=model.isAsleep();model.updatePoop();const sleep=model.isAsleep();const changed=wasPoop!==!!model.state.poop||wasSleep!==sleep;await view.render({preservePet:true,forceObservation:changed});if(changed)share.schedule(350)}

async function boot(){try{window.wireLock?.('../');await switchModel(getViewer());bind();share.bind();sourceLog.load();schedulePose(5000,10000);scheduleSpeech(22000,38000);heartbeatTimer=setInterval(heartbeat,20000);perspectiveTimer=setInterval(async()=>{const v=getViewer();if(model&&v!==model.viewer){await switchModel(v);afterInteraction()}},2000)}catch(e){console.error('われわれ育成所の起動に失敗',e);const host=document.querySelector('.conversation-shell')||document.body;const p=document.createElement('p');p.className='grow-boot-error';p.textContent='育成所を読み込めなかった。再読み込みしてみて。';host.append(p)}}

boot();

import {GrowView} from './view.js?v=20260927-refactor-18';

const PUNCT=['、','。','！','？'];
const viewer=()=>localStorage.getItem('warera_chat_perspective')==='も'?'も':'み';
const enc=s=>encodeURIComponent(String(s??''));
const dec=s=>decodeURIComponent(String(s??''));
const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const shuffled=a=>{const out=[...(a||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
const enc64=value=>{const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
const mobileShare=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.matchMedia?.('(pointer:coarse)').matches;

let currentView=null;
let desktopShareUrl='';
let toastTimer=0;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function installStyle(){
  if(document.getElementById('g12-word-extended-style'))return;
  const style=document.createElement('style');style.id='g12-word-extended-style';
  style.textContent=`
    #g12 .g12playmenu [data-play-mode="words-plus"] span{font-size:22px}
    #g12 .g12x-layout{display:grid;grid-template-rows:auto minmax(0,1fr) auto;max-height:min(78vh,760px);gap:10px}
    #g12 .g12x-choices{display:flex;flex-wrap:wrap;gap:7px;overflow:auto;padding:2px 2px 8px}
    #g12 .g12x-choice{padding:9px 10px;border:1px solid #aaa;border-radius:9px;background:#fff;font-size:12px;font-weight:800}
    #g12 .g12x-choice.is-selected{background:#111;color:#fff;border-color:#111}
    #g12 .g12x-choice.is-punct{min-width:42px;font-size:17px}
    #g12 .g12x-footer{display:grid;gap:9px;border-top:1px solid #ddd;padding-top:10px}
    #g12 .g12x-preview{min-height:48px;padding:11px;border:1px dashed #999;border-radius:9px;background:#fafafa;font-size:18px;font-weight:900;line-height:1.45;overflow-wrap:anywhere}
    #g12 .g12x-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#666;font-weight:800}
    #g12 .g12x-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #g12 .g12x-actions button{padding:11px 8px;border:1px solid #111;border-radius:9px;background:#fff;font-size:12px;font-weight:900}
    #g12 .g12x-actions .primary{background:#111;color:#fff}
    #g12 .g12x-undo{padding:7px 9px;border:1px solid #aaa;border-radius:7px;background:#fff;font-size:11px;font-weight:800}
    #g12x-toast{position:fixed;left:50%;bottom:24px;z-index:550;display:flex;align-items:center;gap:10px;transform:translateX(-50%);padding:10px 12px;border:1px solid #111;border-radius:10px;background:#fff;box-shadow:3px 3px 0 rgba(0,0,0,.22);font-size:12px;font-weight:900;white-space:nowrap}
    #g12x-toast[hidden]{display:none}
    #g12x-toast button{padding:7px 9px;border:1px solid #111;border-radius:7px;background:#111;color:#fff;font-size:11px;font-weight:900}
  `;document.head.append(style);
}

function ensureToast(){if(document.getElementById('g12x-toast'))return;const t=document.createElement('div');t.id='g12x-toast';t.hidden=true;t.innerHTML='<span>リンクをコピーした</span><button type="button" data-x-native-share>共有を開く</button>';document.body.append(t)}
function showToast(){ensureToast();const t=document.getElementById('g12x-toast');t.querySelector('[data-x-native-share]').hidden=!navigator.share;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,4500)}

const originalPlayMenu=GrowView.prototype.showPlayMenu;
GrowView.prototype.showPlayMenu=function(){
  currentView=this;originalPlayMenu.call(this);
  const menu=this.$('g12dlg')?.querySelector('.g12playmenu');
  if(menu&&!menu.querySelector('[data-play-mode="words-plus"]')){
    const b=document.createElement('button');b.type='button';b.dataset.playMode='words-plus';
    b.innerHTML='<span>🧩</span><b>ことばをくっつける＋</b><small>最大6こ。句読点も使える。</small>';
    menu.append(b);
  }
};

function buildChoices(view){
  const base=view.life.wordGame('');
  const randomized=view.randomizeWordGame(base||{});
  const pool=uniq([...(randomized.choices||[]),...PUNCT]);
  const normal=shuffled(pool.filter(x=>!PUNCT.includes(x))).slice(0,32);
  return [...PUNCT,...normal];
}

function showExtended(view){
  currentView=view;
  view.activity={type:'word-plus',selections:[],choices:buildChoices(view)};
  renderExtended(view);
}

function renderExtended(view){
  const a=view.activity;if(!a||a.type!=='word-plus')return;
  const selected=a.selections||[];
  const choices=(a.choices||[]).map(v=>{const i=selected.indexOf(v),punct=PUNCT.includes(v);return `<button type="button" class="g12x-choice${i>=0?' is-selected':''}${punct?' is-punct':''}" data-x-choice data-v="${enc(v)}" ${i>=0||selected.length>=6?'disabled':''}>${i>=0?`${i+1}. `:''}${esc(v)}</button>`}).join('');
  const phrase=selected.join('');
  view.openModal(`<div class="g12x-layout"><div class="g12modalhead"><div><b>ことばをくっつける＋</b><small>1〜6こまで。句読点も使える。</small></div><button data-modal-close>×</button></div><div class="g12x-choices">${choices}</div><div class="g12x-footer"><div class="g12x-preview">${phrase?esc(phrase):'<span style="color:#999;font-size:12px">使いたい順に押す。</span>'}</div><div class="g12x-meta"><span>${selected.length}/6</span><button type="button" class="g12x-undo" data-x-undo ${selected.length?'':'disabled'}>ひとつ戻す</button></div><div class="g12x-actions"><button type="button" class="primary" data-x-say ${selected.length?'':'disabled'}>この子に言う</button><button type="button" data-x-save ${selected.length?'':'disabled'}>とっておく</button><button type="button" data-x-send ${selected.length?'':'disabled'}>相手に送る</button><button type="button" data-x-share ${selected.length?'':'disabled'}>画像でシェア</button></div></div></div>`);
}

async function say(view){const words=[...(view.activity?.selections||[])];if(!words.length)return;view.closeModal();const result=await view.life.sayCraftedPhrase(words);await view.render({preservePet:true});if(result?.stageChanged)view.showStageUp(result.stageChanged);else if(result)view.applyLifeEvent(result)}
async function save(view){const words=[...(view.activity?.selections||[])];if(!words.length)return;await view.life.saveCraftedPhrase(words);view.closeModal();await view.render({preservePet:true});view.showIdleFx('💬')}

function giftUrl(words){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('gift',enc64(words));url.searchParams.set('from',viewer());return url.toString()}
async function send(words){if(!words.length)return;const url=giftUrl(words);if(mobileShare()&&navigator.share){try{await navigator.share({url});return}catch(err){if(err?.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);desktopShareUrl=url;showToast()}catch{if(navigator.share){try{await navigator.share({url})}catch{}}else alert('リンクをコピーできなかった。')}
}

function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function wrap(ctx,text,max){const lines=[];let line='';for(const ch of String(text||'')){const next=line+ch;if(line&&ctx.measureText(next).width>max){lines.push(line);line=ch}else line=next}if(line||!lines.length)lines.push(line);return lines}
async function shareImage(words){
  if(!words.length)return;const phrase=words.join('');const c=document.createElement('canvas');c.width=1080;c.height=1350;const ctx=c.getContext('2d');ctx.fillStyle='#f2f2f2';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';roundRect(ctx,70,70,940,1210,34);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=4;roundRect(ctx,70,70,940,1210,34);ctx.stroke();ctx.fillStyle='#111';ctx.font='900 52px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.textAlign='left';ctx.fillText('ことばをくっつける＋',120,165);ctx.fillStyle='#777';ctx.font='700 24px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillText(`${words.length}こ、くっつけた。`,120,210);ctx.fillStyle='#fafafa';roundRect(ctx,120,290,840,720,26);ctx.fill();ctx.strokeStyle='#999';ctx.setLineDash([12,12]);roundRect(ctx,120,290,840,720,26);ctx.stroke();ctx.setLineDash([]);let size=74;let lines=[];do{ctx.font=`900 ${size}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;lines=wrap(ctx,phrase,700);if(lines.length<=6)break;size-=4}while(size>34);ctx.fillStyle='#111';ctx.textAlign='center';const lh=size*1.45,start=650-(lines.length-1)*lh/2;lines.slice(0,6).forEach((line,i)=>ctx.fillText(line,540,start+i*lh));ctx.fillStyle='#777';ctx.font='800 22px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillText('我らのあそび場',540,1195);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)return;const file=new File([blob],`warera-kotoba-plus-${Date.now()}.png`,{type:'image/png'});if(!navigator.share||navigator.canShare&&!navigator.canShare({files:[file]})){alert('このブラウザでは画像共有できない。');return}try{await navigator.share({files:[file]})}catch(err){if(err?.name!=='AbortError')alert('共有画面を開けなかった。')}
}

installStyle();ensureToast();
document.addEventListener('click',async event=>{
  const mode=event.target.closest?.('[data-play-mode="words-plus"]');if(mode){event.preventDefault();event.stopImmediatePropagation();if(currentView)showExtended(currentView);return}
  const choice=event.target.closest?.('[data-x-choice]');if(choice){event.preventDefault();event.stopImmediatePropagation();if(!currentView?.activity||currentView.activity.type!=='word-plus')return;const v=dec(choice.dataset.v||'');if(currentView.activity.selections.length<6&&!currentView.activity.selections.includes(v))currentView.activity.selections.push(v);renderExtended(currentView);return}
  const undo=event.target.closest?.('[data-x-undo]');if(undo){event.preventDefault();event.stopImmediatePropagation();currentView?.activity?.selections?.pop();if(currentView)renderExtended(currentView);return}
  const sayBtn=event.target.closest?.('[data-x-say]');if(sayBtn){event.preventDefault();event.stopImmediatePropagation();if(currentView)await say(currentView);return}
  const saveBtn=event.target.closest?.('[data-x-save]');if(saveBtn){event.preventDefault();event.stopImmediatePropagation();if(currentView)await save(currentView);return}
  const sendBtn=event.target.closest?.('[data-x-send]');if(sendBtn){event.preventDefault();event.stopImmediatePropagation();await send([...(currentView?.activity?.selections||[])]);return}
  const shareBtn=event.target.closest?.('[data-x-share]');if(shareBtn){event.preventDefault();event.stopImmediatePropagation();await shareImage([...(currentView?.activity?.selections||[])]);return}
  const native=event.target.closest?.('[data-x-native-share]');if(native){event.preventDefault();event.stopImmediatePropagation();if(navigator.share&&desktopShareUrl)try{await navigator.share({url:desktopShareUrl})}catch{}return}
},true);

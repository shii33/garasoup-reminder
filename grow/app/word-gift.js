import {GrowView} from './view.js?v=20260927-refactor-18';

const enc64=value=>{
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const dec64=value=>{
  try{
    const padded=String(value||'').replaceAll('-','+').replaceAll('_','/')+'==='.slice((String(value||'').length+3)%4);
    const binary=atob(padded),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const parsed=JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(parsed)?parsed.map(x=>String(x||'').trim()).filter(Boolean):[];
  }catch{return[]}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const viewer=()=>localStorage.getItem('warera_chat_perspective')==='も'?'も':'み';
const person=v=>v==='も'?'もっち':v==='み'?'みちゃこ':'相手';

let activeView=null;
let incoming=null;
let incomingShown=false;

function readIncoming(){
  const url=new URL(location.href),gift=url.searchParams.get('gift');
  if(!gift)return null;
  const words=dec64(gift);if(!words.length)return null;
  return{words,from:url.searchParams.get('from')||''};
}
incoming=readIncoming();

function clearIncomingUrl(){
  const url=new URL(location.href);url.searchParams.delete('gift');url.searchParams.delete('from');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
}

function selectedWords(){
  return [...document.querySelectorAll('#g12 .g12wordstep')]
    .map(el=>el.textContent.replace(/^\s*\d+\s+/,'').trim())
    .filter(Boolean);
}

function installStyle(){
  if(document.getElementById('g12-word-gift-style'))return;
  const style=document.createElement('style');style.id='g12-word-gift-style';
  style.textContent=`
    #g12 .g12wordsend{box-sizing:border-box;grid-column:1/-1;width:100%;padding:11px;border:1px dashed #111;border-radius:9px;background:#fafafa;font-size:12px;font-weight:900}
    #g12 .g12received{display:grid;gap:12px}
    #g12 .g12received-kicker{font-size:11px;font-weight:900;color:#666}
    #g12 .g12received-phrase{padding:18px 14px;border:1px solid #111;border-radius:10px;background:#fafafa;font-size:20px;font-weight:900;line-height:1.55;text-align:center;overflow-wrap:anywhere}
    #g12 .g12received-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #g12 .g12received-actions button{padding:11px;border:1px solid #111;border-radius:9px;background:#fff;font-size:11px;font-weight:900}
    #g12 .g12received-actions .primary{grid-column:1/-1;background:#111;color:#fff}
    #g12 .g12items-send{padding:9px;border:1px dashed #111;border-radius:8px;background:#fafafa;font-size:9px;font-weight:900;line-height:1.4}
  `;document.head.append(style);
}

function ensureSendButton(){
  const box=document.querySelector('#g12 .g12wordbuttons');if(!box)return;
  let button=box.querySelector('[data-word-send]');
  if(!button){button=document.createElement('button');button.type='button';button.className='g12wordsend';button.dataset.wordSend='';button.textContent='相手に送る';box.append(button)}
  button.disabled=selectedWords().length!==3;
}

function ensureSavedSend(){
  const share=document.querySelector('#g12 [data-saved-share]');if(!share)return;
  const box=share.closest('.g12itemactions');if(!box||box.querySelector('[data-saved-send]'))return;
  const button=document.createElement('button');button.type='button';button.className='g12items-send';button.dataset.savedSend='';button.dataset.phrase=share.dataset.phrase||'';button.textContent='相手に送る';
  const drop=box.querySelector('[data-item-drop]');box.insertBefore(button,drop||null);
}

function giftUrl(words){
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('gift',enc64(words));url.searchParams.set('from',viewer());return url.toString();
}

async function nativeSend(words,button){
  if(!words?.length)return;
  const from=viewer(),phrase=words.join(''),url=giftUrl(words),old=button?.textContent||'相手に送る';
  if(button?.isConnected){button.disabled=true;button.textContent='送る準備中…'}
  try{
    if(navigator.share){await navigator.share({title:'われわれ育成所',text:`「${phrase}」\n${person(from)}からことばが届いた。`,url});return}
    await navigator.clipboard.writeText(url);alert('リンクをコピーしたよ。相手に送ってね。');
  }catch(err){if(err?.name!=='AbortError'){console.warn('word gift share failed',err);try{await navigator.clipboard.writeText(url);alert('リンクをコピーしたよ。相手に送ってね。')}catch{alert('共有画面を開けなかった。')}}}
  finally{if(button?.isConnected){button.textContent=old;button.disabled=selectedWords().length!==3&&button.hasAttribute('data-word-send')}}
}

function showIncoming(view){
  if(!incoming||incomingShown)return;incomingShown=true;activeView=view;const phrase=incoming.words.join(''),fromName=person(incoming.from);
  view.activity={type:'received-word',gift:incoming};
  view.openModal(`<div class="g12received"><div class="g12modalhead"><div><b>ことばが届いた</b><small>${esc(fromName)}から。</small></div><button data-modal-close>×</button></div><div class="g12received-kicker">💌 ${esc(fromName)}からの珍文</div><div class="g12received-phrase">${esc(phrase)}</div><div class="g12received-actions"><button class="primary" data-gift-say>この子に言ってみる</button><button data-gift-save>とっておく</button><button data-modal-close>閉じる</button></div></div>`);
  clearIncomingUrl();
}

const originalRender=GrowView.prototype.render;
GrowView.prototype.render=async function(...args){const result=await originalRender.apply(this,args);activeView=this;if(incoming&&!incomingShown)setTimeout(()=>showIncoming(this),0);return result};

async function sayIncoming(){
  if(!activeView||!incoming?.words?.length)return;const gift=incoming;activeView.closeModal();
  const result=await activeView.life.sayCraftedPhrase(gift.words);await activeView.render({preservePet:true});
  if(result?.stageChanged)activeView.showStageUp(result.stageChanged);else if(result)activeView.applyLifeEvent(result);
  incoming=null;
}

async function saveIncoming(button){
  if(!activeView||!incoming?.words?.length)return;const phrase=incoming.words.join(''),fromName=person(incoming.from);
  button.disabled=true;
  const item=activeView.life.craftedItem(phrase);item.icon='💌';item.subtitle=`${fromName}から届いた`;item.origin='play';item.payload={...(item.payload||{}),words:[...incoming.words],from:incoming.from||''};
  activeView.life.addItem(item);await activeView.model.save();incoming=null;activeView.closeModal();await activeView.render({preservePet:true});activeView.showIdleFx('💌');
}

installStyle();
const observer=new MutationObserver(()=>{ensureSendButton();ensureSavedSend()});observer.observe(document.documentElement,{childList:true,subtree:true});
ensureSendButton();ensureSavedSend();

document.addEventListener('click',event=>{
  const send=event.target.closest?.('[data-word-send]');if(send){event.preventDefault();event.stopPropagation();nativeSend(selectedWords(),send);return}
  const saved=event.target.closest?.('[data-saved-send]');if(saved){event.preventDefault();event.stopPropagation();let phrase='';try{phrase=decodeURIComponent(saved.dataset.phrase||'')}catch{phrase=saved.dataset.phrase||''}nativeSend(phrase?[phrase]:[],saved);return}
  const say=event.target.closest?.('[data-gift-say]');if(say){event.preventDefault();event.stopPropagation();sayIncoming();return}
  const save=event.target.closest?.('[data-gift-save]');if(save){event.preventDefault();event.stopPropagation();saveIncoming(save);return}
},true);

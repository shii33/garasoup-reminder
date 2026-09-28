import {CreatureLife} from './life.js?v=20260927-refactor-18';
import {GrowView} from './view.js?v=20260927-refactor-18';

const INVENTORY_LIMIT=30;
const DUPLICATE_WINDOW=12;
const CONNECTORS=['は','が','を','に','で','と','も','の','へ','から','まで','より','なら','なのに','だけど','けど','でも','って','とか','っていう','ので','のに','だし','みたいな'];
const CONNECTOR_SET=new Set(CONNECTORS);
const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const shuffled=a=>{const out=[...(a||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
const usableWord=v=>String(v||'').trim().replace(/[wｗ]+$/i,'').trim();

// ひろいもの：18→30。自分で「とっておく」したものを、自然に拾ったものより先に消さない。
CreatureLife.prototype.addItem=function(item){
  if(!item)return null;
  const life=this.life();
  const duplicate=life.inventory.slice(-DUPLICATE_WINDOW).find(x=>x.type===item.type&&x.title===item.title);
  if(duplicate&&item.type!=='quiz')return duplicate;
  life.inventory.push(item);
  while(life.inventory.length>INVENTORY_LIMIT){
    const expendable=life.inventory.findIndex(x=>!['saved','play'].includes(x.origin));
    life.inventory.splice(expendable>=0?expendable:0,1);
  }
  return item;
};

// 接続に使える短いことばを少し増やし、毎回5〜6個は候補に混ざるようにする。
// ログ由来候補の末尾の w / ｗ は、ことば遊びでつなぎやすいよう候補表示時だけ落とす。
const originalRandomize=GrowView.prototype.randomizeWordGame;
GrowView.prototype.randomizeWordGame=function(game){
  const result=originalRandomize.call(this,game);
  const seed=String(result.seed||'').trim();
  const normalizedChoices=(result.choices||[]).map(v=>String(v||'').trim()===seed?seed:usableWord(v)).filter(Boolean);
  const connectorPool=shuffled(CONNECTORS.filter(x=>x!==seed)).slice(0,6);
  const rest=shuffled(normalizedChoices.filter(x=>x!==seed&&!CONNECTOR_SET.has(String(x).trim())));
  const choices=seed?uniq([seed,...connectorPool,...rest]).slice(0,30):uniq([...connectorPool,...rest]).slice(0,30);
  return{...result,choices};
};

function installStyle(){
  if(document.getElementById('g12-saved-share-style'))return;
  const style=document.createElement('style');
  style.id='g12-saved-share-style';
  style.textContent=`
    #g12 .g12items-share{padding:9px;border:1px solid #111;border-radius:8px;background:#fff;font-size:9px;font-weight:900;line-height:1.4}
    #g12 .g12itemactions.has-share{grid-template-columns:repeat(2,minmax(0,1fr))}
    #g12 .g12itemactions.has-share .g12itemprimary{grid-column:1/-1}
  `;
  document.head.append(style);
}
installStyle();

const originalShowFindItem=GrowView.prototype.showFindItem;
GrowView.prototype.showFindItem=function(item,opts={}){
  originalShowFindItem.call(this,item,opts);
  if(!item||item.type!=='crafted')return;
  const actions=document.querySelector('#g12 .g12itemactions');
  if(!actions||actions.querySelector('[data-saved-share]'))return;
  actions.classList.add('has-share');
  const button=document.createElement('button');
  button.type='button';
  button.className='g12items-share';
  button.dataset.savedShare='';
  button.dataset.phrase=encodeURIComponent(String(item.payload?.text||item.payload?.word||item.title||''));
  button.textContent='画像でシェア';
  const drop=actions.querySelector('[data-item-drop]');
  actions.insertBefore(button,drop||null);
};

function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function wrapLines(ctx,text,maxWidth){const lines=[];let line='';for(const ch of String(text||'')){if(ch==='\n'){lines.push(line);line='';continue}const next=line+ch;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=ch}else line=next}if(line||!lines.length)lines.push(line);return lines}
function fitFont(ctx,text,maxWidth,maxSize,minSize=32){for(let size=maxSize;size>=minSize;size-=2){ctx.font=`900 ${size}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;if(wrapLines(ctx,text,maxWidth).length<=5)return size}return minSize}

function makeSavedFile(phrase){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f2f2f2';ctx.fillRect(0,0,1080,1080);
  const x=74,y=72,w=912,h=920,shadow=18;
  ctx.fillStyle='rgba(0,0,0,.22)';roundRect(ctx,x+shadow,y+shadow,w,h,34);ctx.fill();
  ctx.fillStyle='#fff';roundRect(ctx,x,y,w,h,34);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=4;roundRect(ctx,x,y,w,h,34);ctx.stroke();
  ctx.fillStyle='#111';ctx.textAlign='left';ctx.font='900 50px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillText('💬 ひろいもの',126,176);
  ctx.fillStyle='#777';ctx.font='700 26px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillText('あとで言ってみる',126,226);
  ctx.fillStyle='#fafafa';roundRect(ctx,126,304,828,470,24);ctx.fill();ctx.strokeStyle='#ddd';ctx.lineWidth=3;roundRect(ctx,126,304,828,470,24);ctx.stroke();
  const size=fitFont(ctx,phrase,720,58,34);ctx.font=`900 ${size}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;ctx.fillStyle='#111';ctx.textAlign='center';
  const lines=wrapLines(ctx,phrase,720).slice(0,5),lh=size*1.5,start=540-(lines.length-1)*lh/2;lines.forEach((line,i)=>ctx.fillText(line,540,start+i*lh));
  ctx.fillStyle='#777';ctx.font='800 22px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.fillText('我らのあそび場',540,916);
  const data=canvas.toDataURL('image/png'),raw=atob(data.split(',')[1]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return new File([bytes],`warera-hiroi-${date}.png`,{type:'image/png'});
}

async function shareSaved(button){
  const phrase=decodeURIComponent(button.dataset.phrase||'');if(!phrase)return;
  const old=button.textContent;button.disabled=true;button.textContent='画像をつくってる…';
  try{
    const file=makeSavedFile(phrase);
    if(!navigator.share||navigator.canShare&&!navigator.canShare({files:[file]})){alert('このブラウザでは画像を端末の共有画面に渡せません。');return}
    await navigator.share({files:[file]});
  }catch(err){if(err?.name!=='AbortError'){console.warn('saved phrase share failed',err);alert('共有画面を開けなかった。もう一度ためしてみて。')}}
  finally{if(button.isConnected){button.disabled=false;button.textContent=old}}
}

document.addEventListener('click',event=>{const button=event.target.closest?.('[data-saved-share]');if(!button)return;event.preventDefault();event.stopPropagation();shareSaved(button)},true);

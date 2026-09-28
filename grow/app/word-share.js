const STYLE_ID='g12-word-share-style';

function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #g12 .g12wordbuttons{grid-template-columns:repeat(2,minmax(0,1fr))}
    #g12 .g12wordbuttons .g12primary{grid-column:auto!important;order:1}
    #g12 .g12wordbuttons .g12wordsave{order:2}
    #g12 .g12wordbuttons .g12wordsend{grid-column:auto!important;order:3}
    #g12 .g12wordbuttons .g12wordshare{order:4}
    #g12 .g12wordshare{box-sizing:border-box;width:100%;padding:12px;border:1px solid #111;border-radius:9px;background:#fff;font-size:13px;font-weight:900}
    @media(max-width:420px){#g12 .g12primary,#g12 .g12wordsave,#g12 .g12wordsend,#g12 .g12wordshare{font-size:12px;padding:11px 8px}}
  `;
  document.head.append(style);
}

function selectedWords(){
  return [...document.querySelectorAll('#g12 .g12wordstep')]
    .map(el=>el.textContent.replace(/^\s*\d+\s+/,'').trim())
    .filter(Boolean);
}

function ensureButton(){
  const box=document.querySelector('#g12 .g12wordbuttons');
  if(!box)return;
  const primary=box.querySelector('.g12primary');
  if(primary)primary.textContent='この子に言う';
  let button=box.querySelector('[data-word-share]');
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.className='g12wordshare';
    button.dataset.wordShare='';
    button.textContent='画像でシェア';
    box.append(button);
  }
  button.disabled=selectedWords().length!==3;
}

function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function wrapLines(ctx,text,maxWidth){
  const lines=[];let line='';
  for(const ch of String(text||'')){
    if(ch==='\n'){lines.push(line);line='';continue}
    const next=line+ch;
    if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=ch}else line=next;
  }
  if(line||!lines.length)lines.push(line);
  return lines;
}

function fitFont(ctx,text,maxWidth,maxSize,minSize=30){
  for(let size=maxSize;size>=minSize;size-=2){
    ctx.font=`900 ${size}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;
    if(wrapLines(ctx,text,maxWidth).length<=4)return size;
  }
  return minSize;
}

function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,{align='center'}={}){
  const lines=wrapLines(ctx,text,maxWidth);
  ctx.textAlign=align;
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],x,y+i*lineHeight);
  return lines.length;
}

function makeShareFile(words){
  const phrase=words.join('');
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');

  ctx.fillStyle='#f2f2f2';ctx.fillRect(0,0,canvas.width,canvas.height);

  const x=74,y=70,w=912,h=1194,shadow=18;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.24)';roundRect(ctx,x+shadow,y+shadow,w,h,34);ctx.fill();ctx.restore();
  ctx.fillStyle='#fff';roundRect(ctx,x,y,w,h,34);ctx.fill();
  ctx.strokeStyle='#111';ctx.lineWidth=4;roundRect(ctx,x,y,w,h,34);ctx.stroke();

  ctx.fillStyle='#111';ctx.textAlign='left';
  ctx.font='900 54px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';
  ctx.fillText('ことばをくっつける',126,164);
  ctx.fillStyle='#777';ctx.font='700 25px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';
  ctx.fillText('好きな3つを、押した順でくっつける。',126,210);

  let rowY=278;
  words.forEach((word,i)=>{
    const rowH=112;
    ctx.fillStyle='#fafafa';roundRect(ctx,126,rowY,828,rowH,24);ctx.fill();
    ctx.strokeStyle='#aaa';ctx.lineWidth=3;roundRect(ctx,126,rowY,828,rowH,24);ctx.stroke();
    ctx.fillStyle='#111';ctx.textAlign='left';ctx.font='900 30px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';
    ctx.fillText(`${i+1}`,160,rowY+68);
    const size=fitFont(ctx,word,690,34,24);ctx.font=`800 ${size}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;
    const lines=wrapLines(ctx,word,690).slice(0,2);const lh=size*1.35;const start=rowY+56-(lines.length-1)*lh/2;
    lines.forEach((line,n)=>ctx.fillText(line,218,start+n*lh));
    rowY+=134;
  });

  const resultY=716,resultH=386;
  ctx.fillStyle='#fafafa';roundRect(ctx,126,resultY,828,resultH,26);ctx.fill();
  ctx.save();ctx.setLineDash([12,12]);ctx.strokeStyle='#999';ctx.lineWidth=3;roundRect(ctx,126,resultY,828,resultH,26);ctx.stroke();ctx.restore();
  ctx.fillStyle='#888';ctx.textAlign='center';ctx.font='800 22px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';
  ctx.fillText('できたことば',540,resultY+58);
  const resultSize=fitFont(ctx,phrase,720,58,34);ctx.font=`900 ${resultSize}px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif`;ctx.fillStyle='#111';
  const resultLines=wrapLines(ctx,phrase,720).slice(0,4),resultLH=resultSize*1.45;
  const resultStart=resultY+205-(resultLines.length-1)*resultLH/2;
  resultLines.forEach((line,i)=>ctx.fillText(line,540,resultStart+i*resultLH));

  ctx.fillStyle='#777';ctx.font='800 22px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';ctx.textAlign='center';
  ctx.fillText('我らのあそび場',540,1194);

  const data=canvas.toDataURL('image/png');
  const raw=atob(data.split(',')[1]);const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return new File([bytes],`warera-kotoba-${date}.png`,{type:'image/png'});
}

async function shareWords(button){
  const words=selectedWords();if(words.length!==3)return;
  const old=button.textContent;button.disabled=true;button.textContent='画像をつくってる…';
  try{
    const file=makeShareFile(words);
    if(!navigator.share||navigator.canShare&&!navigator.canShare({files:[file]})){
      alert('このブラウザでは画像を端末の共有画面に渡せません。');return;
    }
    await navigator.share({files:[file]});
  }catch(err){
    if(err?.name!=='AbortError'){console.warn('word image share failed',err);alert('共有画面を開けなかった。もう一度ためしてみて。')}
  }finally{
    if(button.isConnected){button.textContent=old;button.disabled=selectedWords().length!==3}
  }
}

installStyle();
const observer=new MutationObserver(()=>ensureButton());
observer.observe(document.documentElement,{childList:true,subtree:true});
ensureButton();

document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-word-share]');
  if(!button)return;
  event.preventDefault();event.stopPropagation();
  shareWords(button);
},true);

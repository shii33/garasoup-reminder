(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  if(window.__wareraG12ShareBooted)return;
  window.__wareraG12ShareBooted=true;

  const H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  let cachedBlob=null;
  let cachedFile=null;
  let renderPromise=null;
  let refreshTimer=0;
  let lastRenderAt=0;

  function loadHtml2Canvas(){
    if(window.html2canvas)return Promise.resolve(window.html2canvas);
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-html2canvas]');
      if(old){
        old.addEventListener('load',()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('html2canvas missing')),{once:true});
        old.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=H2C;
      s.async=true;
      s.dataset.html2canvas='1';
      s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('html2canvas missing'));
      s.onerror=()=>reject(new Error('html2canvas load failed'));
      document.head.append(s);
    });
  }

  function waitForImages(node){
    const imgs=[...node.querySelectorAll('img')];
    return Promise.all(imgs.map(img=>{
      if(img.complete&&img.naturalWidth)return Promise.resolve();
      return new Promise(resolve=>{
        const done=()=>resolve();
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
        setTimeout(done,2500);
      });
    }));
  }

  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
  }

  async function makeShareBlob(){
    const source=document.querySelector('#g12 .g12main');
    if(!source)throw new Error('育成カードを見つけられなかった');
    const html2canvas=await loadHtml2Canvas();
    await waitForImages(source);
    if(document.fonts?.ready)await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const rect=source.getBoundingClientRect();
    const targetWidth=1080;
    const scale=Math.min(3.2,Math.max(2,targetWidth/Math.max(320,rect.width)));
    const card=await html2canvas(source,{
      backgroundColor:'#fff',
      scale,
      useCORS:true,
      allowTaint:false,
      logging:false,
      imageTimeout:5000,
      scrollX:-window.scrollX,
      scrollY:-window.scrollY
    });

    const pad=Math.max(34,Math.round(card.width*.06));
    const radius=Math.max(28,Math.round(card.width*.038));
    const shadow=Math.max(10,Math.round(card.width*.016));
    const border=Math.max(2,Math.round(card.width*.003));
    const out=document.createElement('canvas');
    out.width=card.width+pad*2+shadow;
    out.height=card.height+pad*2+shadow;
    const g=out.getContext('2d');
    g.fillStyle='#f4f4f4';
    g.fillRect(0,0,out.width,out.height);

    const x=pad,y=pad;
    g.save();
    g.shadowColor='rgba(0,0,0,.28)';
    g.shadowOffsetX=shadow;
    g.shadowOffsetY=shadow;
    g.shadowBlur=0;
    g.fillStyle='#fff';
    roundRect(g,x,y,card.width,card.height,radius);
    g.fill();
    g.restore();

    g.save();
    roundRect(g,x,y,card.width,card.height,radius);
    g.clip();
    g.drawImage(card,x,y);
    g.restore();

    g.save();
    g.strokeStyle='#111';
    g.lineWidth=border;
    roundRect(g,x+border/2,y+border/2,card.width-border,card.height-border,Math.max(2,radius-border/2));
    g.stroke();
    g.restore();

    return new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('画像を作れなかった')),'image/png'));
  }

  function makeFile(blob){
    const v=localStorage.getItem('warera_chat_perspective')==='も'?'も':'み';
    const t=v==='み'?'も':'み';
    const d=new Date();
    const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    return new File([blob],`warera-pet-${t}-${date}.png`,{type:'image/png'});
  }

  function canNativeShare(file){
    if(!navigator.share)return false;
    try{return !navigator.canShare||navigator.canShare({files:[file]})}catch(e){return false}
  }

  async function refreshCache(force=false){
    if(renderPromise)return renderPromise;
    if(!force&&Date.now()-lastRenderAt<1200&&cachedFile)return cachedFile;
    renderPromise=(async()=>{
      const blob=await makeShareBlob();
      cachedBlob=blob;
      cachedFile=makeFile(blob);
      lastRenderAt=Date.now();
      return cachedFile;
    })().catch(err=>{
      console.warn('share cache refresh failed',err);
      return null;
    }).finally(()=>{renderPromise=null});
    return renderPromise;
  }

  function scheduleRefresh(delay=650){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>refreshCache(true),delay);
  }

  function bootCache(){
    const root=document.querySelector('#g12 .g12main');
    if(!root){setTimeout(bootCache,300);return}
    scheduleRefresh(200);

    const pet=document.getElementById('g12pet');
    if(pet){
      new MutationObserver(()=>scheduleRefresh(350)).observe(pet,{attributes:true,attributeFilter:['src']});
    }
    const speech=document.getElementById('g12speech');
    if(speech){
      new MutationObserver(()=>scheduleRefresh(350)).observe(speech,{childList:true,subtree:true,characterData:true});
    }
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#g12actions [data-a]'))scheduleRefresh(500);
    },true);
  }

  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('#g12share');
    if(!b)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const file=cachedFile;
    if(!file){
      alert('共有画像を準備中。少し待ってもう一度押してね。');
      refreshCache(true);
      return;
    }
    if(!canNativeShare(file)){
      alert('このブラウザでは端末の共有画面を開けません。');
      return;
    }

    try{
      await navigator.share({files:[file],title:'われわれ育成所'});
    }catch(err){
      if(err?.name!=='AbortError'){
        console.warn('native share failed',err);
        alert('共有画面を開けなかった。もう一度ためしてみて。');
      }
    }
  },true);

  bootCache();
})();

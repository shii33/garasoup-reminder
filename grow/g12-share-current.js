(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  if(window.__wareraG12ShareBooted)return;
  window.__wareraG12ShareBooted=true;

  const H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

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

    const pad=Math.round(card.width*.035);
    const radius=Math.round(card.width*.035);
    const shadow=Math.max(4,Math.round(card.width*.012));
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

    return new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('画像を作れなかった')),'image/png'));
  }

  async function shareCard(){
    const blob=await makeShareBlob();
    const v=localStorage.getItem('warera_chat_perspective')==='も'?'も':'み';
    const t=v==='み'?'も':'み';
    const d=new Date();
    const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const file=new File([blob],`warera-pet-${t}-${date}.png`,{type:'image/png'});

    if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file]});return}catch(e){if(e?.name==='AbortError')return}
    }
    if(navigator.clipboard&&window.ClipboardItem){
      try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('画像をコピーしたよ');return}catch(e){}
    }
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('#g12share');
    if(!b)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(b.dataset.sharing==='1')return;
    b.dataset.sharing='1';
    b.disabled=true;
    const old=b.textContent;
    b.textContent='画像を作成中…';
    try{await shareCard()}
    catch(err){console.error('g12 share',err);alert('画像を作れなかった。もう一度ためしてみて。')}
    finally{delete b.dataset.sharing;b.disabled=false;b.textContent=old||'画像にする'}
  },true);
})();

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

  function downloadFile(blob,file){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function showReadySheet(blob,file){
    document.getElementById('g12shareReady')?.remove();
    const overlay=document.createElement('div');
    overlay.id='g12shareReady';
    Object.assign(overlay.style,{
      position:'fixed',inset:'0',zIndex:'99999',background:'rgba(0,0,0,.38)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'16px',boxSizing:'border-box'
    });
    const panel=document.createElement('div');
    Object.assign(panel.style,{
      width:'min(440px,100%)',background:'#fff',border:'1px solid #111',borderRadius:'18px',
      boxShadow:'6px 6px 0 rgba(0,0,0,.3)',padding:'16px',boxSizing:'border-box',fontFamily:'inherit'
    });
    const shareOk=canNativeShare(file);
    panel.innerHTML=`<div style="font-weight:900;font-size:16px;margin-bottom:4px">画像できたよ</div><div style="font-size:12px;color:#666;margin-bottom:14px">${shareOk?'「共有する」で端末の共有メニューを開けます。':'このブラウザでは画像共有に対応していないため、保存してください。'}</div><div style="display:grid;gap:8px">${shareOk?'<button type="button" data-share-native style="min-height:48px;border:1px solid #111;border-radius:12px;background:#111;color:#fff;font-weight:900;font-size:15px">共有する</button>':''}<button type="button" data-share-save style="min-height:48px;border:1px solid #111;border-radius:12px;background:#fff;color:#111;font-weight:900;font-size:15px">画像を保存</button><button type="button" data-share-close style="min-height:42px;border:0;background:transparent;color:#666;font-weight:700">キャンセル</button></div>`;
    overlay.append(panel);
    document.body.append(overlay);

    panel.querySelector('[data-share-native]')?.addEventListener('click',async()=>{
      try{
        await navigator.share({files:[file],title:'われわれ育成所'});
        overlay.remove();
      }catch(e){
        if(e?.name==='AbortError')return;
        console.warn('native share failed',e);
        alert('共有メニューを開けなかった。画像を保存して共有してみて。');
      }
    });
    panel.querySelector('[data-share-save]')?.addEventListener('click',()=>{
      downloadFile(blob,file);
      overlay.remove();
    });
    panel.querySelector('[data-share-close]')?.addEventListener('click',()=>overlay.remove());
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }

  async function shareCard(){
    const blob=await makeShareBlob();
    const file=makeFile(blob);

    if(canNativeShare(file)){
      try{
        await navigator.share({files:[file],title:'われわれ育成所'});
        return;
      }catch(e){
        if(e?.name==='AbortError')return;
        console.warn('initial native share failed',e);
      }
    }

    // Chrome mobile may lose transient user activation while the image is being rendered.
    // Never force-download here: show a second tap target so navigator.share gets fresh activation.
    showReadySheet(blob,file);
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

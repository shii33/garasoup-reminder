(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

  function patchLabel(){
    const note=document.getElementById('g11note');
    if(note&&note.innerHTML.startsWith('いまのようす'))note.innerHTML=note.innerHTML.replace(/^いまのようす/,'いまのきぶん');
    const pat=document.querySelector('#g11care [data-a="pat"] b');
    if(pat&&pat.textContent==='なでる')pat.textContent='愛でる';
  }

  function loadHtml2Canvas(){
    if(window.html2canvas)return Promise.resolve(window.html2canvas);
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-html2canvas]');
      if(old){old.addEventListener('load',()=>resolve(window.html2canvas),{once:true});old.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');
      s.src=H2C;s.async=true;s.dataset.html2canvas='1';
      s.onload=()=>window.html2canvas?resolve(window.html2canvas):reject(new Error('画像化ライブラリを読み込めなかった'));
      s.onerror=()=>reject(new Error('画像化ライブラリを読み込めなかった'));
      document.head.append(s);
    });
  }

  function buildShareCard(){
    const source=document.querySelector('#g11 .g11left');
    if(!source)throw new Error('育成画面を見つけられなかった');
    const clone=source.cloneNode(true);
    clone.querySelector('.g11dock')?.remove();
    clone.querySelector('.g11ident')?.remove();
    clone.querySelector('#g11status')?.remove();
    clone.querySelector('.g11growth')?.remove();
    clone.querySelector('.g11fx')?.remove();
    clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    const note=clone.querySelector('.g11note');
    if(note&&note.innerHTML.startsWith('いまのようす'))note.innerHTML=note.innerHTML.replace(/^いまのようす/,'いまのきぶん');

    const wrap=document.createElement('div');
    wrap.setAttribute('data-grow-share-card','1');
    Object.assign(wrap.style,{
      position:'fixed',left:'-10000px',top:'0',width:'680px',padding:'18px',
      background:'#f4f4f4',boxSizing:'border-box',zIndex:'-1',fontFamily:"'Noto Sans JP',sans-serif"
    });
    Object.assign(clone.style,{
      width:'100%',boxSizing:'border-box',padding:'16px',margin:'0',
      border:'1px solid #111',borderRadius:'10px',background:'#fff',
      boxShadow:'4px 4px 0 rgba(0,0,0,.38)'
    });
    const room=clone.querySelector('.g11room');
    if(room){room.style.minHeight='420px';room.style.margin='12px 0 0';}
    const petbox=clone.querySelector('.g11petbox');
    if(petbox)petbox.style.transform='translateX(-50%) scale(1.22)';
    const speech=clone.querySelector('.g11speech');
    if(speech){speech.style.maxWidth='330px';speech.style.bottom='62%';}
    wrap.append(clone);document.body.append(wrap);
    return wrap;
  }

  async function blobFromCanvas(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像を作れなかった')),'image/png'));
  }

  async function shareCurrent(){
    patchLabel();
    const html2canvas=await loadHtml2Canvas();
    const node=buildShareCard();
    try{
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      if(document.fonts?.ready)await document.fonts.ready;
      const canvas=await html2canvas(node,{backgroundColor:'#f4f4f4',scale:2,useCORS:true,logging:false,removeContainer:true});
      const blob=await blobFromCanvas(canvas);
      const v=localStorage.getItem('warera_chat_perspective')==='も'?'も':'み';
      const t=v==='み'?'も':'み';
      const file=new File([blob],`warera-pet-${t}-${new Date().toISOString().slice(0,10)}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        try{await navigator.share({files:[file]});return}catch(e){if(e?.name==='AbortError')return}
      }
      if(navigator.clipboard&&window.ClipboardItem){
        try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('画像をコピーしたよ');return}catch(e){}
      }
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }finally{node.remove()}
  }

  function bind(){
    patchLabel();
    const old=document.getElementById('g11s');
    if(!old||old.dataset.currentShare==='5')return;
    const b=old.cloneNode(true);b.dataset.currentShare='5';old.replaceWith(b);
    b.addEventListener('click',async()=>{b.disabled=true;try{await shareCurrent()}catch(e){console.error(e);alert('画像を作れなかった。もう一度ためしてみて。')}finally{b.disabled=false}});
  }

  const mo=new MutationObserver(()=>{patchLabel();bind()});
  mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setInterval(()=>{patchLabel();bind()},1000);
  setTimeout(()=>{patchLabel();bind()},0);
})();
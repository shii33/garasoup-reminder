function wireLock(home='../'){const b=document.querySelector('[data-lock]');if(b)b.addEventListener('click',()=>{WareraAuth.clear();location.href=home;});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
function fmtDate(s){if(!s)return'';const [y,m,d]=s.split('-');return `${y}.${m}.${d}`;}
function fmtMinutes(min){min=Math.round(Number(min)||0);const h=Math.floor(min/60),m=min%60;return h?`${h}時間${m?m+'分':''}`:`${m}分`;}

(()=>{
  const KEY='warera_chat_perspective';
  const COMMON_SRC=document.currentScript?.src||new URL('../assets/common.js',location.href).href;
  const AVATAR_BASE=new URL('avatars/',COMMON_SRC);
  const isChatPage=()=>!!document.querySelector('.conversation-shell')||/\/quiz\/?$/.test(location.pathname);
  function saved(){try{const v=localStorage.getItem(KEY);return v==='み'||v==='も'?v:null}catch(e){return null}}
  function current(){return saved()||'み'}
  function css(){
    if(document.getElementById('wareraPerspectiveStyle'))return;
    const s=document.createElement('style');s.id='wareraPerspectiveStyle';s.textContent=`
      .chat-line.self{justify-content:flex-end}.chat-line.other{justify-content:flex-start}
      .who.person-mi{background:#f8dce7}.bubble.person-mi{background:#fff0f5!important}
      .who.person-mo{background:#dceeff}.bubble.person-mo{background:#eef7ff!important}
      .who{overflow:hidden}.who img{display:block;width:100%;height:100%;object-fit:cover;transform:scale(1.26);transform-origin:center center}
      .perspective-row{display:flex;justify-content:flex-end;margin:-8px 0 14px}
      .perspective-btn{border:0;background:none;color:#777;padding:4px 0;font:inherit;font-size:11px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
      .perspective-gate{position:fixed;inset:0;z-index:70;background:rgba(244,244,244,.92);display:grid;place-items:center;padding:24px}
      .perspective-gate[hidden]{display:none}.perspective-box{width:min(100%,360px);border:1px solid #111;border-radius:10px;background:#fff;box-shadow:4px 4px 0 rgba(0,0,0,.45);padding:22px}
      .perspective-box h2{margin:0 0 7px;font-size:22px}.perspective-box p{margin:0 0 17px;color:#666;font-size:13px;line-height:1.7}
      .perspective-choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.perspective-choice{height:50px;border:1px solid #111;border-radius:10px;background:#fff;font:inherit;font-weight:800;box-shadow:2px 2px 0 rgba(0,0,0,.35);cursor:pointer}
      .perspective-choice[data-view="み"]{background:#fff0f5}.perspective-choice[data-view="も"]{background:#eef7ff}
      .warera-share-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100;background:#111;color:#fff;padding:10px 14px;border-radius:999px;font-size:12px;font-weight:700;box-shadow:2px 2px 0 rgba(0,0,0,.25);pointer-events:none}
      @media(max-width:580px){.perspective-row{margin:-5px 0 12px}}
    `;document.head.append(s);
  }
  function normalize(root=document){
    const me=current();
    root.querySelectorAll?.('.chat-line').forEach(row=>{
      const badge=row.querySelector('.who'),bubble=row.querySelector('.bubble');if(!badge||!bubble)return;
      const who=badge.dataset.who||badge.textContent.trim();if(who!=='み'&&who!=='も')return;
      badge.dataset.who=who;
      const self=who===me;
      row.classList.toggle('mine',self);row.classList.toggle('self',self);row.classList.toggle('other',!self);
      badge.classList.toggle('person-mi',who==='み');badge.classList.toggle('person-mo',who==='も');
      bubble.classList.toggle('person-mi',who==='み');bubble.classList.toggle('person-mo',who==='も');
      if(!badge.querySelector('img')){const img=document.createElement('img');img.src=new URL(who==='み'?'mi.jpg':'mo.jpg',AVATAR_BASE).href;img.alt=who;badge.replaceChildren(img)}
      if(self)row.append(bubble,badge);else row.append(badge,bubble);
    });
  }
  function setup(){
    if(!isChatPage())return;css();
    const title=document.querySelector('.app-title');
    const row=document.createElement('div');row.className='perspective-row';
    const btn=document.createElement('button');btn.className='perspective-btn';row.append(btn);
    if(title)title.insertAdjacentElement('afterend',row);
    const gate=document.createElement('div');gate.className='perspective-gate';gate.hidden=true;gate.innerHTML='<div class="perspective-box"><h2>どっち目線で見る？</h2><p>自分を右側に表示します。人物の色は固定で、み＝ピンク、も＝水色。</p><div class="perspective-choices"><button class="perspective-choice" data-view="み">み目線</button><button class="perspective-choice" data-view="も">も目線</button></div></div>';document.body.append(gate);
    const refresh=()=>{btn.textContent=`表示：${current()}目線`;normalize(document)};
    const choose=v=>{try{localStorage.setItem(KEY,v)}catch(e){}gate.hidden=true;refresh()};
    gate.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>choose(x.dataset.view));
    btn.onclick=()=>{gate.hidden=false};
    gate.onclick=e=>{if(e.target===gate&&saved())gate.hidden=true};
    refresh();
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)normalize(n.matches?.('.chat-line')?n.parentElement||n:n)}).observe(document.body,{childList:true,subtree:true});
    if(!saved())gate.hidden=false;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();

  const loadImg=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
  const roundRect=(ctx,x,y,w,h,r)=>{const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()};
  function wrapText(ctx,text,maxWidth){const out=[];for(const para of String(text??'').split('\n')){if(!para){out.push('');continue}let line='';for(const ch of para){const test=line+ch;if(line&&ctx.measureText(test).width>maxWidth){out.push(line);line=ch}else line=test}if(line)out.push(line)}return out.length?out:['']}
  function drawCoverCircle(ctx,img,cx,cy,size){const r=size/2,scale=Math.max(size/img.width,size/img.height),sw=size/scale,sh=size/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,cx-r,cy-r,size,size);ctx.restore()}
  async function sceneBlob(item){
    if(!item||!Array.isArray(item.lines)||!item.lines.length)throw new Error('share scene is empty');
    const W=1080,P=72,avatar=64,gap=20,bubbleMax=700,bubblePX=30,bubblePY=22,lineH=42,rowGap=24,top=158,bottom=112;
    const tmp=document.createElement('canvas').getContext('2d');tmp.font='30px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    const rows=item.lines.map(l=>{const lines=wrapText(tmp,l.text,bubbleMax-bubblePX*2),textW=Math.max(...lines.map(t=>tmp.measureText(t).width),60),bw=Math.min(bubbleMax,Math.max(150,textW+bubblePX*2)),bh=Math.max(86,lines.length*lineH+bubblePY*2);return {...l,lines,bw,bh,rh:Math.max(avatar,bh)}});
    const H=Math.max(560,top+rows.reduce((s,r)=>s+r.rh+rowGap,0)-rowGap+bottom);
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f5f5f3';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#111';ctx.font='700 32px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';ctx.fillText((item.date||'').replaceAll('-','.'),P,72);
    ctx.font='700 20px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';ctx.fillStyle='#777';ctx.fillText('我らのあそび場',P,112);
    let mi=null,mo=null;try{[mi,mo]=await Promise.all([loadImg(new URL('mi.jpg',AVATAR_BASE).href),loadImg(new URL('mo.jpg',AVATAR_BASE).href)])}catch(e){}
    const me=current();let y=top;
    for(const r of rows){
      const self=r.who===me,ax=self?W-P-avatar/2:P+avatar/2,bx=self?W-P-avatar-gap-r.bw:P+avatar+gap;
      ctx.fillStyle=r.who==='み'?'#fff0f5':'#eef7ff';roundRect(ctx,bx,y,r.bw,r.bh,22);ctx.fill();ctx.strokeStyle='#d7d7d7';ctx.lineWidth=2;roundRect(ctx,bx,y,r.bw,r.bh,22);ctx.stroke();
      const img=r.who==='み'?mi:mo;if(img)drawCoverCircle(ctx,img,ax,y+r.rh/2,avatar);else{ctx.fillStyle=r.who==='み'?'#f8dce7':'#dceeff';ctx.beginPath();ctx.arc(ax,y+r.rh/2,avatar/2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font='700 24px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(r.who,ax,y+r.rh/2);ctx.textAlign='left';ctx.textBaseline='alphabetic'}
      ctx.fillStyle='#111';ctx.font='30px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';r.lines.forEach((t,i)=>ctx.fillText(t,bx+bubblePX,y+bubblePY+31+i*lineH));y+=r.rh+rowGap;
    }
    ctx.fillStyle='#999';ctx.font='18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';ctx.fillText('ふたりで使う、どうでもいい道具たち。',P,H-48);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG作成に失敗')),'image/png'));
  }
  function toast(msg){css();document.querySelector('.warera-share-toast')?.remove();const t=document.createElement('div');t.className='warera-share-toast';t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),1800)}
  async function shareScene(item){
    const blob=await sceneBlob(item),name=`warera-${item.date||'scene'}.png`,file=new File([blob],name,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file]});return}catch(e){if(e?.name==='AbortError')return}}
    if(navigator.clipboard&&window.ClipboardItem){try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('画像をコピーしたよ');return}catch(e){}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('画像を保存したよ');
  }
  window.WareraShare={shareScene};
})();
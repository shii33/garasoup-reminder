function wireLock(home='../'){const b=document.querySelector('[data-lock]');if(b)b.addEventListener('click',()=>{WareraAuth.clear();location.href=home;});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
})();

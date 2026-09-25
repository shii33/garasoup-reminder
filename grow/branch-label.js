(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const style=document.createElement('style');
  style.textContent='.g11branch{position:absolute;right:12px;bottom:12px;z-index:9;padding:6px 9px;border:1px solid #111;border-radius:999px;background:rgba(255,255,255,.9);box-shadow:2px 2px 0 rgba(0,0,0,.2);font:800 9px "Noto Sans JP",sans-serif;pointer-events:none}.g11branch[hidden]{display:none!important}';
  document.head.append(style);

  function mount(){
    const room=document.getElementById('g11room');
    const memo=document.getElementById('g11memo');
    if(!room||!memo){setTimeout(mount,120);return}

    let badge=document.getElementById('g11branch');
    if(!badge){
      badge=document.createElement('div');
      badge.id='g11branch';
      badge.className='g11branch';
      badge.hidden=true;
      room.appendChild(badge);
    }

    const sync=()=>{
      const row=[...memo.querySelectorAll('.g11mrow')].find(x=>x.querySelector('span')?.textContent.trim()==='育ち方');
      const label=row?.querySelector('b')?.textContent.trim()||'';
      if(!label||label==='まだ未定'){
        badge.hidden=true;
        badge.textContent='';
        return;
      }
      badge.textContent=label;
      badge.hidden=false;
    };

    sync();
    new MutationObserver(sync).observe(memo,{childList:true,subtree:true,characterData:true});
  }

  mount();
})();
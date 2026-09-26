(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const st=document.createElement('style');
  st.textContent=`#g12memory[data-source-log="1"]{left:10px!important;bottom:10px!important;width:auto!important;min-width:0!important;max-width:none!important;padding:5px 8px!important;font-size:8px!important;line-height:1.2!important;white-space:nowrap!important;box-shadow:1px 1px 0 rgba(0,0,0,.16)!important}#g12memory[data-source-log="1"] b{display:inline!important;margin:0!important;font-size:8px!important}`;
  document.head.append(st);
  function compact(){
    const b=document.querySelector('#g12memory[data-source-log="1"]');
    if(!b)return;
    if(b.textContent.trim()!=='元ログを見る')b.innerHTML='<b>元ログを見る</b>';
  }
  new MutationObserver(compact).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  setInterval(compact,800);
  setTimeout(compact,0);
})();
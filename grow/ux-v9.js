(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const VERSION='20260926-refactor-1';
  const load=()=>import(`./app/main.js?v=${VERSION}`).catch(err=>{
    console.error('われわれ育成所の読み込みに失敗',err);
    const host=document.querySelector('.conversation-shell')||document.body;
    if(host&&!document.querySelector('.grow-boot-error')){
      const p=document.createElement('p');p.className='grow-boot-error';p.textContent='育成所を読み込めなかった。再読み込みしてみて。';host.append(p);
    }
  });
  if(document.querySelector('link[data-grow-app-style]')){load();return}
  const link=document.createElement('link');link.rel='stylesheet';link.href=`./app/styles.css?v=${VERSION}`;link.dataset.growAppStyle='1';link.onload=load;link.onerror=load;document.head.append(link);
})();

(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const style=document.createElement('style');
  style.textContent=`
  .g11ident{display:none!important}
  .g11room{
    background-image:url('./assets/room/room-day.jpg')!important;
    background-size:cover!important;
    background-position:center bottom!important;
    background-repeat:no-repeat!important;
  }
  .g11room.night{
    background-image:url('./assets/room/room-night.jpg')!important;
  }
  .g11room:before,.g11room:after,.g11bed,.g11shelf{display:none!important;content:none!important}
  @media(max-width:720px){
    #g11{position:static!important;left:auto!important;transform:none!important;width:100%!important;max-width:100%!important;margin:0 auto!important;box-sizing:border-box!important}
    .g11w{width:100%!important;box-sizing:border-box!important}
    .g11top{min-height:58px!important;padding:8px 10px!important;gap:8px!important}
    .g11id{gap:8px!important;min-width:0!important}
    .g11logo{width:38px!important;height:38px!important;min-width:38px!important;font-size:19px!important}
    .g11title{min-width:0!important}
    .g11title b{font-size:17px!important;white-space:nowrap!important}
    .g11meta{display:flex!important;align-items:center!important;justify-content:flex-end!important;align-self:center!important;gap:6px!important;flex:0 0 auto!important}
    .g11chip,.g11share{display:inline-flex!important;align-items:center!important;justify-content:center!important;height:34px!important;min-height:34px!important;padding:0 8px!important;line-height:1!important;white-space:nowrap!important;font-size:8px!important;text-align:center!important}
    .g11body{padding:8px!important}
    .g11left{width:100%!important;box-sizing:border-box!important;padding:10px!important}
    .g11room{margin-bottom:8px!important}
    .g11dock.mobile-inline{width:100%!important;box-sizing:border-box!important;margin:0 0 10px!important;padding:8px!important;box-shadow:none!important}
    .g11care{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
    .g11care button{min-width:0!important;min-height:78px!important;padding:6px 3px!important}
    .g11care i{font-size:22px!important}
    .g11care b{font-size:9px!important;white-space:nowrap!important}
    .g11care small{font-size:6px!important;line-height:1.25!important}
    .g11tools{margin-top:6px!important}
    .g11tools button{font-size:7px!important}
  }`;
  document.head.append(style);
  const mq=matchMedia('(max-width:720px)');
  function place(){
    const root=document.getElementById('g11');
    if(!root)return;
    const dock=root.querySelector('.g11dock'),left=root.querySelector('.g11left'),room=root.querySelector('.g11room'),grid=root.querySelector('.g11grid'),right=root.querySelector('.g11right'),status=root.querySelector('#g11status'),stage=root.querySelector('#g11stage');
    if(status)status.style.display=stage?.textContent?.includes('たまご')?'none':'';
    if(!dock||!left||!room||!grid)return;
    if(mq.matches){
      if(dock.parentElement!==left){left.insertBefore(dock,room.nextSibling)}
      dock.classList.add('mobile-inline');
    }else{
      if(dock.parentElement!==grid){grid.insertBefore(dock,right?.nextSibling||null)}
      dock.classList.remove('mobile-inline');
    }
  }
  const observer=new MutationObserver(place);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  mq.addEventListener?.('change',place);
  addEventListener('resize',place,{passive:true});
  setTimeout(place,0);setTimeout(place,300);setTimeout(place,1000);
  if(!document.querySelector('script[data-grow-share-current]')){
    const s=document.createElement('script');
    s.src='./share-current.js?v=20260925-5';
    s.defer=true;
    s.dataset.growShareCurrent='1';
    document.head.append(s);
  }
  if(!document.querySelector('script[data-grow-source-log]')){
    const s=document.createElement('script');
    s.src='./source-log-v3.js?v=20260926-3';
    s.defer=true;
    s.dataset.growSourceLog='1';
    document.head.append(s);
  }
})();
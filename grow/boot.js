(()=>{
  const loading=()=>document.getElementById('growLoading');
  const show=msg=>{const el=loading();if(el)el.textContent=msg};
  const fail=err=>{
    console.error('育成所モジュール読込エラー',err);
    show(`育成所のJS読込エラー：${err?.message||err||'unknown error'}`);
  };
  show('育成所のJSを読み込み中…');
  import('./app/main.js?v=20260926-refactor-5')
    .then(()=>{if(!document.getElementById('g12'))show('育成所を初期化中…')})
    .catch(fail);
  setTimeout(()=>{
    if(!document.getElementById('g12')&&loading()){
      loading().textContent += '（5秒以上停止）';
    }
  },5000);
})();

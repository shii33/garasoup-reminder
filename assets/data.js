(() => {
  let corePromise;
  async function core(home='../'){
    if(!corePromise)corePromise=WareraAuth.load(home+'data/core.enc',home);
    return corePromise;
  }
  async function memories(home='../'){
    const manifest=await fetch(home+'data/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('思い出データを開けませんでした');return r.json()});
    const packs=[manifest.base,...(manifest.updates||[]).map(x=>x.file)];
    const rows=[];
    for(const file of packs){
      const d=await WareraAuth.load(home+'data/'+file,home);
      rows.push(...(d.memories||[]));
    }
    return rows;
  }
  window.WareraData={core,memories};
})();

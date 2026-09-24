(() => {
  let corePromise;
  let memoriesPromise;

  async function core(home='../'){
    if(!corePromise) corePromise=WareraAuth.load(home+'data/core.enc',home);
    return corePromise;
  }

  async function memories(home='../'){
    if(!memoriesPromise){
      memoriesPromise=(async()=>{
        const manifest=await fetch(home+'data/manifest.json',{cache:'no-store'}).then(r=>{
          if(!r.ok) throw new Error('思い出データを開けませんでした');
          return r.json();
        });
        const packs=[manifest.base,...(manifest.updates||[]).map(x=>x.file)];
        const rows=[];
        for(const file of packs){
          const d=await WareraAuth.load(home+'data/'+file,home);
          rows.push(...(d.memories||[]));
        }
        return rows;
      })();
    }
    return memoriesPromise;
  }

  function readableScene(scene){
    const lines=(scene?.lines||[]).filter(x=>x&&String(x.text||'').trim());
    if(lines.length<3) return false;
    const lengths=lines.map(x=>String(x.text||'').length);
    const total=lengths.reduce((a,b)=>a+b,0);
    const longest=Math.max(...lengths,0);
    const joined=lines.map(x=>String(x.text||'')).join('\n');
    // 長文コピペや「続きを読む」主体の場面は、ランダム表示では避ける。
    if(longest>700 || total>1500) return false;
    if((joined.match(/続きを読む/g)||[]).length>=1 && total>650) return false;
    return true;
  }

  function findSceneForQuiz(rows,item){
    if(!item) return null;
    if(item.scene_id!=null){
      const byId=rows.find(x=>String(x.id)===String(item.scene_id));
      if(byId) return byId;
    }
    const sameDay=rows.filter(x=>!item.date||x.date===item.date);
    const targets=item.type==='next'
      ? [item.prompt,item.answer].filter(Boolean)
      : [item.quote].filter(Boolean);
    let best=null,bestScore=0;
    for(const scene of sameDay){
      const texts=(scene.lines||[]).map(x=>String(x.text||''));
      let score=0;
      for(const target of targets){
        if(texts.includes(target)) score+=3;
        else if(texts.some(t=>t.includes(target)||target.includes(t))) score+=1;
      }
      if(score>bestScore){best=scene;bestScore=score;}
    }
    return bestScore?best:null;
  }

  window.WareraData={core,memories,readableScene,findSceneForQuiz};
})();

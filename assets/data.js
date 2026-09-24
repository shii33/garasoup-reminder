(() => {
  let corePromise;
  let memoriesPromise;
  let quizScenePackPromise;

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

  async function quizScenePack(home='../'){
    if(!quizScenePackPromise) quizScenePackPromise=WareraAuth.load(home+'data/quiz-scenes.enc',home);
    return quizScenePackPromise;
  }

  function quizKey(item){
    if(!item) return '';
    if(item.type==='next'||item.prompt!=null) return `next|${item.date||''}|${item.prompt||''}|${item.answer||''}`;
    return `who|${item.date||''}|${item.quote||''}`;
  }

  function readableScene(scene){
    const lines=(scene?.lines||[]).filter(x=>x&&String(x.text||'').trim());
    if(lines.length<3) return false;
    const lengths=lines.map(x=>String(x.text||'').length);
    const total=lengths.reduce((a,b)=>a+b,0);
    const longest=Math.max(...lengths,0);
    const joined=lines.map(x=>String(x.text||'')).join('\n');
    if(longest>700 || total>1500) return false;
    if((joined.match(/続きを読む/g)||[]).length>=1 && total>650) return false;
    return true;
  }

  function findSceneForQuiz(rows,item,contextPack=null){
    if(!item) return null;
    const contextRows=contextPack?.scenes||[];
    const mappedId=contextPack?.map?.[quizKey(item)];
    if(mappedId!=null){
      const mapped=contextRows.find(x=>String(x.id)===String(mappedId));
      if(mapped) return mapped;
    }
    if(item.scene_id!=null){
      const exact=[...contextRows,...(rows||[])].find(x=>String(x.id)===String(item.scene_id));
      if(exact) return exact;
    }
    const sameDay=(rows||[]).filter(x=>!item.date||x.date===item.date);
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

  window.WareraData={core,memories,quizScenePack,quizKey,readableScene,findSceneForQuiz};
})();

(() => {
  let corePromise,memoriesPromise,quizScenePackPromise,expandedMemoriesPromise,expandedQuizPromise,expandedAnalyticsPromise;
  async function core(home='../'){if(!corePromise)corePromise=WareraAuth.load(home+'data/core.enc',home);return corePromise}
  async function memories(home='../'){
    if(!memoriesPromise)memoriesPromise=(async()=>{const manifest=await fetch(home+'data/manifest.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('思い出データを開けませんでした');return r.json()});const packs=[manifest.base,...(manifest.updates||[]).map(x=>x.file)],rows=[];for(const file of packs){const d=await WareraAuth.load(home+'data/'+file,home);rows.push(...(d.memories||[]))}return rows})();return memoriesPromise
  }
  async function quizScenePack(home='../'){if(!quizScenePackPromise)quizScenePackPromise=WareraAuth.load(home+'data/quiz-scenes.enc',home);return quizScenePackPromise}
  async function expandedAnalytics(home='../'){
    if(!expandedAnalyticsPromise)expandedAnalyticsPromise=(async()=>{
      const d=await WareraAuth.load(home+'data/expanded/analytics.enc',home);
      let ann=(d.anniversaries||[]).filter(x=>!String(x?.label||x?.title||'').includes('次回の全量更新'));
      if(!ann.length){
        const c=await core(home),s=c.stats||{},rows=[];
        if(s.period?.start)rows.push({label:'われわれログ開始記念日',date:s.period.start,detail:'ここからログが始まった'});
        if(s.peak_day?.date)rows.push({label:'一番しゃべった日記念日',date:s.peak_day.date,detail:`${Number(s.peak_day.count||0).toLocaleString()}通`});
        if(s.longest_call?.date)rows.push({label:'最長通話記念日',date:s.longest_call.date,detail:`${Math.round(Number(s.longest_call.minutes||0))}分`});
        if(s.rapid_rally?.start)rows.push({label:'最長ラリー記念日',date:String(s.rapid_rally.start).slice(0,10),detail:`${Number(s.rapid_rally.messages||0).toLocaleString()}通`});
        (d.top_days||[]).slice(1,6).forEach((x,i)=>rows.push({label:`よくしゃべった日 #${i+2}`,date:x.date,detail:`${Number(x.count||0).toLocaleString()}通`}));
        ann=rows;
      }
      d.anniversaries=ann;
      return d;
    })();
    return expandedAnalyticsPromise
  }
  function quizKey(item){if(!item)return'';return item.type==='next'||item.prompt!=null?`next|${item.date||''}|${item.prompt||''}|${item.answer||''}`:`who|${item.date||''}|${item.quote||''}`}
  function readableScene(scene){const lines=(scene?.lines||[]).filter(x=>x&&String(x.text||'').trim());if(lines.length<3)return false;const lengths=lines.map(x=>String(x.text||'').length),total=lengths.reduce((a,b)=>a+b,0),longest=Math.max(...lengths,0),joined=lines.map(x=>String(x.text||'')).join('\n');if(longest>700||total>1500)return false;if((joined.match(/続きを読む/g)||[]).length>=1&&total>650)return false;return true}
  function sceneSignature(lines){return lines.map(x=>`${x.who}\0${x.text}`).join('\1')}
  async function expandedMemories(home='../'){
    if(!expandedMemoriesPromise)expandedMemoriesPromise=(async()=>{const base=await memories(home),out=[],seen=new Set();const add=(src,lines,suffix='')=>{if(lines.length<3)return;const key=sceneSignature(lines);if(seen.has(key))return;const row={...src,id:suffix?`${src.id}:v:${suffix}`:src.id,base_id:src.base_id??src.id,lines:lines.map(x=>({...x}))};if(!readableScene(row))return;seen.add(key);out.push(row)};for(const s of base){const lines=(s.lines||[]).filter(x=>x&&String(x.text||'').trim());add(s,lines);if(lines.length>=4){for(let start=0;start<=lines.length-3;start+=2)add(s,lines.slice(start,Math.min(lines.length,start+4)),`${start}-4`);add(s,lines.slice(-3),'last3')}if(lines.length>=6)add(s,lines.slice(Math.max(0,Math.floor(lines.length/2)-2),Math.min(lines.length,Math.floor(lines.length/2)+3)),'mid5')}return out})();return expandedMemoriesPromise
  }
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  async function expandedQuiz(home='../'){
    if(!expandedQuizPromise)expandedQuizPromise=(async()=>{const [c,rows]=await Promise.all([core(home),memories(home)]),who=[],next=[],whoSeen=new Set(),nextSeen=new Set();const addWho=q=>{const k=`${q.date}|${q.quote}|${q.answer}`;if(!whoSeen.has(k)){whoSeen.add(k);who.push(q)}};const addNext=q=>{const k=`${q.date}|${q.prompt}|${q.answer}`;if(!nextSeen.has(k)){nextSeen.add(k);next.push(q)}};(c.quiz?.who||[]).forEach(addWho);(c.quiz?.next||[]).forEach(addNext);const answerPool=[];for(const s of rows){const lines=(s.lines||[]).filter(x=>x&&(x.who==='み'||x.who==='も')&&String(x.text||'').trim());for(const l of lines){const t=String(l.text);if(t.length>=4&&t.length<=110&&!t.includes('\n'))addWho({type:'who',quote:t,answer:l.who,date:s.date,scene_id:s.id});if(t.length>=1&&t.length<=90&&!t.includes('\n'))answerPool.push(t)}for(let i=0;i<lines.length-1;i++){const a=lines[i],b=lines[i+1],pa=String(a.text),ans=String(b.text);if(a.who===b.who||pa.length<1||pa.length>90||ans.length<1||ans.length>90||pa.includes('\n')||ans.includes('\n'))continue;const seed=hash(`${s.id}|${i}|${pa}`),wrong=[];for(let j=0;j<answerPool.length&&wrong.length<2;j++){const v=answerPool[(seed+j*7919)%Math.max(answerPool.length,1)];if(v&&v!==ans&&!wrong.includes(v))wrong.push(v)}if(wrong.length<2)continue;const options=[ans,...wrong];for(let j=options.length-1;j>0;j--){const k=(seed+j*97)%(j+1);[options[j],options[k]]=[options[k],options[j]]}addNext({type:'next',prompt:pa,prompt_who:a.who,answer:ans,answer_who:b.who,options,date:s.date,scene_id:s.id})}}
      const trim=(a,n=2500)=>a.length<=n?a:a.filter((_,i)=>i%Math.ceil(a.length/n)===0).slice(0,n);return{who:trim(who),next:trim(next)} })();return expandedQuizPromise
  }
  function findSceneForQuiz(rows,item,contextPack=null){if(!item)return null;const contextRows=contextPack?.scenes||[],key=quizKey(item),mappedId=contextPack?.map?.[key]??contextPack?.map?.[key+'|'];if(mappedId!=null){const mapped=contextRows.find(x=>String(x.id)===String(mappedId));if(mapped)return mapped}if(item.scene_id!=null){const exact=[...contextRows,...(rows||[])].find(x=>String(x.id)===String(item.scene_id));if(exact)return exact}const sameDay=(rows||[]).filter(x=>!item.date||x.date===item.date),targets=item.type==='next'?[item.prompt,item.answer].filter(Boolean):[item.quote].filter(Boolean);let best=null,bestScore=0;for(const scene of sameDay){const texts=(scene.lines||[]).map(x=>String(x.text||''));let score=0;for(const target of targets){if(texts.includes(target))score+=3;else if(texts.some(t=>t.includes(target)||target.includes(t)))score+=1}if(score>bestScore){best=scene;bestScore=score}}return bestScore?best:null}
  window.WareraData={core,memories,expandedMemories,expandedQuiz,expandedAnalytics,quizScenePack,quizKey,readableScene,findSceneForQuiz};
})();

(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const style=document.createElement('style');
  style.textContent='.grow-shell,.app-title{display:none!important}#speechNote{display:none!important}.mini-panel:has(#history){display:none!important}.needs>.need:not(.ux-need){visibility:hidden!important}';
  document.head.append(style);
  const s=document.createElement('script');
  s.src='./ux-v9.js?v=20260925-3';
  s.defer=true;
  s.onload=()=>{
    const f=document.createElement('script');f.src='./mobile-fix.js?v=20260925-5';f.defer=true;document.head.append(f);
    const b=document.createElement('script');b.src='./branch-label.js?v=20260925-1';b.defer=true;document.head.append(b);
  };
  document.head.append(s);
})();
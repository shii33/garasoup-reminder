(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const VER='20260925-v10-2';
  const fallback=()=>{console.warn('われわれ育成所v10の読み込みに失敗');};
  (async()=>{
    try{
      const parts=await Promise.all(Array.from({length:6},(_,i)=>
        fetch(`./ux-v10/part${i+1}.txt?v=${VER}`,{cache:'no-store'}).then(r=>{
          if(!r.ok)throw new Error(`v10 part${i+1}: ${r.status}`);
          return r.text();
        })
      ));
      let src=parts.join('');
      const oldLoad="async function loadCorpus(){try{const scenes=await window.WareraData?.memories?.('../');if(scenes?.length)return buildCorpus(scenes,G)}catch(e){console.warn('grow corpus fallback',e)}return buildCorpus([],G)}";
      const newLoad=`function quizToScenes(q){const out=[];let n=0;for(const x of q?.who||[]){if(!x||!x.quote||!x.answer)continue;out.push({id:'quiz-who-'+(n++),date:x.date||'',lines:[{who:x.answer,text:x.quote}]})}for(const x of q?.next||[]){if(!x)continue;const lines=[];if(x.prompt&&x.prompt_who)lines.push({who:x.prompt_who,text:x.prompt});if(x.answer&&x.answer_who)lines.push({who:x.answer_who,text:x.answer});if(lines.length)out.push({id:'quiz-next-'+(n++),date:x.date||'',lines})}return out}\nfunction mergeQuizCorpus(base,extra){const seen=new Set(Object.entries(base.pools).flatMap(([k,a])=>(a||[]).map(e=>k+'\\0'+e.text)));for(const [k,rows] of Object.entries(extra.pools||{})){if(k==='memory')continue;for(const e of rows||[])addPool(base.pools,k,e,seen)}base.tokens=[...new Set([...(base.tokens||[]),...(extra.tokens||[])])].slice(0,12);base.count=new Set(Object.values(base.pools).flat().map(x=>x.text)).size;return base}\nasync function loadCorpus(){let base=buildCorpus([],G);try{const scenes=await window.WareraData?.memories?.('../');if(scenes?.length)base=buildCorpus(scenes,G)}catch(e){console.warn('grow memories corpus fallback',e)}try{const q=await window.WareraData?.expandedQuiz?.('../');if(q)base=mergeQuizCorpus(base,buildCorpus(quizToScenes(q),G))}catch(e){console.warn('grow full-log corpus fallback',e)}return base}`;
      if(!src.includes(oldLoad))throw new Error('v10 corpus patch target not found');
      src=src.replace(oldLoad,newLoad);
      src=src.replace("today=()=>new Date().toISOString().slice(0,10)","today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}");
      src=src.replace("function ageDays(){return Math.max(0,Math.floor((new Date()-new Date((S.born||today())+'T00:00:00'))/864e5))}","function ageDays(){return Math.max(1,Math.floor((new Date()-new Date((S.born||today())+'T00:00:00'))/864e5)+1)}");
      src=src.replace("document.querySelector('.conversation-shell')?.append(x);wire()","(document.querySelector('.conversation-shell')||document.querySelector('main')||document.body).append(x);wire()");
      src=src.replace('ログから拾った反応候補','ログ由来の反応候補');
      const blob=new Blob([src],{type:'text/javascript'}),url=URL.createObjectURL(blob),s=document.createElement('script');
      s.src=url;s.onload=()=>URL.revokeObjectURL(url);s.onerror=()=>{URL.revokeObjectURL(url);fallback()};document.head.append(s);
    }catch(e){console.error(e);fallback()}
  })();
})();

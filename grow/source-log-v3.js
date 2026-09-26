(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const BABY_BASES=new Set(['…','ん。','ふむ。','もぐ。','んま。','ごはん。','…！','きゃ。','ふふ。','んふ。','…♡','ぬくい。','ふろ。','ぷは。','ほかほか。','すっきり。','ねむ。','…ねる。','すや。','おきた。','…ん。','きた。']);
  let sourceRows=[],sceneMap=new Map(),ready=false,current=null,updating=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
  const viewer=()=>{try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch(e){return'み'}};
  const target=()=>viewer()==='み'?'も':'み';
  async function loadSources(){
    if(ready)return;
    try{
      const [mem,q]=await Promise.all([
        window.WareraData?.expandedMemories?.('../')?.catch?.(()=>[])||[],
        window.WareraData?.expandedQuiz?.('../')?.catch?.(()=>null)||null
      ]);
      for(const s of Array.isArray(mem)?mem:[]){
        if(s?.id!=null)sceneMap.set(String(s.id),s);
        if(s?.base_id!=null&&!sceneMap.has(String(s.base_id)))sceneMap.set(String(s.base_id),s);
        for(const l of s?.lines||[]){const text=norm(l?.text);if(text&&['み','も'].includes(l?.who))sourceRows.push({who:l.who,text,date:s.date||'',scene:s})}
      }
      for(const x of q?.who||[]){
        const text=norm(x?.quote);if(!text||!['み','も'].includes(x?.answer))continue;
        const scene=sceneMap.get(String(x.scene_id||''))||{date:x.date||'',lines:[{who:x.answer,text:x.quote}]};
        sourceRows.push({who:x.answer,text,date:x.date||scene.date||'',scene});
      }
      for(const x of q?.next||[]){
        const scene=sceneMap.get(String(x.scene_id||''))||{date:x.date||'',lines:[x.prompt&&x.prompt_who?{who:x.prompt_who,text:x.prompt}:null,x.answer&&x.answer_who?{who:x.answer_who,text:x.answer}:null].filter(Boolean)};
        for(const [who,text] of [[x.prompt_who,x.prompt],[x.answer_who,x.answer]]){const t=norm(text);if(t&&['み','も'].includes(who))sourceRows.push({who,text:t,date:x.date||scene.date||'',scene})}
      }
    }catch(e){console.warn('source log lookup unavailable',e)}
    ready=true;
  }
  function findSource(speech){
    const text=norm(speech),stage=document.getElementById('g12stage')?.textContent||'';
    if(!text||stage.includes('たまご')||(stage.includes('あかちゃん')&&BABY_BASES.has(text)))return null;
    let best=null;
    for(const row of sourceRows){if(row.who!==target())continue;const q=norm(row.text);if(q.length<2)continue;if(text===q||text.includes(q))if(!best||q.length>best.text.length)best=row}
    return best;
  }
  function ensureModal(){
    let modal=document.getElementById('g12sourceModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='g12sourceModal';modal.hidden=true;
    modal.innerHTML='<div class="g12sourceDlg"><div class="g12sourceHead"><b id="g12sourceDate"></b><button type="button" id="g12sourceClose">閉じる</button></div><div id="g12sourceLines"></div></div>';document.body.append(modal);
    const st=document.createElement('style');st.id='g12sourceStyle';st.textContent=`#g12memory[data-source-log="1"]{left:10px!important;bottom:10px!important;width:auto!important;min-width:0!important;max-width:none!important;padding:5px 8px!important;font-size:8px!important;line-height:1.2!important;white-space:nowrap!important;box-shadow:1px 1px 0 rgba(0,0,0,.16)!important}#g12memory[data-source-log="1"] b{display:inline!important;margin:0!important;font-size:8px!important}#g12sourceModal{position:fixed;inset:0;z-index:260;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.34)}#g12sourceModal[hidden]{display:none}.g12sourceDlg{width:min(100%,520px);max-height:78vh;overflow:auto;padding:14px;border:1px solid #111;border-radius:10px;background:#fff;box-shadow:4px 4px 0 rgba(0,0,0,.3)}.g12sourceHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.g12sourceHead b{font-size:13px}.g12sourceHead button{padding:6px 9px;border:1px solid #111;border-radius:7px;background:#fff;font-size:9px;font-weight:800}.g12sourceLine{display:grid;grid-template-columns:24px 1fr;gap:7px;margin:7px 0;font-size:10px;line-height:1.6}.g12sourceWho{display:grid;place-items:center;width:22px;height:22px;border:1px solid #111;border-radius:50%;font-size:8px;font-weight:900}.g12sourceText{white-space:pre-wrap}`;document.head.append(st);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});modal.querySelector('#g12sourceClose').onclick=()=>{modal.hidden=true};return modal;
  }
  function openSource(){if(!current?.scene)return;const modal=ensureModal(),scene=current.scene;modal.querySelector('#g12sourceDate').textContent=String(current.date||scene.date||'元ログ').replaceAll('-','/');modal.querySelector('#g12sourceLines').innerHTML=(scene.lines||[]).map(l=>`<div class="g12sourceLine"><span class="g12sourceWho">${esc(l.who||'')}</span><span class="g12sourceText">${esc(l.text||'')}</span></div>`).join('');modal.hidden=false}
  async function sync(){
    if(updating||!document.getElementById('g12'))return;updating=true;
    try{
      await loadSources();const top=document.getElementById('g12memoryBtn');if(top)top.hidden=true;const btn=document.getElementById('g12memory');if(!btn)return;
      current=findSource(document.getElementById('g12speech')?.textContent||'');
      if(!current){btn.hidden=true;btn.removeAttribute('data-source-log');return}
      btn.hidden=false;btn.dataset.sourceLog='1';const html='<b>元ログを見る</b>';if(btn.innerHTML!==html)btn.innerHTML=html;
    }finally{updating=false}
  }
  document.addEventListener('click',e=>{const btn=e.target.closest?.('#g12memory[data-source-log="1"]');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSource()},true);
  const mo=new MutationObserver(()=>queueMicrotask(sync));mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});setTimeout(sync,0);setTimeout(sync,500);setTimeout(sync,1500);
})();
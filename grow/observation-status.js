(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const KEY='warera_grow_v1_';
  const pick=(arr,seed)=>arr[Math.abs(seed)%arr.length];
  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  function getViewer(){try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch(e){return'み'}}
  function getState(){try{const v=getViewer(),t=v==='み'?'も':'み';return JSON.parse(localStorage.getItem(`${KEY}${v}_${t}`)||'null')}catch(e){return null}}
  function mins(ts){return ts?Math.max(0,(Date.now()-Number(ts))/60000):9999}
  function text(){
    const st=getState(),stage=document.getElementById('g12stage')?.textContent||'',h=new Date().getHours(),bucket=Math.floor(Date.now()/600000),seed=hash(`${bucket}|${st?.totalCare||0}|${stage}`);
    if(stage.includes('たまご'))return pick(['🥚 中でなんかやってる','🥚 たまにぴくっとする','🥚 しずか。たぶん元気','🥚 なんかコトコトしてる','🥚 さっきより気配ある'],seed);
    if(!st)return pick(['👀 こっち見てる','✨ なんかごきげん','… ひとりでしょもしょもしてる','📱 なんかしてる','☀️ ふつうに過ごしてる'],seed);
    const last=st.lastActionAt||{},recent=Object.entries(last).map(([k,v])=>[k,mins(v)]).sort((a,b)=>a[1]-b[1])[0]||['',9999],a=recent[0],m=recent[1];
    if(st.poop)return pick(['💩 なんか出てる','💩 こっち見ながら待ってる','💩 しれっとしてる','💩 気づいてほしそう'],seed);
    if(Number(st.manualSleepUntil||0)>Date.now())return pick(['🌙 すやすや寝てる','🌙 かなり寝てる','🌙 起きる気配なし','🌙 しずかに寝てる','🌙 たまに寝返りしてる'],seed);
    if(m<8){
      const map={feed:['🍚 さっきのごはんを反芻してる','🍚 まだ口がもぐもぐしてる','🍚 食べたので満足げ','🍚 ちょっと機嫌よさそう'],play:['🎮 まだ遊ぶ気でいる','🎮 さっきの余韻が残ってる','🎮 ちょっとテンション高い','🎮 まだこっち見てる'],pat:['💗 さっき触られたの覚えてる','💗 ちょっと満足げ','💗 まだ構われる気でいる','💗 なんか距離が近い'],bath:['🫧 ちょっとさっぱりしてる','🫧 ほかほかしてる','🫧 いつもよりきれいな顔してる','🫧 風呂あがりの顔してる'],toilet:['🚽 すっきりした顔してる','🚽 何事もなかった顔してる'],sleep:['☀️ まだちょっと寝ぼけてる','☀️ 起きたけど動きが遅い']};
      if(map[a])return pick(map[a],seed);
    }
    const t=st.traits||{};
    if(h>=23||h<5)return pick(['🌙 だいぶ夜の顔してる','🌙 ちょっと動きがゆっくり','📱 夜なのにまだなんかしてる','… 静かだけど起きてる','🌙 そろそろ眠そう'],seed);
    if(h>=5&&h<9)return pick(['☀️ まだちょっとぼんやり','☀️ 朝の顔してる','… 起きてるけど静か','👀 こっち見てる','☀️ 今日はわりと早い'],seed);
    if(h>=12&&h<14)return pick(['🍚 ごはんの気配は察知してそう','☀️ 昼の顔してる','📱 なんか見てる','… ぼーっとしてる','👀 ときどきこっち見る'],seed);
    if(h>=18&&h<22)return pick(['🌆 だいぶ落ち着いてきた','📱 なんか触ってる','👀 こっち見たり見なかったり','… ひとりでしょもしょもしてる','✨ 今日はまだ元気そう'],seed);
    if((t.clingy||0)>(t.independent||0)*1.2)return pick(['👀 さっきからこっち見てる','💗 なんとなく近くにいる','👀 構われ待ちっぽい','… 離れる気はなさそう','💗 ちょっと寄ってきてる'],seed);
    if((t.independent||0)>(t.clingy||0)*1.2)return pick(['📱 ひとりでなんかしてる','… こっちは気にしてなさそう','☀️ 勝手に過ごしてる','📱 しばらく一人で平気そう','… マイペースにしてる'],seed);
    if((t.playful||0)>6)return pick(['🎮 なんか企んでそう','👀 ちょっかい待ちの顔してる','✨ ちょっと落ち着きない','🎮 まだ遊べそう','… なんかやりたそう'],seed);
    return pick(['👀 さっきからこっち見てる','✨ なんか機嫌いい','… ひとりでしょもしょもしてる','📱 なんか触ってる','☀️ ふつうに過ごしてる','… ぼーっとしてる','👀 たまにこっち見る','✨ 今日はわりと元気','… なんでもない顔してる','📱 ちょっと暇そう'],seed);
  }
  function update(){const el=document.getElementById('g12status');if(!el)return;const t=text();if(el.textContent!==t)el.textContent=t}
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-a],[data-e]'))setTimeout(update,120)});
  setInterval(update,20000);setTimeout(update,0);setTimeout(update,500);setTimeout(update,1500);
})();
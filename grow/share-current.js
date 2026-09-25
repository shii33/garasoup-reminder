(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  const N={み:'みちゃこ',も:'もっち'};
  const TM={affection:'甘やかされ育ち',playful:'あそび好き',food:'ごはん好き',routine:'生活しっかり',weird:'われわれ語多め',independent:'ひとりでも平気',night:'夜ふかし育ち'};
  const TRAITS=['affection','playful','food','routine','weird','independent','night'];
  const clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
  const round=(ctx,x,y,w,h,r)=>{const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()};
  const wrap=(ctx,text,x,y,maxWidth,lineHeight,maxLines=3)=>{const chars=[...String(text||'')];let line='',lines=[];for(const ch of chars){const t=line+ch;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=ch;if(lines.length>=maxLines)break}else line=t}if(lines.length<maxLines&&line)lines.push(line);lines.forEach((s,i)=>ctx.fillText(s,x,y+i*lineHeight));return lines.length};
  function viewer(){try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch(e){return'み'}}
  function state(){const v=viewer(),t=v==='み'?'も':'み';try{return{v,t,s:JSON.parse(localStorage.getItem(`warera_grow_v1_${v}_${t}`)||'null')}}catch(e){return{v,t,s:null}}}
  function stage(xp){xp=Number(xp||0);return xp>=820?['おとな',820]:xp>=320?['こども',820]:xp>=80?['あかちゃん',320]:['たまご',80]}
  function levels(s){const n=s?.needs||{};return{hunger:clamp(n.hunger??84),sleep:clamp(n.sleep??84),mood:clamp(((Number(n.mood??80)+Number(n.bond??76))/2)),clean:clamp(n.clean??92)}}
  function moodText(s,L){if(Date.now()<Number(s?.sleepUntil||0))return'🌙 すやすや寝てる';if(Number(s?.poop||0)>0)return'🚽 トイレしたみたい';const [k,v]=Object.entries(L).sort((a,b)=>a[1]-b[1])[0]||['mood',100];if(v>=55)return'☀️ ごきげんだよ';return{hunger:'🍚 おなかすいてる',sleep:'🌙 ねむそう',mood:'🎮 あそびたそう',clean:'🫧 そろそろおふろ'}[k]||'☀️ ごきげんだよ'}
  function topTrait(s){return TRAITS.slice().sort((a,b)=>Number(s?.traits?.[b]||0)-Number(s?.traits?.[a]||0))[0]||'affection'}
  function patchLabel(){const el=document.getElementById('g11note');if(!el)return;if(el.innerHTML.startsWith('いまのようす'))el.innerHTML=el.innerHTML.replace(/^いまのようす/,'いまのきぶん')}
  function drawPet(ctx,cx,cy,target,stageLabel,sleeping){
    const pet=target==='み'?'#ffdce8':'#ffe6a6';
    ctx.save();ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.lineJoin='round';
    if(stageLabel==='たまご'){
      ctx.fillStyle=pet;ctx.beginPath();ctx.ellipse(cx,cy+10,82,112,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();return;
    }
    const scale=stageLabel==='あかちゃん'?.82:stageLabel==='こども'?.94:1.04;
    ctx.translate(cx,cy);ctx.scale(scale,scale);
    ctx.fillStyle=pet;
    ctx.save();ctx.translate(-56,-64);ctx.rotate(-.23);ctx.beginPath();ctx.ellipse(0,0,30,42,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    ctx.save();ctx.translate(56,-64);ctx.rotate(.23);ctx.beginPath();ctx.ellipse(0,0,30,42,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.ellipse(0,15,86,79,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#111';
    if(sleeping){ctx.fillRect(-47,-1,25,5);ctx.fillRect(22,-1,25,5)}else{ctx.beginPath();ctx.ellipse(-34,-3,10,14,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(34,-3,10,14,0,0,Math.PI*2);ctx.fill()}
    ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,31,18,0,Math.PI);ctx.stroke();
    ctx.restore();
  }
  async function shareCurrent(){
    const {v,t,s}=state();if(!s){alert('育成データを読み込めなかった');return}
    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    const pink=t==='み',room=pink?'#fff0f4':'#eef7ff',L=levels(s),[stageLabel,goal]=stage(s.growthXP),age=Math.max(0,Math.floor((Date.now()-new Date((s.born||new Date().toISOString().slice(0,10))+'T00:00:00').getTime())/864e5)),speech=document.getElementById('g11speech')?.textContent||s.lastSpeech||'……',mood=moodText(s,L),habit=Object.entries(s.learned||{}).filter(([,n])=>Number(n)>=3).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([w])=>w),trait=TM[topTrait(s)]||'まだクセ薄め',sleeping=Date.now()<Number(s.sleepUntil||0);
    x.fillStyle='#f5f5f5';x.fillRect(0,0,W,H);
    x.fillStyle='#111';x.font='800 54px sans-serif';x.fillText('われわれ育成所',64,88);x.font='700 25px sans-serif';x.fillStyle='#555';x.fillText(`${N[v]}が育ててる ${N[t]}`,66,130);
    round(x,64,170,952,650,30);x.fillStyle='#fff';x.fill();x.strokeStyle='#111';x.lineWidth=4;x.stroke();
    x.fillStyle='#111';x.font='800 40px sans-serif';x.fillText(N[t],98,228);x.font='700 20px sans-serif';x.fillStyle='#555';x.fillText(`${age}日目・${stageLabel}`,98,262);
    round(x,730,202,242,72,12);x.fillStyle='#fff';x.fill();x.strokeStyle='#111';x.lineWidth=2;x.stroke();x.fillStyle='#666';x.font='700 16px sans-serif';x.fillText('いまのきぶん',748,226);x.fillStyle='#111';x.font='800 19px sans-serif';x.fillText(mood,748,252);
    round(x,96,292,856,320,22);x.fillStyle=room;x.fill();x.strokeStyle='#111';x.lineWidth=3;x.stroke();
    x.fillStyle='#9bd8ff';x.fillRect(140,332,245,110);x.strokeStyle='#8d6a52';x.lineWidth=7;x.strokeRect(140,332,245,110);x.fillStyle='#d6a47d';x.fillRect(790,405,105,130);x.fillStyle='#f3bed0';round(x,145,475,215,84,34);x.fill();x.strokeStyle='#111';x.lineWidth=2;x.stroke();
    drawPet(x,540,493,t,stageLabel,sleeping);
    round(x,310,312,460,80,15);x.fillStyle='#fff';x.fill();x.strokeStyle='#111';x.lineWidth=2;x.stroke();x.fillStyle='#111';x.font='800 23px sans-serif';x.textAlign='center';wrap(x,speech,540,345,410,28,2);x.textAlign='left';
    const labels=[['🍚 満腹',L.hunger],['🌙 元気',L.sleep],['✨ ごきげん',L.mood],['🫧 きれい',L.clean]];let yy=652;for(const [label,val] of labels){x.fillStyle='#111';x.font='800 21px sans-serif';x.fillText(label,110,yy);round(x,295,yy-22,525,20,10);x.fillStyle='#eee';x.fill();round(x,295,yy-22,525*(val/100),20,10);x.fillStyle=val>=70?'#98cfa5':val>=35?'#e5c66f':'#e5a19a';x.fill();x.fillStyle='#555';x.font='700 17px sans-serif';x.fillText(`${Math.round(val)}%`,850,yy);yy+=42}
    round(x,64,854,952,400,30);x.fillStyle='#fff';x.fill();x.strokeStyle='#111';x.lineWidth=4;x.stroke();
    x.fillStyle='#111';x.font='800 28px sans-serif';x.fillText('この子のいま',98,910);
    x.font='700 21px sans-serif';x.fillStyle='#666';x.fillText('育ちポイント',98,960);x.fillStyle='#111';x.font='800 27px sans-serif';x.fillText(stageLabel==='おとな'?`${Math.round(s.growthXP||0)} pt`:`${Math.round(s.growthXP||0)} / ${goal} pt`,315,960);
    x.fillStyle='#666';x.font='700 21px sans-serif';x.fillText('いちばん濃い育ち',98,1010);x.fillStyle='#111';x.font='800 25px sans-serif';x.fillText(trait,315,1010);
    x.fillStyle='#666';x.font='700 21px sans-serif';x.fillText('お世話した',98,1060);x.fillStyle='#111';x.font='800 25px sans-serif';x.fillText(`${Number(s.totalCare||0)}回`,315,1060);
    x.fillStyle='#666';x.font='700 21px sans-serif';x.fillText('くちぐせ',98,1110);x.fillStyle='#111';x.font='800 23px sans-serif';wrap(x,habit.length?habit.join('・'):'まだなし',315,1110,620,28,2);
    x.fillStyle='#777';x.font='18px sans-serif';x.fillText('我らのあそび場 / われわれ育成所',98,1205);
    const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('画像を作れなかった')),'image/png'));const file=new File([blob],`warera-pet-${t}-${new Date().toISOString().slice(0,10)}.png`,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file]});return}catch(e){if(e?.name==='AbortError')return}}
    if(navigator.clipboard&&window.ClipboardItem){try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);alert('画像をコピーしたよ');return}catch(e){}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
  }
  function bind(){patchLabel();const old=document.getElementById('g11s');if(!old||old.dataset.currentShare==='2')return;const b=old.cloneNode(true);b.dataset.currentShare='2';old.replaceWith(b);b.addEventListener('click',async()=>{b.disabled=true;try{await shareCurrent()}finally{b.disabled=false}})}
  const mo=new MutationObserver(()=>{patchLabel();bind()});mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setInterval(()=>{patchLabel();bind()},1000);setTimeout(()=>{patchLabel();bind()},0);
})();
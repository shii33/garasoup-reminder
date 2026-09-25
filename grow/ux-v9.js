(()=>{
  if(!/\/grow\/?$/.test(location.pathname))return;
  fetch('./ux-v8.js?v=20260925-3',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('育成所本体を読み込めませんでした');return r.text()})
    .then(src=>{
      const replace=(from,to,label)=>{
        if(!src.includes(from))throw new Error(`育成所パッチ失敗: ${label}`);
        src=src.replace(from,to);
      };

      replace(
        "function stage(){return S.growthXP>=820?['adult','おとな',820,820]:S.growthXP>=320?['child','こども',320,820]:S.growthXP>=80?['baby','あかちゃん',80,320]:['egg','たまご',0,80]}",
        "function stage(){return S.growthXP>=520?['adult','おとな',520,520]:S.growthXP>=200?['child','こども',200,520]:S.growthXP>=48?['baby','あかちゃん',48,200]:['egg','たまご',0,48]}",
        '進化ライン'
      );

      replace(
        "function repeatFactor(a){const t=Number(S.actionTimes[a]||0),d=now()-t;if(d<90000)return 0;if(d<5*60000)return .25;if(d<15*60000)return .6;return 1}",
        "function repeatFactor(a){const t=Number(S.actionTimes[a]||0),d=now()-t;if(d<30000)return .25;if(d<2*60000)return .55;if(d<8*60000)return .8;return 1}",
        '連打補正'
      );

      replace(
        "function growthFor(a,q){if(q<=0)return 0;const base=[0,1,3,5][q],f=repeatFactor(a),variety=S.lastAction&&S.lastAction!==a&&q>=2?1:0;return Math.max(0,Math.round(base*f+variety))}",
        "function growthFor(a,q){if(q<=0)return 0;const base=[0,3,6,9][q],f=repeatFactor(a),variety=S.lastAction&&S.lastAction!==a&&q>=2?2:0;return Math.max(1,Math.round(base*f+variety))}",
        '育ちポイント'
      );

      replace(
        "function quality(a){const L=lv(),v={feed:L.hunger,bath:L.clean,play:L.mood,pat:S.needs.bond,sleep:L.sleep}[a];if(a==='toilet')return S.poop>0?3:0;if(v==null)return 0;if(v<30)return 3;if(v<55)return 2;if(v<75)return 1;return 0}",
        "function quality(a){const L=lv(),v={feed:L.hunger,bath:L.clean,play:L.mood,pat:S.needs.bond,sleep:L.sleep}[a];if(a==='toilet')return S.poop>0?3:0;if(v==null)return 1;if(v<35)return 3;if(v<65)return 2;return 1}",
        'お世話受付ライン'
      );

      replace(
        "function decay(){const h=Math.min(72,Math.max(0,(now()-S.lastTick)/36e5));if(h<.02)return;const r=rates();S.needs.hunger=clamp(S.needs.hunger-h*r.hunger);S.needs.sleep=clamp(S.needs.sleep+h*(isAsleep()?1:-r.sleep));S.needs.mood=clamp(S.needs.mood-h*r.mood);S.needs.bond=clamp(S.needs.bond-h*r.bond);S.needs.clean=clamp(S.needs.clean-h*r.clean);S.toiletMeter+=h*1.8;while(S.toiletMeter>=100&&S.poop<2){S.toiletMeter-=100;S.poop++;S.needs.clean=clamp(S.needs.clean-14)}if(h>=4&&Object.values(lv()).some(v=>v<15))S.careMistakes++;S.lastTick=now()}",
        "function decay(){const h=Math.min(72,Math.max(0,(now()-S.lastTick)/36e5));if(h<.02)return;const r=rates(),sleeping=isAsleep(),slow=sleeping?.22:1;S.needs.hunger=clamp(S.needs.hunger-h*r.hunger*slow);S.needs.sleep=clamp(S.needs.sleep+h*(sleeping?2.2:-r.sleep));S.needs.mood=clamp(S.needs.mood-h*r.mood*slow);S.needs.bond=clamp(S.needs.bond-h*r.bond*slow);S.needs.clean=clamp(S.needs.clean-h*r.clean*slow);S.toiletMeter+=h*1.8*slow;while(S.toiletMeter>=100&&S.poop<2){S.toiletMeter-=100;S.poop++;S.needs.clean=clamp(S.needs.clean-14)}if(!sleeping&&h>=4&&Object.values(lv()).some(v=>v<15))S.careMistakes++;S.lastTick=now()}",
        '睡眠中の減衰'
      );

      replace(
        "function isAsleep(){return now()<Number(S.sleepUntil||0)}",
        "function isAsleep(){return now()<Number(S.sleepUntil||0)}\nfunction syncNightSleep(){if(stage()[0]==='egg')return;const d=new Date(),h=d.getHours();if(h>=23||h<7){const wake=new Date(d);if(h>=23)wake.setDate(wake.getDate()+1);wake.setHours(7,0,0,0);S.sleepUntil=Math.max(Number(S.sleepUntil||0),wake.getTime())}else if(Number(S.sleepUntil||0)<=now())S.sleepUntil=0}",
        '夜間自動睡眠'
      );

      replace(
        "function render(){decay();resolveEvolution();",
        "function render(){syncNightSleep();decay();resolveEvolution();",
        '夜間睡眠反映'
      );

      replace(
        "async function egg(a){const t=Number(S.actionTimes[`egg:${a}`]||0),repeat=now()-t<5*60000,first=!S.eggActions[a];const gain=first?8:repeat?0:2;",
        "async function egg(a){const t=Number(S.actionTimes[`egg:${a}`]||0),repeat=now()-t<60000,first=!S.eggActions[a];const gain=first?10:repeat?2:5;",
        'たまご育成'
      );

      replace("const gain=n<3?2:0;","const gain=n<3?4:0;",'ことば加点');
      src=src.replace('必要なときのお世話ほど育つ。連打ではほぼ増えない。','お世話はいつでもできる。いろんなお世話をすると、より育ちやすい。');

      const blob=new Blob([src],{type:'text/javascript'});
      const url=URL.createObjectURL(blob);
      const s=document.createElement('script');
      s.src=url;
      s.onload=()=>URL.revokeObjectURL(url);
      s.onerror=()=>URL.revokeObjectURL(url);
      document.head.append(s);
    })
    .catch(err=>{
      console.error(err);
      const s=document.createElement('script');
      s.src='./ux-v8.js?v=20260925-3';
      s.defer=true;
      document.head.append(s);
    });
})();
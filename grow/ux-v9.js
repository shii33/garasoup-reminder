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
        "function quality(a){const L=lv(),v={feed:L.hunger,bath:L.clean,play:L.mood,pat:S.needs.bond,sleep:L.sleep}[a];if(a==='toilet')return S.poop>0?3:0;if(v==null)return 0;if(v<35)return 3;if(v<65)return 2;if(v<95)return 1;return 0}",
        'お世話受付ライン'
      );

      replace(
        "async function egg(a){const t=Number(S.actionTimes[`egg:${a}`]||0),repeat=now()-t<5*60000,first=!S.eggActions[a];const gain=first?8:repeat?0:2;",
        "async function egg(a){const t=Number(S.actionTimes[`egg:${a}`]||0),repeat=now()-t<60000,first=!S.eggActions[a];const gain=first?10:repeat?2:5;",
        'たまご育成'
      );

      replace("const gain=n<3?2:0;","const gain=n<3?4:0;",'ことば加点');
      src=src.replace('必要なときのお世話ほど育つ。連打ではほぼ増えない。','必要なときのお世話ほどよく育つ。いろんなお世話をするとさらに育ちやすい。');

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
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
        "function rates(){const st=stage()[0];if(st==='adult'){if(S.personality==='dere')return{hunger:1.45,sleep:1,mood:.75,bond:.55,clean:.3};if(S.personality==='aloof')return{hunger:1.55,sleep:1,mood:.32,bond:.18,clean:.35};return{hunger:1.5,sleep:1,mood:.52,bond:.33,clean:.3}}if(st==='child'&&S.childType==='affection')return{hunger:1.5,sleep:1,mood:.62,bond:.42,clean:.3};return{hunger:1.5,sleep:1,mood:.48,bond:.28,clean:.3}}",
        "function rates(){const st=stage()[0];if(st==='adult'){if(S.personality==='dere')return{hunger:12,sleep:8,mood:10,bond:8,clean:5.5};if(S.personality==='aloof')return{hunger:12.5,sleep:7.5,mood:6.5,bond:4.5,clean:5};return{hunger:12,sleep:8,mood:8,bond:6,clean:5.5}}if(st==='child'&&S.childType==='affection')return{hunger:12,sleep:8,mood:9,bond:7,clean:5.5};return{hunger:12,sleep:8,mood:8,bond:6,clean:5.5}}",
        '起きている間の減り方'
      );

      replace(
        "function isAsleep(){return now()<Number(S.sleepUntil||0)}",
        "function isAsleep(){return now()<Number(S.sleepUntil||0)}\nfunction canSleepNow(){const h=new Date().getHours();return h>=21||h<9}\nfunction canWakeNow(){const h=new Date().getHours();return h>=7&&h<9}\nfunction nextNine(){const d=new Date();if(d.getHours()>=9)d.setDate(d.getDate()+1);d.setHours(9,0,0,0);return d.getTime()}\nfunction syncNightSleep(){if(stage()[0]==='egg')return;const d=new Date(),h=d.getHours(),wake=new Date(d);wake.setHours(9,0,0,0);if(h<7){S.sleepUntil=Math.max(Number(S.sleepUntil||0),wake.getTime());S.morningWakeDate=''}else if(h<9){if(S.morningWakeDate!==today())S.sleepUntil=Math.max(Number(S.sleepUntil||0),wake.getTime());else S.sleepUntil=0}else if(Number(S.sleepUntil||0)<=now())S.sleepUntil=0}\nfunction sleepSplit(start,end){let sleep=0,awake=0;const step=15*60*1000;for(let t=start;t<end;t+=step){const n=Math.min(end,t+step),mid=(t+n)/2,d=new Date(mid),forced=d.getHours()<7,manual=mid<Number(S.sleepUntil||0),hours=(n-t)/36e5;if(forced||manual)sleep+=hours;else awake+=hours}return{sleep,awake}}",
        '睡眠時間帯'
      );

      replace(
        "function decay(){const h=Math.min(72,Math.max(0,(now()-S.lastTick)/36e5));if(h<.02)return;const r=rates();S.needs.hunger=clamp(S.needs.hunger-h*r.hunger);S.needs.sleep=clamp(S.needs.sleep+h*(isAsleep()?1:-r.sleep));S.needs.mood=clamp(S.needs.mood-h*r.mood);S.needs.bond=clamp(S.needs.bond-h*r.bond);S.needs.clean=clamp(S.needs.clean-h*r.clean);S.toiletMeter+=h*1.8;while(S.toiletMeter>=100&&S.poop<2){S.toiletMeter-=100;S.poop++;S.needs.clean=clamp(S.needs.clean-14)}if(h>=4&&Object.values(lv()).some(v=>v<15))S.careMistakes++;S.lastTick=now()}",
        "function decay(){const end=now(),span=Math.min(72*36e5,Math.max(0,end-S.lastTick));if(span<.02*36e5)return;const start=end-span,r=rates(),seg=sleepSplit(start,end),slow=.30;S.needs.hunger=clamp(S.needs.hunger-r.hunger*(seg.awake+seg.sleep*slow));S.needs.sleep=clamp(S.needs.sleep-r.sleep*seg.awake+10*seg.sleep);S.needs.mood=clamp(S.needs.mood-r.mood*(seg.awake+seg.sleep*slow));S.needs.bond=clamp(S.needs.bond-r.bond*(seg.awake+seg.sleep*slow));S.needs.clean=clamp(S.needs.clean-r.clean*(seg.awake+seg.sleep*slow));S.toiletMeter+=1.8*(seg.awake+seg.sleep*slow);while(S.toiletMeter>=100&&S.poop<2){S.toiletMeter-=100;S.poop++;S.needs.clean=clamp(S.needs.clean-14)}if(seg.awake>=4&&Object.values(lv()).some(v=>v<15))S.careMistakes++;S.lastTick=end}",
        '睡眠込みのゲージ減衰'
      );

      replace(
        "function render(){decay();resolveEvolution();",
        "function render(){syncNightSleep();decay();resolveEvolution();",
        '夜間睡眠反映'
      );

      replace(
        "sleep:[isAsleep()?'☀️':'🌙',isAsleep()?'起こす':'ねる',isAsleep()?'そろそろ起きる':'オフトゥンへ']",
        "sleep:[isAsleep()?(canWakeNow()?'☀️':'😴'):'🌙',isAsleep()?(canWakeNow()?'起こす':'ねてる'):'ねる',isAsleep()?(canWakeNow()?'起こしてあげる':'朝までおやすみ'):(canSleepNow()?'オフトゥンへ':'21時から')]",
        '睡眠ボタン表示'
      );

      replace(
        "if(a==='sleep'&&wasSleep){S.sleepUntil=0;S.lastSpeech=personaLine('wake');S.lastGrowthGain=0;S.lastAction='wake';await save();render();setPet('stand_front.png',900);fx('wake');return}const q=quality(a),gain=growthFor(a,q);profileCare(a,q);",
        "if(a==='sleep'&&wasSleep){if(!canWakeNow()){S.lastSpeech='朝7時までは起きない。';S.lastGrowthGain=0;await save();render();return}S.sleepUntil=0;S.morningWakeDate=today();S.lastSpeech=personaLine('wake');S.lastGrowthGain=0;S.lastAction='wake';await save();render();setPet('stand_front.png',900);fx('wake');return}const q=quality(a);if(a==='sleep'&&!canSleepNow()){S.lastSpeech='21時になったらねる。';S.lastGrowthGain=0;await save();render();return}const gain=growthFor(a,q);profileCare(a,q);",
        '手動睡眠と起床制御'
      );

      replace(
        "if(a==='sleep'){if(q===0){S.lastSpeech='まだねない。';S.careMistakes++;}else{S.sleepUntil=now()+90*60*1000;n.sleep+=q===3?48:36;S.lastSpeech=personaLine('sleep')}}",
        "if(a==='sleep'){S.morningWakeDate='';S.sleepUntil=nextNine();n.sleep+=q===3?32:q===2?24:16;S.lastSpeech=personaLine('sleep')}",
        '手動睡眠時間'
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
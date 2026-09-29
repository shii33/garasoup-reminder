(async()=>{
  await WareraAuth.requirePass('../');
  wireLock('../');

  const good = [
    'ﾊｯ\n鶏ガラスープある','買えただーん！🐔','ガラスープ確保ぉー！','はーーーん？\nちゃんと買えてるやん','丸鶏を連れてこなくて済んだ','養鶏場ルート回避。','鶏、粉になって待ってた','メモらず行っても勝った。つよ','これで鶏ガラぐつぐつ煮込まんでええ','そいつぁいいことおもいついたなぁ！\n普通に買っただけだけど！w','おっけい！中華できるど','ガラスープ、きたくー','気長ｧじゃなく今日手に入った','コケーッ🐓\n（歓喜）','ごっつぁん！ガラスープ','やったーーーん！\n今度こそある！','鶏ガラスープない\n……じゃない！！！','勝訴。\n鶏ガラスープ購入。','よーーーし\n粉の鶏、確保','今日は忘れんかったwwww'
  ];
  const nope = [
    'ﾊｯ\n鶏ガラスープない','はーーーん？','聞いて。\n鶏ガラスープ忘れた（メモらず行った','待ってな、丸鶏でよければ\n鮮度の良いの連れてくで','養鶏場？','呼んだ？\nコケーッ🐓','ガラスープないなら\n鶏ガラぐつぐつ煮込んだらええねん','そいつぁいいことおもいついたなぁ！\nってなるかい！w','半月以上待てってかwwww','気長ｧ','まだだったーん\nのちほ思い出そ','また忘れたwwww\nでも押しに来たのでヨシ','鶏ガラスープ、今日も不在','次のスーパーで\nﾊｯ ってなれ','ガラスープ「また来いよ」','まだいない。\n粉の鶏。','鶏ガラ仕入れてくるかー！\n……ってなるかい！w','いったん帰ろ。\nそして次はメモろw','本日の鶏ガラスープ：未実装','よし。\n次回リベンジのすけ'
  ];
  const box=document.getElementById('result');let lastGood=-1,lastNope=-1;
  function pick(list,last){if(list.length<=1)return[list[0],0];let i;do{i=Math.floor(Math.random()*list.length)}while(i===last);return[list[i],i]}
  document.getElementById('yes').onclick=()=>{const[text,index]=pick(good,lastGood);lastGood=index;box.textContent=text};
  document.getElementById('no').onclick=()=>{const[text,index]=pick(nope,lastNope);lastNope=index;box.textContent=text};
})();

import {GrowView} from './view.js?v=20260927-refactor-18';

const UNIQUE_WORDS=[
  'パトラッシュ','ガラスープ','オフトゥン','フロダン','ありが亭','てぇてぇ','おわたんぐ','れいでぃお','幸ぃ','メロぉ',
  'はすはす','ふんすふんす','でんでんでんぱー','水中','つよキャン','入れ子構文','むくり','しょもしょも','目ぇしょも','ぐんもにーん',
  'ありがぴょん','ごめんち','おつまる','なるほろ','パンイチ','そろぼち','おちっち','ごっそっさん','ネガティブマージン','首もげ落ちる',
  '見ってるー？','ふにゃT','ぎんぎんT','おT','くるくる靴下','ガン見','ヤリモク構文','たーしかしーぃ？','ぺしっ','ぽわんぴん',
  'どん米','ミチミチ','ホクホク','スヤァ','カタリナ','オーボエ','ミョウガ','ぱっちふりかけ','タンドリーチキン','半裸コン','とんまるっち',
  'おまんk','M',
  '🐮','🐐','👀','🍄','💩','🫶','🦆','⚽️','🍠','👂','♡','💮','🌧️','🎧','🐻‍❄️','💪','🍚','🐺','🪐','☁️','🍞','🦒','👯','😜','🐟','🧠','👼','🥔','👋','❤️','🐳','🍑','🍱','🍖','🍣','😃','🐜','🟢','🥚','🍙','🥓','🙏','🐘','🪰'
];

const CONNECTORS=new Set(['は','が','を','に','で','と','も','の','へ','から','まで','より','なら','なのに','だけど','けど','でも','って','とか','っていう','ので','のに','だし','みたいな']);
const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const shuffled=a=>{const out=[...(a||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};

const originalRandomize=GrowView.prototype.randomizeWordGame;
GrowView.prototype.randomizeWordGame=function(game){
  const result=originalRandomize.call(this,game);
  const seed=String(result.seed||'').trim();
  const uniquePool=shuffled(UNIQUE_WORDS.filter(x=>x!==seed)).slice(0,5);
  const connectorPool=(result.choices||[]).filter(x=>CONNECTORS.has(String(x).trim())&&x!==seed).slice(0,6);
  const rest=shuffled((result.choices||[]).filter(x=>x!==seed&&!CONNECTORS.has(String(x).trim())&&!UNIQUE_WORDS.includes(String(x).trim())));
  const choices=seed?uniq([seed,...uniquePool,...connectorPool,...rest]).slice(0,30):uniq([...uniquePool,...connectorPool,...rest]).slice(0,30);
  return{...result,choices};
};

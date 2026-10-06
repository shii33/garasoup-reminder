import {CreatureLife} from './life.js?v=20261004-offline-outing-1';
import {GrowView} from './view.js?v=20260927-refactor-18';
import {memories,expandedQuiz} from './data-service.js?v=20260927-refactor-18';

const clean=s=>String(s||'').replace(/[\u200e\u200f]/g,'').trim();
const candidate=s=>clean(s).replace(/[wｗ]+$/i,'').trim();
const COMMON_BASE=[
  'みちゃこ','もっち','今日','われわれ','この子','ガラスープ','なんか','そそ','なある！','おけけ','なんやこれ','フロダン！','だん！',
  'ういー','ほう','ふむ','おけー','あーねwww','そりゃあねぇw','仕事終わり','寝る前','風呂上がり','帰り道','休みの日','朝いち','夜中',
  'さっきの話','この感じ','今日のもっち','今日のみちゃこ','われわれ二人','眠いとき','お腹すいたとき','なんか今日','たぶん今日','急に',
  'なんとなく','写真見てたら','LINE見てたら','ゲーム中','もう今日は','いまさらだけど','そういえば'
].map(candidate).filter(Boolean);
const CONNECTORS=['は','が','を','に','で','と','も','の','へ','から','まで','より','なら','なのに','だけど','けど','でも','って','とか','っていう','ので','のに','だし','みたいな'];
const CONNECTOR_SET=new Set(CONNECTORS);
const uniq=a=>[...new Set((a||[]).map(x=>candidate(x)).filter(Boolean))];
const shuffled=a=>{const out=[...(a||[])];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
const useful=s=>{const t=candidate(s);return !!t&&t.length<=18&&!/^(?:w+|ｗ+|笑+|草+)$/i.test(t)&&!/^[-ー〜~!?！？。、…・]+$/.test(t)};

async function buildSharedPool(){
  const pool=[...COMMON_BASE,...CONNECTORS];
  try{
    const scenes=await memories('../');
    for(const scene of scenes||[]){
      for(const line of scene?.lines||[]){
        if(!line||(line.who!=='み'&&line.who!=='も'))continue;
        const text=candidate(line.text);
        if(text.length<=18&&useful(text))pool.push(text);
      }
    }
  }catch(error){console.warn('shared word memories fallback',error)}
  try{
    const quiz=await expandedQuiz('../');
    for(const row of quiz?.who||[]){const text=candidate(row?.quote);if(text.length<=18&&useful(text))pool.push(text)}
    for(const row of quiz?.next||[]){
      for(const value of [row?.prompt,row?.answer]){const text=candidate(value);if(text.length<=18&&useful(text))pool.push(text)}
    }
  }catch(error){console.warn('shared word quiz fallback',error)}
  return uniq(pool);
}

// top-level await にすると、後から読み込む拡張より遅れて prototype を上書きしてしまうことがある。
// 先に同期で共通ロジックを入れ、ログ由来プールだけ裏で拡張する。
let SHARED_POOL=uniq([...COMMON_BASE,...CONNECTORS]);
buildSharedPool().then(pool=>{SHARED_POOL=pool}).catch(()=>{});

CreatureLife.prototype.wordGame=function(seed=''){
  const seedWord=candidate(seed).slice(0,14);
  return{words:uniq([seedWord,...SHARED_POOL]),seed:seedWord};
};

GrowView.prototype.randomizeWordGame=function(game){
  const seed=candidate(game?.seed||'');
  const all=uniq([...COMMON_BASE,...CONNECTORS,...SHARED_POOL,...(game?.words||[])]).filter(v=>candidate(v)!==seed);
  const connectorPool=shuffled(CONNECTORS.filter(x=>x!==seed)).slice(0,6);
  const rest=shuffled(all.filter(x=>!CONNECTOR_SET.has(x)));
  const choices=uniq([...connectorPool,...rest]).slice(0,30);
  return{...game,choices:seed?[seed,...choices.slice(0,29)]:choices,seed};
};

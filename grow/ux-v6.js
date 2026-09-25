(()=>{
if(!/\/grow\/?$/.test(location.pathname))return;
const PREFIX='warera_grow_v1_';
const getViewer=()=>{try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch(e){return'み'}};
const getKey=()=>{const v=getViewer(),t=v==='み'?'も':'み';return`${PREFIX}${v}_${t}`};
const read=()=>{try{return JSON.parse(localStorage.getItem(getKey())||'null')}catch(e){return null}};
const meta={
 hunger:{icon:'🍚',label:'おなかすき',care:'ごはん',low:'満足',mid:'ちょっと',high:'ぺこぺこ'},
 sleep:{icon:'💤',label:'ねむさ',care:'ねかせる',low:'元気',mid:'ちょいねむ',high:'ねむい'},
 mood:{icon:'🎲',label:'あそびたい',care:'あそぶ',low:'満足',mid:'ちょっと',high:'かなり'},
 bond:{icon:'💗',label:'かまって',care:'なでる・ぎゅ',low:'満足',mid:'ちょっと',high:'かまって'},
 clean:{icon:'🫧',label:'よごれ',care:'おふろ',low:'きれい',mid:'ちょっと',high:'おふろ'}
};
const labels={feed:'ごはんをあげる',snack:'おやつをあげる',sleep:'ねかせる',wash:'おふろに入れる',play:'あそぶ',pat:'なでる',hug:'ぎゅする',chat:'しゃべる',teach:'ことばを教える',check:'ようすを見る',poke:'つつく',log:'われわれログを見せる'};
const eggActions=[['warm','🫶','ぬくぬくする'],['call','📣','名前を呼ぶ'],['tap','👉','コツコツする'],['log','📼','われわれログを見せる'],['hum','🎵','適当に歌う'],['listen','👂','中をうかがう']];
const normalActions=[['feed','🍚','ごはんをあげる'],['play','🎲','あそぶ'],['pat','🫳','なでる'],['chat','💬','しゃべる'],['teach','🗣️','ことばを教える'],['check','👀','ようすを見る']];
function installCss(){if(document.getElementById('growStableUx'))return;const s=document.createElement('style');s.id='growStableUx';s.textContent=`
#speechNote{display:none!important}
#needs{display:none!important}
#actionGrid{display:grid!important;visibility:visible!important;opacity:1!important;min-height:60px!important}
#actionGrid .care-btn{display:flex!important;visibility:visible!important;opacity:1!important}
.grow-ux-needs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:12px 0 7px}
.grow-ux-need{min-width:0;padding:7px;border:1px solid #ddd;border-radius:8px;background:#fafafa}
.grow-ux-head{font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grow-ux-meter{height:7px;margin-top:5px;border:1px solid #111;border-radius:999px;background:#fff;overflow:hidden}
.grow-ux-meter i{display:block;height:100%;background:#111;border-radius:999px;transition:width .2s ease}
.grow-ux-state{display:block;margin-top:4px;color:#666;font-size:8px;font-weight:700}
.grow-ux-care{display:block;margin-top:2px;color:#888;font-size:7px}
.grow-ux-help{margin:0 0 9px;color:#777;font-size:8px;line-height:1.45}
@media(max-width:580px){.grow-ux-needs{grid-template-columns:repeat(3,minmax(0,1fr))}.action-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.care-btn{min-height:62px!important}}
`;document.head.append(s)}
function stage(){return document.getElementById('stageLabel')?.textContent.trim()||''}
function needLevels(s){const out={};for(const k of Object.keys(meta))out[k]=Math.max(0,Math.min(100,100-Number(s?.needs?.[k]??80)));return out}
function stateWord(m,v){return v>=76?m.high:v>=42?m.mid:m.low}
function ensureNeedsBox(){let box=document.getElementById('growUxNeeds');if(box)return box;const old=document.getElementById('needs');if(!old)return null;box=document.createElement('div');box.id='growUxNeeds';old.insertAdjacentElement('afterend',box);return box}
function renderNeeds(){const box=ensureNeedsBox(),s=read();if(!box||!s)return;if(stage()==='たまご'){box.innerHTML='<p class="grow-ux-help">孵化すると、おなかすき・ねむさ・あそびたい・かまって・よごれが出てくるよ。</p>';return}const v=needLevels(s);box.innerHTML=`<div class="grow-ux-needs">${Object.entries(meta).map(([k,m])=>{const x=Math.round(v[k]);return`<div class="grow-ux-need"><div class="grow-ux-head">${m.icon} ${m.label}</div><div class="grow-ux-meter"><i style="width:${x}%"></i></div><small class="grow-ux-state">${stateWord(m,x)}</small><small class="grow-ux-care">${x>=52?'→ '+m.care:'まだ平気'}</small></div>`}).join('')}</div><p class="grow-ux-help">バーが伸びるほど、そのお世話が必要。お世話すると下がって、時間がたつとまた少しずつ伸びるよ。</p>`}
function renderState(){const el=document.getElementById('stateLabel'),s=read();if(!el||!s||stage()==='たまご')return;const v=needLevels(s),[k,x]=Object.entries(v).sort((a,b)=>b[1]-a[1])[0];if(x<42){el.textContent='おけけ。通常運転';return}const mild={hunger:'🍚 おなかすいた',sleep:'💤 ねむそう',mood:'🎲 あそびたそう',bond:'💗 かまってほしそう',clean:'🫧 そろそろおふろ'};const hard={hunger:'🍚 かなりおなかすいた',sleep:'💤 かなりねむい',mood:'🎲 かなりあそびたい',bond:'💗 だいぶかまってほしい',clean:'🫧 だいぶよごれてる'};el.textContent=(x>=76?hard:mild)[k]}
function ensureActions(){const grid=document.getElementById('actionGrid');if(!grid)return;if(!grid.children.length){const src=stage()==='たまご'?eggActions:normalActions;for(const [a,icon,label] of src){const b=document.createElement('button');b.className='press-btn care-btn';b.dataset.action=a;b.innerHTML=`<span class="emoji">${icon}</span><span class="label">${label}</span>`;grid.append(b)}}for(const b of grid.querySelectorAll('[data-action]')){const label=labels[b.dataset.action],span=b.querySelector('.label');if(label&&span)span.textContent=label}}
function renderHints(){const h=document.getElementById('actionHint');if(h)h.textContent=stage()==='たまご'?'たまごの時だけのお世話だよ':'いまの様子で、できるお世話が少し変わるよ';const p=document.getElementById('teachPanel');if(p){const b=p.querySelector('b');if(b)b.textContent='ことばを1つ教える';let help=p.querySelector('.teach-help');if(!help){help=document.createElement('p');help.className='grow-ux-help teach-help';b?.insertAdjacentElement('afterend',help)}help.textContent='ログに出てくることばから1つ選ぶよ。何度も教えるほど、返事や口ぐせに出やすくなる。'}}
function removeHistory(){for(const h of document.querySelectorAll('.mini-panel h2'))if(h.textContent.trim()==='成長記録')h.closest('.mini-panel')?.remove()}
function cleanupText(){for(const el of document.querySelectorAll('.grow-shell *')){if(el.children.length===0&&el.textContent.includes('ごあん'))el.textContent=el.textContent.replaceAll('ごあん','ごはん')}}
function run(){installCss();removeHistory();ensureActions();renderNeeds();renderState();renderHints();cleanupText()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
document.addEventListener('click',e=>{if(e.target.closest('#actionGrid'))setTimeout(run,30)},true);
setInterval(run,700);
})();
(()=>{
if(!/\/grow\/?$/.test(location.pathname))return;
const PREFIX='warera_grow_v1_';
const getViewer=()=>{try{return localStorage.getItem('warera_chat_perspective')==='も'?'も':'み'}catch(e){return'み'}};
const getKey=()=>{const v=getViewer(),t=v==='み'?'も':'み';return`${PREFIX}${v}_${t}`};
const read=()=>{try{return JSON.parse(localStorage.getItem(getKey())||'null')}catch(e){return null}};
const meta={
 hunger:{icon:'🍚',label:'満腹',care:'ごはん',states:['ぺこぺこ','おなかすいてきた','まだ平気','おなかいっぱい']},
 sleep:{icon:'💤',label:'元気',care:'ねかせる',states:['ねむい','ねむそう','まだ平気','元気いっぱい']},
 mood:{icon:'✨',label:'ごきげん',care:'あそぶ・なでる',states:['ごきげんななめ','ちょっと退屈そう','まあまあ','ごきげん']},
 clean:{icon:'🫧',label:'きれい',care:'おふろ',states:['かなりよごれてる','そろそろおふろ','まだきれい','ぴかぴか']}
};
const labels={feed:'ごはんをあげる',snack:'おやつをあげる',sleep:'ねかせる',wash:'おふろに入れる',play:'あそぶ',pat:'なでる',hug:'ぎゅする',chat:'しゃべる',teach:'ことばを教える',check:'ようすを見る',poke:'つつく',log:'われわれログを見せる'};
const eggActions=[['warm','🫶','ぬくぬくする'],['call','📣','名前を呼ぶ'],['tap','👉','コツコツする'],['log','📼','われわれログを見せる'],['hum','🎵','適当に歌う'],['listen','👂','中をうかがう']];
const normalActions=[['feed','🍚','ごはんをあげる'],['play','🎲','あそぶ'],['pat','🫳','なでる'],['chat','💬','しゃべる'],['teach','🗣️','ことばを教える'],['check','👀','ようすを見る']];
function installCss(){if(document.getElementById('growStableUx'))return;const s=document.createElement('style');s.id='growStableUx';s.textContent=`
#speechNote{display:none!important}
#needs{display:none!important}
#actionGrid{display:grid!important;visibility:visible!important;opacity:1!important;min-height:60px!important}
#actionGrid .care-btn{display:flex!important;visibility:visible!important;opacity:1!important}
.grow-ux-needs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:12px 0 7px}
.grow-ux-need{min-width:0;padding:7px;border:1px solid #ddd;border-radius:8px;background:#fafafa}
.grow-ux-head{font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grow-ux-meter{height:8px;margin-top:5px;border:1px solid #111;border-radius:999px;background:#fff;overflow:hidden}
.grow-ux-meter i{display:block;height:100%;border-radius:999px;transition:width .2s ease,background .2s ease}
.grow-ux-meter.is-good i{background:#8fcfa6}.grow-ux-meter.is-mid i{background:#e8c66d}.grow-ux-meter.is-low i{background:#e89a91}
.grow-ux-state{display:block;margin-top:4px;color:#555;font-size:8px;font-weight:700}
.grow-ux-care{display:block;margin-top:2px;color:#888;font-size:7px}
.grow-ux-help{margin:0 0 9px;color:#777;font-size:8px;line-height:1.45}
@media(max-width:580px){.grow-ux-needs{grid-template-columns:repeat(2,minmax(0,1fr))}.action-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.care-btn{min-height:62px!important}}
`;document.head.append(s)}
function stage(){return document.getElementById('stageLabel')?.textContent.trim()||''}
function clamp(v){return Math.max(0,Math.min(100,Number(v)||0))}
function levels(s){const n=s?.needs||{};return{hunger:clamp(n.hunger??80),sleep:clamp(n.sleep??80),mood:clamp(((Number(n.mood??80)+Number(n.bond??80))/2)),clean:clamp(n.clean??80)}}
function stateWord(m,v){return m.states[v<25?0:v<50?1:v<75?2:3]}
function meterClass(v){return v<35?'is-low':v<70?'is-mid':'is-good'}
function ensureNeedsBox(){let box=document.getElementById('growUxNeeds');if(box)return box;const old=document.getElementById('needs');if(!old)return null;box=document.createElement('div');box.id='growUxNeeds';old.insertAdjacentElement('afterend',box);return box}
function renderNeeds(){const box=ensureNeedsBox(),s=read();if(!box||!s)return;if(stage()==='たまご'){box.innerHTML='<p class="grow-ux-help">孵化すると、満腹・元気・ごきげん・きれいの4つを見ながらお世話するよ。</p>';return}const v=levels(s);box.innerHTML=`<div class="grow-ux-needs">${Object.entries(meta).map(([k,m])=>{const x=Math.round(v[k]);return`<div class="grow-ux-need"><div class="grow-ux-head">${m.icon} ${m.label}</div><div class="grow-ux-meter ${meterClass(x)}"><i style="width:${x}%"></i></div><small class="grow-ux-state">${stateWord(m,x)}</small><small class="grow-ux-care">${x<45?'→ '+m.care:'いい感じ'}</small></div>`}).join('')}</div><p class="grow-ux-help">バーが多いほど満足してるよ。減ってきたらお世話どき。満タンに近いほど安心、少なくなるほど少し気にしてあげて。</p>`}
function renderState(){const el=document.getElementById('stateLabel'),s=read();if(!el||!s||stage()==='たまご')return;const v=levels(s),[k,x]=Object.entries(v).sort((a,b)=>a[1]-b[1])[0];if(x>=55){el.textContent='おけけ。ごきげん';return}const mild={hunger:'🍚 おなかすいてきた',sleep:'💤 ちょっとねむそう',mood:'✨ ちょっと退屈そう',clean:'🫧 そろそろおふろ'};const hard={hunger:'🍚 ぺこぺこ',sleep:'💤 かなりねむい',mood:'✨ ごきげんななめ',clean:'🫧 だいぶよごれてる'};el.textContent=(x<25?hard:mild)[k]}
function ensureActions(){const grid=document.getElementById('actionGrid');if(!grid)return;if(!grid.children.length){const src=stage()==='たまご'?eggActions:normalActions;for(const [a,icon,label] of src){const b=document.createElement('button');b.className='press-btn care-btn';b.dataset.action=a;b.innerHTML=`<span class="emoji">${icon}</span><span class="label">${label}</span>`;grid.append(b)}}for(const b of grid.querySelectorAll('[data-action]')){const label=labels[b.dataset.action],span=b.querySelector('.label');if(label&&span)span.textContent=label}}
function renderHints(){const h=document.getElementById('actionHint');if(h)h.textContent=stage()==='たまご'?'たまごの時だけのお世話だよ':'いまの様子で、できるお世話が少し変わるよ';const p=document.getElementById('teachPanel');if(p){const b=p.querySelector('b');if(b)b.textContent='ことばを1つ教える';let help=p.querySelector('.teach-help');if(!help){help=document.createElement('p');help.className='grow-ux-help teach-help';b?.insertAdjacentElement('afterend',help)}help.textContent='ログに出てくることばから1つ選ぶよ。何度も教えるほど、返事や口ぐせに出やすくなる。'}}
function removeHistory(){for(const h of document.querySelectorAll('.mini-panel h2'))if(h.textContent.trim()==='成長記録')h.closest('.mini-panel')?.remove()}
function cleanupText(){for(const el of document.querySelectorAll('.grow-shell *')){if(el.children.length===0&&el.textContent.includes('ごあん'))el.textContent=el.textContent.replaceAll('ごあん','ごはん')}}
function run(){installCss();removeHistory();ensureActions();renderNeeds();renderState();renderHints();cleanupText()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);
document.addEventListener('click',e=>{if(e.target.closest('#actionGrid'))setTimeout(run,30)},true);
setInterval(run,700);
})();
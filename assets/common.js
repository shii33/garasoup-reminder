function wireLock(home='../'){const b=document.querySelector('[data-lock]');if(b)b.addEventListener('click',()=>{WareraAuth.clear();location.href=home;});}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtDate(s){if(!s)return'';const [y,m,d]=s.split('-');return `${y}.${m}.${d}`;}
function fmtMinutes(min){min=Math.round(Number(min)||0);const h=Math.floor(min/60),m=min%60;return h?`${h}時間${m?m+'分':''}`:`${m}分`;}

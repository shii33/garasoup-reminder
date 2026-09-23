(() => {
  const SKEY='warera_passphrase_session';
  const LKEY='warera_passphrase_saved';
  const enc=new TextEncoder(), dec=new TextDecoder();
  const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function derive(pass,salt,it){const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);}
  async function decryptPack(url,pass){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('データを読み込めませんでした');const p=await r.json();const key=await derive(pass,b64(p.salt),p.iterations);let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(p.iv)},key,b64(p.ciphertext));}catch(e){throw new Error('あいことば、ちがうかも');}if(p.compression==='gzip'){if(typeof DecompressionStream==='undefined')throw new Error('このブラウザではデータを開けません');const ds=new DecompressionStream('gzip');plain=await new Response(new Blob([plain]).stream().pipeThrough(ds)).arrayBuffer();}return JSON.parse(dec.decode(plain));}
  function getPass(){return sessionStorage.getItem(SKEY)||localStorage.getItem(LKEY)||'';}
  function savePass(pass,remember){sessionStorage.setItem(SKEY,pass);if(remember)localStorage.setItem(LKEY,pass);else localStorage.removeItem(LKEY);}
  function clear(){sessionStorage.removeItem(SKEY);localStorage.removeItem(LKEY);}
  async function requirePass(home='../'){const p=getPass();if(p)return p;const seg=location.pathname.split('/').filter(Boolean).pop()||'';location.replace(home+'?next='+encodeURIComponent(seg+'/'));throw new Error('locked');}
  async function load(url,home='../'){const p=await requirePass(home);try{return await decryptPack(url,p);}catch(e){clear();const seg=location.pathname.split('/').filter(Boolean).pop()||'';location.replace(home+'?next='+encodeURIComponent(seg+'/'));throw e;}}
  window.WareraAuth={decryptPack,getPass,savePass,clear,requirePass,load};
})();
import {GrowView} from './view.js?v=20260927-refactor-18';

let activeView=null;
let pendingItem=null;

const cleanItemText=item=>String(item?.payload?.text||item?.payload?.word||item?.title||'').replace(/^[「『“"]|[」』”"]$/g,'').trim();

const originalShowFindItem=GrowView.prototype.showFindItem;
GrowView.prototype.showFindItem=function(item,opts={}){
  activeView=this;
  originalShowFindItem.call(this,item,opts);
  const button=this.$('g12dlg')?.querySelector('[data-x-item-plus]');
  if(!button||!item)return;
  button.dataset.xItemPlusFree=item.id;
  delete button.dataset.xItemPlus;
};

function syncSourceItem(){
  if(!activeView||!pendingItem||activeView.activity?.type!=='word-plus')return;
  const seed=cleanItemText(pendingItem);
  activeView.activity.sourceItemId=(activeView.activity.selections||[]).includes(seed)?pendingItem.id:'';
}

const observer=new MutationObserver(()=>syncSourceItem());
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true});

document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-x-item-plus-free]');
  if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!activeView)return;
  const item=activeView.life.getItem(button.dataset.xItemPlusFree||'');
  if(!item)return;
  pendingItem=item;

  button.dataset.xItemPlus=item.id;
  delete button.dataset.xItemPlusFree;
  button.click();

  if(activeView.activity?.type==='word-plus'){
    const seed=cleanItemText(item);
    if(activeView.activity.selections?.[0]===seed){
      const undo=activeView.$('g12dlg')?.querySelector('[data-x-undo]');
      undo?.click();
    }
    activeView.activity.sourceItemId='';
  }
},true);

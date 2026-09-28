import {GrowModel} from './core.js?v=20260927-refactor-18';

// 寝かせたあとも、21:00〜翌7:00は「今だけ遊ぼ」を使えるようにする。
GrowModel.prototype.canNightPlay=function(){
  if(this.stageKey()==='egg'||this.isNightPlayActive())return false;
  const hour=new Date().getHours();
  return hour>=21||hour<7;
};

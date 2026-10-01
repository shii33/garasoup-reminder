(async()=>{
wireLock('../');
const [core,a,state]=await Promise.all([WareraData.core('../'),WareraData.expandedAnalytics('../'),fetch('../scripts/state.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)]);
const d=(a&&a.counts)?a:core.stats;
const last=state?.last_processed||'';
if(last){const dt=new Date(last);document.getElementById('sourceCount').textContent=`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}まで反映`}else{const end=d.period?.end||'';document.getElementById('sourceCount').textContent=end?`${end.replaceAll('-','/')}まで反映`:'反映日不明'}

const cards=[['テキストメッセージ',d.counts.text_messages.toLocaleString()+'通'],['ログ期間',d.period.days+'日'],['音声・ビデオ通話',d.counts.calls.toLocaleString()+'回'],['通話時間',d.counts.call_hours.toLocaleString()+'時間'],['1日平均',d.counts.avg_text_per_day+'通'],['最多の日',d.peak_day.date.slice(5).replace('-','/')+'・'+d.peak_day.count+'通'],['最長通話',fmtMinutes(d.longest_call.minutes)],['最長ラリー',d.rapid_rally.messages+'通']];
document.getElementById('statGrid').innerHTML=cards.map(x=>`<div class="stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></div>`).join('');

const total=d.by_sender.reduce((s,x)=>s+x.count,0);
document.getElementById('senderBars').innerHTML=d.by_sender.map(x=>`<div class="bar-row"><b>${x.who}</b><div class="bar"><i style="width:${x.count/total*100}%"></i></div><span>${x.count.toLocaleString()}通</span></div>`).join('');
const max=Math.max(...d.hours.map(x=>x.count));
document.getElementById('hourBars').innerHTML=d.hours.map(x=>`<div class="bar-row"><span>${String(x.hour).padStart(2,'0')}時</span><div class="bar"><i style="width:${max?x.count/max*100:0}%"></i></div><span>${x.count.toLocaleString()}</span></div>`).join('');
document.getElementById('peakHour').textContent=`ピーク ${d.peak_hour.hour}時台`;

document.getElementById('timeGrid').innerHTML=[...(a.weekday||[]).map(x=>[`${x.label}曜日`,x.count.toLocaleString()+'通']),...(a.time_buckets||[]).map(x=>[x.label,x.count.toLocaleString()+'通'])].map(x=>`<div class="mini-stat"><span class="subtle">${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');

const rec=[];
if(a.longest_message?.chars)rec.push(['最長メッセージ',`${a.longest_message.who}・${a.longest_message.chars.toLocaleString()}文字`]);
if(a.max_streak?.messages)rec.push(['連投最多',`${a.max_streak.who}・${a.max_streak.messages}通`]);
if(a.longest_gap?.hours)rec.push(['最長無言期間',`${Math.round(a.longest_gap.hours/24*10)/10}日`]);
if(a.counts?.questions!=null)rec.push(['？の数',a.counts.questions.toLocaleString()]);
if(a.counts?.exclamations!=null)rec.push(['！の数',a.counts.exclamations.toLocaleString()]);
if(a.counts?.w_chars!=null)rec.push(['w の総文字数',a.counts.w_chars.toLocaleString()]);
(a.reply||[]).forEach(x=>rec.push([`${x.direction} 平均返信`,x.avg_seconds<60?`${Math.round(x.avg_seconds)}秒`:`${Math.round(x.avg_seconds/60*10)/10}分`]));
document.getElementById('recordGrid').innerHTML=rec.map(x=>`<div class="mini-stat"><span class="subtle">${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');

const callFallback={through:'2026-09-24 22:03',duration_calls:193,call_days:39,call_day_avg:297.0,no_call_day_avg:216.7,during_rate:14.4,around_rate:14.5,records:[{date:'2026-05-23',minutes:12,text_messages:224},{date:'2026-05-25',minutes:180,text_messages:486},{date:'2026-06-04',minutes:300,text_messages:174},{date:'2026-06-05',minutes:540,text_messages:223},{date:'2026-06-23',minutes:600,text_messages:126}]};
const cr=d.call_relation||a.call_relation||callFallback;
document.getElementById('callRelationGrid').innerHTML=[['時間が記録された通話',`${cr.duration_calls.toLocaleString()}回`],['通話があった日',`${cr.call_days.toLocaleString()}日`],['通話ありの日 平均',`${Math.round(cr.call_day_avg*10)/10}通`],['通話なしの日 平均',`${Math.round(cr.no_call_day_avg*10)/10}通`]].map(x=>`<div class="mini-stat"><span class="subtle">${x[0]}</span><b>${x[1]}</b></div>`).join('');
const compare=[['通話中',cr.during_rate],['通話の前後1時間',cr.around_rate]],cmax=Math.max(...compare.map(x=>x[1]),1);
document.getElementById('callCompare').innerHTML=compare.map(x=>`<div class="compare-row"><span>${x[0]}</span><div class="compare-track"><i style="width:${x[1]/cmax*100}%"></i></div><span class="compare-value">${Math.round(x[1]*10)/10}通/時</span></div>`).join('');
document.getElementById('callRecords').innerHTML=(cr.records||[]).map(x=>`<div class="call-record"><b>${fmtDate(x.date)}</b><span>最長通話 ${fmtMinutes(x.minutes)}</span><strong>${x.text_messages.toLocaleString()}通</strong></div>`).join('');
const relationDiff=Math.abs(cr.during_rate-cr.around_rate);
document.getElementById('callRelationNote').textContent=`通話ログの記録時刻を開始時刻として、表示された通話時間ぶんを通話区間とみなして集計。前後比較は各通話区間の直前・直後1時間（通話区間を除く）。現時点では通話中 ${cr.during_rate}通/時、前後 ${cr.around_rate}通/時で、全体では${relationDiff<2?'ほぼ同じ':'差が出ている'}。${cr===callFallback?' この比較だけは '+cr.through+' までの全ログ集計。':''}`;

document.getElementById('topDays').innerHTML=(a.top_days||[]).slice(0,10).map((x,i)=>`<div class="rank-row"><span>${i+1}. ${fmtDate(x.date)}</span><b>${x.count.toLocaleString()}通</b></div>`).join('');
const apologyDays=a.apology_days||d.apology_days||[];
document.getElementById('apologyDays').innerHTML=apologyDays.slice(0,3).map((x,i)=>`<div class="rank-row"><span>${i+1}. ${fmtDate(x.date)}</span><b>${x.count.toLocaleString()}回</b></div>`).join('')||'<div class="empty">まだ謝ってない。えらい。</div>';
document.getElementById('apologyNote').textContent=(a.apology_days_basis||d.apology_days_basis)==='full'?'みの発言のうち、謝罪表現を含むメッセージを1回として集計。':'現在保持している会話と今後の追加ログを集計。全量ログで再構築すると過去分も厳密になる。';

const recordBook=[
{date:'2026-05-23',kind:'記録更新',title:'通話 12分',detail:'確認できる最初の最長通話記録'},
{date:'2026-05-25',kind:'記録更新',title:'通話 1時間 → 2時間 → 3時間',detail:'同じ日に最長通話を3回更新'},
{date:'2026-05-25',kind:'マイルストーン',title:'テキスト 1,000通',detail:'生ログ上の1,000通目'},
{date:'2026-06-02',kind:'マイルストーン',title:'テキスト 5,000通',detail:'生ログ上の5,000通目'},
{date:'2026-06-04',kind:'記録更新',title:'通話 5時間',detail:'それまでの3時間を更新'},
{date:'2026-06-05',kind:'記録更新',title:'通話 9時間',detail:'翌日にさらに4時間更新'},
{date:'2026-06-18',kind:'文化',title:'われわれがわれわれになった日',detail:'「われわれ、ね」→「われわれもだけど」'},
{date:'2026-06-21',kind:'マイルストーン',title:'テキスト 10,000通',detail:'生ログ上の10,000通目'},
{date:'2026-06-23',kind:'記録更新',title:'通話 10時間',detail:'現在確認できる最長通話記録'},
{date:'2026-07-10',kind:'マイルストーン',title:'テキスト 15,000通',detail:'生ログ上の15,000通目'},
{date:'2026-07-27',kind:'初出',title:'「今日もかわいかったぞ」',detail:'のちに繰り返し登場する締めのひとこと'},
{date:'2026-07-30',kind:'初出',title:'しょもしょも誕生',detail:'み側で初出'},
{date:'2026-08-04',kind:'マイルストーン',title:'テキスト 20,000通',detail:'生ログ上の20,000通目'},
{date:'2026-08-10',kind:'継承',title:'おけけ、もっちに感染',detail:'み発の「おけけ」を、もが初使用'},
{date:'2026-08-15',kind:'継承',title:'しょもしょも、もっちに感染',detail:'み発の「しょもしょも」を、もが初使用'},
{date:'2026-08-30',kind:'マイルストーン',title:'テキスト 25,000通',detail:'生ログ上の25,000通目'},
{date:'2026-08-31',kind:'継承',title:'カラダ・アラウ継承',detail:'5月からのみ語を、もが初使用'},
{date:'2026-09-21',kind:'起点',title:'ガラスープ爆誕',detail:'「鶏ガラスープない」から始まった'}
];
document.getElementById('recordBook').innerHTML=recordBook.map(x=>`<div class="record-entry"><time>${fmtDate(x.date)}</time><span class="record-kind">${esc(x.kind)}</span><div><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></div></div>`).join('');

const curatedAnniversaries=[{label:'5時間通話、記録更新',date:'2026-06-04',detail:'その時点での最長通話・5時間'},{label:'9時間通話、記録更新',date:'2026-06-05',detail:'翌日さらに4時間更新'},{label:'われわれがわれわれになった日',date:'2026-06-18',detail:'「われわれ、ね」→8秒後に「われわれもだけど」'},{label:'10時間通話、記録更新',date:'2026-06-23',detail:'その時点での最長通話・10時間'},{label:'「今日もかわいかったぞ」初出',date:'2026-07-27',detail:'のちに繰り返し登場する締めのひとこと'},{label:'しょもしょも誕生',date:'2026-07-30',detail:'み「しょもしょも…」'},{label:'おけけ、もっちに感染',date:'2026-08-10',detail:'み発の「おけけ」を、もが初使用'},{label:'しょもしょも、もっちに感染',date:'2026-08-15',detail:'み発の「しょもしょも」を、もが初使用'},{label:'カラダ・アラウ継承記念日',date:'2026-08-31',detail:'5月からのみ語を、もが初使用'},{label:'ガラスープ爆誕',date:'2026-09-21',detail:'「鶏ガラスープない」から全部が始まった'}];
const autoAnniversaries=(a.anniversaries||[]).filter(x=>{const label=String(x.label||x.title||'');return !label.includes('よくしゃべった日')&&!label.includes('一番しゃべった日')&&!label.includes('よく喋った日')&&!label.includes('一番喋った日')});
const anniversaries=[...curatedAnniversaries,...autoAnniversaries.filter(x=>!curatedAnniversaries.some(y=>y.date===x.date&&(y.label===x.label||y.label===x.title)))].sort((x,y)=>String(x.date).localeCompare(String(y.date)));
document.getElementById('anniversaries').innerHTML=anniversaries.slice(0,24).map(x=>`<div class="anniv-row"><b>${esc(x.label||x.title||'記念日')}</b><span>${fmtDate(x.date)}${x.detail?' ／ '+esc(x.detail):''}</span></div>`).join('')||'<div class="empty">まだ制定されてない。</div>';

document.getElementById('funGrid').innerHTML=(a.fun||[]).map(x=>`<div class="stat"><div class="label">${esc(x.label)}</div><div class="value">${x.count.toLocaleString()}</div></div>`).join('');
document.getElementById('note').textContent=(d.note||'')+'　詳細内訳は手元の全ログ範囲を基準に集計。総数は最新ログまで反映済み。';
})()

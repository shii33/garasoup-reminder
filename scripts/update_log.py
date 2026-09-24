#!/usr/bin/env python3
"""我らのあそび場：ログ更新・全量再構築。

通常更新:
  python scripts/update_log.py _chat.txt
  cat pasted.txt | python scripts/update_log.py

全量再構築（過去ログ全体から、統計・辞典・検定・思い出を作り直す）:
  python scripts/update_log.py _chat.txt --rebuild-all

通常更新でも core（統計・国語辞典・検定）と memories を同時に更新する。
"""
import argparse, base64, getpass, gzip, hashlib, json, os, random, re, sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit('cryptography が必要です: pip install cryptography')

HEADER = re.compile(r'^[\u200e\u200f]*\[(\d{4}/\d{2}/\d{2}) (\d{1,2}:\d{2}:\d{2})\] ([^:]+): ?(.*)$')
SYSTEM_MARKERS = ('画像は含まれていません','スタンプは含まれていません','ビデオは含まれていません','このメッセージは削除されました')
WHO = {'ぱっち':'み','motchi':'も'}
WEEKDAYS = ['月','火','水','木','金','土','日']
FUN_PATTERNS = {
    'w': r'w', 'www': r'w{3,}', 'ありがと': r'ありがと', 'かわいい': r'かわいい|可愛い', '好き': r'好き',
    'ちっち': r'ちっち', 'オフトゥン': r'オフトゥン', 'のちほ': r'のちほ', 'てぇてぇ': r'てぇてぇ', 'だん！': r'だん[！!]',
    'おはよ': r'おはよ', 'おやすみ': r'おやすみ', '風呂': r'風呂', 'ごめん': r'ごめん', 'ごはん': r'ごはん|ご飯',
    '飯': r'飯', '眠い': r'眠い', 'ねむ': r'ねむ|眠', '仕事': r'仕事', '会社': r'会社', '酒': r'酒', '飲む': r'飲む|飲ん',
    '待って': r'待って', 'やだ': r'やだ|嫌だ', 'しぬ': r'しぬ|死ぬ', 'ほんと': r'ほんと|本当', 'まじ': r'まじ|マジ',
    '草': r'草', 'ただいま': r'ただいま', 'おかえり': r'おかえり|お帰り', 'サンキュー': r'サンキュ', 'あはーん': r'あはーん',
    'まぁまぁ': r'まぁまぁ|まあまあ', 'なるほど': r'なるほど', 'え？': r'え[？?]'
}
ANNIVERSARY_TERMS = ['好き','かわいい','ありがと','オフトゥン','ちっち','てぇてぇ','おはよ','おやすみ','風呂','サンキュー']
MILESTONES = [1000,5000,10000,25000,50000,75000,100000,150000,200000]

def parse_records(text):
    out=[];cur=None
    for raw in text.splitlines():
        m=HEADER.match(raw)
        if m:
            if cur: out.append(cur)
            cur={'dt':datetime.strptime(m.group(1)+' '+m.group(2),'%Y/%m/%d %H:%M:%S'),'sender':m.group(3).strip(),'text':m.group(4)}
        elif cur is not None: cur['text']+='\n'+raw
    if cur: out.append(cur)
    return out

def _b64d(s): return base64.b64decode(s)
def _b64e(b): return base64.b64encode(b).decode()
def _key(password,salt,iterations): return hashlib.pbkdf2_hmac('sha256',password.encode(),salt,iterations,32)
def decrypt_obj(obj,password):
    raw=AESGCM(_key(password,_b64d(obj['salt']),obj['iterations'])).decrypt(_b64d(obj['iv']),_b64d(obj['ciphertext']),None)
    if obj.get('compression')=='gzip': raw=gzip.decompress(raw)
    return json.loads(raw)
def encrypt_obj(data,password):
    salt=os.urandom(16);iv=os.urandom(12);iterations=250000
    raw=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),9)
    ct=AESGCM(_key(password,salt,iterations)).encrypt(iv,raw,None)
    return {'version':1,'kdf':'PBKDF2-SHA256','iterations':iterations,'cipher':'AES-256-GCM','compression':'gzip','salt':_b64e(salt),'iv':_b64e(iv),'ciphertext':_b64e(ct)}
def load_json(path): return json.loads(Path(path).read_text(encoding='utf-8'))
def save_json(path,obj): Path(path).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def load_core(data,password): return decrypt_obj(load_json(data/'core.enc'),password)
def save_core(data,core,password): save_json(data/'core.enc',encrypt_obj(core,password))
def rid(r): return hashlib.sha256(f"{r['dt'].isoformat()}\0{r['sender']}\0{r['text']}".encode()).hexdigest()[:24]
def is_call(r): return ('音声通話,' in r['text'] or 'ビデオ通話,' in r['text'] or '通話の不在着信' in r['text'])
def is_text(r):
    t=r['text']
    if is_call(r) or any(x in t for x in SYSTEM_MARKERS): return False
    if t.lstrip().startswith('\u200eアンケート:'): return False
    return bool(t.strip())
def call_minutes(t):
    if '不在着信' in t or '応答なし' in t or '終了' in t:return 0
    h=re.search(r'(\d+)時間',t);m=re.search(r'(\d+)分',t)
    return (int(h.group(1))*60 if h else 0)+(int(m.group(1)) if m else 0)
def who(r): return WHO.get(r['sender'],r['sender'])
def clean_for_scene(r):
    if not is_text(r):return False
    t=r['text'].strip()
    return len(t)<=650 and not (t.startswith('http') and len(t)>180) and t.count('\n')<=8
def scene_score(rows):
    joined=' '.join(x['text'] for x in rows);speakers=len({who(x) for x in rows})
    return len(rows)*2+speakers*4+min(joined.count('w'),8)+2*sum(k in joined for k in ['？','！','www','好き','かわ','なんで','待って','え、','あー','笑'])
def _scene_windows(rows):
    sessions=[];cur=[]
    for r in rows:
        if cur and (r['dt']-cur[-1]['dt']).total_seconds()>12*60:
            if len(cur)>=3:sessions.append(cur)
            cur=[]
        cur.append(r)
    if len(cur)>=3:sessions.append(cur)
    out=[]
    for s in sessions:
        for n in (3,4,5,6):
            if len(s)<n:continue
            step=1 if len(s)<=12 else 2
            for i in range(0,len(s)-n+1,step):
                w=s[i:i+n]
                if len({who(x) for x in w})<2 or sum(len(x['text']) for x in w)>1400:continue
                out.append(w)
    return out
def scenes_by_day(records,limit=30):
    by=defaultdict(list)
    for r in records:
        if clean_for_scene(r):by[r['dt'].date().isoformat()].append(r)
    result={}
    for day,rows in by.items():
        cand=_scene_windows(rows)
        if not cand:continue
        uniq=[];seen=set()
        for w in cand:
            key=tuple((x['dt'].isoformat(),who(x),x['text']) for x in w)
            if key in seen:continue
            seen.add(key);uniq.append(w)
        if len(uniq)<=limit:picked=uniq
        else:
            scored=sorted(uniq,key=lambda w:(-scene_score(w),w[0]['dt']));top=scored[:max(1,limit//3)];top_keys={tuple(x['dt'] for x in w) for w in top};remaining=[w for w in uniq if tuple(x['dt'] for x in w) not in top_keys];timeline=[];need=limit//3
            if remaining and need:
                remaining.sort(key=lambda w:w[0]['dt'])
                for i in range(need):timeline.append(remaining[round(i*(len(remaining)-1)/max(need-1,1))])
            chosen={tuple(x['dt'] for x in w) for w in top+timeline};left=[w for w in remaining if tuple(x['dt'] for x in w) not in chosen];random.Random(day).shuffle(left);picked=(top+timeline+left)[:limit]
        result[day]=[[{'who':who(x),'text':x['text']} for x in w] for w in picked]
    return result
def _time_bucket(h):
    if h<=4:return '深夜 0〜4時'
    if h<=9:return '朝 5〜9時'
    if h<=16:return '昼 10〜16時'
    return '夜 17〜23時'
def _rapid_rally(texts):
    best=[];cur=[]
    for r in texts:
        if cur and (r['dt']-cur[-1]['dt']).total_seconds()>60:cur=[]
        cur.append(r)
        if len(cur)>len(best):best=list(cur)
    if not best:return {'messages':0,'start':'','end':'','minutes':0}
    return {'messages':len(best),'start':best[0]['dt'].strftime('%Y-%m-%d %H:%M:%S'),'end':best[-1]['dt'].strftime('%Y-%m-%d %H:%M:%S'),'minutes':round((best[-1]['dt']-best[0]['dt']).total_seconds()/60,1)}
def _max_streak(texts):
    best={'who':'','messages':0,'date':''};curwho=None;n=0;start=None
    for r in texts:
        w=who(r)
        if w==curwho:n+=1
        else:curwho=w;n=1;start=r['dt']
        if n>best['messages']:best={'who':w,'messages':n,'date':start.date().isoformat()}
    return best
def build_stats(records):
    texts=[r for r in records if is_text(r)];calls=[r for r in records if is_call(r)]
    start=min(r['dt'] for r in records).date();end=max(r['dt'] for r in records).date();active=sorted({r['dt'].date().isoformat() for r in texts});bys=Counter(who(r) for r in texts);hours=Counter(r['dt'].hour for r in texts);days=Counter(r['dt'].date().isoformat() for r in texts);mt=Counter(r['dt'].strftime('%Y-%m') for r in texts);mc=Counter(r['dt'].strftime('%Y-%m') for r in calls);weekday=Counter(WEEKDAYS[r['dt'].weekday()] for r in texts);buckets=Counter(_time_bucket(r['dt'].hour) for r in texts);total_min=sum(call_minutes(r['text']) for r in calls)
    longest_call={'date':'','time':'','sender':'','minutes':0.0}
    for r in calls:
        m=call_minutes(r['text'])
        if m>longest_call['minutes']:longest_call={'date':r['dt'].date().isoformat(),'time':r['dt'].time().isoformat(),'sender':r['sender'],'minutes':float(m)}
    longest=max(texts,key=lambda r:len(r['text']));gaps=[((b['dt']-a['dt']).total_seconds(),a,b) for a,b in zip(texts,texts[1:]) if (b['dt']-a['dt']).total_seconds()>=0];lg=max(gaps,key=lambda x:x[0]) if gaps else (0,texts[0],texts[0]);reply_sums=Counter();reply_counts=Counter();reply_fast={}
    for a,b in zip(texts,texts[1:]):
        if who(a)==who(b):continue
        sec=(b['dt']-a['dt']).total_seconds()
        if not 0<=sec<=6*3600:continue
        key=f'{who(a)}→{who(b)}';reply_sums[key]+=sec;reply_counts[key]+=1
        if key not in reply_fast or sec<reply_fast[key]['seconds']:reply_fast[key]={'seconds':round(sec,1),'date':b['dt'].date().isoformat()}
    first={}
    for label,pat in FUN_PATTERNS.items():
        hit=next((r for r in texts if re.search(pat,r['text'],re.I)),None)
        if hit:first[label]=hit['dt'].date().isoformat()
    milestones=[{'count':m,'date':texts[m-1]['dt'].date().isoformat()} for m in MILESTONES if len(texts)>=m];top_days=[{'date':d,'count':n} for d,n in days.most_common(10)];peak=top_days[0];hour_rows=[{'hour':h,'count':hours[h]} for h in range(24)];ph=max(hour_rows,key=lambda x:x['count']);fun=[{'label':label,'count':sum(len(re.findall(pat,r['text'],re.I)) for r in texts)} for label,pat in FUN_PATTERNS.items()]
    stats={'counts':{'raw_records':len(records),'text_messages':len(texts),'calls':len(calls),'call_minutes':round(total_min,1),'call_hours':round(total_min/60,1),'avg_text_per_day':round(len(texts)/max(len(active),1),1),'questions':sum(r['text'].count('?')+r['text'].count('？') for r in texts),'exclamations':sum(r['text'].count('!')+r['text'].count('！') for r in texts),'w_chars':sum(len(re.findall('w',r['text'],re.I)) for r in texts)},'period':{'start':start.isoformat(),'end':end.isoformat(),'days':(end-start).days+1,'active_days':len(active)},'by_sender':[{'who':w,'count':bys[w]} for w in ['み','も']],'hours':hour_rows,'peak_hour':{'hour':ph['hour'],'count':ph['count']},'months':[{'month':m,'count':mt[m],'calls':mc[m]} for m in sorted(set(mt)|set(mc))],'weekday':[{'label':w,'count':weekday[w]} for w in WEEKDAYS],'time_buckets':[{'label':b,'count':buckets[b]} for b in ['深夜 0〜4時','朝 5〜9時','昼 10〜16時','夜 17〜23時']],'fun':fun,'top_days':top_days,'peak_day':peak,'longest_call':longest_call,'rapid_rally':_rapid_rally(texts),'longest_message':{'who':who(longest),'date':longest['dt'].date().isoformat(),'chars':len(longest['text'])},'max_streak':_max_streak(texts),'reply':[{'direction':k,'avg_seconds':round(reply_sums[k]/reply_counts[k],1),'count':reply_counts[k],'fastest_seconds':reply_fast[k]['seconds'],'fastest_date':reply_fast[k]['date']} for k in sorted(reply_counts)],'longest_gap':{'hours':round(lg[0]/3600,1),'from':lg[1]['dt'].date().isoformat(),'to':lg[2]['dt'].date().isoformat()},'first_occurrences':first,'milestones':milestones,'note':'ログから自動集計。画像・スタンプ等のシステム行はテキスト発言数から除外。'}
    c=1
    for r in reversed(texts[:-1]):
        if who(r)==who(texts[-1]):c+=1
        else:break
    aux={'reply_sums':dict(reply_sums),'reply_counts':dict(reply_counts),'last_text':{'dt':texts[-1]['dt'].isoformat(),'sender':texts[-1]['sender'],'text':texts[-1]['text']},'streak_who':who(texts[-1]),'streak_count':c,'streak_start':texts[-c]['dt'].date().isoformat()}
    return stats,aux
def ensure_stats_shape(stats):
    stats.setdefault('fun',[]);existing={x.get('label') for x in stats['fun']}
    for label in FUN_PATTERNS:
        if label not in existing:stats['fun'].append({'label':label,'count':0})
    stats.setdefault('weekday',[{'label':w,'count':0} for w in WEEKDAYS]);stats.setdefault('time_buckets',[{'label':b,'count':0} for b in ['深夜 0〜4時','朝 5〜9時','昼 10〜16時','夜 17〜23時']]);stats.setdefault('first_occurrences',{});stats.setdefault('milestones',[]);stats.setdefault('reply',[]);stats.setdefault('longest_gap',{'hours':0,'from':'','to':''});stats.setdefault('max_streak',{'who':'','messages':0,'date':''});stats.setdefault('longest_message',{'who':'','date':'','chars':0});stats.setdefault('top_days',[])
    for k in ['questions','exclamations','w_chars']:stats['counts'].setdefault(k,0)
    return stats
def update_stats(stats,new,state):
    stats=ensure_stats_shape(stats);texts=[r for r in new if is_text(r)];calls=[r for r in new if is_call(r)];old_text_count=stats['counts']['text_messages'];stats['counts']['raw_records']+=len(new);stats['counts']['text_messages']+=len(texts);stats['counts']['calls']+=len(calls);addmin=sum(call_minutes(r['text']) for r in calls);stats['counts']['call_minutes']=round(stats['counts'].get('call_minutes',stats['counts'].get('call_hours',0)*60)+addmin,1);stats['counts']['call_hours']=round(stats['counts']['call_minutes']/60,1);stats['counts']['questions']+=sum(r['text'].count('?')+r['text'].count('？') for r in texts);stats['counts']['exclamations']+=sum(r['text'].count('!')+r['text'].count('！') for r in texts);stats['counts']['w_chars']+=sum(len(re.findall('w',r['text'],re.I)) for r in texts)
    bymap={x['who']:x for x in stats['by_sender']}
    for w,n in Counter(who(r) for r in texts).items():bymap.setdefault(w,{'who':w,'count':0})['count']+=n
    stats['by_sender']=list(bymap.values());hmap={x['hour']:x for x in stats['hours']}
    for h,n in Counter(r['dt'].hour for r in texts).items():hmap.setdefault(h,{'hour':h,'count':0})['count']+=n
    stats['hours']=[hmap.setdefault(h,{'hour':h,'count':0}) for h in range(24)];ph=max(stats['hours'],key=lambda x:x['count']);stats['peak_hour']={'hour':ph['hour'],'count':ph['count']};months={x['month']:x for x in stats['months']};mt=Counter(r['dt'].strftime('%Y-%m') for r in texts);mc=Counter(r['dt'].strftime('%Y-%m') for r in calls)
    for mon in sorted(set(mt)|set(mc)):months.setdefault(mon,{'month':mon,'count':0,'calls':0});months[mon]['count']+=mt[mon];months[mon]['calls']+=mc[mon]
    stats['months']=[months[k] for k in sorted(months)];wmap={x['label']:x for x in stats['weekday']}
    for w,n in Counter(WEEKDAYS[r['dt'].weekday()] for r in texts).items():wmap.setdefault(w,{'label':w,'count':0})['count']+=n
    bmap={x['label']:x for x in stats['time_buckets']}
    for b,n in Counter(_time_bucket(r['dt'].hour) for r in texts).items():bmap.setdefault(b,{'label':b,'count':0})['count']+=n
    fmap={x['label']:x for x in stats['fun']}
    for label,pat in FUN_PATTERNS.items():
        fmap.setdefault(label,{'label':label,'count':0})['count']+=sum(len(re.findall(pat,r['text'],re.I)) for r in texts)
        if label not in stats['first_occurrences']:
            hit=next((r for r in texts if re.search(pat,r['text'],re.I)),None)
            if hit:stats['first_occurrences'][label]=hit['dt'].date().isoformat()
    stats['fun']=[fmap[k] for k in FUN_PATTERNS]
    for r in calls:
        mins=call_minutes(r['text'])
        if mins>stats['longest_call'].get('minutes',0):stats['longest_call']={'date':r['dt'].date().isoformat(),'time':r['dt'].time().isoformat(),'sender':r['sender'],'minutes':float(mins)}
    for r in texts:
        if len(r['text'])>stats['longest_message'].get('chars',0):stats['longest_message']={'who':who(r),'date':r['dt'].date().isoformat(),'chars':len(r['text'])}
    rbatch=_rapid_rally(texts)
    if rbatch['messages']>stats['rapid_rally'].get('messages',0):stats['rapid_rally']=rbatch
    day_counts=state.setdefault('day_counts',{})
    for d,n in Counter(r['dt'].date().isoformat() for r in texts).items():day_counts[d]=day_counts.get(d,0)+n
    top=sorted(({'date':d,'count':n} for d,n in day_counts.items()),key=lambda x:x['count'],reverse=True)[:10];stats['top_days']=top
    if top:stats['peak_day']=top[0]
    if texts or calls:
        end=max(r['dt'].date().isoformat() for r in new);stats['period']['end']=max(stats['period']['end'],end);stats['period']['days']=(datetime.fromisoformat(stats['period']['end'])-datetime.fromisoformat(stats['period']['start'])).days+1;known=set(state.setdefault('active_dates',[]));known.update(r['dt'].date().isoformat() for r in texts);state['active_dates']=sorted(known);stats['period']['active_days']=len(known)
    stats['counts']['avg_text_per_day']=round(stats['counts']['text_messages']/max(stats['period'].get('active_days',1),1),1)
    for m in MILESTONES:
        if old_text_count<m<=old_text_count+len(texts) and not any(x.get('count')==m for x in stats['milestones']):stats['milestones'].append({'count':m,'date':texts[m-old_text_count-1]['dt'].date().isoformat()})
    aux=state.setdefault('stats_aux',{});prev=aux.get('last_text');chain=[]
    if prev:
        try:chain.append({'dt':datetime.fromisoformat(prev['dt']),'sender':prev['sender'],'text':prev.get('text','')})
        except Exception:pass
    chain.extend(texts);rs=Counter(aux.get('reply_sums',{}));rc=Counter(aux.get('reply_counts',{}));rmap={x['direction']:x for x in stats.get('reply',[])}
    for a,b in zip(chain,chain[1:]):
        sec=(b['dt']-a['dt']).total_seconds()
        if sec>=0 and sec/3600>stats['longest_gap'].get('hours',0):stats['longest_gap']={'hours':round(sec/3600,1),'from':a['dt'].date().isoformat(),'to':b['dt'].date().isoformat()}
        if who(a)!=who(b) and 0<=sec<=6*3600:
            key=f'{who(a)}→{who(b)}';rs[key]+=sec;rc[key]+=1;row=rmap.setdefault(key,{'direction':key,'fastest_seconds':sec,'fastest_date':b['dt'].date().isoformat()})
            if sec<row.get('fastest_seconds',10**18):row['fastest_seconds']=round(sec,1);row['fastest_date']=b['dt'].date().isoformat()
    for key in rc:rmap.setdefault(key,{'direction':key})['avg_seconds']=round(rs[key]/rc[key],1);rmap[key]['count']=rc[key]
    stats['reply']=[rmap[k] for k in sorted(rmap)];aux['reply_sums']=dict(rs);aux['reply_counts']=dict(rc);sw=aux.get('streak_who');sc=int(aux.get('streak_count',0));ss=aux.get('streak_start')
    for r in texts:
        w=who(r)
        if w==sw:sc+=1
        else:sw=w;sc=1;ss=r['dt'].date().isoformat()
        if sc>stats['max_streak'].get('messages',0):stats['max_streak']={'who':w,'messages':sc,'date':ss}
    aux['streak_who']=sw;aux['streak_count']=sc;aux['streak_start']=ss
    if texts:aux['last_text']={'dt':texts[-1]['dt'].isoformat(),'sender':texts[-1]['sender'],'text':texts[-1]['text']}
    return stats
def rebuild_dictionary(dic,records):
    texts=[r for r in records if is_text(r)]
    for e in dic.get('entries',[]):
        terms=[e['term']]+e.get('aliases',[]);hits=[r for r in texts if any(t and t in r['text'] for t in terms)];e['count']=len(hits);e['first_date']=hits[0]['dt'].date().isoformat() if hits else e.get('first_date');e['examples']=[{'who':who(r),'date':r['dt'].date().isoformat(),'text':r['text']} for r in hits[:3]]
    dic['count']=len(dic.get('entries',[]));return dic
def update_dictionary(dic,new):
    texts=[r for r in new if is_text(r)]
    for e in dic.get('entries',[]):
        terms=[e['term']]+e.get('aliases',[]);hits=[r for r in texts if any(t and t in r['text'] for t in terms)];e['count']=e.get('count',0)+len(hits)
        if hits and not e.get('first_date'):e['first_date']=hits[0]['dt'].date().isoformat()
        ex=e.setdefault('examples',[])
        for r in hits:
            row={'who':who(r),'date':r['dt'].date().isoformat(),'text':r['text']}
            if row not in ex and len(ex)<3:ex.append(row)
    dic['count']=len(dic.get('entries',[]));return dic
def _quiz_who_candidates(texts):
    seen=set();rows=[]
    for r in texts:
        t=r['text'].strip()
        if not 4<=len(t)<=110 or '\n' in t or t.startswith('http') or t in seen:continue
        seen.add(t);rows.append(r)
    return rows
def _wrong_options(pool,answer,seed):
    c=[x for x in pool if x!=answer and max(len(x),len(answer))/max(min(len(x),len(answer)),1)<=2.5];rng=random.Random(seed);rng.shuffle(c)
    if len(c)<2:c=[x for x in pool if x!=answer];rng.shuffle(c)
    return c[:2]
def build_quiz(records,who_limit=1000,next_limit=1000):
    texts=[r for r in records if is_text(r)];cand=_quiz_who_candidates(texts);random.Random(20260924).shuffle(cand);cand=sorted(cand,key=lambda r:(-scene_score([r]),r['dt']))[:who_limit*3];selected=[];per_day=Counter()
    for r in cand:
        d=r['dt'].date().isoformat()
        if per_day[d]>=12:continue
        selected.append(r);per_day[d]+=1
        if len(selected)>=who_limit:break
    qwho=[{'type':'who','quote':r['text'],'answer':who(r),'date':r['dt'].date().isoformat()} for r in selected];pairs=[];seen=set();answer_pool=[r['text'] for r in texts if 1<=len(r['text'])<=100 and '\n' not in r['text']]
    for a,b in zip(texts,texts[1:]):
        if who(a)==who(b) or (b['dt']-a['dt']).total_seconds()>600 or not (1<=len(a['text'])<=100 and 1<=len(b['text'])<=100) or '\n' in a['text'] or '\n' in b['text']:continue
        key=(a['text'],b['text'])
        if key in seen:continue
        seen.add(key);pairs.append((a,b))
    random.Random(20260925).shuffle(pairs);per_day=Counter();qnext=[]
    for a,b in pairs:
        d=a['dt'].date().isoformat()
        if per_day[d]>=12:continue
        wrong=_wrong_options(answer_pool,b['text'],a['dt'].timestamp())
        if len(wrong)<2:continue
        opts=wrong+[b['text']];random.Random(a['dt'].timestamp()).shuffle(opts);qnext.append({'type':'next','prompt':a['text'],'prompt_who':who(a),'answer':b['text'],'answer_who':who(b),'options':opts,'date':d});per_day[d]+=1
        if len(qnext)>=next_limit:break
    return {'who':qwho,'next':qnext}
def update_quiz(q,new,per_type=30):
    texts=[r for r in new if is_text(r)];existing={x['quote'] for x in q.get('who',[])};added=0
    for r in sorted(_quiz_who_candidates(texts),key=lambda r:(-scene_score([r]),r['dt']))[:per_type*3]:
        if r['text'] in existing:continue
        q.setdefault('who',[]).append({'type':'who','quote':r['text'],'answer':who(r),'date':r['dt'].date().isoformat()});existing.add(r['text']);added+=1
        if added>=per_type:break
    existing_next={(x['prompt'],x['answer']) for x in q.get('next',[])};pool=[r['text'] for r in texts if 1<=len(r['text'])<=100 and '\n' not in r['text']];added=0
    for a,b in zip(texts,texts[1:]):
        if added>=per_type:break
        if who(a)==who(b) or (b['dt']-a['dt']).total_seconds()>600 or len(a['text'])>100 or len(b['text'])>100 or '\n' in a['text'] or '\n' in b['text'] or (a['text'],b['text']) in existing_next:continue
        wrong=_wrong_options(pool,b['text'],a['dt'].timestamp())
        if len(wrong)<2:continue
        opts=wrong+[b['text']];random.Random(a['dt'].timestamp()).shuffle(opts);q.setdefault('next',[]).append({'type':'next','prompt':a['text'],'prompt_who':who(a),'answer':b['text'],'answer_who':who(b),'options':opts,'date':a['dt'].date().isoformat()});existing_next.add((a['text'],b['text']));added+=1
    return q
def locate_quiz_item(records,item):
    date=item.get('date')
    if item.get('type')=='next' or 'prompt' in item:
        for i in range(len(records)-1):
            a,b=records[i],records[i+1]
            if a['dt'].date().isoformat()==date and a['text']==item.get('prompt') and b['text']==item.get('answer'):return i,i+1
        for i,r in enumerate(records):
            if r['dt'].date().isoformat()==date and r['text']==item.get('prompt'):return i,i
    else:
        for i,r in enumerate(records):
            if r['dt'].date().isoformat()==date and r['text']==item.get('quote'):return i,i
    return None
def context_rows(records,start,end):
    inds=list(range(start,end+1));i=start-1;before=0
    while i>=0 and before<3:
        if records[i]['dt'].date()!=records[start]['dt'].date() or (records[i+1]['dt']-records[i]['dt']).total_seconds()>600:break
        if is_text(records[i]):inds.insert(0,i);before+=1
        i-=1
    i=end+1;after=0
    while i<len(records) and after<3:
        if records[i]['dt'].date()!=records[end]['dt'].date() or (records[i]['dt']-records[i-1]['dt']).total_seconds()>600:break
        if is_text(records[i]):inds.append(i);after+=1
        i+=1
    return [records[i] for i in inds if is_text(records[i])]
def quiz_key(item): return ('next|' if item.get('type')=='next' or 'prompt' in item else 'who|')+str(item.get('date',''))+'|'+str(item.get('prompt',item.get('quote','')))+'|'+(str(item.get('answer','')) if item.get('type')=='next' or 'prompt' in item else '')
def build_quiz_scenes(q,records):
    scenes=[];mapping={};cache={};next_num=1
    for item in q.get('who',[])+q.get('next',[]):
        loc=locate_quiz_item(records,item)
        if not loc:continue
        rows=context_rows(records,*loc);key=tuple((who(r),r['text']) for r in rows);scene=cache.get(key)
        if not scene:
            scene={'id':f'q{next_num:05d}','date':rows[0]['dt'].date().isoformat(),'start_dt':rows[0]['dt'].isoformat(),'end_dt':rows[-1]['dt'].isoformat(),'lines':[{'who':who(r),'text':r['text']} for r in rows],'kind':'quiz-context'};next_num+=1;scenes.append(scene);cache[key]=scene
        mapping[quiz_key(item)]=scene['id']
    return {'version':3,'count':len(scenes),'scenes':scenes,'map':mapping}
def attach_quiz_scenes(q,new_records,scene_pack,new_who_from,new_next_from):
    scenes=scene_pack.setdefault('scenes',[]);mapping=scene_pack.setdefault('map',{});used={str(s.get('id')) for s in scenes};nums=[int(m.group(1)) for x in used if (m:=re.fullmatch(r'q(\d+)',x))];next_num=max(nums,default=0)+1;cache={tuple((x.get('who'),x.get('text')) for x in s.get('lines',[])):s for s in scenes}
    for item in q.get('who',[])[new_who_from:]+q.get('next',[])[new_next_from:]:
        loc=locate_quiz_item(new_records,item)
        if not loc:continue
        rows=context_rows(new_records,*loc);key=tuple((who(r),r['text']) for r in rows);scene=cache.get(key)
        if not scene:
            scene={'id':f'q{next_num:05d}','date':rows[0]['dt'].date().isoformat(),'start_dt':rows[0]['dt'].isoformat(),'end_dt':rows[-1]['dt'].isoformat(),'lines':[{'who':who(r),'text':r['text']} for r in rows],'kind':'quiz-context'};next_num+=1;scenes.append(scene);cache[key]=scene
        mapping[quiz_key(item)]=scene['id']
    scene_pack['version']=3;scene_pack['count']=len(scenes)
def build_memories(records,start_id=1,per_day=30):
    out=[];nid=start_id
    for day,groups in sorted(scenes_by_day(records,per_day).items()):
        for lines in groups:out.append({'id':nid,'date':day,'lines':lines});nid+=1
    return out
def build_anniversaries(stats):
    rows=[]
    for term in ANNIVERSARY_TERMS:
        d=stats.get('first_occurrences',{}).get(term)
        if d:rows.append({'date':d,'label':f'初めて「{term}」が出た日','kind':'first-word'})
    p=stats.get('peak_day') or {}
    if p.get('date'):rows.append({'date':p['date'],'label':f'いちばん喋った日（{p.get("count",0):,}通）','kind':'peak-day'})
    lc=stats.get('longest_call') or {}
    if lc.get('date') and lc.get('minutes',0):rows.append({'date':lc['date'],'label':f'最長通話の日（{round(lc["minutes"]):,}分）','kind':'longest-call'})
    for m in stats.get('milestones',[]):rows.append({'date':m['date'],'label':f'{m["count"]:,}通目のテキストを送った日','kind':'milestone'})
    seen=set();out=[]
    for x in sorted(rows,key=lambda x:(x['date'],x['label'])):
        k=(x['date'],x['label'])
        if k not in seen:seen.add(k);out.append(x)
    return out
def build_state(records,stats,aux):
    texts=[r for r in records if is_text(r)];days=Counter(r['dt'].date().isoformat() for r in texts);last=max(r['dt'] for r in records)
    return {'last_processed':last.isoformat(),'base_end':last.date().isoformat(),'base_active_days':len(days),'active_dates':sorted(days),'day_counts':dict(days),'processed_record_ids':[rid(r) for r in records[-5000:]],'stats_aux':aux}
def rebuild_all(root,data,state_path,password,records):
    core=load_core(data,password);stats,aux=build_stats(records);core['stats']=stats;core['dictionary']=rebuild_dictionary(core.get('dictionary',{'entries':[]}),records);core['quiz']=build_quiz(records,1000,1000);core['anniversaries']=build_anniversaries(stats);memories=build_memories(records,1,30);save_json(data/'memories-base.enc',encrypt_obj({'version':2,'count':len(memories),'memories':memories},password));save_json(data/'manifest.json',{'version':2,'base':'memories-base.enc','base_count':len(memories),'updates':[]});qp=build_quiz_scenes(core['quiz'],records);save_json(data/'quiz-scenes.enc',encrypt_obj(qp,password));save_core(data,core,password);state=build_state(records,stats,aux);state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f'全量再構築完了: memories {len(memories):,}件 / quiz 発言者 {len(core["quiz"]["who"]):,}問・続き {len(core["quiz"]["next"]):,}問 / quiz scenes {qp["count"]:,}件')
def incremental(root,data,state_path,password,records):
    state=json.loads(state_path.read_text(encoding='utf-8'));cutoff=datetime.fromisoformat(state['last_processed']);processed=set(state.get('processed_record_ids',[]));new=[r for r in records if r['dt']>cutoff and rid(r) not in processed]
    if not new:print('新しいログはありません。変更なし。');return
    core=load_core(data,password);who_from=len(core.get('quiz',{}).get('who',[]));next_from=len(core.get('quiz',{}).get('next',[]));core['stats']=update_stats(core['stats'],new,state);core['dictionary']=update_dictionary(core['dictionary'],new);core['quiz']=update_quiz(core['quiz'],new,30);core['anniversaries']=build_anniversaries(core['stats']);qp=data/'quiz-scenes.enc';scene_pack=decrypt_obj(load_json(qp),password) if qp.exists() else {'version':3,'count':0,'scenes':[],'map':{}};attach_quiz_scenes(core['quiz'],new,scene_pack,who_from,next_from);save_json(qp,encrypt_obj(scene_pack,password));save_core(data,core,password);manifest=load_json(data/'manifest.json');memories=[]
    for rel in [manifest['base']]+[x['file'] for x in manifest.get('updates',[])]:
        payload=decrypt_obj(load_json(data/rel),password);memories.extend(payload.get('memories',[]) if isinstance(payload,dict) else payload)
    next_id=max((x.get('id',0) for x in memories if isinstance(x.get('id',0),int)),default=0)+1;additions=build_memories(new,next_id,30)
    if additions:
        stamp=max(r['dt'] for r in new).strftime('%Y%m%d');n=1
        while True:
            rel=f'memories-updates/{stamp}-{n:03d}.enc'
            if not (data/rel).exists():break
            n+=1
        (data/rel).parent.mkdir(parents=True,exist_ok=True);save_json(data/rel,encrypt_obj({'version':2,'count':len(additions),'memories':additions},password));manifest.setdefault('updates',[]).append({'file':rel,'count':len(additions)});save_json(data/'manifest.json',manifest)
    state['last_processed']=max(r['dt'] for r in new).isoformat();processed.update(rid(r) for r in new);state['processed_record_ids']=list(processed)[-5000:];state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f'更新完了: {state["last_processed"]} / memories +{len(additions)}件 / quiz scenes {scene_pack["count"]}件')
def main():
    ap=argparse.ArgumentParser(description='我らのあそび場：ログ更新');ap.add_argument('input',nargs='?',help='_chat.txt。省略すると標準入力（ベタ貼り）');ap.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));ap.add_argument('--password',default=os.getenv('WARERA_PASSPHRASE'));ap.add_argument('--dry-run',action='store_true');ap.add_argument('--rebuild-all',action='store_true');args=ap.parse_args();raw=Path(args.input).read_text(encoding='utf-8-sig') if args.input else sys.stdin.read();records=parse_records(raw)
    if not records:sys.exit('ログ形式を読み取れませんでした')
    if args.dry_run:
        texts=sum(is_text(r) for r in records);calls=sum(is_call(r) for r in records);mem=sum(len(v) for v in scenes_by_day(records,30).values());q=build_quiz(records,1000,1000) if args.rebuild_all else {'who':[],'next':[]};print(f'読み取り: {len(records):,} records / text {texts:,} / calls {calls:,} / memory候補 {mem:,} / quiz {len(q["who"]):,}+{len(q["next"]):,}');return
    root=Path(args.root);data=root/'data';state_path=root/'scripts'/'state.json';password=args.password or getpass.getpass('合言葉: ')
    if args.rebuild_all:rebuild_all(root,data,state_path,password,records)
    else:incremental(root,data,state_path,password,records)
if __name__=='__main__':main()

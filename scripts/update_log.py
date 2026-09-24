#!/usr/bin/env python3
"""我らのあそび場：ログ差分更新。

_chat.txt 全体でも、ベタ貼りした差分でも更新できます。
検定問題は生成時に必ず quiz-scenes.enc の周辺会話へ紐付けます。
"""
import argparse, base64, getpass, gzip, hashlib, json, os, random, re, sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit('cryptography が必要です: pip install cryptography')

HEADER=re.compile(r'^[\u200e\u200f]*\[(\d{4}/\d{2}/\d{2}) (\d{1,2}:\d{2}:\d{2})\] ([^:]+): ?(.*)$')
SYSTEM_MARKERS=('画像は含まれていません','スタンプは含まれていません','ビデオは含まれていません','このメッセージは削除されました')
WHO={'ぱっち':'み','motchi':'も'}
FUN_PATTERNS={'w':'w','ありがと':'ありがと','かわいい':'かわいい|可愛い','好き':'好き','ちっち':'ちっち','オフトゥン':'オフトゥン','のちほ':'のちほ','てぇてぇ':'てぇてぇ','だん！':'だん！','おはよ':'おはよ','おやすみ':'おやすみ','風呂':'風呂'}


def parse_records(text):
    out=[];cur=None
    for raw in text.splitlines():
        m=HEADER.match(raw)
        if m:
            if cur: out.append(cur)
            cur={'dt':datetime.strptime(m.group(1)+' '+m.group(2),'%Y/%m/%d %H:%M:%S'),'sender':m.group(3).strip(),'text':m.group(4)}
        elif cur is not None:
            cur['text']+='\n'+raw
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

def is_call(r):
    t=r['text'];return ('音声通話,' in t or 'ビデオ通話,' in t or '通話の不在着信' in t)
def is_text(r):
    t=r['text']
    if is_call(r) or any(x in t for x in SYSTEM_MARKERS): return False
    if t.lstrip().startswith('\u200eアンケート:'): return False
    return bool(t.strip())
def call_minutes(t):
    if '不在着信' in t or '応答なし' in t or '終了' in t:return 0
    h=re.search(r'(\d+)時間',t);m=re.search(r'(\d+)分',t)
    return (int(h.group(1))*60 if h else 0)+(int(m.group(1)) if m else 0)
def scene_score(rows):
    joined=' '.join(x['text'] for x in rows)
    return len(rows)*3+min(joined.count('w'),8)+3*sum(k in joined for k in ['？','！','www','好き','かわ','なんで','待って','なる','え、','あー'])

def scenes_by_day(records,limit=10):
    by=defaultdict(list)
    for r in records:
        if is_text(r):by[r['dt'].date().isoformat()].append(r)
    out={}
    for day,rows in by.items():
        groups=[];cur=[]
        for r in rows:
            if cur and (r['dt']-cur[-1]['dt']).total_seconds()>8*60:
                if len(cur)>=2:groups.append(cur)
                cur=[]
            cur.append(r)
            if len(cur)>=6:groups.append(cur);cur=[]
        if len(cur)>=2:groups.append(cur)
        groups=sorted(groups,key=scene_score,reverse=True)[:limit]
        out[day]=[[{'who':WHO.get(x['sender'],x['sender']),'text':x['text']} for x in g] for g in groups]
    return out

def update_stats(stats,new,state):
    texts=[r for r in new if is_text(r)];calls=[r for r in new if is_call(r)]
    stats['counts']['raw_records']+=len(new);stats['counts']['text_messages']+=len(texts);stats['counts']['calls']+=len(calls)
    addmin=sum(call_minutes(r['text']) for r in calls);stats['counts']['call_minutes']=round(stats['counts'].get('call_minutes',stats['counts'].get('call_hours',0)*60)+addmin,1);stats['counts']['call_hours']=round(stats['counts']['call_minutes']/60,1)
    send=Counter(WHO.get(r['sender'],r['sender']) for r in texts)
    for x in stats['by_sender']:x['count']+=send.get(x['who'],0)
    hours=Counter(r['dt'].hour for r in texts)
    for x in stats['hours']:x['count']+=hours.get(x['hour'],0)
    ph=max(stats['hours'],key=lambda x:x['count']);stats['peak_hour']={'hour':ph['hour'],'count':ph['count']}
    mt=Counter(r['dt'].strftime('%Y-%m') for r in texts);mc=Counter(r['dt'].strftime('%Y-%m') for r in calls);months={x['month']:x for x in stats['months']}
    for mon in sorted(set(mt)|set(mc)):
        months.setdefault(mon,{'month':mon,'count':0,'calls':0});months[mon]['count']+=mt[mon];months[mon]['calls']+=mc[mon]
    stats['months']=[months[k] for k in sorted(months)]
    for x in stats['fun']:
        pat=FUN_PATTERNS.get(x['label'],re.escape(x['label']));x['count']+=sum(len(re.findall(pat,r['text'],re.I)) for r in texts)
    for r in calls:
        mins=call_minutes(r['text'])
        if mins>stats['longest_call'].get('minutes',0):stats['longest_call']={'date':r['dt'].date().isoformat(),'time':r['dt'].time().isoformat(),'sender':r['sender'],'minutes':float(mins)}
    best=[];cur=[]
    for r in texts:
        if cur and (r['dt']-cur[-1]['dt']).total_seconds()>60:cur=[]
        cur.append(r)
        if len(cur)>len(best):best=list(cur)
    if len(best)>stats['rapid_rally'].get('messages',0):stats['rapid_rally']={'messages':len(best),'start':best[0]['dt'].strftime('%Y-%m-%d %-H:%M:%S'),'end':best[-1]['dt'].strftime('%Y-%m-%d %-H:%M:%S'),'minutes':round((best[-1]['dt']-best[0]['dt']).total_seconds()/60,1)}
    day_add=Counter(r['dt'].date().isoformat() for r in texts);day_counts=state.setdefault('day_counts',{})
    for d,n in day_add.items():day_counts[d]=day_counts.get(d,0)+n
    top={x['date']:x['count'] for x in stats.get('top_days',[])}
    for d,n in day_counts.items():top[d]=max(top.get(d,0),n)
    top_rows=sorted(({'date':d,'count':n} for d,n in top.items()),key=lambda x:x['count'],reverse=True)[:8];stats['top_days']=top_rows
    if top_rows:stats['peak_day']=top_rows[0]
    if texts or calls:
        end=max(r['dt'].date().isoformat() for r in new);stats['period']['end']=max(stats['period']['end'],end);stats['period']['days']=(datetime.fromisoformat(stats['period']['end'])-datetime.fromisoformat(stats['period']['start'])).days+1
        known=set(state.setdefault('active_dates',[]));known.update(r['dt'].date().isoformat() for r in new);state['active_dates']=sorted(known);base_active=state.get('base_active_days',stats['period'].get('active_days',stats['period']['days']));old_end=state.get('base_end',stats['period']['end']);extra=len({d for d in known if d>old_end});stats['period']['active_days']=base_active+extra
    stats['counts']['avg_text_per_day']=round(stats['counts']['text_messages']/max(stats['period'].get('active_days',stats['period']['days']),1),1);return stats

def update_dictionary(dic,new):
    texts=[r for r in new if is_text(r)]
    for e in dic['entries']:
        terms=[e['term']]+e.get('aliases',[]);hits=[r for r in texts if any(t and t in r['text'] for t in terms)];e['count']+=len(hits)
        for r in hits:
            if len(e.get('examples',[]))<2:e.setdefault('examples',[]).append({'who':WHO.get(r['sender'],r['sender']),'date':r['dt'].date().isoformat(),'text':r['text']})
    dic['count']=len(dic['entries']);return dic

def update_quiz(q,new):
    texts=[r for r in new if is_text(r)];existing={x['quote'] for x in q['who']};candidates=[r for r in texts if 4<=len(r['text'])<=100 and '\n' not in r['text']];candidates=sorted(candidates,key=lambda r:(-scene_score([r]),r['dt']))[:10]
    for r in candidates:
        if r['text'] in existing:continue
        idx=texts.index(r);ctx=[{'who':WHO.get(x['sender'],x['sender']),'text':x['text']} for x in texts[max(0,idx-1):idx+2]];q['who'].append({'type':'who','quote':r['text'],'answer':WHO.get(r['sender'],r['sender']),'date':r['dt'].date().isoformat(),'context':ctx})
    existing_next={(x['prompt'],x['answer']) for x in q['next']};pool=[r['text'] for r in texts if 1<=len(r['text'])<=80];added=0
    for a,b in zip(texts,texts[1:]):
        if added>=10:break
        if a['sender']==b['sender'] or (b['dt']-a['dt']).total_seconds()>600 or len(a['text'])>80 or len(b['text'])>80:continue
        if (a['text'],b['text']) in existing_next:continue
        wrong=[x for x in pool if x!=b['text']][:2]
        if len(wrong)<2:continue
        opts=wrong+[b['text']];random.Random(a['dt'].timestamp()).shuffle(opts);q['next'].append({'type':'next','prompt':a['text'],'prompt_who':WHO.get(a['sender'],a['sender']),'answer':b['text'],'answer_who':WHO.get(b['sender'],b['sender']),'options':opts,'date':a['dt'].date().isoformat()});added+=1
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
        if records[i]['dt'].date()!=records[start]['dt'].date() or (records[i+1]['dt']-records[i]['dt']).total_seconds()>10*60:break
        if is_text(records[i]):inds.insert(0,i);before+=1
        i-=1
    i=end+1;after=0
    while i<len(records) and after<3:
        if records[i]['dt'].date()!=records[end]['dt'].date() or (records[i]['dt']-records[i-1]['dt']).total_seconds()>10*60:break
        if is_text(records[i]):inds.append(i);after+=1
        i+=1
    return [records[i] for i in inds if is_text(records[i])]

def quiz_key(item):
    if item.get('type')=='next' or 'prompt' in item:
        return 'next|'+str(item.get('date',''))+'|'+str(item.get('prompt',''))+'|'+str(item.get('answer',''))
    return 'who|'+str(item.get('date',''))+'|'+str(item.get('quote',''))

def attach_quiz_scenes(q,new_records,scene_pack,new_who_from,new_next_from):
    scenes=scene_pack.setdefault('scenes',[]);mapping=scene_pack.setdefault('map',{})
    used={str(s.get('id')) for s in scenes};nums=[int(m.group(1)) for x in used if (m:=re.fullmatch(r'q(\d+)',x))];next_num=max(nums,default=0)+1
    cache={tuple((x.get('who'),x.get('text')) for x in s.get('lines',[])):s for s in scenes}
    for item in q['who'][new_who_from:]+q['next'][new_next_from:]:
        loc=locate_quiz_item(new_records,item)
        if not loc:continue
        rows=context_rows(new_records,*loc);key=tuple((WHO.get(r['sender'],r['sender']),r['text']) for r in rows);scene=cache.get(key)
        if not scene:
            sid=f'q{next_num:04d}';next_num+=1
            scene={'id':sid,'date':rows[0]['dt'].date().isoformat(),'start_dt':rows[0]['dt'].isoformat(),'end_dt':rows[-1]['dt'].isoformat(),'lines':[{'who':WHO.get(r['sender'],r['sender']),'text':r['text']} for r in rows],'kind':'quiz-context'}
            scenes.append(scene);cache[key]=scene
        mapping[quiz_key(item)]=scene['id']
    scene_pack['version']=2;scene_pack['count']=len(scenes)

def main():
    ap=argparse.ArgumentParser(description='我らのあそび場：ログ差分更新');ap.add_argument('input',nargs='?',help='_chat.txt。省略すると標準入力（ベタ貼り）');ap.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));ap.add_argument('--password',default=os.getenv('WARERA_PASSPHRASE'));ap.add_argument('--dry-run',action='store_true');args=ap.parse_args()
    root=Path(args.root);data=root/'data';state_path=root/'scripts'/'state.json';password=args.password or getpass.getpass('合言葉: ');raw=Path(args.input).read_text(encoding='utf-8-sig') if args.input else sys.stdin.read();records=parse_records(raw)
    if not records:sys.exit('ログ形式を読み取れませんでした')
    state=json.loads(state_path.read_text(encoding='utf-8'));cutoff=datetime.fromisoformat(state['last_processed']);processed=set(state.get('processed_record_ids',[]))
    def rid(r):return hashlib.sha256(f"{r['dt'].isoformat()}\0{r['sender']}\0{r['text']}".encode()).hexdigest()[:24]
    new=[r for r in records if r['dt']>cutoff and rid(r) not in processed]
    if not new:print('新しいログはありません。変更なし。');return
    print(f'新規 {len(new)} レコード: {new[0]["dt"]} → {new[-1]["dt"]}')
    if args.dry_run:return
    core=load_core(data,password);who_from=len(core['quiz']['who']);next_from=len(core['quiz']['next']);core['stats']=update_stats(core['stats'],new,state);core['dictionary']=update_dictionary(core['dictionary'],new);core['quiz']=update_quiz(core['quiz'],new)
    qp=data/'quiz-scenes.enc';scene_pack=decrypt_obj(load_json(qp),password) if qp.exists() else {'version':1,'count':0,'scenes':[]};attach_quiz_scenes(core['quiz'],new,scene_pack,who_from,next_from);save_json(qp,encrypt_obj(scene_pack,password));save_core(data,core,password)
    manifest=load_json(data/'manifest.json');memories=[]
    for rel in [manifest['base']]+[x['file'] for x in manifest.get('updates',[])]:
        payload=decrypt_obj(load_json(data/rel),password);memories.extend(payload['memories'] if isinstance(payload,dict) else payload)
    next_id=max((x.get('id',0) for x in memories if isinstance(x.get('id',0),int)),default=0)+1;additions=[]
    for day,groups in sorted(scenes_by_day(new,10).items()):
        for lines in groups:additions.append({'id':next_id,'date':day,'lines':lines});next_id+=1
    if additions:
        stamp=max(r['dt'] for r in new).strftime('%Y%m%d');n=1
        while True:
            rel=f'memories-updates/{stamp}-{n:03d}.enc'
            if not (data/rel).exists():break
            n+=1
        (data/rel).parent.mkdir(parents=True,exist_ok=True);save_json(data/rel,encrypt_obj({'version':1,'count':len(additions),'memories':additions},password));manifest.setdefault('updates',[]).append({'file':rel,'count':len(additions)});save_json(data/'manifest.json',manifest)
    state['last_processed']=max(r['dt'] for r in new).isoformat();processed.update(rid(r) for r in new);state['processed_record_ids']=sorted(processed)[-5000:];state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'更新完了: {state["last_processed"]}');print(f'core: 1 file / memories added: {len(additions)}件 / quiz scenes: {scene_pack["count"]}件')

if __name__=='__main__':main()

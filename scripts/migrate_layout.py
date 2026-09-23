#!/usr/bin/env python3
from pathlib import Path
import base64, json, shutil, tarfile

root=Path(__file__).resolve().parents[1]
old_data=root/'assets'/'data'
if not old_data.exists():
    raise RuntimeError('変換元 assets/data が見つかりません')

# --- encrypted data: transport split -> maintainable layout ---
new_data=root/'data'
updates=new_data/'memories-updates'
updates.mkdir(parents=True,exist_ok=True)
parts=sorted(old_data.glob('corex-*.part'))
if len(parts)!=10:
    raise RuntimeError(f'corex が10分割揃っていません: {len(parts)}')
core=''.join(p.read_text(encoding='utf-8') for p in parts)
json.loads(core)
(new_data/'core.enc').write_text(core,encoding='utf-8')

base=old_data/'memories.enc'
extra=old_data/'memories-extra.enc'
if not base.exists() or not extra.exists():
    raise RuntimeError('思い出のbase/update変換元が揃っていません')
json.loads(base.read_text(encoding='utf-8'))
json.loads(extra.read_text(encoding='utf-8'))
shutil.copy2(base,new_data/'memories-base.enc')
update_name='20260924-001.enc'
shutil.copy2(extra,updates/update_name)
manifest={
    'version':2,
    'base':'memories-base.enc',
    'updates':[{'file':f'memories-updates/{update_name}','count':8}],
    'compact_after':20,
}
(new_data/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# --- static site: extract the already validated clean build ---
bundle=root/'_migration'/'static.tgz.b64'
if not bundle.exists():
    raise RuntimeError('clean static bundle が見つかりません')
archive=Path('/tmp/warera-static.tgz')
archive.write_bytes(base64.b64decode(bundle.read_text(encoding='ascii')))
temp=Path('/tmp/warera-static')
shutil.rmtree(temp,ignore_errors=True)
temp.mkdir()
with tarfile.open(archive,'r:gz') as tf:
    for m in tf.getmembers():
        target=(temp/m.name).resolve()
        if temp.resolve() not in target.parents and target!=temp.resolve():
            raise RuntimeError('不正なarchive path')
    tf.extractall(temp)

shutil.rmtree(root/'assets')
for src in temp.iterdir():
    dst=root/src.name
    if src.is_dir():
        shutil.copytree(src,dst,dirs_exist_ok=True)
    else:
        shutil.copy2(src,dst)

# --- updater: keep the existing aggregation logic, change only storage/update flow ---
up_path=root/'scripts'/'update_log.py'
up=up_path.read_text(encoding='utf-8')
up=up.replace(r'(\d{2}:\d{2}:\d{2})',r'(\d{1,2}:\d{2}:\d{2})',1)
a=up.index('def load_core(')
b=up.index('def is_call(',a)
core_funcs="""def load_core(data_dir,password):
    return decrypt_obj(load_json(data_dir/'core.enc'),password)

def save_core(data_dir,core,password):
    save_json(data_dir/'core.enc',encrypt_obj(core,password))

"""
up=up[:a]+core_funcs+up[b:]
main_start=up.index('def main():')
new_main=r'''def main():
    ap=argparse.ArgumentParser(description='我らのあそび場：ログ差分更新')
    ap.add_argument('input',nargs='?',help='_chat.txt。省略すると標準入力（ベタ貼り）')
    ap.add_argument('--root',default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument('--password',default=os.getenv('WARERA_PASSPHRASE'))
    ap.add_argument('--dry-run',action='store_true')
    args=ap.parse_args()
    root=Path(args.root)
    data=root/'data'
    state_path=root/'scripts'/'state.json'
    password=args.password or getpass.getpass('合言葉: ')
    raw=Path(args.input).read_text(encoding='utf-8-sig') if args.input else sys.stdin.read()
    records=parse_records(raw)
    if not records:
        sys.exit('ログ形式を読み取れませんでした')
    state=json.loads(state_path.read_text(encoding='utf-8'))
    cutoff=datetime.fromisoformat(state['last_processed'])
    processed=set(state.get('processed_record_ids',[]))
    def rid(r):
        src=f"{r['dt'].isoformat()}\0{r['sender']}\0{r['text']}"
        return hashlib.sha256(src.encode()).hexdigest()[:24]
    new=[r for r in records if r['dt']>cutoff and rid(r) not in processed]
    if not new:
        print('新しいログはありません。変更なし。')
        return
    print(f'新規 {len(new)} レコード: {new[0]["dt"]} → {new[-1]["dt"]}')
    if args.dry_run:
        return

    core=load_core(data,password)
    core['stats']=update_stats(core['stats'],new,state)
    core['dictionary']=update_dictionary(core['dictionary'],new)
    core['quiz']=update_quiz(core['quiz'],new)
    save_core(data,core,password)

    manifest=load_json(data/'manifest.json')
    memories=[]
    for rel in [manifest['base']]+[x['file'] for x in manifest.get('updates',[])]:
        payload=decrypt_obj(load_json(data/rel),password)
        memories.extend(payload['memories'] if isinstance(payload,dict) else payload)
    next_id=max((x.get('id',0) for x in memories if isinstance(x.get('id',0),int)),default=0)+1
    additions=[]
    for day,groups in sorted(scenes_by_day(new,10).items()):
        for lines in groups:
            additions.append({'id':next_id,'date':day,'lines':lines})
            next_id+=1
    if additions:
        stamp=max(r['dt'] for r in new).strftime('%Y%m%d')
        n=1
        while True:
            rel=f'memories-updates/{stamp}-{n:03d}.enc'
            if not (data/rel).exists():
                break
            n+=1
        (data/rel).parent.mkdir(parents=True,exist_ok=True)
        save_json(data/rel,encrypt_obj({'version':1,'count':len(additions),'memories':additions},password))
        manifest.setdefault('updates',[]).append({'file':rel,'count':len(additions)})
        save_json(data/'manifest.json',manifest)

    state['last_processed']=max(r['dt'] for r in new).isoformat()
    processed.update(rid(r) for r in new)
    state['processed_record_ids']=sorted(processed)[-5000:]
    state_path.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'更新完了: {state["last_processed"]}')
    print(f'core: 1 file / memories added: {len(additions)}件')

if __name__=='__main__':
    main()
'''
up_path.write_text(up[:main_start]+new_main,encoding='utf-8')

compact=r'''#!/usr/bin/env python3
import argparse, getpass, os
from pathlib import Path
from update_log import decrypt_obj, encrypt_obj, load_json, save_json

def main():
    ap=argparse.ArgumentParser(description='思い出の差分をbaseへ統合')
    ap.add_argument('--root',default=str(Path(__file__).resolve().parents[1]))
    ap.add_argument('--password',default=os.getenv('WARERA_PASSPHRASE'))
    args=ap.parse_args()
    root=Path(args.root)
    data=root/'data'
    password=args.password or getpass.getpass('合言葉: ')
    manifest=load_json(data/'manifest.json')
    updates=manifest.get('updates',[])
    if not updates:
        print('まとめる差分はありません。')
        return
    payload=decrypt_obj(load_json(data/manifest['base']),password)
    base=payload['memories'] if isinstance(payload,dict) else payload
    by_id={x.get('id'):x for x in base}
    added=0
    for item in updates:
        payload=decrypt_obj(load_json(data/item['file']),password)
        rows=payload['memories'] if isinstance(payload,dict) else payload
        for row in rows:
            key=row.get('id')
            if key not in by_id:
                by_id[key]=row
                added+=1
    merged=sorted(by_id.values(),key=lambda x:(x.get('date',''),str(x.get('id',''))))
    save_json(data/manifest['base'],encrypt_obj({'version':1,'count':len(merged),'memories':merged},password))
    for item in updates:
        p=data/item['file']
        if p.exists():
            p.unlink()
    manifest['updates']=[]
    save_json(data/'manifest.json',manifest)
    print(f'統合完了: +{added}件 / 合計{len(merged)}件')

if __name__=='__main__':
    main()
'''
(root/'scripts'/'compact_memories.py').write_text(compact,encoding='utf-8')
(root/'scripts'/'README.md').write_text(
    '# ログ更新\n\n'
    '`python scripts/update_log.py _chat.txt` で全ログ、標準入力でベタ貼り差分を更新できます。\n\n'
    '思い出の差分をまとめるときは `python scripts/compact_memories.py`。\n\n'
    'データは `data/core.enc`、`data/memories-base.enc`、`data/memories-updates/`、`data/manifest.json` に集約しています。\n',
    encoding='utf-8')

# --- validation before any commit ---
required=[
    root/'index.html',root/'assets/auth.js',root/'data/auth.enc',root/'data/core.enc',
    root/'data/memories-base.enc',root/'data/memories-updates'/update_name,
    root/'data/manifest.json',root/'on-this-day/index.html',root/'scripts/update_log.py',
    root/'scripts/compact_memories.py',
]
for p in required:
    if not p.is_file() or p.stat().st_size==0:
        raise RuntimeError(f'生成ファイル不備: {p}')
json.loads((root/'data/core.enc').read_text(encoding='utf-8'))
json.loads((root/'data/manifest.json').read_text(encoding='utf-8'))
compile((root/'scripts/update_log.py').read_text(encoding='utf-8'),'update_log.py','exec')
compile((root/'scripts/compact_memories.py').read_text(encoding='utf-8'),'compact_memories.py','exec')
if (root/'assets/site').exists() or (root/'assets/data').exists():
    raise RuntimeError('旧split assetsが残っています')
if 'corex-' in (root/'index.html').read_text(encoding='utf-8') or 'sitez-' in (root/'index.html').read_text(encoding='utf-8'):
    raise RuntimeError('index.htmlに旧split参照が残っています')

# Clean migration-only files so the committed tree is the final layout.
shutil.rmtree(root/'_migration')
workflow=root/'.github/workflows/restructure-playground.yml'
if workflow.exists():
    workflow.unlink()
Path(__file__).unlink()
print('migration validation ok')

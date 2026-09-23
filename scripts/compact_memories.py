#!/usr/bin/env python3
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

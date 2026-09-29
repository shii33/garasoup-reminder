# 我らのあそび場 構成

ビルド工程のない静的サイトです。各ページは HTML、サイト全体の共通処理は `assets/`、ページ固有の見た目と動作は各ディレクトリの `app.css` / `app.js` に分けます。

## 共通レイヤー

- `assets/auth.js`: あいことばの保持、AES-GCM 復号、未解除時のリダイレクト
- `assets/common.js`: 日付表示、HTML エスケープ、視点切り替え、会話画像共有
- `assets/data.js`: 暗号化パックの読み込みと、思い出・検定データの展開
- `assets/site.css`: 全ページ共通のレイアウトとコンポーネント

`grow/` は状態管理の規模が大きいため、ES Modules の `grow/app/` 内で独立しています。

## データ更新

`scripts/update_log.py` は追加ログを差分反映し、次を同時に更新します。

- `data/core.enc`: 統計・辞書・検定
- `data/memories-updates/`: 追加思い出
- `data/quiz-scenes.enc`: 検定の前後文脈
- `data/manifest.json`: 思い出パック一覧
- `scripts/state.json`: 差分更新位置

全量ログから再生成する場合は `--rebuild-all` を使います。

## 検証

```sh
python3 scripts/check_site.py
```

HTML のローカル参照・ID 重複・直書き CSS/JS、データマニフェスト、すべての JavaScript 構文を確認します。

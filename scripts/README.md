# ログ更新

通常は `python scripts/update_log.py _chat.txt`、または標準入力でベタ貼りした差分を更新します。

通常更新で同時に更新されるもの：
- われわれ統計（発言数・通話・時間帯・曜日・無駄カウント・返信速度など）
- われわれ国語辞典（既存採録語の回数・初出・用例）
- われわれ検定（発言者あて／続きあて＋前後シーン）
- たまには思い出そうず／あの日のわれわれ用の思い出シーン
- どうでもいい記念日

過去ログ全体から作り直すときは `python scripts/update_log.py _chat.txt --rebuild-all`。
全量再構築では、思い出を1日最大30場面まで多様化して作り直し、検定は各タイプ最大1,000問まで生成します。

思い出の差分をまとめるだけなら `python scripts/compact_memories.py`。

データは `data/core.enc`、`data/memories-base.enc`、`data/memories-updates/`、`data/quiz-scenes.enc`、`data/manifest.json` に集約しています。

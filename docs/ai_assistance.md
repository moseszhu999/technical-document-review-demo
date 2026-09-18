# AI Assistance Boundary

この公開デモでは AI を最終判定者として扱いません。

AI / OCR / LLM が有効な場所は、たとえば次です。

- PDF / Word / 表 / 画像から項目候補を抽出する
- 自然言語の部品名を既存の Asset 候補へ紐付ける
- Finding に対応する Evidence 位置を候補として提示する
- 確定済み Finding を人が読みやすい説明や報告草稿へ整える
- 公開デモ内の文書・ナレッジ・ルール・Evidence に限定した質問応答を行う

一方、次は分離します。

- 決定論的に確認できる Rule
- Finding の状態管理
- Evidence の保存
- Human Review による最終確認

`data/ai/assist_candidates.json` はこの境界を説明する fixture であり、実モデルの抽出結果ではありません。

## Grounded AI Review Chat

チャット画面では、サーバー側から火山方舟 Ark の Chat Completions API を呼び出せます。ブラウザへ API Key は渡しません。

モデルへ渡す根拠は二層です。ナレッジ（`data/knowledge/manufacturing_knowledge.json`）の `sources` に記載した公開規格（ISO/JIS）と NORD 公式資料は実在の公開情報で、リンクのみを提示し原文は転載しません。一方、次のデータはすべて公開デモ用の架空レコードであり、しきい値を規格の規定値として語ることは禁止しています。

- `data/input/*.json`
- `data/knowledge/manufacturing_knowledge.json`
- `data/rules/public_demo_rules.json`
- `data/ai/assist_candidates.json`

回答は SSE（Server-Sent Events）でストリーミング配信します。`POST /api/demo/chat/stream` が `phase`（思考中）→ `delta`（本文を逐次）→ `sources`（根拠ID）→ `done` を順に返し、推論型モデルの長い待ち時間でも途中から表示されます。JSON 形式の `POST /api/demo/chat` も後方互換として残しています。

外部 AI 接続に失敗した場合は、画面に `AI接続失敗・固定デモ回答に切替` と表示し、同じ公開データだけを使う固定フォールバック回答へ切り替えます。フォールバックを実 AI の回答として見せないことを優先します。

## Ark 接続設定

Render 等のサーバー環境では次を設定します。

```text
ARK_API_KEY=<Ark API Key>
ARK_MODEL=ark-code-latest
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/plan/v3
ARK_TIMEOUT=60
```

`ARK_API_KEY` は値だけを設定します。`Bearer `、引用符、余分な空白を付けないのが推奨です。実装側でも一般的な貼り付けミスは正規化します。

この公開デモは Agent Plan（サブスクリプション）のキーと `/api/plan/v3` エンドポイント、モデル `ark-code-latest` で動作確認しています。従量課金の個別モデル ID を使う場合は `/api/v3` とそのモデル ID を指定します。キーの種別とエンドポイントが一致していないと 401/404 になります。

HTTP 401 が返る場合は、Laravel やブラウザ側ではなく Ark の認証段階で拒否されています。Ark 側で API Key が有効か、対象アカウントでモデル利用が有効かを確認し、必要なら API Key を再発行してください。HTTP 403 の場合はモデル利用権限を確認します。

MCP、Agent、外部 API はツール連携境界の選択肢ですが、具体的な Tool 分割、Prompt、ノード構成は公開していません。

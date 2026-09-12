# AI Assistance Boundary

この公開デモでは AI を最終判定者として扱いません。

AI / OCR / LLM が有効な場所は、たとえば次です。

- PDF / Word / 表 / 画像から項目候補を抽出する
- 自然言語の部品名を既存の Asset 候補へ紐付ける
- Finding に対応する Evidence 位置を候補として提示する
- 確定済み Finding を人が読みやすい説明や報告草稿へ整える

一方、次は分離します。

- 決定論的に確認できる Rule
- Finding の状態管理
- Evidence の保存
- Human Review による最終確認

`data/ai/assist_candidates.json` はこの境界を説明する fixture であり、実モデルの出力ではありません。

MCP、Agent、外部 API はツール連携境界の選択肢ですが、具体的な Tool 分割、Prompt、ノード構成は公開していません。

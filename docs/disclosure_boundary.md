# Disclosure Boundary

このリポジトリは、技術面接や設計議論のための公開サンプルです。

## 公開するもの

- 文書 → 正規化 → Rule / Compare → Finding → Evidence → Human Review という責務分離
- 製造業を題材にした完全架空の文書
- 3件だけの簡略化した公開デモルール
- Evidence locator の考え方
- AI 支援を candidate として扱う境界
- Laravel のサービス分割と自動テスト
- 文書 / 部品 / Rule / Evidence を結ぶ簡易 3D UI

## 公開しないもの

- 実案件の顧客・組織・業界固有情報
- 実文書、実座標、実規格、実閾値
- 実案件固有の Rule Schema / Rule DSL
- ルールの例外体系・承認フロー・バージョン運用の詳細
- Prompt / Model routing / Agent node graph
- MCP Tool の具体的な分割、引数、接続構成
- 本番データモデル / API / 権限構造
- 実案件の精度値や評価セット

公開側では「何を分離すべきか」を示し、「実案件でどう最適化したか」は持ち込みません。

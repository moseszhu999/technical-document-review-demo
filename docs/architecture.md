# Architecture

## 目的

公開サンプルでは、技術文書を検索することよりも、**複数文書の内容を同じ業務対象に結び付け、差異と根拠を人が確認できる形にすること**へ焦点を置いています。

```text
Input Documents
      ↓
Normalization
      ↓
Case / Asset grouping
      ↓
Cross-document comparison
      ↓
Finding + Evidence
      ↓
Human Review
```

## 境界を分ける理由

文書の読み取り方法は、入力形式や実行環境によって変わります。一方、Finding や Evidence の扱いまで読み取り技術に依存させると、検証や交換が難しくなります。

そのため `DocumentNormalizer` を境界に置き、レビュー側は共通形式だけを扱います。

本番システムでは OCR、LLM、検索、ルールサービス、既存システムなどがこの境界の外側に存在し得ますが、この公開リポジトリでは具体的な接続構成を扱いません。

## Finding

文書間で異なる値を見つけた場合でも、その場で業務上の「誤り」とは確定しません。

例えば、正常な更新、測定時点の違い、入力ミス、仕様変更など複数の理由が考えられます。

そのため状態は `needs_review` とし、Evidence と一緒に人へ渡します。

## Evidence

公開サンプルでは次の情報だけを保持します。

- document_id
- document_type
- document_version
- source_document
- field
- value

実運用ではページや表など、元資料へ戻るための追加ロケータを持たせることがありますが、その具体設計はこの公開サンプルの対象外です。

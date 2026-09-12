# Technical Document Review Demo

PHP / Laravel を使った、技術文書レビューの小さな公開サンプルです。

このリポジトリは、複数の技術文書をまたいで同一対象の情報を整理し、差異を **Finding** として抽出し、その判断根拠を **Evidence** として追跡する流れを示します。

**Document → Normalize → Compare → Finding → Evidence → Human Review**

> 実案件のソースコードではありません。顧客名、案件名、原文書、実際の業務ルール、閾値、座標、評価データは含めていません。データとルールは公開用にすべて架空化しています。

## このサンプルで確認できること

- PHP 8.2+ / Laravel 12 のサービス設計
- 複数文書を同一ケースとして扱う方法
- 同一対象の項目を文書横断で比較する方法
- 差異を即座に「誤り」と断定せず、`needs_review` として扱う考え方
- Finding から元文書・元フィールドへ戻れる Evidence
- 自動判定と Human Review の責務分離
- Feature / Unit Test と GitHub Actions

## 公開範囲

このリポジトリでは、実務上の考え方だけを小さく再現しています。

公開していないもの:

- 実案件固有のルール定義や Rule Schema
- Prompt、Agent の具体的なノード構成
- MCP / 外部ツールの具体的な分割や接続方式
- 実データ構造、実 API、実システム構成
- 実案件の精度値・評価セット

外部検索、ルールサービス、AI/OCR などは、必要に応じて交換できる **ツール連携境界** として考えますが、この公開サンプルでは内部実装を持ち込みません。

## デモの流れ

架空の技術文書を4種類用意します。

1. Project Summary
2. Technical Measurement Report
3. Inspection Record
4. Acceptance Conclusion

同じ設備が複数文書に登場し、一部の値だけが異なるようにしています。

Laravel 側では以下を行います。

```text
文書読み込み
  ↓
共通形式へ正規化
  ↓
同一 case / asset を整理
  ↓
対象フィールドを比較
  ↓
差異を Finding 化
  ↓
Evidence を付与
  ↓
Human Review 対象として返す
```

## API

```text
GET /api/demo/review
```

主なレスポンス:

- `case_id`
- `documents`
- `entities`
- `findings`
- `evidence_chain`
- `summary`

## 実行方法

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

テスト:

```bash
composer test
```

## 設計上の考え方

詳細は以下を参照してください。

- [Architecture](docs/architecture.md)
- [Accuracy Strategy](docs/accuracy_strategy.md)
- [Disclosure Boundary](docs/disclosure_boundary.md)

このサンプルの目的は、コード量や AI 機能の多さを見せることではなく、**専門文書を扱うときに、どこまで自動化し、どこから人が確認すべきかをコードで説明できるようにすること**です。

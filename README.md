# Technical Document Review Demo

PHP / Laravel を使った、製造業向け技術文書レビューの小さな公開サンプルです。

題材は架空の**小型ギヤボックス**です。設計図、検査記録、作業指示、受入記録を同一ケースとして整理し、公開用に簡略化したルールで確認し、Finding と Evidence を Human Review へ渡します。

**Document → AI-assisted extraction candidate → Normalize → Rule / Compare → Finding → Evidence → Human Review**

> 実案件のソースコードではありません。顧客名、案件名、原文書、実際の業務ルール、閾値、座標、評価データは含めていません。文書・部品・数値・ルールはすべて公開デモ用の架空データです。

## Demo UI

Laravel を起動して次を開きます。

```text
http://localhost:8000/demo
```

画面では、ギヤボックスを簡易 3D 表示し、ハウジング、ギヤセット、ベアリングをクリックできます。選択した部品に関連するルール、Evidence、AI 支援候補を右側で確認できます。

3D は CAD 精度を目的としたモデルではなく、**文書・部品・ルール・Evidence の紐付けを説明するためのインタラクティブな可視化**です。

## 架空の文書

`sample_documents/` に、人が読める形の4文書を置いています。

1. `assembly_drawing_extract.md` — 組立図抜粋
2. `inspection_report_extract.md` — 検査記録抜粋
3. `work_instruction_extract.md` — 作業指示抜粋
4. `acceptance_report_extract.md` — 受入記録抜粋

処理用の JSON は `data/input/` にあります。

## 公開用ルール

実案件の Rule Schema は公開していません。その代わり、考え方を説明するための**完全に架空の3ルール**だけを実装しています。

| Rule | Input | 判定 | Output |
|---|---|---|---|
| DEMO-R01 | 組立図 Rev / 検査記録 Rev | 参照 Rev が一致する | pass / `drawing_revision_mismatch` |
| DEMO-R02 | 設計減速比 / 実測減速比 | デモ用許容差内か | pass / `ratio_out_of_tolerance` |
| DEMO-R03 | すきま下限・上限 / 実測値 | デモ用範囲内か | pass / `clearance_out_of_range` |

詳細は [公開ルール表](docs/rule_catalog.md) を参照してください。数値はすべて説明用であり、実在製品・規格の値ではありません。

## AI の使い方

AI を「最終判定者」にはしていません。このデモでは AI の役割を次の境界に限定して表現しています。

- 非構造文書からの項目抽出候補
- 同一部品への紐付け候補
- Evidence 位置の候補
- Finding の説明文・報告草稿の支援

公開リポジトリでは外部 AI を実行せず、`data/ai/assist_candidates.json` に**候補データの契約だけ**を置いています。Prompt、モデル選定、Agent ノード、MCP の具体的な Tool 分割は含めません。

重要なのは、AI 候補の後ろに決定論的なルールと Evidence、Human Review があることです。

## API

```text
GET /api/demo/review
```

主なレスポンス:

- `documents` — 正規化済み文書
- `entities` — 部品 / アセンブリ
- `rule_results` — 公開デモルールの評価結果
- `document_findings` — 文書間の一般的な不一致
- `evidence_chain` — 文書工程の Evidence Chain
- `ai_assist` — AI 支援候補の公開デモ fixture
- `summary` — レビュー状況

## Laravel 構成

```text
app/Services/
├── DocumentReviewService.php
├── CrossDocumentComparator.php
├── EvidenceChainBuilder.php
├── RuleCatalog.php
├── RuleEvaluator.php
├── AiCandidateReader.php
└── JsonDocumentNormalizer.php
```

ルールを Prompt に埋め込まず、`RuleCatalog` と `RuleEvaluator` に分けています。ただし、ここで公開している Rule Catalog は説明用の簡易形式であり、実案件の Rule Schema を再現したものではありません。

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

## 公開範囲

公開していないもの:

- 実案件固有の Rule Schema / Rule DSL
- Prompt、Agent の具体的なノード構成
- MCP / 外部ツールの具体的な分割・接続方式
- 実データ構造、実 API、実システム構成
- 実案件の精度値・評価セット
- 実際の専門規格、閾値、例外条件

詳細は [Disclosure Boundary](docs/disclosure_boundary.md) を参照してください。

このサンプルの目的は AI 機能の数を見せることではなく、**文書・部品・ルール・Evidence・人の責任境界を、実装と UI の両方で説明すること**です。

# Technical Document Review Demo

PHP / Laravel を使った、製造業向け技術文書レビューの小さな公開サンプルです。

題材は架空の小型ギヤボックスです。設計図、検査記録、作業指示、受入記録を同一ケースとして整理し、公開用に簡略化したルールで確認し、Finding と Evidence を Human Review へ渡します。

**Document → AI-assisted extraction candidate → Normalize → Rule / Compare → Finding → Evidence → Human Review**

> 実案件のソースコードではありません。顧客名、案件名、原文書、実際の業務ルール、閾値、座標、評価データは含めていません。文書・部品・数値・ルールはすべて公開デモ用の架空データです。

## Demo Architecture

本デモでは、製造現場に存在する技術情報を、レビュー可能な形で統合します。

```text
技術文書
  ↓
Knowledge
  ↓
Rule Engine
  ↓
Evidence
  ↓
AI Review
  ↓
Human Confirmation
```

AIは判断を支援しますが、最終的な確認・承認は人が実施する設計です。

## Digital Twin Concept

本デモにおける3D Digital Twinは、単なる設備表示ではありません。

設備・工程・文書・ルール・証跡情報を関連付けるレビューインターフェースです。

3D空間を入口として、対象設備に関連する技術情報、検査ルール、Evidence、AI支援結果を確認できます。

## Demo UI

Laravel を起動して次を開きます。

```text
http://localhost:8000/demo
```

画面では、ギヤボックスを簡易 3D 表示し、部品・設備に関連するルール、Evidence、AI 支援候補を確認できます。

3D は CAD 精度を目的としたモデルではなく、文書・部品・ルール・Evidence の紐付けを説明するためのインタラクティブな可視化です。

## AI の使い方

AI を最終判定者にはしていません。このデモでは AI の役割を次の境界に限定しています。

- 非構造文書からの項目抽出候補
- 同一部品への紐付け候補
- Evidence 位置の候補
- Finding の説明文・報告草稿の支援

重要なのは、AI候補やAIの説明の後ろに決定論的なルール、Evidence、Human Reviewがあることです。

## API

```text
GET /api/demo/review
GET /api/demo/knowledge
GET /api/demo/rules
POST /api/demo/chat
```

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

- 実案件固有の Rule Schema
- 実データ構造
- 実 API
- 実際の専門規格、閾値、例外条件

このサンプルの目的は AI 機能の数を見せることではなく、文書・設備・工程・ルール・Evidence・人の責任境界を、実装と UI の両方で説明することです。

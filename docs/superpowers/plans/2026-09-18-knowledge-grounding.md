# 知识库接地真实公开出处 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 4 条知识库条目从"架空ナレッジ"改造为基于已核实公开标准（ISO/JIS）与 NORD 官方手册的带出处知识，同时明确演示数值仍是架空记录。

**Architecture:** 数据层 schema v2（每条 `sources[]`；标准内联，NORD 引用既有 `public_sources` registry）；AI prompt 分两层（公开标准可依据 / demo 记录虚构）；前端在既有 token 体系下渲染出典区块；数据正确性由 PHP 校验测试强制（URL host 白名单、页码必须命中 registry）。

**Tech Stack:** Laravel 12 / PHP 8.2、原生 ES module 前端、PHPUnit、headless Chrome（Puppeteer，仅验收用）。

## Global Constraints

- 不新增/删除 KB 条目（保持 KB-001~004），不改演示文档、规则数值、规则引擎。
- 不转载标准原文或 NORD PDF；NORD 元数据只能来自 `data/public_sources/nord_maxxdrive_sources.json`，不得在 knowledge JSON 重复 title/url。
- 允许的标准 URL host 白名单：`www.iso.org`、`iso.org`、`webdesk.jsa.or.jp`、`www.jbia.or.jp`。
- NORD 页码为**印刷页码**（registry 既有约定，见 spec §8）；任何写入的页码必须已存在于 registry 的 `key_previews`。
- 前端只允许使用 `--panel/--panel-soft/--line/--text/--muted/--cyan/--red` 等 token 与既有共享类，禁止硬编码 hex/rgba。
- 日文 UI 文案保持日语；每个任务结束跑相关测试并提交。
- 本计划基于 spec：`docs/superpowers/specs/2026-09-18-knowledge-grounding-design.md`。

---

### Task 1: 数据层 — knowledge v2 与 registry 增补（TDD）

**Files:**
- Test: `tests/Feature/KnowledgeGroundingTest.php`（新建）
- Modify: `data/knowledge/manufacturing_knowledge.json`（整体替换）
- Modify: `data/public_sources/nord_maxxdrive_sources.json`（G1050 key_previews 增补 3 条）

**Interfaces:**
- Produces: `public_demo_knowledge_v2`；每个 item 有 `sources: array<int, Source>`；`Source` 为二选一：
  - `{type:"standard", publisher:string, code:string, title:string, url:string, locator?:string}`
  - `{type:"official_manual", registry_ref:string, page?:string, note?:string}`

- [ ] **Step 1: 先写失败测试**

创建 `tests/Feature/KnowledgeGroundingTest.php`：

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;

class KnowledgeGroundingTest extends TestCase
{
    private const ALLOWED_HOSTS = [
        'www.iso.org',
        'iso.org',
        'webdesk.jsa.or.jp',
        'www.jbia.or.jp',
    ];

    /** @return array<string, mixed> */
    private function knowledge(): array
    {
        return json_decode(
            file_get_contents(base_path('data/knowledge/manufacturing_knowledge.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    /** @return array<string, mixed> */
    private function registry(): array
    {
        return json_decode(
            file_get_contents(base_path('data/public_sources/nord_maxxdrive_sources.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    public function test_schema_is_v2_and_keeps_four_entries(): void
    {
        $knowledge = $this->knowledge();

        $this->assertSame('public_demo_knowledge_v2', $knowledge['schema']);
        $ids = array_column($knowledge['items'], 'knowledge_id');
        $this->assertSame(['KB-001', 'KB-002', 'KB-003', 'KB-004'], $ids);
    }

    public function test_each_entry_has_real_sources_with_allowed_hosts(): void
    {
        foreach ($this->knowledge()['items'] as $item) {
            $this->assertNotEmpty($item['sources'] ?? [], $item['knowledge_id'].' has no sources');

            foreach ($item['sources'] as $source) {
                if (($source['type'] ?? null) === 'standard') {
                    $this->assertArrayHasKey('code', $source);
                    $this->assertArrayHasKey('title', $source);
                    $url = (string) $source['url'];
                    $this->assertStringStartsWith('https://', $url, $item['knowledge_id']);
                    $this->assertContains(parse_url($url, PHP_URL_HOST), self::ALLOWED_HOSTS);
                }
            }
        }
    }

    public function test_official_manual_refs_resolve_and_pages_are_registered(): void
    {
        $registry = $this->registry();
        $byId = collect($registry['sources'])->keyBy('source_id');

        foreach ($this->knowledge()['items'] as $item) {
            foreach ($item['sources'] ?? [] as $source) {
                if (($source['type'] ?? null) !== 'official_manual') {
                    continue;
                }

                $registered = $byId->get($source['registry_ref']);
                $this->assertNotNull($registered, $source['registry_ref'].' missing from registry');

                if (! empty($source['page'])) {
                    preg_match_all('/\d+/', (string) $source['page'], $matches);
                    $registeredPages = array_column($registered['key_previews'] ?? [], 'page');
                    foreach ($matches[0] as $pageNumber) {
                        $this->assertContains((int) $pageNumber, $registeredPages);
                    }
                }
            }
        }
    }

    public function test_demo_thresholds_are_marked_fictional_in_guidance(): void
    {
        $items = collect($this->knowledge()['items'])->keyBy('knowledge_id');

        $this->assertStringContainsString('架空', $items['KB-002']['guidance']);
        $this->assertStringContainsString('架空', $items['KB-003']['guidance']);
        $this->assertStringContainsString('ISO 1122-1', $items['KB-002']['guidance']);
        $this->assertStringContainsString('ISO 5753-1', $items['KB-003']['guidance']);
    }

    public function test_g1050_registers_ratio_nomenclature_and_exact_ratio_pages(): void
    {
        $g1050 = collect($this->registry()['sources'])->firstWhere('source_id', 'NORD-G1050');
        $pages = array_column($g1050['key_previews'], 'page');

        foreach ([36, 88, 89] as $page) {
            $this->assertContains($page, $pages);
        }
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `php artisan test tests/Feature/KnowledgeGroundingTest.php`
Expected: FAIL（schema 仍是 v1、sources 不存在）。

- [ ] **Step 3: 增补 G1050 key_previews**

在 `data/public_sources/nord_maxxdrive_sources.json` 的 `NORD-G1050` 条目 `key_previews` 数组中（现有 132/163 之后）追加：

```json
  {
    "page": 36,
    "title": "Nomenclature – nominal ratio ranges by gear-unit type",
    "description": "Official G1050 nomenclature table listing nominal ratio iN ranges for 2-/3-stage parallel and helical-bevel gear units."
  },
  {
    "page": 88,
    "title": "Structure of the power/torque ratings tables (nominal ratio)",
    "description": "How to read the parallel ratings tables: nominal ratio, nominal input/output speed and torque columns."
  },
  {
    "page": 89,
    "title": "Structure of the exact ratio tables – nominal ratio iN vs exact ratio i_ges",
    "description": "Official G1050 explanation distinguishing the catalog nominal ratio iN from the exact gear ratio i_ges per configuration."
  }
```

- [ ] **Step 4: 整体替换 knowledge JSON**

用以下内容整体替换 `data/knowledge/manufacturing_knowledge.json`：

```json
{
  "schema": "public_demo_knowledge_v2",
  "note": "ガイドの方法論は公開規格（ISO/JIS）とメーカー公式資料（NORD）に基づきます。出典は各 item の sources を参照してください。関連する DEMO ルールの入力値・しきい値・判定結果は、すべて公開デモ用の架空レコードです。",
  "items": [
    {
      "knowledge_id": "KB-001",
      "title": "図面改訂管理ガイド",
      "category": "文書管理",
      "summary": "設計図の改訂番号と、検査・受入文書が参照する改訂番号を、文書管理のルールに沿って確認する。",
      "guidance": "改訂番号の管理は ISO 9001:2015 7.5.3.2 c)（JIS Q 9001:2015 7.5.3）が求める文書化した情報の変更管理にあたる。差異を見つけても自動的に不適合とせず、変更記録・配布履歴を確認し、理由を記録してから人手判断へ引き渡す。",
      "linked_rules": ["DEMO-R01"],
      "keywords": ["図面", "改訂", "検査"],
      "sources": [
        {
          "type": "standard",
          "publisher": "ISO",
          "code": "ISO 9001:2015",
          "title": "品質マネジメントシステム－要求事項（Quality management systems – Requirements）",
          "locator": "7.5.3.2 c) 変更管理（版の管理）、8.5.6 変更の管理",
          "url": "https://www.iso.org/standard/62085.html"
        },
        {
          "type": "standard",
          "publisher": "JSA（日本規格協会）",
          "code": "JIS Q 9001:2015",
          "title": "品質マネジメントシステム－要求事項（ISO 9001:2015 の日本語規格・公式プレビュー）",
          "locator": "7.5.3 文書化した情報の管理",
          "url": "https://webdesk.jsa.or.jp/preview/pre_jis_q_09001_000_000_2015_j_ed10_ch.pdf"
        }
      ]
    },
    {
      "knowledge_id": "KB-002",
      "title": "減速比確認ガイド",
      "category": "検査",
      "summary": "組立図の設計減速比と検査記録の実測値を、用語定義と単位をそろえて比較する。",
      "guidance": "減速比は ISO 1122-1:1998 1.1.3.1 で「被動歯車(wheel)の歯数を小歯車(pinion)の歯数で割った値」と定義される。設計値と実測値は同じ対象・単位で比較する。歯車の精度等級は ISO 1328-1:2013 のフランク公差等級（1～11級）で規定されるが、相対誤差 1.5% という DEMO-R02 のしきい値は公開規格の規定値ではない架空のデモ用許容差である。NORD G1050（p.88–89）は公称減速比 iN と実減速比 i_ges を別欄で示す実例である。許容差を超えた場合は人にエスカレーションする。",
      "linked_rules": ["DEMO-R02"],
      "keywords": ["減速比", "実測", "検査"],
      "sources": [
        {
          "type": "standard",
          "publisher": "ISO",
          "code": "ISO 1122-1:1998",
          "title": "Vocabulary of gear terms – Part 1: Definitions related to geometry（歯車用語－幾何関連の定義）",
          "locator": "1.1.3.1 歯車比（gear ratio）＝被動歯車の歯数÷小歯車の歯数",
          "url": "https://www.iso.org/obp/ui/en/#!iso:std:5649:en"
        },
        {
          "type": "standard",
          "publisher": "ISO",
          "code": "ISO 1328-1:2013",
          "title": "Cylindrical gears – ISO system of flank tolerance classification – Part 1（円筒歯車のフランク公差等級方式）",
          "locator": "フランク公差等級 1～11（数値が小さいほど高精度）",
          "url": "https://www.iso.org/obp/ui/#iso:std:iso:1328:-1:ed-2:v1:en"
        },
        {
          "type": "official_manual",
          "registry_ref": "NORD-G1050",
          "page": "88–89",
          "note": "定格表の見方／公称減速比 iN と実減速比 i_ges の区別（英語版）"
        }
      ]
    },
    {
      "knowledge_id": "KB-003",
      "title": "ベアリングすきま確認ガイド",
      "category": "検査",
      "summary": "指定された下限・上限と実測すきまを、測定条件をそろえて比較する。",
      "guidance": "軸受の内部すきまは ISO 5753-1:2009 で C2/C0/C3 等のグループとして規定されるが、これは未組立・無負荷状態の値で、組立後の実測すきまとは条件が異なる。軸受自体の公差等級は ISO 492:2023 による。DEMO-R03 の 0.10–0.20 mm という判定帯は公開規格の値ではない架空のデモ用基準である。範囲外の場合は測定条件とエビデンスを添え、最終的な適否は専門担当者が確認する。",
      "linked_rules": ["DEMO-R03"],
      "keywords": ["ベアリング", "すきま", "軸受"],
      "sources": [
        {
          "type": "standard",
          "publisher": "ISO",
          "code": "ISO 5753-1:2009",
          "title": "Rolling bearings – Internal clearance – Part 1（転がり軸受－内部すきま－第1部：ラジアル内部すきま）",
          "locator": "すきまグループ C2/C0/C3 等。規格値は未組立・無負荷状態",
          "url": "https://www.iso.org/standard/46232.html"
        },
        {
          "type": "standard",
          "publisher": "ISO",
          "code": "ISO 492:2023",
          "title": "Rolling bearings – Radial bearings – GPS and tolerance values（ラジアル軸受の幾何製品仕様及び公差値）",
          "locator": "寸法精度・回転精度の公差等級",
          "url": "https://www.iso.org/standard/80376.html"
        },
        {
          "type": "standard",
          "publisher": "日本軸受工業会（JBIA）",
          "code": "ISO 492:2023 日本語解説",
          "title": "ISO 492:2023（転がり軸受－ラジアル軸受）日本語概要",
          "locator": "規格内容の日本語による概要説明",
          "url": "https://www.jbia.or.jp/cbo/pdf/492_2023.pdf"
        }
      ]
    },
    {
      "knowledge_id": "KB-004",
      "title": "エビデンス追跡ガイド",
      "category": "レビュー工程",
      "summary": "指摘事項は元文書の位置情報までたどれるエビデンスとセットで扱う。",
      "guidance": "トレーサビリティが要求される場合、ISO 9001:2015 8.5.2（JIS Q 9001:2015 8.5.2）は追跡を可能にする文書化した情報の保持を求める。点検・保守記録の実例として NORD B1050 マニュアル p.73（Inspection and maintenance intervals）が参考になる。システムの候補を最終結論とせず、文書・位置・判定ルールを確認できる状態で専門担当者へ引き渡す。",
      "linked_rules": ["DEMO-R01", "DEMO-R02", "DEMO-R03"],
      "keywords": ["エビデンス", "根拠", "レビュー", "確認"],
      "sources": [
        {
          "type": "standard",
          "publisher": "JSA（日本規格協会）",
          "code": "JIS Q 9001:2015",
          "title": "品質マネジメントシステム－要求事項（ISO 9001:2015 の日本語規格・公式プレビュー）",
          "locator": "8.5.2 識別及びトレーサビリティ",
          "url": "https://webdesk.jsa.or.jp/preview/pre_jis_q_09001_000_000_2015_j_ed10_ch.pdf"
        },
        {
          "type": "official_manual",
          "registry_ref": "NORD-B1050",
          "page": "73",
          "note": "5.1 Inspection and maintenance intervals（点検・保守周期の記録例）"
        }
      ]
    }
  ]
}
```

- [ ] **Step 5: 测试通过**

Run: `php artisan test tests/Feature/KnowledgeGroundingTest.php`
Expected: 5 tests PASS。

- [ ] **Step 6: 提交**

```bash
git add data/knowledge/manufacturing_knowledge.json data/public_sources/nord_maxxdrive_sources.json tests/Feature/KnowledgeGroundingTest.php
git commit -m "feat(knowledge): ground KB entries on verified ISO/JIS and NORD sources"
```

---

### Task 2: AI 两层接地 — system prompt、接地前缀、来源正则（TDD）

**Files:**
- Modify: `app/Services/ArkChatService.php`（`systemPrompt()`、`completionPayload()` 用户消息前缀、`extractSources()` 正则）
- Modify: `tests/Feature/DemoChatTest.php`（更新旧前缀断言；新增 ISO/JIS 来源提取测试）
- Modify: `app/Services/DemoFallbackResponder.php`（固定回答对齐两层表述，追加标准号 sources）

**Interfaces:**
- Consumes: Task 1 的 knowledge v2（`groundingContext()` 原样读 JSON，无需改读取代码）。
- Produces: Ark 请求中用户消息含标记 `架空のデモレコード`；`extractSources()` 可提取 `ISO 1122-1`、`ISO 5753-1:2009`、`JIS Q 9001:2015` 形态。

- [ ] **Step 1: 先改测试（旧断言会失败 + 新行为测试）**

在 `tests/Feature/DemoChatTest.php` 中把第 40 行：

```php
                && str_contains((string) $request['messages'][1]['content'], '公開デモ用の架空データ')
```

改为：

```php
                && str_contains((string) $request['messages'][1]['content'], '架空のデモレコード')
```

在同类中追加新测试方法：

```php
    public function test_chat_extracts_iso_and_jis_citations_as_sources(): void
    {
        config([
            'services.ark.api_key' => 'test-only-key',
            'services.ark.base_url' => 'https://ark.example.test/api/v3',
            'services.ark.model' => 'doubao-seed-2.1-pro',
            'services.ark.timeout' => 5,
        ]);

        Http::fake([
            'https://ark.example.test/api/v3/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => '減速比の定義は ISO 1122-1:1998 を、文書管理は JIS Q 9001:2015 を根拠にできます。',
                    ],
                ]],
            ], 200),
        ]);

        $response = $this->postJson('/api/demo/chat', ['message' => '定義は？']);

        $response->assertOk();
        $sources = $response->json('sources');
        $this->assertContains('ISO 1122-1:1998', $sources);
        $this->assertContains('JIS Q 9001:2015', $sources);
    }
```

- [ ] **Step 2: 运行确认失败**

Run: `php artisan test tests/Feature/DemoChatTest.php`
Expected: 两个 FAIL（前缀字符串不存在；ISO/JIS 未提取）。

- [ ] **Step 3: 替换 systemPrompt()**

把 `app/Services/ArkChatService.php` 的 `systemPrompt()` heredoc 整体替换为：

```php
    private function systemPrompt(): string
    {
        return <<<'PROMPT'
あなたは製造業の技術文書レビューを支援する公開デモ用AIです。根拠は二層に区別し、必ず日本語で簡潔に回答してください。
【実在の公開資料】ナレッジの sources にある公開規格（ISO/JIS）と NORD の公式マニュアル・カタログは、実在する公開資料として根拠にできます。可能な場合は規格番号・節（例: ISO 1122-1 1.1.3.1、ISO 5753-1、JIS Q 9001 8.5.2、B1050 p.73）を本文に含めてください。
【架空のデモレコード】data/input の文書、DEMO-Rxx ルール、数値・しきい値（1.5%、0.10–0.20mm など）、AI候補、デジタルツイン点位は、すべて公開デモ用の架空レコードです。これらのしきい値を ISO/JIS 規格の規定値として説明してはいけません。
公開規格に由来する事実と架空デモレコードは回答の中で明示的に区別し、架空レコードについては「この公開デモでは」と断ってください。
根拠が見つからない場合は「この公開デモの資料からは確認できません」と明示し、実在する規格、法令、顧客情報、数値を推測して補わないでください。
歯車形式の一部は NORD MAXXDRIVE の公式公開資料を参照しています。NORD の仕様値と架空デモの点位・判定値を混同しないでください。
ルール判定は最終的な専門判断ではありません。要確認の項目は、人が元文書とエビデンスを確認する必要があることを明示してください。
PROMPT;
    }
```

- [ ] **Step 4: 替换用户消息前缀**

在 `completionPayload()` 中把：

```php
                    'content' => "以下は公開デモ用の架空データです。\n\n" . $this->groundingContext() . "\n\n質問: " . $message,
```

替换为：

```php
                    'content' => "以下に公開デモの資料を添付します。ナレッジの sources に記載された公開規格・NORD公式資料は実在の公開情報で、それ以外（文書・ルール・数値・AI候補・デジタルツイン点位）は架空のデモレコードです。\n\n"
                        . $this->groundingContext() . "\n\n質問: " . $message,
```

- [ ] **Step 5: 扩展 extractSources() 正则**

把 `extractSources()` 中的正则替换为（新增 ISO/JIS 两个分支）：

```php
        preg_match_all(
            '/\b(?:DEMO-R\d+|KB-\d+|AI-C\d+|DRAW-\d+|WI-\d+|INSP-\d+|ACC-\d+'
            .'|(?:RCV|STR|ASM|INSP|MNT|SHP)-\d+'
            .'|ISO(?:\/[A-Z]+)?\s?\d+(?:-\d+)?(?::\d{4})?'
            .'|JIS\sQ\s\d+(?::\d{4})?)\b/u',
            $answer,
            $matches,
        );
```

- [ ] **Step 6: 对齐固定兜底回答**

在 `app/Services/DemoFallbackResponder.php` 中：

減速比回答（约第 16 行）替换为：

```php
                'answer' => '減速比については DEMO-R02 を確認できます。設計値 12.50 に対して実測値は 12.62 で、この公開デモの判定では適合です。1.5% という許容差は架空のデモ用しきい値で、ISO 規格の規定値ではありません。減速比の定義は ISO 1122-1、実測値は INSP-042 に戻って確認できます。',
                'sources' => ['DEMO-R02', 'INSP-042', 'KB-002', 'ISO 1122-1'],
```

ベアリング回答（约第 21 行）替换为：

```php
                'answer' => '出力側ベアリング（BRG-01）は DEMO-R03 の対象です。実測すきまは 0.24 mm、公開デモ用の上限は 0.20 mm なので要確認です。0.10–0.20 mm は架空のデモ用基準で、ISO 5753-1 の規格値ではありません。最終不適合とは確定せず、INSP-042 の元文書と測定条件を人が確認します。',
                'sources' => ['DEMO-R03', 'INSP-042', 'KB-003', 'ISO 5753-1'],
```

- [ ] **Step 7: 跑测试**

Run: `php artisan test tests/Feature/DemoChatTest.php tests/Feature/DemoChatStreamTest.php`
Expected: 全 PASS（注意 `sources.0` 断言仍是 DEMO-Rxx，追加项放在数组末尾）。

- [ ] **Step 8: 提交**

```bash
git add app/Services/ArkChatService.php app/Services/DemoFallbackResponder.php tests/Feature/DemoChatTest.php
git commit -m "feat(chat): two-layer grounding with real standards vs fictional demo records"
```

---

### Task 3: 前端弹窗 — 出典区块、demo 值注记、边界文案

**Files:**
- Modify: `public/js/knowledge-detail.js`（注入样式、`openKnowledge()` 模板、新增 renderSource 函数）
- Modify: `tests/Feature/KnowledgeDetailInteractionTest.php`（新增出典区块相关字符串断言，版本号在 Task 4 统一改）

**Interfaces:**
- Consumes: `item.sources`（Task 1）；`review.public_sources`（`GET /api/demo/review` 已返回的 registry sources 数组）。
- Produces: DOM 结构 `.knowledge-sources > .knowledge-source-item`；外链带 `target="_blank" rel="noopener noreferrer"`。

- [ ] **Step 1: 先加测试断言**

在 `tests/Feature/KnowledgeDetailInteractionTest.php::test_knowledge_cards_open_real_detail_content_and_actions` 内追加：

```php
        $this->assertStringContainsString('出典・参考資料', $script);
        $this->assertStringContainsString('knowledge-sources', $script);
        $this->assertStringContainsString('noopener noreferrer', $script);
        $this->assertStringContainsString('public_sources', $script);
```

Run: `php artisan test tests/Feature/KnowledgeDetailInteractionTest.php`
Expected: FAIL。

- [ ] **Step 2: 新增 renderSource() 函数**

在 `knowledge-detail.js` 的 `renderEvidence()` 函数之后插入：

```js
    function renderSource(source, review) {
        if (source.type === 'standard') {
            return `
            <div class="knowledge-source-item">
                <div class="knowledge-source-top">
                    <span class="knowledge-source-publisher">${escapeHtml(source.publisher ?? '')}</span>
                    <code>${escapeHtml(source.code)}</code>
                    <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">公式ページ ↗</a>
                </div>
                <strong>${escapeHtml(source.title)}</strong>
                ${source.locator ? `<p>${escapeHtml(source.locator)}</p>` : ''}
            </div>`;
        }

        const registered = (review.public_sources ?? []).find(entry => entry.source_id === source.registry_ref);
        const code = registered?.document_code ?? source.registry_ref;
        const page = source.page ? ` · p.${escapeHtml(source.page)}` : '';
        const title = registered?.title ?? '';
        const link = registered?.official_url
            ? `<a href="${escapeHtml(registered.official_url)}" target="_blank" rel="noopener noreferrer">公式ページ ↗</a>`
            : '';

        return `
        <div class="knowledge-source-item">
            <div class="knowledge-source-top">
                <span class="knowledge-source-publisher">${escapeHtml(registered?.publisher ?? 'NORD')} 公式資料</span>
                <code>${escapeHtml(code)}${page}</code>
                ${link}
            </div>
            ${title ? `<strong>${escapeHtml(title)}</strong>` : ''}
            ${source.note ? `<p>${escapeHtml(source.note)}</p>` : ''}
        </div>`;
    }
```

- [ ] **Step 3: 在弹窗模板中插入出典区块与 demo 值注记**

在 `openKnowledge()` 内，`rulesHtml` 生成语句之前加：

```js
        const sourcesHtml = `<div class="knowledge-sources">${(item.sources ?? []).map(source => renderSource(source, review)).join('')}</div>`;
```

把「関連ルールと現在の判定」section 改为（在 h3 后加一行 demo 值注记）：

```js
                <section class="knowledge-detail-section"><h3>関連ルールと現在の判定</h3><p class="knowledge-demo-note">このセクションの数値・判定は公開デモ用の架空レコードで、公開規格の規定値ではありません。</p>${rulesHtml}</section>
```

在「検索キーワード」section 之后、actions 之前插入出典区块：

```js
                <section class="knowledge-detail-section full"><h3>出典・参考資料</h3>${sourcesHtml}</section>
```

把底部 `.knowledge-boundary.guidance` 的日文替换为：

```
ナレッジのガイドは公開規格（ISO/JIS）と NORD 公式資料（出典欄）に基づきます。ただし関連 DEMO ルールの入力値・しきい値・判定結果は公開デモ用の架空レコードです。AIの回答・候補だけで最終判断せず、ルールと元文書の根拠を人が確認する設計を示しています。
```

- [ ] **Step 4: 注入 token-only 的出典样式**

在 `ensureStyles()` 模板中（`.knowledge-keywords span{...}` 规则之后）追加：

```css
            .knowledge-sources{display:grid}
            .knowledge-source-item{padding:11px 0;border-top:1px solid var(--line)}
            .knowledge-source-item:first-child{border-top:0;padding-top:0}
            .knowledge-source-item:last-child{padding-bottom:0}
            .knowledge-source-top{display:flex;justify-content:flex-end;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:5px}
            .knowledge-source-publisher{margin-right:auto;color:var(--muted);font-size:11px}
            .knowledge-source-top code{color:var(--cyan);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace}
            .knowledge-source-top a{color:var(--cyan);font-size:11px;text-decoration:none}
            .knowledge-source-top a:hover{text-decoration:underline}
            .knowledge-source-item strong{display:block;color:var(--text);font-size:13px;margin-bottom:5px}
            .knowledge-source-item p{margin:0;color:var(--muted);font-size:12px;line-height:1.7}
            .knowledge-demo-note{margin:0 0 10px;font-size:12px}
```

- [ ] **Step 5: 测试通过**

Run: `php artisan test tests/Feature/KnowledgeDetailInteractionTest.php`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add public/js/knowledge-detail.js tests/Feature/KnowledgeDetailInteractionTest.php
git commit -m "feat(knowledge): render verified sources section in detail modal"
```

---

### Task 4: 知识卡片出典 chip、静态文案、版本号

**Files:**
- Modify: `public/js/knowledge-detail.js`（`decorateKnowledgeCards()` + `syncSourceCounts()` + chip 样式）
- Modify: `resources/views/demo.blade.php`（知识 Tab 引导语、页脚、JS 版本号）
- Modify: `tests/Feature/KnowledgeDetailInteractionTest.php`（版本号断言）
- Modify: `tests/Feature/LightThemeTest.php`（如版本号被引用——检查后无引用则不动）

**Interfaces:**
- Produces: 每张知识卡片底部出现 `出典 N` chip；静态资源版本 `knowledge-detail.js?v=20260918-2`。

- [ ] **Step 1: 更新版本号测试断言**

把 `KnowledgeDetailInteractionTest::test_demo_loads_knowledge_detail_module` 中的：

```php
        $this->assertStringContainsString('/js/knowledge-detail.js?v=20260918-1', $view);
```

改为：

```php
        $this->assertStringContainsString('/js/knowledge-detail.js?v=20260918-2', $view);
```

- [ ] **Step 2: 实现卡片出典计数**

在 `knowledge-detail.js` 中把 `decorateKnowledgeCards()` 整体替换为：

```js
    function decorateKnowledgeCards() {
        document.querySelectorAll('#knowledge-list .knowledge-card').forEach(card => {
            const id = card.querySelector('.knowledge-id')?.textContent?.trim();
            if (!id || card.dataset.knowledgeDetail === id) return;
            card.dataset.knowledgeDetail = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${id} の詳細を開く`);
            if (!card.querySelector('.knowledge-open-hint')) card.insertAdjacentHTML('beforeend', '<div class="knowledge-open-hint"><span>詳細・関連ルール・根拠を確認</span></div>');
            if (!card.querySelector('.knowledge-card-source-count')) card.insertAdjacentHTML('beforeend', '<span class="knowledge-card-source-count" hidden></span>');
        });

        dataPromise.then(([knowledge]) => {
            const counts = new Map((knowledge.items ?? []).map(item => [item.knowledge_id, (item.sources ?? []).length]));
            document.querySelectorAll('.knowledge-card[data-knowledge-detail]').forEach(card => {
                const chip = card.querySelector('.knowledge-card-source-count');
                const count = counts.get(card.dataset.knowledgeDetail) ?? 0;
                if (!chip) return;
                chip.textContent = count > 0 ? `出典 ${count}` : '';
                chip.hidden = count === 0;
            });
        }).catch(() => {});
    }
```

在注入样式中追加 chip 样式（token-only）：

```css
            .knowledge-card-source-count{display:inline-flex;align-self:flex-start;margin-top:10px;border:1px solid var(--line);background:var(--panel-soft,var(--panel));color:var(--cyan);border-radius:999px;padding:4px 9px;font:800 9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}
            .knowledge-card-source-count[hidden]{display:none}
```

- [ ] **Step 3: 更新 blade 静态文案与版本号**

`resources/views/demo.blade.php` 三处：

知识 Tab 引导 `<p>` 改为：

```html
<p>レビューで使う判断の手引き。ガイドの方法論は公開規格（ISO/JIS）と NORD 公式資料に出典接地し、関連するデモの判定値は架空レコードとして明示します。</p>
```

页脚改为：

```html
<footer>公開デモ・文書・数値・ルール・点位は架空レコードですが、ナレッジの出典は実在の公開規格・公式資料です・顧客データは含まれていません</footer>
```

JS 版本号改为：

```html
<script src="/js/knowledge-detail.js?v=20260918-2"></script>
```

- [ ] **Step 4: 跑测试**

Run: `php artisan test`
Expected: 全 57 个测试 PASS（原 51 + Task 1 新增 5 + Task 2 新增 1）。

- [ ] **Step 5: 提交**

```bash
git add public/js/knowledge-detail.js resources/views/demo.blade.php tests/Feature/KnowledgeDetailInteractionTest.php
git commit -m "feat(knowledge): show source count chip and update two-layer copy"
```

---

### Task 5: 文档同步

**Files:**
- Modify: `docs/disclosure_boundary.md`
- Modify: `docs/ai_assistance.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: disclosure_boundary.md**

「## 公開するもの」列表中在 `- Evidence locator の考え方` 之后插入一行：

```markdown
- 公開規格（ISO 9001/JIS Q 9001、ISO 1122-1、ISO 1328-1、ISO 5753-1、ISO 492）と NORD 公式マニュアルへリンクの形で出典接地されたナレッジ（規格原文は転載しない）
```

并把 `- 製造業を題材にした完全架空の文書` 改为：

```markdown
- 製造業を題材にした架空のデモ文書・ルール判定値（ナレッジの方法論とその出典は実在の公開資料）
```

- [ ] **Step 2: ai_assistance.md**

把第 26 行 `モデルへ渡す根拠は、この公開デモに含まれる次の架空データだけです。` 改为：

```markdown
モデルへ渡す根拠は二層です。ナレッジ（`data/knowledge/manufacturing_knowledge.json`）の `sources` に記載した公開規格（ISO/JIS）と NORD 公式資料は実在の公開情報で、リンクのみを提示し原文は転載しません。一方、次のデータはすべて公開デモ用の架空レコードであり、しきい値を規格の規定値として語ることは禁止しています。
```

- [ ] **Step 3: README.md（日文）**

第 129 行接地说明末尾追加一句：

```markdown
ナレッジの方法論は ISO/JIS と NORD 公式資料への出典（`sources`）付きで、架空レコードとは明示的に区別します。
```

第 200 行「公開範囲」段の `文書・部品・数値・ルールはすべて公開デモ用の架空データです。` 改为：

```markdown
文書・部品・数値・ルールはすべて公開デモ用の架空データです。ただしナレッジのガイド方法論は公開規格（ISO/JIS）と NORD 公式資料に出典接地しており、各出典はリンクで確認できます。
```

- [ ] **Step 4: README.zh-CN.md（中文）**

第 129 行中文接地说明末尾追加：

```markdown
知识条目的方法论均带 `sources` 出处（ISO/JIS 公开标准与 NORD 官方手册），与虚构演示记录明确区分。
```

「公开范围」段（对应日文第 200 行）中 `文档、部件、数值、规则均为公开演示用的虚构数据。` 改为：

```markdown
文档、部件、数值、规则均为公开演示用的虚构数据；但知识库条目的方法论接地到公开标准（ISO/JIS）与 NORD 官方手册，每条出处都可通过链接核实。
```

- [ ] **Step 5: 提交**

```bash
git add docs/disclosure_boundary.md docs/ai_assistance.md README.md README.zh-CN.md
git commit -m "docs: document two-layer knowledge grounding boundary"
```

---

### Task 6: 全量验收

**Files:** 无代码修改（只验证；发现问题回到对应 Task）

- [ ] **Step 1: 全量测试**

Run: `php artisan test`
Expected: 全 PASS（原 51 + 新增 6 = 57；如数量因断言调整不同，以全绿为准）。

- [ ] **Step 2: API 烟测**

Run（服务已在 127.0.0.1:8765 运行；若没在跑则 `php artisan serve --port=8765`）：

```bash
curl -s http://127.0.0.1:8765/api/demo/knowledge | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d['schema'])
for i in d['items']:
    print(i['knowledge_id'], len(i.get('sources',[])), [s.get('code',s.get('registry_ref')) for s in i.get('sources',[])])
"
```

Expected: `public_demo_knowledge_v2`；四条分别输出 2 / 3 / 3 / 2 个出处。

- [ ] **Step 3: headless Chrome 目视验收**

用 `/tmp/pup/run.js` 的既有启动方式（puppeteer-core + 系统 Chrome）另写 `/tmp/pup/verify-grounding.js`：打开 KB-001 与 KB-003 弹窗，断言：

```js
  const checks = await page.evaluate(() => {
    const open = id => document.querySelector(`.knowledge-card[data-knowledge-detail="${id}"]`).click();
    open('KB-003');
    const sources = [...document.querySelectorAll('.knowledge-source-item')].map(el => el.textContent);
    const links = [...document.querySelectorAll('.knowledge-source-item a')].map(a =>
      [a.href, a.target, a.rel]);
    const note = document.querySelector('.knowledge-demo-note')?.textContent;
    return {count: sources.length, links, note};
  });
  console.log(JSON.stringify(checks, null, 1));
```

Expected: `count: 3`；links 的 target=`_blank`、rel 含 `noopener noreferrer`，host 分别为 iso.org ×2、jbia ×1（KB-003）；note 含「架空レコード」。再截图 `/tmp/grounded-kb003.png` 与移动端弹窗人工目检。

- [ ] **Step 4: 检查无硬编码颜色回归**

Run:

```bash
grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' public/js/knowledge-detail.js | grep -v '&#039;' || echo "clean"
```

Expected: `clean`。

- [ ] **Step 5: 收尾报告**

汇总：测试数、4 条 KB 的出处数、截图路径、未改 §8 既存 G1050 页码偏移问题的提醒。任务全部完成后用 superpowers:finishing-a-development-branch 处理合并（当前在 main 上工作，按用户指示决定是否直接保留在 main）。

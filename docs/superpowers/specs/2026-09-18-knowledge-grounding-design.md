# 知识库去架空化设计：知识接地到真实公开出处

- 日期：2026-09-18
- 范围：`data/knowledge` 及其消费面（API、知识卡片、详情弹窗、AI 接地、文档/测试）
- 决策来源：用户确认「知识接地到真实出处（推荐）」＋「4 条原地接地（最小改动）」＋「标准 + NORD 手册混合出典」＋「内联 sources + NORD registry 引用」

## 1. 背景与问题

`data/knowledge/manufacturing_knowledge.json` 目前 4 条知识（KB-001~004）自我标注为"架空ナレッジ"，没有任何可核实出处，并与虚构的 DEMO 规则数值（1.5% 容差、0.10–0.20 mm 等）绑定。仓库里 `data/public_sources/` 已经建立了"真实公开资料 + 明确边界声明"的成熟范式（5 份 NORD 官方文档，真实链接与页码）。

本设计把知识库的**方法论部分接地到可核实的公开标准/官方手册**，同时保持演示案件与规则判定值为虚构并明确标注。公开仓库的硬约束不变（见 `docs/disclosure_boundary.md`）：不引入客户信息、真实阈值、内部规则。

## 2. 目标 / 非目标

**目标**

1. 4 条 KB 的主题、ID、与 DEMO 规则的绑定关系不变；每条新增至少一个真实、可点击核实的出处。
2. 按出处校准措辞：demo 阈值明确写成"架空デモ値"，不伪装成标准规定值。
3. 详情弹窗新增「出典・参考資料」区块，外链新标签页打开。
4. AI 回答能以这些公开标准为依据，并与虚构 demo 数据明确区分。
5. 出处数据可被测试校验（结构、URL、registry 引用、页码白名单）。

**非目标（YAGNI）**

- 不新增/删除 KB 条目，不重构分类。
- 不改演示文档、规则数值、规则引擎。
- 不新建独立 source registry 文件；不转载任何付费标准原文或 NORD PDF。
- 不改知识搜索逻辑。
- 不修复已发现的 G1050 预览页偏移问题（见 §8，另行处理）。

## 3. 已核实的出处清单（本设计的事实基础）

所有 URL 于 2026-09-18 实际核实（iso.org 对非浏览器客户端返回 403 反爬，浏览器可正常打开；JSA、NORD、JBIA 链接 curl 实测 200）。

| KB | 出处 | 定位 | 链接 |
|---|---|---|---|
| KB-001 | ISO 9001:2015 | §7.5.3.2 c) 成文信息的变更管理（版本管理）；§8.5.6 变更控制 | https://www.iso.org/standard/62085.html |
| KB-001 / KB-004 | JIS Q 9001:2015（日本語規格、JSA 公式プレビュー） | 7.5.3 文書化した情報の管理；8.5.2 識別及びトレーサビリティ | https://webdesk.jsa.or.jp/preview/pre_jis_q_09001_000_000_2015_j_ed10_ch.pdf |
| KB-002 | ISO 1122-1:1998 歯車用語 | §1.1.3.1 歯車比（gear ratio）＝被動歯車の歯数 / 小歯車の歯数 | https://www.iso.org/obp/ui/en/#!iso:std:5649:en |
| KB-002 | ISO 1328-1:2013 円筒歯車の精度等級 | フランク公差等級 1～11（等級が小さいほど高精度） | https://www.iso.org/obp/ui/#iso:std:iso:1328:-1:ed-2:v1:en |
| KB-002 | NORD G1050 カタログ（官方 PDF 已下载逐页核实） | 印刷 p.36 Nomenclature：形式ごとの公称減速比 iN 範囲；印刷 p.88 定格表の見方（Nom. Ratio）；印刷 p.89 **Structure of the Exact Ratio Tables（公称減速比 iN と実減速比 i_ges の区別）** | https://www.nord.com/en/services/documentation/catalogues/details/g1050.jsp |
| KB-003 | ISO 5753-1:2009 転がり軸受－内部すきま（ラジアル） | C2/C0/C3 等のすきまグループ。**規格値は未組立・無負荷状態のもの**（組立後の実測すきまとは別物） | https://www.iso.org/standard/46232.html |
| KB-003 | ISO 492:2023 ラジアル軸受の公差（GPS） | 寸法・回転精度の公差等級 | https://www.iso.org/standard/80376.html |
| KB-003 | 日本軸受工業会（JBIA）による ISO 492:2023 日本語解説 PDF | 全体概要 | https://www.jbia.or.jp/cbo/pdf/492_2023.pdf |
| KB-004 | NORD B1050 マニュアル（官方 PDF 已下载逐页核实） | p.73 §5.1 Inspection and maintenance intervals（点検・保守周期の実記録例） | registry `NORD-B1050`，已登记 key_preview |
| KB-004 | ISO 9001:2015 / JIS Q 9001 | §8.5.2 識別及びトレーサビリティ：トレーサビリティに必要な文書化した情報を保持 | 同 KB-001 链接 |

措辞校准要点：

- **KB-002**：ISO 1122-1 给的是"减速比"的术语定义，ISO 1328 给的是齿面精度等级——**没有任何 ISO 标准规定"减速比相对误差 1.5%"这种验收阈值**；指导文中明确 1.5% 是公開デモ用の架空許容差。G1050 p.89 的公称比/実減速比区分正好支撑"設計値と実測値を比較する"这一做法的工程背景。
- **KB-003**：ISO 5753 的游隙值是未组装无载荷的规格值；组装后的实测游隙受配合影响。demo 的 0.10–0.20 mm 是架空判定帯，不是 ISO 值。

## 4. 数据设计

### 4.1 knowledge JSON（schema v2）

`data/knowledge/manufacturing_knowledge.json`：

- `schema` 升为 `public_demo_knowledge_v2`。
- 顶层 `note` 改为：知識ガイドの方法论は公開規格・公式マニュアルに基づく（出典は各 items.sources）。関連する DEMO ルールの判定値・しきい値はすべて公開デモ用の架空値。
- 每个 item 新增 `sources: Source[]`（1 件以上），其余字段不变。

```json
{
  "type": "standard",
  "publisher": "ISO",
  "code": "ISO 5753-1:2009",
  "title": "転がり軸受－内部すきま－第1部：ラジアル軸受のラジアル内部すきま",
  "locator": "すきまグループ（C2/C0/C3 等）。規格値は未組立・無負荷状態",
  "url": "https://www.iso.org/standard/46232.html"
}
```

```json
{
  "type": "official_manual",
  "registry_ref": "NORD-G1050",
  "page": "88–89",
  "note": "定格表の見方／公称減速比 iN と実減速比 i_ges"
}
```

规则：

- `standard` 必须有 `code/title/url`（https），`locator` 可选；`publisher` 用于显示（ISO / JSA / JBIA）。
- `official_manual` 必须有 `registry_ref`，其 `code/title/official_url` 一律由 `data/public_sources/nord_maxxdrive_sources.json` 解析，knowledge JSON 不重复存这些字段；`page` 为印刷页码字符串（沿用 registry 既有约定，见 §8）。
- 允许的标准 URL host 白名单（测试强制）：`iso.org`（含 `www.iso.org/obp`）、`webdesk.jsa.or.jp`、`www.jbia.or.jp`。新增出处必须先核实再进白名单。

### 4.2 registry 增补

给 `NORD-G1050` 的 `key_previews` 增加 3 条元数据（印刷页码，标题按 PDF 实际内容）：

- p.36 "Nomenclature – nominal ratio ranges by gear-unit type"
- p.88 "Structure of the power/torque ratings tables (nominal ratio)"
- p.89 "Structure of the exact ratio tables – nominal ratio iN vs exact ratio i_ges"

不改 B1050（p.73 已存在且已逐页核实）。

## 5. 前端设计

全部沿用刚统一的 token/共享组件体系，不新增硬编码颜色。

1. **详情弹窗新区块「出典・参考資料」**（`knowledge-detail.js` 内）：
   - standard：`publisher` 小标签 + `code`（cyan，等宽）+ `title` + `locator`，整行外链，末尾 ↗。
   - official_manual：用 `dataPromise` 里已有的 review.public_sources 解析 registry_ref → `document_code`/`title`/`official_url`，显示 `B1050 · p.73 · note`；解析不到时退化为纯文本（不产生死链）。
   - 所有外链 `target="_blank" rel="noopener noreferrer"`。
   - 区块本身用 `.knowledge-detail-section`（白底卡），出处条目用 hairline 分隔，复用规则/证据区的模式，不再增加嵌套卡。
2. **知识网格卡片加「出典 N」chip**：在 `decorateKnowledgeCards()` 注入（知识数据来自该模块自己的 dataPromise），chip 样式复用 `.linked span`/`.knowledge-detail-badge` 语言。`gearbox-demo.js` 的卡片渲染不动。
3. **边界文案翻转**：
   - 弹窗底部 `.knowledge-boundary.guidance` 文案改为：方法论は公開規格・公式マニュアル（出典欄）に基づく；ただし関連 DEMO ルールの入力値・判定値は公開デモ用の架空レコード。
   - 「関連ルールと現在の判定」h3 保持，在该 section 顶部加一行小字注记：このセクションの数値・判定は架空デモレコードです（`.knowledge-detail-section p` 同款 muted 小字）。
   - blade 知识 Tab 引导语、页脚的"すべて架空"表述同步改为"知识方法论有公开出处、demo 记录虚构"。
4. knowledge-detail.js 的 `stepsByKnowledge` 保留（属工程手順，措辞与标准对齐即可，不声称出自标准）。
5. 资源版本号递增（blade 与测试断言同步）。

## 6. AI 接地设计（`ArkChatService`）

- `systemPrompt()` 中"所有数据都是架空"的总括表述替换为两层规则：
  1. ナレッジの `sources` にある公開規格（ISO/JIS）と NORD 公式マニュアルは、実在の公開資料として根拠にしてよい。可能なら規格番号・節（例：ISO 1122-1 §1.1.3.1、JIS Q 9001 8.5.2、B1050 p.73）を本文に含める。
  2. 文書・ルール・数値・デジタルツイン点位は架空デモレコード。demo のしきい値（1.5% 等）を規格の規定値として語ってはならない。規格に由来する事実と架空レコードを回答中で明示的に区別する。
- grounding JSON 自动包含新 sources（knowledge JSON 内联），无需额外读取。
- `extractSources()` 正则增补标准号识别（ISO/JIS 形态，如 `ISO 1122-1`、`ISO 5753-1:2009`、`JIS Q 9001`、`ISO 492`），让来源 chip 显示标准号。
- 离线兜底 `DemoFallbackResponder` 不改业务逻辑；在提到 KB-002/003 的固定回答中把"デモ用許容差/上限"措辞与新边界对齐（数值仍为 demo 值），sources 数组可加 ISO 编号（extractSources 仅用于展示，固定回答的 sources 是手写的，保持一致即可）。

## 7. 测试与文档

**新增测试 `tests/Feature/KnowledgeGroundingTest.php`**

- schema === public_demo_knowledge_v2；KB-001~004 存在且各有 ≥1 个 source。
- 每个 standard：含 code/title，url 为 https 且 host 在白名单。
- 每个 official_manual：registry_ref 在 NORD registry 中存在；若给 page，抽出的每个数字页码必须命中该 source 的 key_previews（防止编页码）。
- KB-002 的 guidance 必须包含"架空"或"デモ"字样（防止把 1.5% 说成标准值）；任一 item 的 sources/title 中不出现把 demo 阈值归于 ISO/JIS 的表述（用字符串断言兜底）。
- registry 新增的 G1050 key_previews（36/88/89）存在且 title 非空。

**更新测试**

- `KnowledgeDetailInteractionTest`：版本号、断言「出典・参考資料」区块与外链 rel。
- 现有 51 个测试跑全量，修正受文案变化影响的断言（KB ID 与兜底 sources 不变，预期影响很小）。

**文档**

- `docs/disclosure_boundary.md`：公開するものに「公開規格・公式マニュアルに出典接地されたナレッジ」を追加、出典の扱い（リンクのみ、転載なし）を明記。公開しないもの（実閾値・顧客情報）は不変。
- `README.md` / `README.zh-CN.md`：知识层说明与"架空"总括表述更新。
- `docs/ai_assistance.md`：两层接地规则（公开标准可依据 / demo 记录虚构）。

## 8. 已发现的既存问题（本次不修，仅记录）

G1050 的 registry 页码（132/163，及本次新增的 36/88/89）是**印刷页码**，而 `official-source-previews.js` 的 `buildPdfPageUrl()` 直接把它放进 PDF 的 `#page=N`（物理页）。G1050 物理页 = 印刷页 + 2（B1050 恰好一致，故 p.73 正常）。即官方来源预览里 G1050 的 iframe 会落在前 2 页。本设计的知识出典**不使用** `#page=` 深链（只链 official_url + 文本页码），不受影响。建议后续单独修：preview 构建时为 G1050 加 offset 或 registry 统一改物理页。

## 9. 验收标准

1. `composer test` 全绿。
2. 4 条 KB 的所有出处 URL 逐一在真实浏览器可打开（iso.org 的 403 仅限非浏览器客户端）。
3. headless Chrome 复查：详情弹窗出典区块渲染、外链 rel/target 正确、chip 计数正确、边界文案到位、移动端不破版。
4. G1050 p.36/88/89、B1050 p.73 的内容与 locator 描述一致（已通过下载官方 PDF 逐页核实，记录于 §3）。
5. 仓库中"ナレッジは架空"类总括文案全部更新为两层表述，无自相矛盾。

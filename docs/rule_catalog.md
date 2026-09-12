# 公開デモ用 Rule Catalog

この表は、専門文書レビューで「入力 → 判定条件 → Evidence → 出力」を分ける考え方を示すためのものです。

**すべてのルール・数値・部品名は架空です。実案件の Rule Schema、規格値、例外条件を再現していません。**

| Rule ID | 対象 | Input | 公開デモ用ルール | Evidence | Output |
|---|---|---|---|---|---|
| DEMO-R01 | Gearbox Assembly | 組立図 Rev + 検査記録 Rev | 同じ Rev を参照する | 両文書の Title block | `pass` / `drawing_revision_mismatch` |
| DEMO-R02 | Gear Pair | 設計減速比 + 実測減速比 | 相対差が 1.5% 以下 | Assembly Table A-02 + Inspection Table I-02 | `pass` / `ratio_out_of_tolerance` |
| DEMO-R03 | Output Bearing | 下限 + 上限 + 実測すきま | 0.10–0.20 mm のデモ範囲内 | Assembly Table A-03 + Inspection Table I-03 | `pass` / `clearance_out_of_range` |

## このデモで見せたいこと

ルールは Prompt の文章ではなく、AI とは別の責務として扱います。

```text
AI / Parser
  ↓ 候補抽出
Normalized facts
  ↓
Rule evaluation
  ↓
Finding + Evidence
  ↓
Human Review
```

実運用ではルールの適用条件、例外、バージョン、承認状態などが重要になりますが、この公開サンプルでは具体的な設計を意図的に省略しています。

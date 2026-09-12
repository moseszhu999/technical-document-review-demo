# Inspection Report Extract — GBX-042

> 公開デモ用の架空文書です。数値・判定条件は実在の製造規格ではありません。

| 項目 | 実測 / 参照値 | 位置 |
|---|---:|---|
| Referenced Drawing Revision | D2 | Title block |
| Gear Ratio | 12.62 | Table I-02 / row 3 |
| Output Bearing Clearance | 0.24 mm | Table I-03 / row 2 |

この文書には意図的に2つのレビュー対象を入れています。

- 組立図 D3 に対して検査記録が D2 を参照
- ベアリングすきまが公開デモ用範囲を外れる

システムはこれらを自動的に「製品不良」と断定せず、Evidence を伴う `needs_review` として返します。

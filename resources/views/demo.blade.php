<!doctype html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>製造業 技術文書レビュー・ワークスペース</title>
    <link rel="stylesheet" href="/css/demo.css">
    <link rel="stylesheet" href="/css/document-preview.css">
    <link rel="stylesheet" href="/css/chat-status.css?v=20260912-3">
</head>
<body>
<div class="ambient ambient-a"></div>
<div class="ambient ambient-b"></div>
<main class="workspace">
<header class="hero"><div><div class="eyebrow">技術文書レビュー / 公開デモ</div><h1>製造業エビデンス・ワークスペース</h1><p>技術文書の確認から根拠追跡、人手による最終確認までを一つの画面で支援する公開デモ。</p></div><div class="hero-status"><span class="pulse"></span><span id="review-status">レビューを読み込み中...</span></div></header>
<section class="pipeline"><span>01 文書</span><b>→</b><span>02 ナレッジ</span><b>→</b><span>03 AI候補</span><b>→</b><span>04 ルール</span><b>→</b><span>05 エビデンス</span><b>→</b><span>06 人手確認</span></section>
<nav class="workspace-nav"><button class="nav-tab active" data-view="review-view">レビューワークスペース</button><button class="nav-tab" data-view="knowledge-view">ナレッジベース</button><button class="nav-tab" data-view="rules-view">ルールカタログ</button><button class="nav-tab" data-view="chat-view">AIレビュー対話</button></nav>
<section id="review-view" class="view active"><section class="grid"><aside class="panel documents-panel"><div class="panel-heading"><span>文書一覧</span><small id="document-count">案件エビデンス連鎖</small></div><div id="documents" class="document-list"></div><div class="legend-note">すべて公開用の架空文書です。クリックすると内容を確認できます。</div></aside><section class="panel model-panel"><div class="panel-heading"><span>3Dモデルビュー</span><small>部品をクリック</small></div><div id="model-stage"><div class="model-overlay"><div id="selected-name">コンパクト減速機アセンブリ</div><div id="selected-id">GBX-042</div></div><canvas id="gearbox-canvas"></canvas><div class="model-hint">ドラッグで回転・スクロールで拡大縮小・部品をクリック</div></div><div class="part-tabs"><button data-asset="GBX-042" class="part-tab active">ハウジング / 組立体</button><button data-asset="GEARSET-01" class="part-tab">歯車ペア</button><button data-asset="BRG-01" class="part-tab">出力側ベアリング</button></div></section><aside class="panel rules-panel"><div class="panel-heading"><span>ルールレビュー</span><small>現在の判定</small></div><div id="rules" class="rule-list"></div></aside></section><section class="lower-grid"><section class="panel evidence-panel"><div class="panel-heading"><span>エビデンス</span><small>元文書の位置まで追跡</small></div><div id="evidence" class="evidence-grid"></div></section><section class="panel ai-panel"><div class="panel-heading"><span>AI支援</span><small>候補のみ・最終判断ではありません</small></div><div id="ai-candidates" class="ai-list"></div><button class="primary-action" id="open-chat">AIレビュー対話を開く →</button></section></section></section>
<section id="knowledge-view" class="view"><div class="section-intro"><div><div class="eyebrow">ナレッジベース</div><h2>製造業レビュー・ナレッジ</h2><p>レビューに使う知識を、ルールとは分けて参照できるようにした公開デモ用の架空ナレッジ。</p></div><div class="search-box"><span>⌕</span><input id="knowledge-search" type="search" placeholder="図面、減速比、エビデンス..." autocomplete="off"></div></div><div id="knowledge-list" class="knowledge-grid"></div></section>
<section id="rules-view" class="view"><div class="section-intro"><div><div class="eyebrow">ルールカタログ</div><h2>入力 → 判断 → 結果 → エビデンス → 人手確認</h2><p>ルールはAIへの指示文に埋め込まず、入力項目と判断結果を確認できる独立したレビュー単位として表示。</p></div><div class="rule-summary" id="rule-summary"></div></div><div id="rule-catalog" class="rule-catalog"></div></section>
<section id="chat-view" class="view"><div class="chat-layout"><section class="panel chat-panel"><div class="panel-heading"><span>AIレビュー支援</span><small>根拠付きデモ・最終判断は人が実施</small></div><div id="ai-connection-status" class="ai-connection-status" hidden aria-live="polite"></div><div id="chat-messages" class="chat-messages"><div class="chat-message assistant"><div class="chat-avatar">AI</div><div><div class="chat-bubble">このデモの文書・ナレッジベース・ルール・エビデンスについて質問できます。最終的な専門判断は人が行います。</div><div class="chat-sources">KB-004 · エビデンス追跡ガイド</div></div></div></div><form id="chat-form" class="chat-form"><input id="chat-input" type="text" maxlength="500" placeholder="例：減速比の判定は？" autocomplete="off"><button type="submit">質問する</button></form></section><aside class="panel prompt-panel"><div class="panel-heading"><span>質問例</span><small>根拠に基づく質問</small></div><button class="prompt-button" data-prompt="減速比の判定は？">減速比の判定は？</button><button class="prompt-button" data-prompt="ベアリングの判定は？">ベアリングの判定は？</button><button class="prompt-button" data-prompt="図面改訂について教えて">図面改訂について教えて</button><button class="prompt-button" data-prompt="ルールを3つ教えて">ルールを3つ教えて</button><button class="prompt-button" data-prompt="ナレッジベースには何がある？">ナレッジベースには何がある？</button><div class="ai-boundary"><strong>AIの役割範囲</strong><p>AIは候補抽出・関連付け・エビデンス候補の提示を支援。ルール判定と最終確認は別レイヤーで扱います。</p></div></aside></div></section>
<footer>公開デモ・すべての文書、ナレッジ、数値、ルールは架空のものです・顧客データは含まれていません</footer>
</main>
<div id="document-modal" class="modal hidden" aria-hidden="true"><div class="modal-backdrop"></div><section class="modal-card"><button class="modal-close" id="modal-close" aria-label="閉じる">×</button><div class="eyebrow">文書プレビュー</div><h2 id="modal-title">文書</h2><div id="modal-meta" class="modal-meta"></div><div id="modal-content" class="document-preview"></div></section></div>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>
<script src="/js/chat-connection-status.js?v=20260912-3"></script>
<script type="module" src="/js/gearbox-demo.js"></script>
<script type="module" src="/js/document-preview.js"></script>
</body>
</html>

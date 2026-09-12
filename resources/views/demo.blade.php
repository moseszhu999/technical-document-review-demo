<!doctype html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Manufacturing Review Workspace</title>
    <link rel="stylesheet" href="/css/demo.css">
</head>
<body>
<div class="ambient ambient-a"></div>
<div class="ambient ambient-b"></div>
<main class="workspace">
    <header class="hero">
        <div>
            <div class="eyebrow">TECHNICAL DOCUMENT REVIEW / PUBLIC DEMO</div>
            <h1>Manufacturing Evidence Workspace</h1>
            <p>文書・部品・ルール・Evidence を1つのレビュー面にまとめる架空のギヤボックス案件。</p>
        </div>
        <div class="hero-status">
            <span class="pulse"></span>
            <span id="review-status">Loading review...</span>
        </div>
    </header>

    <section class="pipeline">
        <span>01 DOCUMENT</span><b>→</b><span>02 AI CANDIDATE</span><b>→</b><span>03 RULE</span><b>→</b><span>04 EVIDENCE</span><b>→</b><span>05 HUMAN REVIEW</span>
    </section>

    <section class="grid">
        <aside class="panel documents-panel">
            <div class="panel-heading"><span>DOCUMENTS</span><small>case evidence chain</small></div>
            <div id="documents" class="document-list"></div>
            <div class="legend-note">すべて公開用の架空文書です。</div>
        </aside>

        <section class="panel model-panel">
            <div class="panel-heading">
                <span>3D ASSET VIEW</span>
                <small>click a component</small>
            </div>
            <div id="model-stage">
                <div class="model-overlay">
                    <div id="selected-name">Compact Gearbox Assembly</div>
                    <div id="selected-id">GBX-042</div>
                </div>
                <canvas id="gearbox-canvas"></canvas>
                <div class="model-hint">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK PART</div>
            </div>
            <div class="part-tabs">
                <button data-asset="GBX-042" class="part-tab active">Housing / Assembly</button>
                <button data-asset="GEARSET-01" class="part-tab">Gear Pair</button>
                <button data-asset="BRG-01" class="part-tab">Output Bearing</button>
            </div>
        </section>

        <aside class="panel rules-panel">
            <div class="panel-heading"><span>RULE REVIEW</span><small>synthetic public rules</small></div>
            <div id="rules" class="rule-list"></div>
        </aside>
    </section>

    <section class="lower-grid">
        <section class="panel evidence-panel">
            <div class="panel-heading"><span>EVIDENCE</span><small>trace back to document location</small></div>
            <div id="evidence" class="evidence-grid"></div>
        </section>
        <section class="panel ai-panel">
            <div class="panel-heading"><span>AI ASSIST</span><small>candidate only · not final decision</small></div>
            <div id="ai-candidates" class="ai-list"></div>
        </section>
    </section>

    <footer>
        PUBLIC DEMO · ALL DOCUMENTS, VALUES AND RULES ARE FICTIONAL · NO CLIENT DATA
    </footer>
</main>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
<script type="module" src="/js/gearbox-demo.js"></script>
</body>
</html>

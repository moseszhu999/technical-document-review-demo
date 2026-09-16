const twinStyle = document.createElement('link');
twinStyle.rel = 'stylesheet';
twinStyle.href = '/css/digital-twin.css?v=20260913-1';
if (!document.querySelector('link[href*="digital-twin.css"]')) document.head.appendChild(twinStyle);

const twinStatusLabels = {
    available: 'AVAILABLE',
    in_review: 'IN REVIEW',
    review_required: 'REVIEW REQUIRED',
    confirmed: 'CONFIRMED',
    idle: 'NO RECENT ACTIVITY',
};

const HUMAN_STATUS_KEY = 'mfg-demo-human-status-v1';

function humanStatusText(action, time) {
    if (action === 'confirmed') return `Confirmed · ${time}`;
    if (action === 'escalated') return `Escalated · ${time}`;
    return `Pending Evidence · ${time}`;
}

function readHumanStatus() {
    try {
        const value = JSON.parse(sessionStorage.getItem(HUMAN_STATUS_KEY) ?? 'null');
        return value?.action && value?.time ? value : null;
    } catch {
        return null;
    }
}

function writeHumanStatus(action) {
    const time = new Intl.DateTimeFormat('ja-JP', {hour:'2-digit', minute:'2-digit'}).format(new Date());
    try {
        sessionStorage.setItem(HUMAN_STATUS_KEY, JSON.stringify({action, time}));
    } catch {
        // The demo remains usable if browser storage is unavailable.
    }
    return time;
}

function restoreHumanStatus() {
    const status = document.querySelector('#twin-human-status');
    const saved = readHumanStatus();
    if (status && saved) status.textContent = humanStatusText(saved.action, saved.time);
}

function twinEscape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function statusCount(assets, status) {
    return assets.filter(asset => asset.status === status).length;
}

function buildTwinRoot(registry) {
    const root = document.createElement('section');
    root.id = 'digital-twin-root';
    root.dataset.workspace = registry.workspace_id;
    root.innerHTML = `
        <div class="twin-kpis" id="twin-kpis"></div>
        <div class="twin-shell">
            <section class="twin-map-panel">
                <div class="twin-heading"><strong>WORKSHOP DIGITAL TWIN</strong><span>${twinEscape(registry.workspace_label)}</span></div>
                <div class="twin-map-wrap">
                    <div class="twin-map" id="twin-map"></div>
                    <div class="twin-legend">
                        <span><i style="background:#6fa4ff"></i>Available</span>
                        <span><i style="background:#ffcc66"></i>In Review</span>
                        <span><i style="background:#ff4d5f"></i>Review Required</span>
                        <span><i style="background:#45e0a8"></i>Confirmed</span>
                    </div>
                </div>
            </section>
            <aside class="twin-detail-panel">
                <div class="twin-heading"><strong>ASSET REVIEW</strong><span>空間 → 設備 → 根拠</span></div>
                <div class="twin-detail" id="twin-detail"></div>
            </aside>
        </div>
        <div class="twin-bottom">
            <section class="twin-timeline-panel">
                <div class="twin-heading"><strong>EVENT / EVIDENCE TIMELINE</strong><span>review trace</span></div>
                <div class="twin-timeline" id="twin-timeline"></div>
            </section>
            <section class="twin-human-panel">
                <div class="twin-heading"><strong>HUMAN CONFIRMATION</strong><span>final responsibility</span></div>
                <div class="twin-human">
                    <span class="twin-section-title">Decision</span>
                    <div class="twin-human-status" id="twin-human-status">Pending Evidence</div>
                    <div class="twin-human-note">当前浏览器会话内的公开演示状态</div>
                    <div class="twin-human-actions">
                        <button type="button" data-human-action="confirmed">CONFIRM</button>
                        <button type="button" data-human-action="escalated">ESCALATE</button>
                        <button type="button" data-human-action="pending">PENDING EVIDENCE</button>
                    </div>
                </div>
            </section>
        </div>
    `;
    return root;
}

function renderTwinKpis(registry) {
    const assets = registry.assets ?? [];
    const container = document.querySelector('#twin-kpis');
    if (!container) return;
    const gaps = assets.filter(asset => asset.evidence_gap).length;
    const data = [
        ['Assets', assets.length, ''],
        ['Review Required', statusCount(assets, 'review_required'), 'alert'],
        ['In Review', statusCount(assets, 'in_review'), 'review'],
        ['Confirmed', statusCount(assets, 'confirmed'), 'confirmed'],
        ['Evidence Gaps', gaps, gaps ? 'alert' : ''],
    ];
    container.innerHTML = data.map(([label, value, klass]) => `<div class="twin-kpi ${klass}"><span>${twinEscape(label)}</span><strong>${twinEscape(value)}</strong></div>`).join('');
}

function renderTwinMap(registry, selectedId) {
    const map = document.querySelector('#twin-map');
    if (!map) return;
    const zones = (registry.zones ?? []).map(zone => `
        <div class="twin-zone" style="left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%">
            <span class="twin-zone-label">${twinEscape(zone.label)}</span>
        </div>`).join('');
    const assets = (registry.assets ?? []).map(asset => `
        <button type="button" class="twin-asset ${twinEscape(asset.status)}${asset.asset_id === selectedId ? ' selected' : ''}" data-twin-asset="${twinEscape(asset.asset_id)}" style="left:${asset.x}%;top:${asset.y}%" title="${twinEscape(asset.label)}">
            <span class="twin-node"></span>
            <span class="twin-asset-label">${twinEscape(asset.asset_id)}</span>
            <span class="twin-asset-name">${twinEscape(asset.label)}</span>
        </button>`).join('');
    map.innerHTML = `${zones}<div class="twin-flow" aria-hidden="true"></div>${assets}`;
}

function findRule(review, ruleId) {
    return (review.rule_results ?? []).find(rule => rule.rule_id === ruleId);
}

function ruleLabel(rule) {
    if (!rule) return 'REFERENCE';
    if (rule.status === 'pass') return 'PASS';
    return 'REVIEW';
}

function renderTwinDetail(registry, review, asset) {
    const detail = document.querySelector('#twin-detail');
    if (!detail || !asset) return;
    document.documentElement.dataset.twinAsset = asset.asset_id;
    const zone = (registry.zones ?? []).find(item => item.zone_id === asset.zone_id);
    const rules = (asset.linked_rules ?? []).map(ruleId => findRule(review, ruleId)).filter(Boolean);
    const docs = (asset.linked_documents ?? []).map(code => {
        const sourceIndex = (review.public_sources ?? []).findIndex(source => source.document_code === code);
        const official = sourceIndex >= 0;
        return `<button type="button" class="twin-doc" data-source-code="${twinEscape(code)}" data-source-index="${sourceIndex}">${official ? 'OFFICIAL · ' : 'DEMO · '}${twinEscape(code)} ↗</button>`;
    }).join('');
    const ruleRows = rules.length ? rules.map(rule => `
        <div class="twin-rule ${rule.status === 'pass' ? 'pass' : ''}">
            <code>${twinEscape(rule.rule_id)}</code>
            <span>${twinEscape(rule.title ?? '')}</span>
            <b>${twinEscape(ruleLabel(rule))}</b>
        </div>`).join('') : '<div class="twin-rule"><span>この点位に直接紐付くデモルールはありません。</span><b>REFERENCE</b></div>';
    detail.innerHTML = `
        <div class="twin-asset-head">
            <div><div class="twin-asset-code">${twinEscape(asset.asset_id)}</div><h3>${twinEscape(asset.label)}</h3></div>
            <span class="twin-state ${twinEscape(asset.status)}">${twinEscape(twinStatusLabels[asset.status] ?? asset.status)}</span>
        </div>
        <div class="twin-meta">
            <div><span>Zone</span><strong>${twinEscape(zone?.label ?? asset.zone_id)}</strong></div>
            <div><span>Owner</span><strong>${twinEscape(asset.owner_role)}</strong></div>
            <div><span>Product</span><strong>${twinEscape(asset.product_family)}</strong></div>
            <div><span>Linked entity</span><strong>${twinEscape(asset.linked_entity)}</strong></div>
        </div>
        <section class="twin-section">
            <span class="twin-section-title">Linked Documents</span>
            <div class="twin-chips">${docs}</div>
        </section>
        <section class="twin-section">
            <span class="twin-section-title">Evidence Topics</span>
            <div class="twin-chips">${(asset.evidence_topics ?? []).map(topic => `<span class="twin-chip">${twinEscape(topic)}</span>`).join('')}</div>
        </section>
        <section class="twin-section">
            <span class="twin-section-title">Rule Results</span>
            ${ruleRows}
        </section>
        <div class="twin-actions">
            <button type="button" class="twin-action" data-twin-action="3d">3D部品ビューを開く</button>
            <button type="button" class="twin-action primary" data-twin-action="ai">AIレビューで質問</button>
        </div>
        <div class="twin-detail-anchor"><strong>V1 boundary:</strong> 車間配置は公開デモ用の架空デジタルツインです。NORD資料は公式公開ソース、抽出値・判定・点位状態はデモレコードとして分離しています。</div>
    `;
}

function renderTwinTimeline(registry) {
    const container = document.querySelector('#twin-timeline');
    if (!container) return;
    container.innerHTML = (registry.timeline ?? []).map(item => `
        <div class="twin-event">
            <time>${twinEscape(item.time)}</time><span class="twin-event-dot"></span>
            <div><strong>${twinEscape(item.event)}</strong><span>${twinEscape(item.detail)}</span></div>
        </div>`).join('');
}

function scrollTo3d(asset) {
    const tab = document.querySelector(`.part-tab[data-asset="${CSS.escape(asset.linked_entity ?? '')}"]`);
    tab?.click();
    document.querySelector('.model-panel')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function prepareAiQuestion(asset) {
    const chatTab = document.querySelector('.nav-tab[data-view="chat-view"]');
    chatTab?.click();
    window.setTimeout(() => {
        const input = document.querySelector('#chat-input');
        if (!input) return;
        input.value = asset.ai_prompt ?? `${asset.asset_id} について、根拠付きでレビューしてください。`;
        input.focus();
    }, 80);
}

function openLinkedDocument(review, button) {
    const index = Number(button.dataset.sourceIndex ?? -1);
    if (index >= 0) {
        const card = document.querySelector(`#documents [data-public-source-index="${index}"]`);
        if (card) {
            card.click();
            return;
        }
    }
    document.querySelector('.documents-panel')?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function installTwinInteractions(registry, review, initialAsset) {
    let selected = initialAsset;
    restoreHumanStatus();
    const selectAsset = assetId => {
        const asset = (registry.assets ?? []).find(item => item.asset_id === assetId);
        if (!asset) return;
        selected = asset;
        renderTwinMap(registry, asset.asset_id);
        renderTwinDetail(registry, review, asset);
    };
    document.querySelector('#twin-map')?.addEventListener('click', event => {
        const button = event.target.closest('[data-twin-asset]');
        if (button) selectAsset(button.dataset.twinAsset);
    });
    document.querySelector('#twin-detail')?.addEventListener('click', event => {
        const doc = event.target.closest('.twin-doc');
        if (doc) return openLinkedDocument(review, doc);
        const action = event.target.closest('[data-twin-action]')?.dataset.twinAction;
        if (action === '3d') scrollTo3d(selected);
        if (action === 'ai') prepareAiQuestion(selected);
    });
    document.querySelector('.twin-human-actions')?.addEventListener('click', event => {
        const action = event.target.closest('[data-human-action]')?.dataset.humanAction;
        if (!action) return;
        const status = document.querySelector('#twin-human-status');
        if (!status) return;
        const now = writeHumanStatus(action);
        status.textContent = humanStatusText(action, now);
    });
}

async function bootDigitalTwin() {
    const reviewView = document.querySelector('#review-view');
    const detailGrid = reviewView?.querySelector('.grid');
    if (!reviewView || !detailGrid || document.querySelector('#digital-twin-root')) return;
    const [registryResponse, reviewResponse] = await Promise.all([
        fetch('/data/workshop-assets.json', {headers:{'Accept':'application/json'}}),
        fetch('/api/demo/review', {headers:{'Accept':'application/json'}}),
    ]);
    if (!registryResponse.ok || !reviewResponse.ok) throw new Error('Digital twin data could not be loaded.');
    const [registry, review] = await Promise.all([registryResponse.json(), reviewResponse.json()]);
    const root = buildTwinRoot(registry);
    detailGrid.before(root);

    const heroTitle = document.querySelector('.hero h1');
    const heroText = document.querySelector('.hero p');
    const eyebrow = document.querySelector('.hero .eyebrow');
    const reviewTab = document.querySelector('.nav-tab[data-view="review-view"]');
    if (heroTitle) heroTitle.textContent = '製造現場デジタルツイン・レビュー・ワークスペース';
    if (heroText) heroText.textContent = '製造現場を俯瞰し、設備から文書・根拠・AIレビュー・人手判断までを下掘りできる公開デモ。';
    if (eyebrow) eyebrow.textContent = 'DIGITAL TWIN / EVIDENCE REVIEW / PUBLIC DEMO';
    if (reviewTab) reviewTab.textContent = 'デジタルツイン・レビュー';

    renderTwinKpis(registry);
    renderTwinTimeline(registry);
    const initialAsset = (registry.assets ?? []).find(asset => asset.asset_id === registry.default_asset_id) ?? registry.assets?.[0];
    renderTwinMap(registry, initialAsset?.asset_id);
    renderTwinDetail(registry, review, initialAsset);
    installTwinInteractions(registry, review, initialAsset);
}

bootDigitalTwin().catch(error => console.error('[digital-twin]', error));

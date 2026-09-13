const reviewPromise = fetch('/api/demo/review').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
});

const documentLabels = {
    AssemblyDrawing: '組立図',
    WorkInstruction: '作業指示書',
    InspectionReport: '検査記録',
    AcceptanceReport: '受入記録',
};

const sourceLabels = {
    'assembly_drawing.json': '組立図',
    'work_instruction.json': '作業指示書',
    'inspection_report.json': '検査記録',
    'acceptance_report.json': '受入記録',
};

const sourceClassLabels = {
    Manual: '取扱・据付マニュアル',
    Catalogue: '技術カタログ',
    'Spare Parts List': 'スペアパーツリスト',
    'Product Brochure': '製品資料',
    'Application Brochure': '用途資料',
};

const assetLabels = {
    'GBX-042': 'コンパクト減速機アセンブリ',
    'GEARSET-01': '歯車ペア',
    'BRG-01': '出力側ベアリング',
};

const fieldLabels = {
    part_number: '部品番号',
    drawing_revision: '図面改訂番号',
    material_grade: '材質',
    lubricant_grade: '潤滑油種別',
    gear_ratio_design: '設計減速比',
    gear_ratio_measured: '実測減速比',
    clearance_min_mm: 'すきま下限（mm）',
    clearance_max_mm: 'すきま上限（mm）',
    clearance_measured_mm: '実測すきま（mm）',
    acceptance_status: '受入状態',
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function safeNordUrl(value, allowedHosts = ['www.nord.com', 'media.nord.com']) {
    try {
        const url = new URL(String(value ?? ''));
        return url.protocol === 'https:' && allowedHosts.includes(url.hostname) ? url.href : '';
    } catch {
        return '';
    }
}

function locatorText(locator) {
    if (!locator) return '';
    const labels = {page: 'ページ', table: '表', row: '行', section: '節', column: '列'};
    return Object.entries(locator)
        .map(([key, value]) => `${labels[key] ?? key}: ${value}`)
        .join(' · ');
}

function pageMatches(pageNumber, locator) {
    return !locator?.page || Number(locator.page) === Number(pageNumber);
}

function renderBlock(block, pageNumber, locator) {
    const sectionFocus = pageMatches(pageNumber, locator) && locator?.section && block.section === locator.section;
    const tableFocus = pageMatches(pageNumber, locator) && locator?.table && block.table === locator.table && !locator.row;
    const focusClass = sectionFocus || tableFocus ? ' doc-focus' : '';

    if (block.type === 'kv') {
        return `<section class="document-block${focusClass}">
            <h4>${escapeHtml(block.title ?? '基本情報')}</h4>
            <div class="document-kv">${(block.rows ?? []).map(row => `<div><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join('')}</div>
        </section>`;
    }

    if (block.type === 'table') {
        const headers = (block.columns ?? []).map(column => `<th>${escapeHtml(column)}</th>`).join('');
        const rows = (block.rows ?? []).map(row => {
            const rowFocus = pageMatches(pageNumber, locator) && locator?.table === block.table && String(locator?.row ?? '') === String(row.row ?? '');
            return `<tr class="${rowFocus ? 'doc-focus' : ''}">${(row.cells ?? []).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
        }).join('');
        return `<section class="document-block${focusClass}">
            <div class="document-block-title"><h4>${escapeHtml(block.title ?? '表')}</h4>${block.table ? `<span>${escapeHtml(block.table)}</span>` : ''}</div>
            <div class="document-table-wrap"><table class="document-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>
        </section>`;
    }

    if (block.type === 'list') {
        return `<section class="document-block${focusClass}"><h4>${escapeHtml(block.title ?? '注記')}</h4><ul>${(block.items ?? []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`;
    }

    return `<section class="document-block${focusClass}"><h4>${escapeHtml(block.title ?? '説明')}</h4><p>${escapeHtml(block.text ?? '')}</p></section>`;
}

function renderPages(doc, focusLocator) {
    const content = doc.document_content;
    if (!content?.pages?.length) return '';

    return `<div class="document-preview-shell">
        <div class="document-cover-strip"><div><strong>${escapeHtml(content.title ?? documentLabels[doc.document_type] ?? '文書')}</strong><span>${escapeHtml(content.subtitle ?? '')}</span></div><span>${content.pages.length} ページ構成</span></div>
        ${focusLocator ? `<div class="evidence-focus-banner">エビデンス位置を表示中：${escapeHtml(locatorText(focusLocator))}</div>` : ''}
        ${content.pages.map(page => `<article class="document-page" data-page="${escapeHtml(page.page)}">
            <div class="document-page-header"><span>${escapeHtml(content.title ?? '')}</span><strong>PAGE ${escapeHtml(page.page)}</strong></div>
            <h3>${escapeHtml(page.heading ?? '')}</h3>
            ${(page.blocks ?? []).map(block => renderBlock(block, page.page, focusLocator)).join('')}
            <div class="document-page-footer">公開デモ用・架空のレビュー抽出記録 / ${escapeHtml(doc.document_id)}</div>
        </article>`).join('')}
    </div>`;
}

function renderExtractedFields(doc) {
    return `<section class="extracted-section"><div class="extracted-heading"><strong>デモ抽出フィールド</strong><span>公式資料そのものではなく、レビュー動作を示すための架空レコード</span></div>${(doc.assets ?? []).map(asset => {
        const fields = Object.entries(asset.snapshot ?? {}).map(([key, value]) => `<div><span>${escapeHtml(fieldLabels[key] ?? key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
        return `<section class="extracted-asset"><h4>${escapeHtml(asset.asset_id)} · ${escapeHtml(assetLabels[asset.asset_id] ?? asset.asset_name)}</h4><div class="field-grid">${fields}</div></section>`;
    }).join('')}</section>`;
}

function showModal(doc, focusLocator = null) {
    const modal = document.querySelector('#document-modal');
    if (!modal) return;

    document.querySelector('#modal-title').textContent = documentLabels[doc.document_type] ?? doc.document_type;
    document.querySelector('#modal-meta').textContent = `${sourceLabels[doc.source_document] ?? doc.source_document} · ${doc.document_id} · 版 ${doc.document_version} · ${doc.document_date}`;

    const pages = renderPages(doc, focusLocator);
    document.querySelector('#modal-content').innerHTML = `<div class="demo-record-banner"><strong>DEMO REVIEW RECORD</strong><span>以下の抽出値・判定用データはNORDの仕様値ではありません。レビューUIを説明するための架空レコードです。</span></div>${pages || '<div class="empty-state">本文プレビューはありません。</div>'}`;
    document.querySelector('#modal-content').insertAdjacentHTML('beforeend', renderExtractedFields(doc));

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    if (focusLocator) {
        requestAnimationFrame(() => {
            const target = modal.querySelector('.doc-focus');
            target?.scrollIntoView({behavior: 'smooth', block: 'center'});
        });
    } else {
        modal.querySelector('.modal-card')?.scrollTo({top: 0});
    }
}

function showPublicSourceModal(source, boundaryNote = '') {
    const modal = document.querySelector('#document-modal');
    if (!modal) return;

    const officialUrl = safeNordUrl(source.official_url, ['www.nord.com']);
    const thumbnailUrl = safeNordUrl(source.thumbnail_url, ['media.nord.com']);
    const typeLabel = sourceClassLabels[source.document_class] ?? source.document_class;

    document.querySelector('#modal-title').textContent = `${source.document_code} · ${typeLabel}`;
    document.querySelector('#modal-meta').textContent = `${source.publisher} · 公式公開資料 · MAXXDRIVE®`;
    document.querySelector('#modal-content').innerHTML = `
        <section class="official-source-sheet">
            <div class="official-source-cover">
                <div class="official-source-image">${thumbnailUrl ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(source.document_code)} official document preview" loading="lazy">` : '<div class="source-image-fallback">NORD<br>MAXXDRIVE®</div>'}</div>
                <div class="official-source-identity">
                    <span class="official-badge">NORD · OFFICIAL PUBLIC SOURCE</span>
                    <div class="official-code">${escapeHtml(source.document_code)}</div>
                    <h3>${escapeHtml(source.title)}</h3>
                    <p>${escapeHtml(typeLabel)}</p>
                </div>
            </div>
            <div class="official-source-meta">
                <div><span>Publisher</span><strong>${escapeHtml(source.publisher)}</strong></div>
                <div><span>Product scope</span><strong>${escapeHtml(source.product_scope)}</strong></div>
                <div><span>Languages</span><strong>${escapeHtml((source.languages ?? []).join(' / '))}</strong></div>
                <div><span>Role in review</span><strong>${escapeHtml(source.role)}</strong></div>
                <div><span>Source ID</span><strong>${escapeHtml(source.source_id)}</strong></div>
                <div><span>Verified</span><strong>${escapeHtml(source.verified_on)}</strong></div>
            </div>
            ${officialUrl ? `<a class="official-source-action" href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener noreferrer">NORD公式資料を開く ↗</a>` : ''}
        </section>
        <section class="source-boundary-note">
            <strong>実資料とデモ判定の境界</strong>
            <p>${escapeHtml(boundaryNote || '公式公開資料は出典として参照します。抽出値・レビュー用ルール・判定結果はデモ用レコードとして分離しています。')}</p>
        </section>
    `;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-card')?.scrollTo({top: 0});
}

async function openDocumentByIndex(index, focusLocator = null) {
    const review = await reviewPromise;
    const doc = review.documents?.[index];
    if (doc) showModal(doc, focusLocator);
}

async function openPublicSourceByIndex(index) {
    const review = await reviewPromise;
    const source = review.public_sources?.[index];
    if (source) showPublicSourceModal(source, review.public_source_boundary ?? '');
}

async function openEvidence(evidence) {
    const review = await reviewPromise;
    const index = review.documents.findIndex(doc => doc.source_document === evidence.source_document || doc.document_type === evidence.document_type);
    if (index >= 0) showModal(review.documents[index], evidence.locator ?? null);
}

function renderPublicSourceCards(review) {
    const container = document.querySelector('#documents');
    const sources = review.public_sources ?? [];
    if (!container || sources.length === 0) return;

    container.innerHTML = sources.map((source, index) => {
        const image = safeNordUrl(source.thumbnail_url, ['media.nord.com']);
        const typeLabel = sourceClassLabels[source.document_class] ?? source.document_class;
        return `<button class="doc-card public-source-card" data-public-source-index="${index}">
            <div class="source-card-thumb">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span>NORD</span>'}</div>
            <div class="source-card-body">
                <div class="doc-type">0${index + 1} · 公式公開資料 · ${escapeHtml(typeLabel)}</div>
                <div class="doc-title">${escapeHtml(source.document_code)} · ${escapeHtml(source.title)}</div>
                <div class="doc-meta">${escapeHtml(source.publisher)}<br>${escapeHtml(source.product_scope)}</div>
                <div class="source-card-link">公式資料を確認 →</div>
            </div>
        </button>`;
    }).join('');

    const count = document.querySelector('#document-count');
    if (count) count.textContent = `${sources.length} 公式資料 · ${review.documents?.length ?? 0} デモ抽出記録`;

    const heading = document.querySelector('.documents-panel .panel-heading span');
    if (heading) heading.textContent = '公式公開資料';

    const note = document.querySelector('.documents-panel .legend-note');
    if (note) note.textContent = 'NORD DRIVESYSTEMS の公式公開資料を参照。クリックすると出典と公式ページを確認できます。';

    const hero = document.querySelector('.hero p');
    if (hero) hero.textContent = 'NORDの公式公開技術資料を出典として参照し、抽出・ルール・エビデンス・AI・人手確認を1つのレビュー体験にまとめた公開デモ。';

    const footer = document.querySelector('footer');
    if (footer) footer.textContent = 'NORD公式公開資料を出典として参照 · 抽出値・ルール・判定は公開デモ用の架空レコード · 顧客データは含まれていません';
}

const documents = document.querySelector('#documents');
documents?.addEventListener('click', event => {
    const card = event.target.closest('.doc-card');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (card.dataset.publicSourceIndex !== undefined) {
        openPublicSourceByIndex(Number(card.dataset.publicSourceIndex)).catch(console.error);
        return;
    }

    openDocumentByIndex(Number(card.dataset.documentIndex)).catch(console.error);
}, true);

reviewPromise.then(review => {
    renderPublicSourceCards(review);
    if (!documents) return;

    const sourceCardObserver = new MutationObserver(() => {
        if ((review.public_sources ?? []).length > 0 && !documents.querySelector('[data-public-source-index]')) {
            queueMicrotask(() => renderPublicSourceCards(review));
        }
    });
    sourceCardObserver.observe(documents, {childList: true});
}).catch(console.error);

const evidencePanel = document.querySelector('#evidence');
evidencePanel?.addEventListener('click', async event => {
    const card = event.target.closest('.evidence-card');
    if (!card) return;
    const cards = [...evidencePanel.querySelectorAll('.evidence-card')];
    const evidenceIndex = cards.indexOf(card);
    if (evidenceIndex < 0) return;

    try {
        const review = await reviewPromise;
        const selectedAsset = document.querySelector('.part-tab.active')?.dataset.asset ?? 'GBX-042';
        const rules = review.rule_results.filter(rule => rule.target_asset_id === selectedAsset);
        const evidence = rules.flatMap(rule => (rule.evidence ?? []).map(item => ({...item, rule_id: rule.rule_id})));
        if (evidence[evidenceIndex]) openEvidence(evidence[evidenceIndex]);
    } catch (error) {
        console.error(error);
    }
});

const observer = new MutationObserver(() => {
    document.querySelectorAll('#evidence .evidence-card').forEach(card => {
        card.classList.add('evidence-link');
        card.setAttribute('title', 'クリックしてデモ抽出レコードのエビデンス位置を開く');
        card.setAttribute('tabindex', '0');
    });
});

if (evidencePanel) observer.observe(evidencePanel, {childList: true});

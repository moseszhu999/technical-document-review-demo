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
            <div class="document-page-footer">公開デモ用・架空文書 / ${escapeHtml(doc.document_id)}</div>
        </article>`).join('')}
    </div>`;
}

function renderExtractedFields(doc) {
    return `<section class="extracted-section"><div class="extracted-heading"><strong>システム抽出フィールド</strong><span>原文からレビュー用に構造化された値</span></div>${(doc.assets ?? []).map(asset => {
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
    document.querySelector('#modal-content').innerHTML = pages || '<div class="empty-state">本文プレビューはありません。</div>';
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

async function openDocumentByIndex(index, focusLocator = null) {
    const review = await reviewPromise;
    const doc = review.documents?.[index];
    if (doc) showModal(doc, focusLocator);
}

async function openEvidence(evidence) {
    const review = await reviewPromise;
    const index = review.documents.findIndex(doc => doc.source_document === evidence.source_document || doc.document_type === evidence.document_type);
    if (index >= 0) showModal(review.documents[index], evidence.locator ?? null);
}

const documents = document.querySelector('#documents');
documents?.addEventListener('click', event => {
    const card = event.target.closest('.doc-card');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openDocumentByIndex(Number(card.dataset.documentIndex)).catch(console.error);
}, true);

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
        card.setAttribute('title', 'クリックして元文書のエビデンス位置を開く');
        card.setAttribute('tabindex', '0');
    });
});

if (evidencePanel) observer.observe(evidencePanel, {childList: true});

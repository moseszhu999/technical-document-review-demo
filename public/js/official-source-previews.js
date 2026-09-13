const officialSourceReviewPromise = fetch('/api/demo/review').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
});

function safeOfficialPdfUrl(value) {
    try {
        const url = new URL(String(value ?? ''));
        return url.protocol === 'https:' && url.hostname === 'www.nord.com' && url.pathname.toLowerCase().endsWith('.pdf') ? url.href : '';
    } catch {
        return '';
    }
}

function escapePreviewHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function ensurePreviewStyles() {
    if (document.querySelector('#official-source-preview-styles')) return;
    const style = document.createElement('style');
    style.id = 'official-source-preview-styles';
    style.textContent = `
        .official-key-previews{margin:18px 0;padding:16px;border:1px solid rgba(69,216,255,.22);border-radius:14px;background:linear-gradient(145deg,rgba(69,216,255,.055),rgba(255,255,255,.015))}
        .official-key-preview-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.official-key-preview-head strong{font-size:13px;color:#f3f6fb}.official-key-preview-head span{font:800 9px ui-monospace,SFMono-Regular,Menlo,monospace;color:#45d8ff;letter-spacing:.08em}
        .official-preview-note{margin:0 0 12px;color:#8997aa;font-size:10px;line-height:1.6}
        .official-preview-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.official-preview-tab{border:1px solid rgba(255,255,255,.11);background:#0b1220;color:#98a5b8;border-radius:9px;padding:8px 10px;font:800 9px ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer}.official-preview-tab:hover{border-color:rgba(69,216,255,.45);color:#fff}.official-preview-tab.active{border-color:rgba(69,216,255,.65);color:#fff;background:rgba(69,216,255,.11)}
        .official-preview-caption{display:grid;gap:4px;margin-bottom:10px}.official-preview-caption strong{font-size:12px;color:#eef3f9}.official-preview-caption span{font-size:10px;color:#8390a4;line-height:1.5}
        .official-pdf-shell{position:relative;border:1px solid rgba(255,255,255,.11);border-radius:11px;overflow:hidden;background:#111826}.official-pdf-frame{display:block;width:100%;height:min(62vh,680px);min-height:520px;border:0;background:#e6e9ee}
        .official-preview-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid rgba(255,255,255,.08);background:rgba(4,8,14,.92)}.official-preview-actions span{font-size:9px;color:#69788e}.official-preview-open{color:#45d8ff;text-decoration:none;font:800 9px ui-monospace,SFMono-Regular,Menlo,monospace}.official-preview-open:hover{color:#fff}
        @media(max-width:720px){.official-pdf-frame{min-height:420px;height:55vh}.official-key-preview-head,.official-preview-actions{flex-direction:column;align-items:flex-start}}
    `;
    document.head.appendChild(style);
}

function buildPdfPageUrl(pdfUrl, page) {
    return `${pdfUrl}#page=${encodeURIComponent(page)}&zoom=page-width`;
}

function installPreviewInteractions(section, source, pdfUrl) {
    const frame = section.querySelector('.official-pdf-frame');
    const title = section.querySelector('[data-preview-title]');
    const description = section.querySelector('[data-preview-description]');
    const pageLabel = section.querySelector('[data-preview-page]');
    const openLink = section.querySelector('.official-preview-open');
    const previews = source.key_previews ?? [];

    section.querySelectorAll('.official-preview-tab').forEach((button, index) => {
        button.addEventListener('click', () => {
            const preview = previews[index];
            if (!preview || !frame) return;
            section.querySelectorAll('.official-preview-tab').forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            const pageUrl = buildPdfPageUrl(pdfUrl, preview.page);
            frame.src = pageUrl;
            if (title) title.textContent = preview.title ?? `Page ${preview.page}`;
            if (description) description.textContent = preview.description ?? '';
            if (pageLabel) pageLabel.textContent = `PDF page ${preview.page}`;
            if (openLink) openLink.href = pageUrl;
        });
    });
}

async function enhanceOfficialSourceModal() {
    const content = document.querySelector('#modal-content');
    const sourceSheet = content?.querySelector('.official-source-sheet');
    if (!content || !sourceSheet || content.querySelector('.official-key-previews')) return;

    const review = await officialSourceReviewPromise;
    const code = (document.querySelector('#modal-title')?.textContent ?? '').split('·')[0].trim();
    const source = (review.public_sources ?? []).find(item => item.document_code === code);
    const pdfUrl = safeOfficialPdfUrl(source?.direct_pdf_url);
    const previews = source?.key_previews ?? [];
    if (!source || !pdfUrl || previews.length === 0) return;

    ensurePreviewStyles();
    const first = previews[0];
    const section = document.createElement('section');
    section.className = 'official-key-previews';
    section.innerHTML = `
        <div class="official-key-preview-head">
            <div><strong>公式PDF・実ページプレビュー</strong><div class="official-preview-caption"><span>NORD公式サーバー上のPDFを直接表示します。リポジトリにはPDF本体を複製していません。</span></div></div>
            <span>REAL PUBLIC SOURCE</span>
        </div>
        ${source.preview_note ? `<p class="official-preview-note">${escapePreviewHtml(source.preview_note)}</p>` : ''}
        <div class="official-preview-tabs">
            ${previews.map((preview, index) => `<button type="button" class="official-preview-tab${index === 0 ? ' active' : ''}">P.${escapePreviewHtml(preview.page)} · ${escapePreviewHtml(preview.title)}</button>`).join('')}
        </div>
        <div class="official-preview-caption">
            <strong data-preview-title>${escapePreviewHtml(first.title)}</strong>
            <span data-preview-description>${escapePreviewHtml(first.description)}</span>
        </div>
        <div class="official-pdf-shell">
            <iframe class="official-pdf-frame" src="${escapePreviewHtml(buildPdfPageUrl(pdfUrl, first.page))}" title="${escapePreviewHtml(source.document_code)} official PDF preview" loading="lazy" referrerpolicy="no-referrer"></iframe>
            <div class="official-preview-actions">
                <span data-preview-page>PDF page ${escapePreviewHtml(first.page)}</span>
                <a class="official-preview-open" href="${escapePreviewHtml(buildPdfPageUrl(pdfUrl, first.page))}" target="_blank" rel="noopener noreferrer">この実ページをNORD PDFで開く ↗</a>
            </div>
        </div>
    `;

    const boundary = content.querySelector('.source-boundary-note');
    if (boundary) boundary.before(section); else sourceSheet.after(section);
    installPreviewInteractions(section, source, pdfUrl);
}

const officialModalContent = document.querySelector('#modal-content');
if (officialModalContent) {
    const officialPreviewObserver = new MutationObserver(() => {
        queueMicrotask(() => enhanceOfficialSourceModal().catch(console.error));
    });
    officialPreviewObserver.observe(officialModalContent, {childList: true, subtree: true});
}

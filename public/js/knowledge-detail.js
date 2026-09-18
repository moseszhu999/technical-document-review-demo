(() => {
    const stepsByKnowledge = {
        'KB-001': [
            '対象図面の改訂番号を確認する',
            '検査記録・受入記録が参照する改訂番号と照合する',
            '差異がある場合は元文書と変更理由を確認する',
            'AIだけで確定せず、人手確認の結果を記録する',
        ],
        'KB-002': [
            '設計減速比と実測減速比が同じ対象・同じ単位か確認する',
            'DEMO-R02 の入力値と許容差を確認する',
            '判定に使った文書位置と値をエビデンスとして追跡する',
            '許容差を超えた場合は人にエスカレーションする',
        ],
        'KB-003': [
            '対象ベアリングと測定箇所を確認する',
            '下限値・上限値・実測値を同じ条件で比較する',
            '範囲外の場合は関連文書と測定記録を確認する',
            '最終的な適否は専門担当者が確認する',
        ],
        'KB-004': [
            '指摘事項に対応する元文書を特定する',
            'ページ・表・行・節などの位置情報まで追跡する',
            'ルールの入力値と判定結果を照合する',
            '根拠が不足する場合は結論を出さず、人に引き渡す',
        ],
    };

    const statusLabels = {
        pass: '適合',
        needs_review: '要確認',
        human_review_required: '人手確認が必要',
        candidate: '候補',
        unknown: '未確認',
        not_evaluated: '未評価',
    };

    const fieldLabels = {
        drawing_revision: '図面改訂番号',
        inspection_revision: '検査参照改訂番号',
        gear_ratio_design: '設計減速比',
        gear_ratio_measured: '実測減速比',
        clearance_min_mm: 'すきま下限（mm）',
        clearance_max_mm: 'すきま上限（mm）',
        clearance_measured_mm: '実測すきま（mm）',
    };

    const locatorLabels = {page: 'ページ', table: '表', row: '行', section: '節', column: '列'};

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function locatorText(locator) {
        if (!locator || Object.keys(locator).length === 0) return '位置情報なし';
        return Object.entries(locator)
            .map(([key, value]) => `${locatorLabels[key] ?? key}: ${value}`)
            .join(' · ');
    }

    function ensureStyles() {
        if (document.querySelector('#knowledge-detail-styles')) return;
        const style = document.createElement('style');
        style.id = 'knowledge-detail-styles';
        style.textContent = `
            /* ナレッジ詳細モーダルは配色を独自に持たない。サイズ・grid・間隔など構造だけを定義し、
               色はすべてページ共通トークン（--panel / --line / --text / --muted / --cyan / --red）と
               共有コンポーネント（.modal-card / .prompt-button / .primary-action / .status / .guidance / .modal-close）に従う。 */
            .knowledge-card[data-knowledge-detail]{cursor:pointer;position:relative;padding-bottom:48px}
            .knowledge-card[data-knowledge-detail]:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
            .knowledge-open-hint{position:absolute;left:18px;right:18px;bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--cyan);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em}
            .knowledge-open-hint:after{content:'→';font-size:13px}

            /* ダイアログの外殻・背景・開閉ボタンは .modal / .modal-backdrop / .modal-card / .modal-close を共有。
               ここではナレッジ詳細に必要なカード幅と内側の余白だけを上書きする。 */
            .knowledge-detail-card{width:min(980px,100%);padding:28px}
            .knowledge-detail-head{padding-right:44px;border-bottom:1px solid var(--line);padding-bottom:18px}
            .knowledge-detail-head h2{color:var(--text)}
            .knowledge-detail-head p{margin:0;color:var(--muted);font-size:14px;line-height:1.75}
            .knowledge-detail-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:9px}
            .knowledge-detail-badge{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--panel);color:var(--cyan);border-radius:999px;padding:5px 9px;font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}

            .knowledge-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
            .knowledge-detail-section{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:15px}
            .knowledge-detail-section.full{grid-column:1/-1}
            .knowledge-detail-section h3{margin:0 0 10px;color:var(--text);font-size:14px;letter-spacing:.04em}
            .knowledge-detail-section p{margin:0;color:var(--muted);font-size:13px;line-height:1.7}

            .knowledge-steps{display:grid;gap:9px;counter-reset:kstep}
            .knowledge-step{display:grid;grid-template-columns:26px 1fr;gap:9px;align-items:start;color:var(--text);font-size:13px;line-height:1.6}
            .knowledge-step:before{counter-increment:kstep;content:counter(kstep);width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:var(--panel-soft,var(--panel));border:1px solid var(--line);color:var(--cyan);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace}

            /* 関連ルール／エビデンスは入れ子カードをやめ、境界線だけで視覚段数を減らす。 */
            .knowledge-rule-stack,.knowledge-evidence-stack{display:grid}
            .knowledge-rule-item,.knowledge-evidence-item{padding:11px 0;border-top:1px solid var(--line)}
            .knowledge-rule-item:first-child,.knowledge-evidence-item:first-child{border-top:0;padding-top:0}
            .knowledge-rule-item:last-child,.knowledge-evidence-item:last-child{padding-bottom:0}
            .knowledge-rule-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:5px}
            .knowledge-rule-top code{color:var(--cyan);font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace}
            .knowledge-rule-top .status{margin:0}
            .knowledge-rule-item strong,.knowledge-evidence-item strong{display:block;color:var(--text);font-size:13px;margin-bottom:5px}
            .knowledge-rule-inputs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
            .knowledge-rule-inputs span{border:1px solid var(--line);background:var(--panel-soft,var(--panel));color:var(--muted);border-radius:999px;padding:4px 8px;font-size:11px}
            .knowledge-evidence-source{color:var(--cyan);font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:5px}
            .knowledge-evidence-item p{font-size:12px}

            .knowledge-keywords{display:flex;gap:6px;flex-wrap:wrap}
            .knowledge-keywords span{border:1px solid var(--line);background:var(--panel-soft,var(--panel));color:var(--muted);border-radius:999px;padding:5px 9px;font-size:11px}

            /* ボタンの配色は .prompt-button（secondary）／.primary-action（primary）に任せ、ここは行レイアウトだけ。 */
            .knowledge-detail-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}
            .knowledge-detail-actions .prompt-button,.knowledge-detail-actions .primary-action{flex:1 1 200px;width:auto;margin:0;padding:11px 14px;border-radius:11px;text-align:center;font:700 12px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif;letter-spacing:.02em}

            /* 末尾の注意書きはページ共通の .guidance コールアウトを共有し、外側の間隔だけを上書きする。 */
            .knowledge-boundary.guidance{margin:16px 0 0;padding:11px 13px;font-size:12px;line-height:1.75}

            .knowledge-load-error{padding:22px;border:1px solid var(--red);background:var(--panel);color:var(--red);border-radius:14px}
            .knowledge-load-error strong{display:block;font-size:15px;margin-bottom:8px;color:var(--red)}
            .knowledge-load-error p{margin:0;font-size:13px;line-height:1.7;color:var(--muted)}
            .knowledge-focus{outline:2px solid var(--cyan);outline-offset:2px}

            @media(max-width:760px){
                .knowledge-detail-grid{grid-template-columns:1fr}
                .knowledge-detail-section.full{grid-column:auto}
                .knowledge-detail-card{padding:20px}
                .knowledge-detail-actions .prompt-button,.knowledge-detail-actions .primary-action{flex-basis:100%}
            }
        `;
        document.head.appendChild(style);
    }

    function createModal() {
        if (document.querySelector('#knowledge-detail-modal')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="knowledge-detail-modal" class="modal hidden" aria-hidden="true">
                <div class="modal-backdrop" data-knowledge-close></div>
                <section class="modal-card knowledge-detail-card" role="dialog" aria-modal="true" aria-labelledby="knowledge-detail-title">
                    <button type="button" class="knowledge-detail-close modal-close" data-knowledge-close aria-label="閉じる">×</button>
                    <div id="knowledge-detail-content"></div>
                </section>
            </div>
        `);
    }

    async function fetchJson(url, options = {}) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {...options, signal: controller.signal});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    const dataPromise = Promise.all([
        fetchJson('/api/demo/knowledge', {headers:{'Accept':'application/json'}}),
        fetchJson('/api/demo/review', {headers:{'Accept':'application/json'}}),
        fetchJson('/api/demo/rules', {headers:{'Accept':'application/json'}}),
    ]);

    function showKnowledgeError(error) {
        const content = document.querySelector('#knowledge-detail-content');
        const modal = document.querySelector('#knowledge-detail-modal');
        if (!content || !modal) return;
        content.innerHTML = '<div class="knowledge-load-error" role="alert"><strong>ナレッジ詳細を読み込めませんでした。</strong><p>ネットワーク状態を確認して、もう一度お試しください。</p></div>';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.querySelector('.knowledge-detail-close')?.focus();
        console.error(error);
    }

    function renderRule(ruleId, ruleCatalog, review) {
        const rule = (ruleCatalog.rules ?? []).find(item => item.rule_id === ruleId);
        const evaluation = (review.rule_results ?? []).find(item => item.rule_id === ruleId);
        const status = evaluation?.status ?? 'not_evaluated';
        const inputs = (evaluation?.inputs ?? []).map(input => `<span>${escapeHtml(fieldLabels[input.name] ?? input.name)}: ${escapeHtml(input.value ?? 'なし')}</span>`).join('');
        return `
            <div class="knowledge-rule-item" data-knowledge-rule="${escapeHtml(ruleId)}">
                <div class="knowledge-rule-top"><code>${escapeHtml(ruleId)}</code><span class="status ${status === 'pass' ? 'status-pass' : 'status-review'}">${escapeHtml(statusLabels[status] ?? status)}</span></div>
                <strong>${escapeHtml(rule?.title ?? evaluation?.title ?? '関連ルール')}</strong>
                <p>${escapeHtml(rule?.judgment ?? rule?.public_rule ?? evaluation?.public_rule ?? '現在のレビュー結果と根拠を確認してください。')}</p>
                ${inputs ? `<div class="knowledge-rule-inputs">${inputs}</div>` : ''}
            </div>`;
    }

    function renderEvidence(item, review) {
        const evidence = (review.rule_results ?? [])
            .filter(rule => (item.linked_rules ?? []).includes(rule.rule_id))
            .flatMap(rule => (rule.evidence ?? []).map(entry => ({...entry, rule_id: rule.rule_id})));
        if (!evidence.length) return '<p>現在、このナレッジに直接紐付くエビデンスはありません。</p>';
        return `<div class="knowledge-evidence-stack">${evidence.map(entry => `
            <div class="knowledge-evidence-item">
                <div class="knowledge-evidence-source">${escapeHtml(entry.rule_id)} · ${escapeHtml(entry.source_document ?? entry.document_type ?? 'SOURCE')}</div>
                <strong>${escapeHtml(entry.value ?? '値なし')}</strong>
                <p>${escapeHtml(locatorText(entry.locator))}</p>
            </div>`).join('')}</div>`;
    }

    async function openKnowledge(knowledgeId) {
        const [knowledge, review, ruleCatalog] = await dataPromise;
        const item = (knowledge.items ?? []).find(entry => entry.knowledge_id === knowledgeId);
        if (!item) return;
        const steps = stepsByKnowledge[item.knowledge_id] ?? [
            '関連する文書と対象を確認する',
            'ルール入力と根拠位置を確認する',
            'AI候補と確定判断を分けて扱う',
            '最終判断を人が確認する',
        ];
        const rulesHtml = (item.linked_rules ?? []).length
            ? `<div class="knowledge-rule-stack">${item.linked_rules.map(id => renderRule(id, ruleCatalog, review)).join('')}</div>`
            : '<p>このナレッジに直接紐付くルールはありません。</p>';
        const content = document.querySelector('#knowledge-detail-content');
        content.innerHTML = `
            <header class="knowledge-detail-head">
                <div class="knowledge-detail-badges"><span class="knowledge-detail-badge">${escapeHtml(item.knowledge_id)}</span><span class="knowledge-detail-badge">${escapeHtml(item.category)}</span></div>
                <h2 id="knowledge-detail-title">${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.summary)}</p>
            </header>
            <div class="knowledge-detail-grid">
                <section class="knowledge-detail-section"><h3>レビュー時の考え方</h3><p>${escapeHtml(item.guidance)}</p></section>
                <section class="knowledge-detail-section"><h3>確認ステップ</h3><div class="knowledge-steps">${steps.map(step => `<div class="knowledge-step">${escapeHtml(step)}</div>`).join('')}</div></section>
                <section class="knowledge-detail-section"><h3>関連ルールと現在の判定</h3>${rulesHtml}</section>
                <section class="knowledge-detail-section"><h3>根拠・エビデンス</h3>${renderEvidence(item, review)}</section>
                <section class="knowledge-detail-section full"><h3>検索キーワード</h3><div class="knowledge-keywords">${(item.keywords ?? []).map(keyword => `<span>${escapeHtml(keyword)}</span>`).join('')}</div></section>
            </div>
            <div class="knowledge-detail-actions">
                <button type="button" class="prompt-button" data-knowledge-action="rules">ルールカタログで確認</button>
                <button type="button" class="prompt-button" data-knowledge-action="review">レビュー画面で根拠を確認</button>
                <button type="button" class="primary-action" data-knowledge-action="ai">このナレッジをAIに質問</button>
            </div>
            <div class="knowledge-boundary guidance">このナレッジは公開デモ用の架空データです。AIの回答・候補だけで最終判断せず、ルールと元文書の根拠を人が確認する設計を示しています。</div>
        `;
        content.dataset.knowledgeId = item.knowledge_id;
        const modal = document.querySelector('#knowledge-detail-modal');
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.querySelector('.knowledge-detail-card')?.scrollTo({top: 0});
        modal.querySelector('.knowledge-detail-close')?.focus();
    }

    function closeKnowledge() {
        const modal = document.querySelector('#knowledge-detail-modal');
        modal?.classList.add('hidden');
        modal?.setAttribute('aria-hidden', 'true');
    }

    function activateTab(viewId) {
        document.querySelector(`.nav-tab[data-view="${viewId}"]`)?.click();
    }

    async function handleAction(action) {
        const id = document.querySelector('#knowledge-detail-content')?.dataset.knowledgeId;
        const [knowledge] = await dataPromise;
        const item = (knowledge.items ?? []).find(entry => entry.knowledge_id === id);
        if (!item) return;
        if (action === 'rules') {
            closeKnowledge();
            activateTab('rules-view');
            window.setTimeout(() => {
                document.querySelectorAll('.rule-row').forEach(row => row.classList.remove('knowledge-focus'));
                const ruleId = item.linked_rules?.[0];
                const row = [...document.querySelectorAll('.rule-row')].find(node => ruleId && node.textContent.includes(ruleId));
                row?.classList.add('knowledge-focus');
                row?.scrollIntoView({behavior:'smooth', block:'center'});
            }, 100);
        }
        if (action === 'review') {
            closeKnowledge();
            activateTab('review-view');
            const [,, ruleCatalog] = await dataPromise;
            const firstRuleId = item.linked_rules?.[0];
            const rule = (ruleCatalog.rules ?? []).find(entry => entry.rule_id === firstRuleId);
            const target = rule?.target_asset_id;
            if (target) window.setTimeout(() => document.querySelector(`.part-tab[data-asset="${CSS.escape(target)}"]`)?.click(), 100);
            window.setTimeout(() => document.querySelector('#evidence')?.scrollIntoView({behavior:'smooth', block:'center'}), 140);
        }
        if (action === 'ai') {
            closeKnowledge();
            activateTab('chat-view');
            window.setTimeout(() => {
                const input = document.querySelector('#chat-input');
                if (!input) return;
                input.value = `${item.knowledge_id}「${item.title}」について、関連ルールと根拠を使って説明してください。`;
                input.focus();
            }, 100);
        }
    }

    function decorateKnowledgeCards() {
        document.querySelectorAll('#knowledge-list .knowledge-card').forEach(card => {
            const id = card.querySelector('.knowledge-id')?.textContent?.trim();
            if (!id || card.dataset.knowledgeDetail === id) return;
            card.dataset.knowledgeDetail = id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${id} の詳細を開く`);
            if (!card.querySelector('.knowledge-open-hint')) card.insertAdjacentHTML('beforeend', '<div class="knowledge-open-hint"><span>詳細・関連ルール・根拠を確認</span></div>');
        });
    }

    function boot() {
        ensureStyles();
        createModal();
        const list = document.querySelector('#knowledge-list');
        if (!list) return;
        decorateKnowledgeCards();
        new MutationObserver(decorateKnowledgeCards).observe(list, {childList:true, subtree:true});
        list.addEventListener('click', event => {
            const card = event.target.closest('.knowledge-card[data-knowledge-detail]');
            if (card) openKnowledge(card.dataset.knowledgeDetail).catch(showKnowledgeError);
        });
        list.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const card = event.target.closest('.knowledge-card[data-knowledge-detail]');
            if (!card) return;
            event.preventDefault();
            openKnowledge(card.dataset.knowledgeDetail).catch(showKnowledgeError);
        });
        document.querySelector('#knowledge-detail-modal')?.addEventListener('click', event => {
            if (event.target.closest('[data-knowledge-close]')) closeKnowledge();
            const action = event.target.closest('[data-knowledge-action]')?.dataset.knowledgeAction;
            if (action) handleAction(action).catch(console.error);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !document.querySelector('#knowledge-detail-modal')?.classList.contains('hidden')) closeKnowledge();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();

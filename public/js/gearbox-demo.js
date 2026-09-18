import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#gearbox-canvas');
const stage = document.querySelector('#model-stage');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(10, 7, 11);

const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, .2, 0);
controls.minDistance = 7;
controls.maxDistance = 23;

scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x090b0f, 2.2));
const key = new THREE.DirectionalLight(0xffd9d0, 5);
key.position.set(7, 9, 8);
scene.add(key);
const rim = new THREE.PointLight(0x459cff, 36, 25);
rim.position.set(-7, 2, -5);
scene.add(rim);
const red = new THREE.PointLight(0xff314f, 32, 20);
red.position.set(5, -1, 6);
scene.add(red);

const componentRoots = new Map();
const selectable = [];
const materials = {
    housing: new THREE.MeshPhysicalMaterial({color: 0x3b465b, metalness: .68, roughness: .28, transparent: true, opacity: .32, side: THREE.DoubleSide}),
    gear: new THREE.MeshStandardMaterial({color: 0xb8c4d6, metalness: .88, roughness: .24, emissive: 0x000000}),
    gear2: new THREE.MeshStandardMaterial({color: 0x7d8ba0, metalness: .9, roughness: .2, emissive: 0x000000}),
    shaft: new THREE.MeshStandardMaterial({color: 0x59677d, metalness: .92, roughness: .18, emissive: 0x000000}),
    bearing: new THREE.MeshStandardMaterial({color: 0xff6a5f, metalness: .7, roughness: .25, emissive: 0x000000}),
};

function mark(group, assetId, name) {
    group.userData.assetId = assetId;
    group.userData.name = name;
    group.traverse(child => {
        if (child.isMesh) {
            child.userData.assetId = assetId;
            child.userData.name = name;
            selectable.push(child);
        }
    });
    componentRoots.set(assetId, group);
}

function gear(radius, width, teeth, material) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius * .72, width, 48), material);
    core.rotation.z = Math.PI / 2;
    group.add(core);
    for (let i = 0; i < teeth; i++) {
        const angle = i / teeth * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(width, radius * .24, radius * .15), material);
        tooth.position.set(0, Math.cos(angle) * radius * .83, Math.sin(angle) * radius * .83);
        tooth.rotation.x = angle;
        group.add(tooth);
    }
    return group;
}

const housing = new THREE.Group();
const shell = new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.8, 4.4), materials.housing);
housing.add(shell);
const topRib = new THREE.Mesh(new THREE.BoxGeometry(5.8, .22, 4.65), new THREE.MeshStandardMaterial({color:0x46546b,metalness:.7,roughness:.3}));
topRib.position.y = 2.1;
housing.add(topRib);
mark(housing, 'GBX-042', 'コンパクト減速機アセンブリ');
scene.add(housing);

const shaft1 = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,8.8,24),materials.shaft);
shaft1.rotation.z=Math.PI/2;
shaft1.position.set(0,.75,0);
scene.add(shaft1);

const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,8.6,24),materials.shaft);
shaft2.rotation.z=Math.PI/2;
shaft2.position.set(0,-.9,0);
scene.add(shaft2);

const gearSet = new THREE.Group();
const g1 = gear(1.35,.68,22,materials.gear);
g1.position.set(-.55,.75,0);
gearSet.add(g1);
const g2 = gear(1.62,.78,28,materials.gear2);
g2.position.set(.5,-.9,0);
gearSet.add(g2);
mark(gearSet,'GEARSET-01','歯車ペア');
scene.add(gearSet);

const bearing = new THREE.Group();
const outer = new THREE.Mesh(new THREE.TorusGeometry(.72,.19,20,48),materials.bearing);
outer.rotation.y=Math.PI/2;
bearing.add(outer);
const inner = new THREE.Mesh(new THREE.TorusGeometry(.43,.08,16,40),materials.shaft);
inner.rotation.y=Math.PI/2;
bearing.add(inner);
bearing.position.set(3.35,-.9,0);
mark(bearing,'BRG-01','出力側ベアリング');
scene.add(bearing);

const floor = new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshBasicMaterial({color:0x0b1120,transparent:true,opacity:.52}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-2.55;
scene.add(floor);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedAsset = 'GBX-042';
let reviewData = null;
let knowledgeData = {items: []};
let ruleCatalog = {rules: []};

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
    drawing_revision: '図面改訂番号',
    inspection_revision: '検査参照改訂番号',
    gear_ratio_design: '設計減速比',
    gear_ratio_measured: '実測減速比',
    clearance_min_mm: 'すきま下限（mm）',
    clearance_max_mm: 'すきま上限（mm）',
    clearance_measured_mm: '実測すきま（mm）',
    design: '設計値',
    measured: '実測値',
    minimum: '下限値',
    maximum: '上限値',
    part_number: '部品番号',
    material_grade: '材質',
    lubricant_grade: '潤滑油種別',
};

const taskLabels = {
    field_extraction: '項目抽出候補',
    entity_linking: 'エンティティ関連付け候補',
    evidence_location: 'エビデンス位置特定候補',
};

const statusLabels = {
    pass: '適合',
    needs_review: '要確認',
    candidate: '候補',
    unknown: '未確認',
    not_evaluated: '未評価',
    human_review_required: '人手確認が必要',
    no_issue_found: '問題なし',
};

const outputLabels = {
    pass: '適合',
    revision_consistent: '改訂番号は整合',
    drawing_revision_mismatch: '図面改訂番号に差異',
    ratio_within_demo_tolerance: '減速比は許容範囲内',
    ratio_out_of_tolerance: '減速比が許容範囲外',
    clearance_within_demo_range: 'すきまは範囲内',
    clearance_out_of_range: 'すきまが範囲外',
    not_evaluated: '未評価',
};

const locatorLabels = {
    page: 'ページ',
    table: '表',
    row: '行',
    section: '節',
    column: '列',
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function fieldLabel(value) {
    return fieldLabels[value] ?? value;
}

function documentLabel(value) {
    return documentLabels[value] ?? value;
}

function sourceLabel(value) {
    return sourceLabels[value] ?? value;
}

function statusLabel(value) {
    return statusLabels[value] ?? value;
}

function outputLabel(value) {
    return outputLabels[value] ?? value;
}

function setAsset(assetId) {
    selectedAsset = assetId;
    document.querySelectorAll('.part-tab').forEach(button => button.classList.toggle('active', button.dataset.asset === assetId));
    componentRoots.forEach((group,id) => {
        group.traverse(child => {
            if (!child.isMesh || !child.material?.emissive) return;
            child.material.emissive.setHex(id === assetId ? 0x471018 : 0x000000);
            child.material.emissiveIntensity = id === assetId ? .7 : 0;
        });
    });
    const root = componentRoots.get(assetId);
    document.querySelector('#selected-name').textContent = root?.userData.name ?? assetLabels[assetId] ?? assetId;
    document.querySelector('#selected-id').textContent = assetId;
    renderReviewPanels();
}

document.querySelectorAll('.part-tab').forEach(button => button.addEventListener('click', () => setAsset(button.dataset.asset)));
canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer,camera);
    const hit = raycaster.intersectObjects(selectable,false)[0];
    if (hit?.object?.userData?.assetId) setAsset(hit.object.userData.assetId);
});

function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    renderer.setSize(width,height,false);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    gearSet.rotation.x += .0016;
    renderer.render(scene,camera);
}
animate();

function locatorText(locator) {
    if (!locator) return '位置情報: なし';
    return Object.entries(locator).map(([key,value]) => `${escapeHtml(locatorLabels[key] ?? key)}: ${escapeHtml(value)}`).join(' · ');
}

function renderDocuments() {
    const container = document.querySelector('#documents');
    document.querySelector('#document-count').textContent = `${reviewData.documents.length} 文書 · ${reviewData.entities.length} 対象`; 
    container.innerHTML = reviewData.documents.map((doc,index) => `
        <button class="doc-card" data-document-index="${index}">
            <div class="doc-type">0${index+1} · ${escapeHtml(documentLabel(doc.document_type))}</div>
            <div class="doc-title">${escapeHtml(documentLabel(doc.document_type))}</div>
            <div class="doc-meta">${escapeHtml(sourceLabel(doc.source_document))}<br>版 ${escapeHtml(doc.document_version)} · ${escapeHtml(doc.document_date)}</div>
        </button>
    `).join('');
    container.querySelectorAll('.doc-card').forEach(button => button.addEventListener('click', () => openDocument(Number(button.dataset.documentIndex))));
}

function renderReviewPanels() {
    if (!reviewData) return;
    const rules = reviewData.rule_results.filter(rule => rule.target_asset_id === selectedAsset);
    document.querySelector('#rules').innerHTML = rules.length ? rules.map(rule => {
        const inputs = (rule.inputs ?? []).map(input => `<div class="rule-input"><span>${escapeHtml(fieldLabel(input.name))}</span><strong>${escapeHtml(input.value ?? 'なし')}</strong></div>`).join('');
        return `<div class="rule-card selected"><div class="rule-id">${escapeHtml(rule.rule_id)}</div><div class="rule-title">${escapeHtml(rule.title)}</div><div class="rule-text">${escapeHtml(rule.public_rule)}</div><div class="rule-inputs">${inputs}</div><span class="status ${rule.status === 'pass' ? 'status-pass' : 'status-review'}">${escapeHtml(statusLabel(rule.status))}</span></div>`;
    }).join('') : '<div class="rule-card"><div class="rule-text">この部品に直接紐付く公開デモルールはありません。</div></div>';

    const evidence = rules.flatMap(rule => (rule.evidence ?? []).map(item => ({...item, rule_id:rule.rule_id})));
    document.querySelector('#evidence').innerHTML = evidence.length ? evidence.map(item => `<div class="evidence-card"><div class="evidence-source">${escapeHtml(item.rule_id)} · ${escapeHtml(sourceLabel(item.source_document))}</div><div class="evidence-value">${escapeHtml(item.value)}</div><div class="evidence-locator">${escapeHtml(documentLabel(item.document_type))}<br>${locatorText(item.locator)}</div></div>`).join('') : '<div class="evidence-card"><div class="evidence-locator">部品を選ぶと関連エビデンスを表示します。</div></div>';

    const candidates = (reviewData.ai_assist?.candidates ?? []).filter(item => item.asset_id === selectedAsset);
    document.querySelector('#ai-candidates').innerHTML = candidates.length ? candidates.map(item => `<div class="ai-card"><div class="ai-task">${escapeHtml(taskLabels[item.task] ?? item.task)}</div><div class="rule-title">${escapeHtml(item.candidate_id)}</div><div class="ai-meta">${escapeHtml(sourceLabel(item.source_document))}<br>${item.field ? `${escapeHtml(fieldLabel(item.field))}: ${escapeHtml(item.candidate_value)}` : escapeHtml(item.source_label ?? '')}</div><div class="confidence">信頼度 ${Math.round(item.confidence*100)}% · ${escapeHtml(statusLabel(item.status))}</div></div>`).join('') : '<div class="ai-card"><div class="ai-meta">この部品に紐付くAI候補はありません。</div></div>';
}

function renderKnowledge(filter = '') {
    const query = filter.trim().toLowerCase();
    const items = knowledgeData.items.filter(item => {
        const haystack = [item.title,item.category,item.summary,item.guidance,...(item.keywords ?? []),...(item.linked_rules ?? [])].join(' ').toLowerCase();
        return !query || haystack.includes(query);
    });
    document.querySelector('#knowledge-list').innerHTML = items.length ? items.map(item => `<article class="knowledge-card"><div class="knowledge-top"><span class="knowledge-id">${escapeHtml(item.knowledge_id)}</span><span class="knowledge-category">${escapeHtml(item.category)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><div class="guidance">${escapeHtml(item.guidance)}</div><div class="linked">${(item.linked_rules ?? []).map(rule => `<span>${escapeHtml(rule)}</span>`).join('')}</div></article>`).join('') : '<div class="empty-state">該当するナレッジがありません。</div>';
}

function renderRuleCatalog() {
    const evaluations = new Map((reviewData?.rule_results ?? []).map(item => [item.rule_id, item]));
    const passCount = [...evaluations.values()].filter(item => item.status === 'pass').length;
    const reviewCount = [...evaluations.values()].filter(item => item.status !== 'pass').length;
    document.querySelector('#rule-summary').innerHTML = `<span class="summary-chip"><strong>${ruleCatalog.rules.length}</strong> ルール</span><span class="summary-chip"><strong>${passCount}</strong> 適合</span><span class="summary-chip"><strong>${reviewCount}</strong> 要確認</span>`;
    document.querySelector('#rule-catalog').innerHTML = ruleCatalog.rules.map(rule => {
        const evaluation = evaluations.get(rule.rule_id);
        const inputValues = new Map((evaluation?.inputs ?? []).map(item => [item.name, item.value]));
        return `<article class="rule-row"><div class="rule-cell"><label>ルール</label><strong>${escapeHtml(rule.rule_id)}</strong><p>${escapeHtml(rule.title)}</p></div><div class="rule-cell"><label>入力</label><div class="input-stack">${rule.inputs.map(input => `<div>${escapeHtml(fieldLabel(input.name))} <span>· ${escapeHtml(documentLabel(input.document_type))}</span><br><strong>${escapeHtml(inputValues.get(input.name) ?? 'なし')}</strong></div>`).join('')}</div></div><div class="rule-cell"><label>判断</label><p>${escapeHtml(rule.judgment ?? rule.public_rule)}</p>${rule.parameters?.max_relative_error_percent ? `<p>デモ用許容差: ${escapeHtml(rule.parameters.max_relative_error_percent)}%</p>` : ''}</div><div class="rule-cell"><label>結果</label><div class="output-code">${escapeHtml(outputLabel(evaluation?.output_code ?? 'not_evaluated'))}</div><p>${escapeHtml(statusLabel(evaluation?.status ?? 'unknown'))}</p></div><div class="rule-cell"><label>エビデンス / 確認</label><p>${(rule.evidence_requirements ?? []).map(escapeHtml).join('<br>')}</p><div class="review-mark">${rule.human_review ? '● 人手確認' : '○ 自動判定'}</div></div></article>`;
    }).join('');
}

function openDocument(index) {
    const doc = reviewData.documents[index];
    if (!doc) return;
    document.querySelector('#modal-title').textContent = documentLabel(doc.document_type);
    document.querySelector('#modal-meta').textContent = `${sourceLabel(doc.source_document)} · ${doc.document_id} · 版 ${doc.document_version} · ${doc.document_date}`;
    document.querySelector('#modal-content').innerHTML = doc.assets.map(asset => {
        const fields = Object.entries(asset.snapshot ?? {}).map(([key,value]) => `<div><span>${escapeHtml(fieldLabel(key))}</span>${escapeHtml(value)}</div>`).join('');
        return `<section class="doc-section"><h4>${escapeHtml(asset.asset_id)} · ${escapeHtml(assetLabels[asset.asset_id] ?? asset.asset_name)}</h4><div class="field-grid">${fields}</div></section>`;
    }).join('');
    const modal = document.querySelector('#document-modal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

function closeDocument() {
    const modal = document.querySelector('#document-modal');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
}

document.querySelector('#modal-close').addEventListener('click', closeDocument);
document.querySelector('.modal-backdrop').addEventListener('click', closeDocument);
document.addEventListener('keydown', event => {
    const modal = document.querySelector('#document-modal');
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeDocument();
});

function activateView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === viewId));
    if (viewId === 'knowledge-view') renderKnowledge(document.querySelector('#knowledge-search').value);
}

document.querySelectorAll('.nav-tab').forEach(tab => tab.addEventListener('click', () => activateView(tab.dataset.view)));
document.querySelector('#open-chat').addEventListener('click', () => activateView('chat-view'));
document.querySelector('#knowledge-search').addEventListener('input', event => renderKnowledge(event.target.value));

function renderChatText(role, text) {
    const escaped = escapeHtml(text).replace(/\r\n?/g, '\n');
    if (role !== 'assistant') return escaped.replace(/\n/g, '<br>');

    return escaped
        .replace(/^###\s+(.+)$/gm, '<strong class="chat-heading">$1</strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^-\s+(.+)$/gm, '<span class="chat-list-item">• $1</span>')
        .replace(/\n/g, '<br>');
}

function addChatMessage(role, text, sources = []) {
    const messages = document.querySelector('#chat-messages');
    const node = document.createElement('div');
    node.className = `chat-message ${role}`;
    node.innerHTML = `<div class="chat-avatar">${role === 'user' ? '自分' : 'AI'}</div><div><div class="chat-bubble">${renderChatText(role, text)}</div>${sources.length ? `<div class="chat-sources">${sources.map(escapeHtml).join(' · ')}</div>` : ''}</div>`;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
}

function createStreamingMessage() {
    const messages = document.querySelector('#chat-messages');
    const node = document.createElement('div');
    node.className = 'chat-message assistant';
    node.innerHTML = `<div class="chat-avatar">AI</div><div><div class="chat-phase"><span class="chat-phase-label">ルールとエビデンスを照合中</span><span class="stream-cursor"></span></div><div class="chat-bubble chat-bubble-streaming" hidden></div><div class="chat-sources" hidden></div></div>`;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return {
        node,
        phase: node.querySelector('.chat-phase'),
        bubble: node.querySelector('.chat-bubble'),
        sources: node.querySelector('.chat-sources'),
    };
}

async function askAssistant(message) {
    addChatMessage('user', message);
    const ui = createStreamingMessage();
    const messagesEl = document.querySelector('#chat-messages');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75000);

    try {
        const response = await fetch('/api/demo/chat/stream', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'text/event-stream'},
            body: JSON.stringify({message}),
            signal: controller.signal,
        });

        if (!response.ok || !response.body) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let answer = '';
        let receivedDone = false;

        const handleEvent = (event, data) => {
            if (event === 'meta') {
                window.dispatchEvent(new CustomEvent('ark:chat-status', {detail: {mode: data.mode, warning: data.warning}}));
            } else if (event === 'phase') {
                ui.phase.hidden = false;
            } else if (event === 'delta') {
                ui.phase.hidden = true;
                ui.bubble.hidden = false;
                answer += data.text ?? '';
                ui.bubble.innerHTML = `${renderChatText('assistant', answer)}<span class="stream-cursor"></span>`;
                messagesEl.scrollTop = messagesEl.scrollHeight;
            } else if (event === 'sources') {
                const sources = data.sources ?? [];
                if (sources.length) {
                    ui.sources.hidden = false;
                    ui.sources.textContent = sources.join(' · ');
                }
            } else if (event === 'done') {
                receivedDone = true;
            } else if (event === 'error') {
                throw new Error(data.message || 'AI ストリームエラー');
            }
        };

        for (;;) {
            if (receivedDone) break;
            const {value, done} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});

            let separator;
            while ((separator = buffer.indexOf(String.fromCharCode(10, 10))) !== -1) {
                const block = buffer.slice(0, separator);
                buffer = buffer.slice(separator + 2);

                let event = 'message';
                const dataLines = [];
                block.split(String.fromCharCode(10)).forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('event:')) {
                        event = trimmed.slice(6).trim();
                    } else if (trimmed.startsWith('data:')) {
                        dataLines.push(trimmed.slice(5).trim());
                    }
                });

                if (!dataLines.length) continue;

                const parsed = JSON.parse(dataLines.join(String.fromCharCode(10)));
                handleEvent(event, parsed);
                if (receivedDone) break;
            }

            if (receivedDone) {
                await reader.cancel().catch(() => {});
                break;
            }
        }

        ui.phase.remove();
        if (answer === '') throw new Error('空のストリーム応答');
        ui.bubble.innerHTML = renderChatText('assistant', answer);
    } catch (error) {
        ui.node.remove();
        throw error;
    } finally {
        window.clearTimeout(timeout);
    }
}
document.querySelector('#chat-form').addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#chat-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    input.disabled = true;
    try {
        await askAssistant(message);
    } catch (error) {
        addChatMessage('assistant', '現在は回答サービスに接続できません。ルールカタログまたはナレッジベースを直接確認してください。', ['画面内の代替案内']);
        console.error(error);
    } finally {
        input.disabled = false;
        input.focus();
    }
});

document.querySelectorAll('.prompt-button').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector('#chat-input');
    input.value = button.dataset.prompt;
    input.focus();
}));

Promise.all([
    window.DemoApi.getJson('/api/demo/review'),
    window.DemoApi.getJson('/api/demo/knowledge'),
    window.DemoApi.getJson('/api/demo/rules')
]).then(([review, knowledge, rules]) => {
    reviewData = review;
    knowledgeData = knowledge;
    ruleCatalog = rules;
    document.querySelector('#review-status').textContent = `${review.case_id} · ${statusLabel(review.summary.review_status)}`;
    renderDocuments();
    renderKnowledge();
    renderRuleCatalog();
    setAsset('GBX-042');
}).catch(error => {
    document.querySelector('#review-status').textContent = 'APIの読み込みに失敗しました';
    document.querySelector('#documents').innerHTML = '<div class="loading">レビュー情報を読み込めませんでした。</div>';
    document.querySelector('#rules').innerHTML = '<div class="empty-state">ルール情報を読み込めませんでした。</div>';
    document.querySelector('#evidence').innerHTML = '<div class="empty-state">エビデンス情報を読み込めませんでした。</div>';
    document.querySelector('#ai-candidates').innerHTML = '<div class="empty-state">AI候補を読み込めませんでした。</div>';
    document.querySelector('#knowledge-list').innerHTML = '<div class="empty-state">ナレッジを読み込めませんでした。</div>';
    document.querySelector('#rule-catalog').innerHTML = '<div class="empty-state">ルールカタログを読み込めませんでした。</div>';
    console.error(error);
});

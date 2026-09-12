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
mark(housing, 'GBX-042', 'Compact Gearbox Assembly');
scene.add(housing);

const shaft1 = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,8.8,24),materials.shaft); shaft1.rotation.z=Math.PI/2; shaft1.position.set(0,.75,0); scene.add(shaft1);
const shaft2 = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,8.6,24),materials.shaft); shaft2.rotation.z=Math.PI/2; shaft2.position.set(0,-.9,0); scene.add(shaft2);

const gearSet = new THREE.Group();
const g1 = gear(1.35,.68,22,materials.gear); g1.position.set(-.55,.75,0); gearSet.add(g1);
const g2 = gear(1.62,.78,28,materials.gear2); g2.position.set(.5,-.9,0); gearSet.add(g2);
mark(gearSet,'GEARSET-01','Gear Pair');
scene.add(gearSet);

const bearing = new THREE.Group();
const outer = new THREE.Mesh(new THREE.TorusGeometry(.72,.19,20,48),materials.bearing); outer.rotation.y=Math.PI/2; bearing.add(outer);
const inner = new THREE.Mesh(new THREE.TorusGeometry(.43,.08,16,40),materials.shaft); inner.rotation.y=Math.PI/2; bearing.add(inner);
bearing.position.set(3.35,-.9,0);
mark(bearing,'BRG-01','Output Bearing');
scene.add(bearing);

const floor = new THREE.Mesh(new THREE.CircleGeometry(8,64),new THREE.MeshBasicMaterial({color:0x0b1120,transparent:true,opacity:.52}));
floor.rotation.x=-Math.PI/2; floor.position.y=-2.55; scene.add(floor);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedAsset = 'GBX-042';
let reviewData = null;

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
    document.querySelector('#selected-name').textContent = root?.userData.name ?? assetId;
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
window.addEventListener('resize',resize); resize();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    gearSet.rotation.x += .0016;
    renderer.render(scene,camera);
}
animate();

const labels = {AssemblyDrawing:'組立図',WorkInstruction:'作業指示',InspectionReport:'検査記録',AcceptanceReport:'受入記録'};
function locatorText(locator) {
    if (!locator) return 'locator: n/a';
    return Object.entries(locator).map(([key,value]) => `${key}: ${value}`).join(' · ');
}
function renderDocuments() {
    const container = document.querySelector('#documents');
    container.innerHTML = reviewData.evidence_chain.map((doc,index) => `<div class="doc-card"><div class="doc-type">0${index+1} · ${doc.document_type}</div><div class="doc-title">${labels[doc.document_type] ?? doc.document_type}</div><div class="doc-meta">${doc.source_document}<br>version ${doc.document_version} · ${doc.document_date}</div></div>`).join('');
}
function renderReviewPanels() {
    if (!reviewData) return;
    const rules = reviewData.rule_results.filter(rule => rule.target_asset_id === selectedAsset);
    document.querySelector('#rules').innerHTML = rules.length ? rules.map(rule => `<div class="rule-card selected"><div class="rule-id">${rule.rule_id}</div><div class="rule-title">${rule.title}</div><div class="rule-text">${rule.public_rule}</div><span class="status ${rule.status === 'pass' ? 'status-pass' : 'status-review'}">${rule.status.toUpperCase()}</span></div>`).join('') : '<div class="rule-card"><div class="rule-text">この部品に直接紐付く公開デモルールはありません。</div></div>';

    const evidence = rules.flatMap(rule => rule.evidence.map(item => ({...item, rule_id:rule.rule_id})));
    document.querySelector('#evidence').innerHTML = evidence.length ? evidence.map(item => `<div class="evidence-card"><div class="evidence-source">${item.rule_id} · ${item.source_document}</div><div class="evidence-value">${item.value}</div><div class="evidence-locator">${item.document_type}<br>${locatorText(item.locator)}</div></div>`).join('') : '<div class="evidence-card"><div class="evidence-locator">部品を選ぶと関連 Evidence を表示します。</div></div>';

    const candidates = reviewData.ai_assist.candidates.filter(item => item.asset_id === selectedAsset);
    document.querySelector('#ai-candidates').innerHTML = candidates.length ? candidates.map(item => `<div class="ai-card"><div class="ai-task">${item.task}</div><div class="rule-title">${item.candidate_id}</div><div class="ai-meta">${item.source_document}<br>${item.field ? `${item.field}: ${item.candidate_value}` : item.source_label ?? ''}</div><div class="confidence">confidence ${Math.round(item.confidence*100)}% · ${item.status}</div></div>`).join('') : '<div class="ai-card"><div class="ai-meta">この部品に紐付く AI 候補はありません。</div></div>';
}

fetch('/api/demo/review').then(response => response.json()).then(data => {
    reviewData = data;
    document.querySelector('#review-status').textContent = `${data.case_id} · ${data.summary.review_status}`;
    renderDocuments();
    setAsset('GBX-042');
}).catch(error => {
    document.querySelector('#review-status').textContent = 'API load failed';
    console.error(error);
});

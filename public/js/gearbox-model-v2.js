import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.querySelector('#model-stage');
const legacyCanvas = document.querySelector('#gearbox-canvas');

if (stage && legacyCanvas && !document.querySelector('#gearbox-canvas-v2')) {
    legacyCanvas.classList.add('gearbox-canvas-legacy');

    const canvas = document.createElement('canvas');
    canvas.id = 'gearbox-canvas-v2';
    canvas.setAttribute('aria-label', '減速機カットアウェイ3Dモデル');
    stage.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(10.4, 6.8, 10.8);

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.target.set(0, -0.05, 0);
    controls.minDistance = 7.5;
    controls.maxDistance = 21;
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.HemisphereLight(0xf6fbff, 0x8d98a5, 2.45));

    const key = new THREE.DirectionalLight(0xffffff, 4.4);
    key.position.set(8, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9cc8ff, 1.8);
    fill.position.set(-8, 5, 8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffc7b8, 1.6);
    rim.position.set(5, 4, -8);
    scene.add(rim);

    const materials = {
        housing: new THREE.MeshPhysicalMaterial({color: 0x356f9d, metalness: 0.42, roughness: 0.46, clearcoat: 0.18, clearcoatRoughness: 0.35}),
        housingDark: new THREE.MeshStandardMaterial({color: 0x244c6d, metalness: 0.52, roughness: 0.4}),
        cutaway: new THREE.MeshPhysicalMaterial({color: 0x7fb2cf, metalness: 0.2, roughness: 0.32, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false}),
        steel: new THREE.MeshStandardMaterial({color: 0xb8c2ca, metalness: 0.93, roughness: 0.2}),
        steelDark: new THREE.MeshStandardMaterial({color: 0x5f6d78, metalness: 0.92, roughness: 0.2}),
        gear: new THREE.MeshStandardMaterial({color: 0xbfc8cf, metalness: 0.95, roughness: 0.18}),
        gear2: new THREE.MeshStandardMaterial({color: 0x8c9ba7, metalness: 0.94, roughness: 0.2}),
        bearing: new THREE.MeshStandardMaterial({color: 0xd85a50, metalness: 0.72, roughness: 0.26}),
        brass: new THREE.MeshStandardMaterial({color: 0xb88a44, metalness: 0.76, roughness: 0.28}),
        rubber: new THREE.MeshStandardMaterial({color: 0x202832, metalness: 0.08, roughness: 0.74}),
        base: new THREE.MeshStandardMaterial({color: 0x253342, metalness: 0.62, roughness: 0.38}),
        bolt: new THREE.MeshStandardMaterial({color: 0xd4d9de, metalness: 0.9, roughness: 0.2}),
    };

    const roots = new Map();
    const selectable = [];

    function mesh(geometry, material, {position = [0, 0, 0], rotation = [0, 0, 0], cast = true, receive = true} = {}) {
        const item = new THREE.Mesh(geometry, material);
        item.position.set(...position);
        item.rotation.set(...rotation);
        item.castShadow = cast;
        item.receiveShadow = receive;
        return item;
    }

    function mark(group, assetId, name) {
        group.userData.assetId = assetId;
        group.userData.name = name;
        group.traverse(child => {
            if (!child.isMesh) return;
            if (child.material?.clone) child.material = child.material.clone();
            child.userData.assetId = assetId;
            child.userData.name = name;
            if (child.material?.emissive) child.userData.baseEmissive = child.material.emissive.getHex();
            selectable.push(child);
        });
        roots.set(assetId, group);
    }

    function addBolt(group, x, y, z, axis = 'z') {
        const bolt = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 12), materials.bolt, {position: [x, y, z]});
        if (axis === 'z') bolt.rotation.x = Math.PI / 2;
        else if (axis === 'x') bolt.rotation.z = Math.PI / 2;
        group.add(bolt);
    }

    function addFastenerRow(group, y, z, count = 7) {
        for (let i = 0; i < count; i += 1) {
            const x = -2.7 + (5.4 * i / (count - 1));
            addBolt(group, x, y, z);
        }
    }

    function gearHelix(radius, width, teeth, material, helix = 0.12) {
        const group = new THREE.Group();
        group.userData.radius = radius;
        group.userData.teeth = teeth;
        group.userData.visualOuterRadius = radius * 0.95;

        const core = mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, width, 64), material, {rotation: [0, 0, Math.PI / 2]});
        group.add(core);

        const hub = mesh(new THREE.CylinderGeometry(radius * 0.3, radius * 0.3, width * 1.25, 40), materials.steelDark, {rotation: [0, 0, Math.PI / 2]});
        group.add(hub);

        for (let i = 0; i < teeth; i += 1) {
            const angle = i / teeth * Math.PI * 2;
            const tooth = mesh(new THREE.BoxGeometry(width * 0.92, radius * 0.22, radius * 0.13), material);
            tooth.position.set(0, Math.cos(angle) * radius * 0.84, Math.sin(angle) * radius * 0.84);
            tooth.rotation.x = angle;
            tooth.rotation.y = helix;
            group.add(tooth);
        }

        const ringA = mesh(new THREE.TorusGeometry(radius * 0.66, 0.035, 12, 64), materials.steelDark, {position: [-width * 0.51, 0, 0], rotation: [0, Math.PI / 2, 0]});
        const ringB = ringA.clone();
        ringB.position.x = width * 0.51;
        group.add(ringA, ringB);
        return group;
    }

    function bearingAssembly(radius = 0.75) {
        const group = new THREE.Group();
        const outer = mesh(new THREE.TorusGeometry(radius, 0.16, 20, 64), materials.bearing, {rotation: [0, Math.PI / 2, 0]});
        const inner = mesh(new THREE.TorusGeometry(radius * 0.58, 0.075, 18, 56), materials.steelDark, {rotation: [0, Math.PI / 2, 0]});
        group.add(outer, inner);

        for (let i = 0; i < 12; i += 1) {
            const angle = i / 12 * Math.PI * 2;
            const roller = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 12), materials.steel, {rotation: [0, 0, Math.PI / 2]});
            roller.position.set(0, Math.cos(angle) * radius * 0.79, Math.sin(angle) * radius * 0.79);
            group.add(roller);
        }
        return group;
    }

    const housing = new THREE.Group();

    const basePlate = mesh(new THREE.BoxGeometry(7.5, 0.32, 4.65), materials.base, {position: [0, -2.05, 0]});
    housing.add(basePlate);

    const lowerPan = mesh(new THREE.BoxGeometry(6.75, 0.65, 4.1), materials.housing, {position: [0, -1.58, 0]});
    housing.add(lowerPan);

    const backWall = mesh(new THREE.BoxGeometry(6.7, 3.2, 0.34), materials.housing, {position: [0, 0.02, -1.88]});
    housing.add(backWall);

    const topCap = mesh(new THREE.BoxGeometry(6.8, 0.42, 4.15), materials.housing, {position: [0, 1.82, 0]});
    housing.add(topCap);

    const leftEnd = mesh(new THREE.BoxGeometry(0.34, 3.45, 4.0), materials.housing, {position: [-3.2, 0.03, 0]});
    const rightEnd = mesh(new THREE.BoxGeometry(0.34, 3.45, 4.0), materials.cutaway, {position: [3.2, 0.03, 0]});
    housing.add(leftEnd, rightEnd);

    const frontWindow = mesh(new THREE.BoxGeometry(6.25, 3.05, 0.14), materials.cutaway, {position: [0, 0.03, 1.94], cast: false});
    housing.add(frontWindow);

    for (const x of [-2.6, -1.7, -0.8, 0.8, 1.7, 2.6]) {
        housing.add(mesh(new THREE.BoxGeometry(0.11, 2.7, 0.22), materials.housingDark, {position: [x, 0.1, -2.02]}));
    }

    for (const x of [-2.8, 2.8]) {
        for (const z of [-1.62, 1.62]) {
            const foot = mesh(new THREE.BoxGeometry(0.82, 0.35, 0.72), materials.housingDark, {position: [x, -2.28, z]});
            housing.add(foot);
            addBolt(housing, x, -2.48, z, 'x');
        }
    }

    addFastenerRow(housing, 1.58, 2.06, 8);
    addFastenerRow(housing, -1.31, 2.06, 8);

    const inspectionCover = mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.18, 48), materials.housingDark, {position: [2.25, 0.35, -2.08], rotation: [Math.PI / 2, 0, 0]});
    housing.add(inspectionCover);
    for (let i = 0; i < 8; i += 1) {
        const angle = i / 8 * Math.PI * 2;
        addBolt(housing, 2.25 + Math.cos(angle) * 0.66, 0.35 + Math.sin(angle) * 0.66, -2.19);
    }

    const oilGlass = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 28), materials.brass, {position: [-2.25, -0.78, 2.05], rotation: [Math.PI / 2, 0, 0]});
    housing.add(oilGlass);

    mark(housing, 'GBX-042', 'コンパクト減速機アセンブリ');
    scene.add(housing);

    // Keep both gears inside the housing envelope while preserving visible mesh overlap.
    const inputCenter = new THREE.Vector2(0.82, 0.61);   // y, z
    const outputCenter = new THREE.Vector2(-0.26, -0.61); // y, z

    const inputShaft = mesh(new THREE.CylinderGeometry(0.19, 0.19, 8.5, 32), materials.steel, {position: [0, inputCenter.x, inputCenter.y], rotation: [0, 0, Math.PI / 2]});
    const outputShaft = mesh(new THREE.CylinderGeometry(0.28, 0.28, 8.75, 32), materials.steelDark, {position: [0, outputCenter.x, outputCenter.y], rotation: [0, 0, Math.PI / 2]});
    scene.add(inputShaft, outputShaft);

    const inputSeal = mesh(new THREE.TorusGeometry(0.34, 0.08, 14, 42), materials.rubber, {position: [-3.35, inputCenter.x, inputCenter.y], rotation: [0, Math.PI / 2, 0]});
    const outputSeal = mesh(new THREE.TorusGeometry(0.46, 0.09, 14, 42), materials.rubber, {position: [-3.35, outputCenter.x, outputCenter.y], rotation: [0, Math.PI / 2, 0]});
    scene.add(inputSeal, outputSeal);

    const gearSet = new THREE.Group();
    const inputGearTeeth = 24;
    const outputGearTeeth = 32;

    const g1 = gearHelix(0.78, 0.68, inputGearTeeth, materials.gear, 0.13);
    g1.position.set(-0.1, inputCenter.x, inputCenter.y);
    gearSet.add(g1);

    const g2 = gearHelix(1.05, 0.8, outputGearTeeth, materials.gear2, -0.11);
    g2.position.set(0.12, outputCenter.x, outputCenter.y);
    g2.rotation.x = Math.PI / outputGearTeeth;
    gearSet.add(g2);

    mark(gearSet, 'GEARSET-01', '歯車ペア');
    scene.add(gearSet);

    const centerDistance = inputCenter.distanceTo(outputCenter);
    const visualOuterSum = g1.userData.visualOuterRadius + g2.userData.visualOuterRadius;
    console.assert(centerDistance < visualOuterSum, 'Gear teeth must visually overlap to read as meshed.');
    console.assert(outputCenter.x - g2.userData.visualOuterRadius >= -1.26, 'Output gear must stay above the lower housing pan.');
    console.assert(inputCenter.x + g1.userData.visualOuterRadius <= 1.61, 'Input gear must stay below the top housing cap.');
    console.assert(outputCenter.y - g2.userData.visualOuterRadius >= -1.71, 'Output gear must stay inside the rear housing wall.');

    const outputBearing = bearingAssembly(0.7);
    outputBearing.position.set(3.34, outputCenter.x, outputCenter.y);
    mark(outputBearing, 'BRG-01', '出力側ベアリング');
    scene.add(outputBearing);

    const supportBearing = bearingAssembly(0.52);
    supportBearing.position.set(-2.85, inputCenter.x, inputCenter.y);
    supportBearing.scale.setScalar(0.8);
    scene.add(supportBearing);

    const outputFlange = mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.22, 48), materials.housingDark, {position: [3.22, outputCenter.x, outputCenter.y], rotation: [0, 0, Math.PI / 2]});
    scene.add(outputFlange);

    const floor = mesh(new THREE.PlaneGeometry(22, 18), new THREE.MeshStandardMaterial({color: 0xdce4eb, metalness: 0.02, roughness: 0.92}), {position: [0, -2.52, 0], rotation: [-Math.PI / 2, 0, 0], cast: false});
    scene.add(floor);

    const grid = new THREE.GridHelper(18, 18, 0xb9c7d3, 0xcbd6df);
    grid.position.y = -2.505;
    grid.material.opacity = 0.34;
    grid.material.transparent = true;
    scene.add(grid);

    const shadowDisc = mesh(new THREE.CircleGeometry(5.8, 64), new THREE.MeshBasicMaterial({color: 0x6d7c89, transparent: true, opacity: 0.12, depthWrite: false}), {position: [0, -2.495, 0], rotation: [-Math.PI / 2, 0, 0], cast: false, receive: false});
    scene.add(shadowDisc);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = false;

    function currentAssetId() {
        return document.querySelector('#selected-id')?.textContent?.trim() || 'GBX-042';
    }

    function applySelection(assetId) {
        roots.forEach((group, id) => {
            group.traverse(child => {
                if (!child.isMesh || !child.material?.emissive) return;
                const active = id === assetId;
                child.material.emissive.setHex(active ? 0x16394d : (child.userData.baseEmissive ?? 0x000000));
                child.material.emissiveIntensity = active ? 0.36 : 0;
            });
        });
    }

    function delegateSelection(assetId) {
        const tab = document.querySelector(`.part-tab[data-asset="${CSS.escape(assetId)}"]`);
        tab?.click();
        applySelection(assetId);
    }

    function pick(event, commit = false) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(selectable, false)[0];
        hovered = Boolean(hit?.object?.userData?.assetId);
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        if (commit && hit?.object?.userData?.assetId) delegateSelection(hit.object.userData.assetId);
    }

    canvas.addEventListener('pointermove', event => pick(event, false));
    canvas.addEventListener('click', event => pick(event, true));
    canvas.addEventListener('pointerdown', () => { if (!hovered) canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointerup', () => { canvas.style.cursor = hovered ? 'pointer' : 'grab'; });

    document.querySelectorAll('.part-tab').forEach(tab => {
        tab.addEventListener('click', () => applySelection(tab.dataset.asset));
    });

    const selectedNode = document.querySelector('#selected-id');
    if (selectedNode) {
        new MutationObserver(() => applySelection(currentAssetId())).observe(selectedNode, {childList: true, characterData: true, subtree: true});
    }

    function resize() {
        const width = Math.max(1, stage.clientWidth);
        const height = Math.max(1, stage.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();
    applySelection(currentAssetId());

    const inputAngularSpeed = 0.0032;
    const outputAngularSpeed = -inputAngularSpeed * (inputGearTeeth / outputGearTeeth);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        g1.rotation.x += inputAngularSpeed;
        g2.rotation.x += outputAngularSpeed;
        inputShaft.rotation.x += inputAngularSpeed;
        outputShaft.rotation.x += outputAngularSpeed;
        renderer.render(scene, camera);
    }

    animate();
}

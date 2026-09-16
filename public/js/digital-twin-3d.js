import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const STATUS_COLORS = {
    available: 0x6fa4ff,
    in_review: 0xffc857,
    review_required: 0xff4d5f,
    confirmed: 0x45e0a8,
    idle: 0x7a879a,
};
const STATUS_LABELS = {
    available: 'AVAILABLE',
    in_review: 'IN REVIEW',
    review_required: 'REVIEW REQUIRED',
    confirmed: 'CONFIRMED',
    idle: 'IDLE',
};

// Large-scene factory footprint. Asset and zone percentages from the canonical
// workshop registry are projected into this world, so business semantics stay
// unchanged while the spatial experience becomes a real factory floor.
const WORLD = {width: 54, depth: 42, innerWidth: 52, innerDepth: 40};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function waitForMap(timeout = 10000) {
    return new Promise((resolve, reject) => {
        const current = document.querySelector('#twin-map');
        if (current) return resolve(current);
        const observer = new MutationObserver(() => {
            const map = document.querySelector('#twin-map');
            if (!map) return;
            observer.disconnect();
            resolve(map);
        });
        observer.observe(document.body, {childList: true, subtree: true});
        window.setTimeout(() => {
            observer.disconnect();
            reject(new Error('Digital twin map did not mount in time.'));
        }, timeout);
    });
}

function pointFromPercent(x, y, elevation = 0) {
    return new THREE.Vector3(
        (Number(x) / 100 - .5) * WORLD.innerWidth,
        elevation,
        (Number(y) / 100 - .5) * WORLD.innerDepth,
    );
}

function zoneRect(zone) {
    return {
        x: ((Number(zone.x) + Number(zone.w) / 2) / 100 - .5) * WORLD.innerWidth,
        z: ((Number(zone.y) + Number(zone.h) / 2) / 100 - .5) * WORLD.innerDepth,
        width: Number(zone.w) / 100 * WORLD.innerWidth,
        depth: Number(zone.h) / 100 * WORLD.innerDepth,
    };
}

async function mount3dTwin() {
    const map = await waitForMap();
    const stage = map.closest('.twin-map-wrap');
    if (!stage || stage.dataset.webglTwin === 'mounted') return;

    const response = await fetch('/data/workshop-assets.json', {headers: {'Accept': 'application/json'}});
    if (!response.ok) throw new Error(`workshop registry HTTP ${response.status}`);
    const registry = await response.json();

    stage.dataset.webglTwin = 'mounted';
    stage.id = 'twin-3d-stage';
    stage.classList.add('twin-3d-stage');
    map.classList.add('twin-map-hidden');
    stage.insertAdjacentHTML('beforeend', `
        <canvas id="twin-3d-canvas" aria-label="Interactive 3D workshop digital twin"></canvas>
        <div class="twin-3d-label-layer" id="twin-3d-label-layer"></div>
        <div class="twin-3d-hud"><span class="twin-live-dot"></span><strong>LIVE 3D TWIN</strong><span>drag: orbit · wheel: zoom · click: asset</span></div>
        <div class="twin-3d-toolbar">
            <button type="button" data-scene-action="overview">OVERVIEW</button>
            <button type="button" data-scene-action="focus">FOCUS</button>
            <button type="button" data-scene-action="roof">ROOF</button>
            <button type="button" data-scene-action="orbit">AUTO ORBIT</button>
        </div>
        <div class="twin-3d-loading" id="twin-3d-loading"><span></span><strong>3D車間を読み込み中</strong></div>
    `);

    const canvas = stage.querySelector('#twin-3d-canvas');
    const labelLayer = stage.querySelector('#twin-3d-label-layer');
    if (!canvas || !labelLayer) throw new Error('3D twin DOM mount failed.');

    function setStageHeight() {
        const height = window.innerWidth <= 760 ? 520 : (window.innerWidth <= 1180 ? 640 : 760);
        stage.style.height = `${height}px`;
        stage.style.minHeight = `${height}px`;
    }
    setStageHeight();

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9e3ea);
    scene.fog = new THREE.Fog(0xd9e3ea, 58, 108);

    const camera = new THREE.PerspectiveCamera(42, 1, .1, 180);
    camera.position.set(42, 30, 44);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.target.set(0, 1.4, 0);
    controls.minDistance = 12;
    controls.maxDistance = 90;
    controls.minPolarAngle = Math.PI * .12;
    controls.maxPolarAngle = Math.PI * .48;
    controls.autoRotateSpeed = .42;

    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x8d9ba8, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(22, 34, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -42;
    key.shadow.camera.right = 42;
    key.shadow.camera.top = 36;
    key.shadow.camera.bottom = -36;
    key.shadow.camera.far = 90;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbfdcff, .95);
    rim.position.set(-24, 15, -18);
    scene.add(rim);

    const mat = {
        floor: new THREE.MeshStandardMaterial({color: 0xc7d2db, roughness: .95, metalness: .04}),
        inset: new THREE.MeshStandardMaterial({color: 0xdbe4eb, roughness: .92, metalness: .02}),
        wall: new THREE.MeshStandardMaterial({color: 0xe4ebf0, roughness: .86, metalness: .04}),
        steel: new THREE.MeshStandardMaterial({color: 0x8fa0ad, roughness: .42, metalness: .68}),
        dark: new THREE.MeshStandardMaterial({color: 0x4b5d6c, roughness: .48, metalness: .62}),
        light: new THREE.MeshStandardMaterial({color: 0xc1ccd4, roughness: .34, metalness: .58}),
        yellow: new THREE.MeshStandardMaterial({color: 0xe6aa2d, roughness: .56, metalness: .18}),
        orange: new THREE.MeshStandardMaterial({color: 0xc67a34, roughness: .62, metalness: .14}),
        blue: new THREE.MeshStandardMaterial({color: 0x437da4, roughness: .5, metalness: .34}),
        red: new THREE.MeshStandardMaterial({color: 0xc05d68, roughness: .52, metalness: .18}),
        green: new THREE.MeshStandardMaterial({color: 0x4d937c, roughness: .58, metalness: .16}),
        crate: new THREE.MeshStandardMaterial({color: 0xc59e72, roughness: .92}),
        pallet: new THREE.MeshStandardMaterial({color: 0x9c7048, roughness: .96}),
        tire: new THREE.MeshStandardMaterial({color: 0x20272d, roughness: .95}),
        screen: new THREE.MeshStandardMaterial({color: 0x173244, emissive: 0x38a9d0, emissiveIntensity: 1.25, roughness: .28}),
        white: new THREE.MeshStandardMaterial({color: 0xecf1f4, roughness: .52, metalness: .16}),
        glass: new THREE.MeshPhysicalMaterial({color: 0xd9edf5, transparent: true, opacity: .28, roughness: .18, metalness: .04, depthWrite: false}),
    };

    const root = new THREE.Group();
    scene.add(root);

    function box(parent, size, pos, material = mat.steel, rot = 0, cast = true, receive = true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos);
        mesh.rotation.y = rot;
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        parent.add(mesh);
        return mesh;
    }

    function cylinder(parent, radius, height, pos, material = mat.steel, axis = 'y', segments = 18) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
        mesh.position.set(...pos);
        if (axis === 'x') mesh.rotation.z = Math.PI / 2;
        if (axis === 'z') mesh.rotation.x = Math.PI / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    function line(parent, from, to, color = 0xd7aa39) {
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]);
        const item = new THREE.Line(geometry, new THREE.LineBasicMaterial({color}));
        parent.add(item);
        return item;
    }

    // Factory shell: open front, tall columns, optional translucent roof.
    box(root, [WORLD.width, .5, WORLD.depth], [0, -.25, 0], mat.floor);
    box(root, [WORLD.innerWidth, .08, WORLD.innerDepth], [0, .045, 0], mat.inset, 0, false, true);
    box(root, [WORLD.width, 8.2, .42], [0, 4.1, -WORLD.depth / 2], mat.wall);
    box(root, [.42, 8.2, WORLD.depth], [-WORLD.width / 2, 4.1, 0], mat.wall);
    box(root, [.42, 8.2, WORLD.depth * .82], [WORLD.width / 2, 4.1, -3.2], mat.wall);

    for (let x = -22; x <= 22; x += 8.8) {
        for (const z of [-16.8, -8.4, 0, 8.4, 16.8]) {
            box(root, [.26, 7.9, .26], [x, 3.95, z], mat.dark);
        }
    }
    for (const z of [-16.8, -8.4, 0, 8.4, 16.8]) box(root, [50, .22, .22], [0, 7.55, z], mat.dark);

    const roofGroup = new THREE.Group();
    root.add(roofGroup);
    for (let x = -18; x <= 18; x += 12) {
        box(roofGroup, [10.6, .12, 38], [x, 8.05, 0], mat.glass, 0, false, false);
    }
    roofGroup.visible = false;

    const grid = new THREE.GridHelper(52, 52, 0x9cadba, 0xbecbd4);
    grid.position.y = .095;
    grid.material.transparent = true;
    grid.material.opacity = .22;
    root.add(grid);

    // Main traffic aisle and pedestrian crossing lines.
    box(root, [1.5, .025, 36], [-1.1, .16, 0], mat.yellow, 0, false, false);
    box(root, [1.5, .025, 36], [1.1, .16, 0], mat.yellow, 0, false, false);
    box(root, [1.18, .028, 36], [0, .17, 0], mat.inset, 0, false, false);
    for (let i = -5; i <= 5; i++) box(root, [.9, .025, .16], [0, .18, 8.6 + i * .42], mat.white, 0, false, false);

    const zoneRects = new Map();
    const zonePalette = [0xcfe5ef, 0xdbeadf, 0xe9e1ca, 0xe4d6dc, 0xdbe6eb, 0xe9e0d0];
    (registry.zones ?? []).forEach((zone, index) => {
        const rect = zoneRect(zone);
        zoneRects.set(zone.zone_id, rect);
        const zoneMat = new THREE.MeshStandardMaterial({
            color: zonePalette[index % zonePalette.length],
            transparent: true,
            opacity: .48,
            roughness: .86,
            metalness: .05,
            depthWrite: false,
        });
        const slab = box(root, [Math.max(rect.width - .25, .3), .055, Math.max(rect.depth - .25, .3)], [rect.x, .115, rect.z], zoneMat, 0, false, true);
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(slab.geometry),
            new THREE.LineBasicMaterial({color: 0x7894a6, transparent: true, opacity: .42}),
        );
        edges.position.copy(slab.position);
        root.add(edges);
    });

    function palletStack(parent, x, z, layers = 2) {
        box(parent, [2.2, .16, 1.3], [x, .24, z], mat.pallet);
        for (let l = 0; l < layers; l++) {
            for (let i = 0; i < 3; i++) box(parent, [.6, .5, .96], [x - .7 + i * .7, .58 + l * .52, z], mat.crate);
        }
    }

    function rack(parent, x, z, width = 3.5, levels = 3) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        for (const sx of [-width / 2, width / 2]) {
            for (const sz of [-.62, .62]) box(g, [.13, 3.8, .13], [sx, 1.9, sz], mat.dark);
        }
        for (let l = 0; l < levels; l++) {
            const y = .58 + l * 1.16;
            box(g, [width + .25, .11, 1.42], [0, y, 0], mat.orange);
            for (let i = -1; i <= 1; i++) box(g, [.82, .58, .94], [i * 1.05, y + .36, 0], mat.crate);
        }
        return g;
    }

    function workbench(parent, x, z, width = 3) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        box(g, [width, .16, 1.25], [0, 1, 0], mat.light);
        for (const sx of [-width / 2 + .18, width / 2 - .18]) {
            for (const sz of [-.48, .48]) box(g, [.12, 1, .12], [sx, .5, sz], mat.dark);
        }
        return g;
    }

    function monitor(parent, x, z, y = 1.78) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        box(g, [.09, .7, .09], [0, y - .4, 0], mat.dark);
        box(g, [.82, .52, .09], [0, y, 0], mat.screen);
        return g;
    }

    function gearbox(parent, x = 0, z = 0, scale = 1, rot = 0) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot;
        g.scale.setScalar(scale);
        parent.add(g);
        box(g, [1.5, 1.05, 1.12], [0, .86, 0], mat.blue);
        cylinder(g, .42, .34, [.8, .88, 0], mat.dark, 'x');
        cylinder(g, .25, 2.05, [0, .9, 0], mat.steel, 'x');
        cylinder(g, .36, .3, [-.78, .88, 0], mat.dark, 'x');
        box(g, [1.7, .14, 1.28], [0, .3, 0], mat.dark);
        return g;
    }

    function conveyor(parent, x, z, length = 8) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        box(g, [length, .22, 1.2], [0, .8, 0], mat.dark);
        const rollers = [];
        for (let i = -length / 2 + .35; i < length / 2; i += .48) rollers.push(cylinder(g, .09, 1.02, [i, .94, 0], mat.light, 'z', 12));
        return {group: g, rollers};
    }

    function truck(parent, x, z, rot = 0, scale = .82) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot;
        g.scale.setScalar(scale);
        parent.add(g);
        box(g, [5.7, 2.2, 2.15], [-.4, 1.5, 0], mat.white);
        box(g, [1.7, 1.85, 2.1], [3.15, 1.26, 0], mat.blue);
        box(g, [.9, .72, 1.92], [3.52, 1.88, 0], mat.screen);
        for (const wx of [-2.35, -.35, 2.65, 3.38]) {
            for (const wz of [-1.09, 1.09]) cylinder(g, .4, .28, [wx, .45, wz], mat.tire, 'z', 18);
        }
        return g;
    }

    function forklift(parent, x, z, rot = 0) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot;
        parent.add(g);
        box(g, [1.2, .62, 1.05], [0, .55, 0], mat.yellow);
        box(g, [.78, .9, .95], [-.16, 1.18, 0], mat.dark);
        box(g, [.12, 1.9, 1.2], [.76, 1.02, 0], mat.dark);
        for (const zf of [-.37, .37]) box(g, [1.4, .06, .08], [1.28, .18, zf], mat.steel);
        return g;
    }

    function safetyRail(parent, x, z, length = 5, rot = 0) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rot;
        parent.add(g);
        for (let i = -length / 2; i <= length / 2; i += 1) box(g, [.07, 1, .07], [i, .5, 0], mat.yellow);
        box(g, [length, .07, .07], [0, .45, 0], mat.yellow);
        box(g, [length, .07, .07], [0, .9, 0], mat.yellow);
        return g;
    }

    function qaDesk(parent, x, z, accent = mat.green) {
        const g = workbench(parent, x, z, 2.8);
        const unit = box(g, [1.02, .7, .78], [-.55, 1.46, 0], accent);
        unit.rotation.y = .08;
        monitor(g, .72, -.28, 1.95);
        return g;
    }

    function pressStation(parent, x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        box(g, [2.5, .22, 1.8], [0, .72, 0], mat.dark);
        for (const sx of [-.95, .95]) box(g, [.18, 2.55, .18], [sx, 1.72, 0], mat.steel);
        box(g, [2.1, .24, 1.05], [0, 2.88, 0], mat.steel);
        cylinder(g, .18, 1.25, [0, 2.25, 0], mat.dark, 'y', 20);
        cylinder(g, .38, .24, [0, 1.58, 0], mat.red, 'y', 24);
        return g;
    }

    function ratioBench(parent, x, z) {
        const g = workbench(parent, x, z, 3.4);
        const drive = gearbox(g, -.15, 0, .72, .04);
        const inputShaft = cylinder(g, .08, 1.45, [-1.25, 1.65, 0], mat.steel, 'x', 20);
        const outputShaft = cylinder(g, .12, 1.55, [1.25, 1.65, 0], mat.steel, 'x', 20);
        monitor(g, 1.15, -.48, 2.25);
        box(g, [.55, .82, .48], [-1.42, 1.42, 0], mat.dark);
        return {group: g, drive, inputShaft, outputShaft};
    }

    const animatedRollers = [];
    const animatedShafts = [];

    const receiving = zoneRects.get('receiving');
    if (receiving) {
        truck(root, receiving.x - 3.6, receiving.z, Math.PI / 2, .9);
        palletStack(root, receiving.x + 3.4, receiving.z - 2.4, 1);
        palletStack(root, receiving.x + 3.4, receiving.z + .2, 2);
        forklift(root, receiving.x + 1.1, receiving.z + 2.9, -.55);
        qaDesk(root, receiving.x + 4.9, receiving.z + 2.6, mat.red);
        safetyRail(root, receiving.x + 4.6, receiving.z - 3.4, 4.8);
    }

    const storage = zoneRects.get('storage');
    if (storage) {
        rack(root, storage.x - 3.6, storage.z - 2.4, 4.1, 3);
        rack(root, storage.x - 3.6, storage.z + 2.2, 4.1, 3);
        rack(root, storage.x + 1.5, storage.z - 2.4, 4.1, 3);
        rack(root, storage.x + 1.5, storage.z + 2.2, 4.1, 3);
        palletStack(root, storage.x + 5, storage.z + 2.4, 2);
        forklift(root, storage.x + 4.2, storage.z - 2.6, .45);
    }

    const assembly = zoneRects.get('assembly');
    if (assembly) {
        const c1 = conveyor(root, assembly.x - 3.6, assembly.z - 1.2, 11.5);
        animatedRollers.push(...c1.rollers);
        const c2 = conveyor(root, assembly.x + 5.2, assembly.z + 2.1, 7.6);
        animatedRollers.push(...c2.rollers);
        for (let i = -3; i <= 2; i++) gearbox(root, assembly.x - 3.6 + i * 1.7, assembly.z - 1.2, .62, .12);
        const w1 = workbench(root, assembly.x + 4.5, assembly.z - 2.4, 3.2);
        gearbox(w1, 0, 0, .66, .15);
        pressStation(root, assembly.x + 8.5, assembly.z - 1.7);
        const w2 = workbench(root, assembly.x + 8.4, assembly.z + 2.7, 3.1);
        gearbox(w2, 0, 0, .62, -.1);
        safetyRail(root, assembly.x - 1.4, assembly.z - 4.25, 12.5);
        safetyRail(root, assembly.x + 7.8, assembly.z + 4.25, 8.5);
    }

    const inspection = zoneRects.get('inspection');
    if (inspection) {
        const ratio = ratioBench(root, inspection.x - 4.5, inspection.z - 1.1);
        animatedShafts.push(ratio.inputShaft, ratio.outputShaft);
        qaDesk(root, inspection.x + .6, inspection.z - 1.1, mat.red);
        qaDesk(root, inspection.x + 5.6, inspection.z - 1.1, mat.green);
        monitor(root, inspection.x + 9.2, inspection.z - 1.6, 2.1);
        box(root, [1.2, 1.7, .85], [inspection.x + 9.2, .85, inspection.z + .4], mat.blue);
        safetyRail(root, inspection.x + 2.5, inspection.z + 4.1, 13.5);
    }

    const maintenance = zoneRects.get('maintenance');
    if (maintenance) {
        const w1 = workbench(root, maintenance.x - 4, maintenance.z, 3.6);
        gearbox(w1, 0, 0, .72, .2);
        const w2 = workbench(root, maintenance.x + .7, maintenance.z, 3.4);
        box(w2, [1.2, .72, .9], [-.45, 1.42, 0], mat.blue);
        box(root, [1.45, 2.5, .8], [maintenance.x + 5.2, 1.25, maintenance.z - 1.3], mat.red);
        box(root, [1.45, 2.5, .8], [maintenance.x + 5.2, 1.25, maintenance.z + 1.3], mat.blue);
        forklift(root, maintenance.x + 7, maintenance.z + 1.8, -.3);
    }

    const shipping = zoneRects.get('shipping');
    if (shipping) {
        truck(root, shipping.x + 6.6, shipping.z + .2, -Math.PI / 2, .85);
        palletStack(root, shipping.x - 5.5, shipping.z - 1.6, 2);
        palletStack(root, shipping.x - 2.8, shipping.z - 1.6, 2);
        palletStack(root, shipping.x, shipping.z - 1.6, 1);
        qaDesk(root, shipping.x - 4.2, shipping.z + 2.2, mat.green);
        forklift(root, shipping.x + 1.6, shipping.z + 2.2, .65);
        safetyRail(root, shipping.x - 1.6, shipping.z + 4, 10.5);
    }

    // Ceiling lights: enough to read as an industrial hall without blocking the view.
    for (let x = -20; x <= 20; x += 10) {
        for (const z of [-14, -4.8, 4.8, 14]) {
            const light = new THREE.PointLight(0xe8f6ff, .72, 18, 2);
            light.position.set(x, 7.35, z);
            root.add(light);
            box(root, [1.35, .08, .24], [x, 7.46, z], mat.white, 0, false, false);
        }
    }

    // A few long floor markings to make the expanded scale immediately legible.
    for (const z of [-15, -5, 5, 15]) line(root, [-24, .19, z], [24, .19, z], 0xd6b03d);
    for (const x of [-20, -10, 10, 20]) line(root, [x, .19, -18], [x, .19, 18], 0xd6b03d);

    const markerMeshes = [];
    const markers = new Map();
    const pulses = [];
    const labels = [];
    const zoneLabels = [];

    (registry.assets ?? []).forEach(asset => {
        const p = pointFromPercent(asset.x, asset.y, .18);
        const color = STATUS_COLORS[asset.status] ?? STATUS_COLORS.idle;
        const g = new THREE.Group();
        g.position.copy(p);
        root.add(g);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(.52, .07, 12, 36),
            new THREE.MeshBasicMaterial({color, transparent: true, opacity: .72, depthWrite: false}),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = .1;
        g.add(ring);

        const halo = new THREE.Mesh(
            new THREE.RingGeometry(.58, .95, 36),
            new THREE.MeshBasicMaterial({color, transparent: true, opacity: .18, depthWrite: false}),
        );
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = .11;
        g.add(halo);

        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(.045, .045, 1.55, 12),
            new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .75}),
        );
        stem.position.y = .92;
        g.add(stem);

        const orb = new THREE.Mesh(
            new THREE.SphereGeometry(.2, 20, 20),
            new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 1.8, roughness: .18}),
        );
        orb.position.y = 1.72;
        g.add(orb);

        const lamp = new THREE.PointLight(color, asset.status === 'review_required' ? 1.5 : .8, 4.2, 2.2);
        lamp.position.y = 1.72;
        g.add(lamp);

        g.traverse(child => {
            child.userData.assetId = asset.asset_id;
            if (child.isMesh) markerMeshes.push(child);
        });
        markers.set(asset.asset_id, g);
        pulses.push({ring, halo, offset: Math.random() * Math.PI * 2});

        const label = document.createElement('button');
        label.type = 'button';
        label.className = `twin-3d-asset-label ${asset.status}`;
        label.dataset.twinAsset = asset.asset_id;
        label.innerHTML = `<strong>${escapeHtml(asset.asset_id)}</strong><span>${escapeHtml(STATUS_LABELS[asset.status] ?? asset.status)}</span>`;
        labelLayer.appendChild(label);
        labels.push({element: label, object: g, asset});
    });

    (registry.zones ?? []).forEach(zone => {
        const r = zoneRect(zone);
        const anchor = new THREE.Object3D();
        anchor.position.set(r.x, 4.9, r.z - r.depth * .18);
        root.add(anchor);
        const el = document.createElement('div');
        el.className = 'twin-3d-zone-label';
        el.textContent = String(zone.label).split('/')[0].trim();
        labelLayer.appendChild(el);
        zoneLabels.push({element: el, object: anchor});
    });

    let selectedId = document.documentElement.dataset.twinAsset || registry.default_asset_id || registry.assets?.[0]?.asset_id;
    let cameraGoal = null;
    let targetGoal = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function syncVisuals() {
        labels.forEach(item => item.element.classList.toggle('selected', item.asset.asset_id === selectedId));
        markers.forEach((g, id) => g.scale.setScalar(id === selectedId ? 1.24 : 1));
    }

    function triggerSelection(assetId, focus = true) {
        const button = document.querySelector(`#twin-map [data-twin-asset="${CSS.escape(assetId)}"]`);
        button?.click();
        selectedId = assetId;
        syncVisuals();
        if (focus) focusAsset(assetId);
    }

    function focusAsset(assetId) {
        const g = markers.get(assetId);
        if (!g) return;
        const p = new THREE.Vector3();
        g.getWorldPosition(p);
        targetGoal = p.clone().add(new THREE.Vector3(0, 1.4, 0));
        cameraGoal = p.clone().add(new THREE.Vector3(10.8, 8.5, 12.5));
        controls.autoRotate = false;
        stage.querySelector('[data-scene-action="orbit"]')?.classList.remove('active');
    }

    function overview() {
        targetGoal = new THREE.Vector3(0, 1.4, 0);
        cameraGoal = new THREE.Vector3(42, 30, 44);
        controls.autoRotate = false;
        stage.querySelector('[data-scene-action="orbit"]')?.classList.remove('active');
    }

    labelLayer.addEventListener('click', event => {
        const button = event.target.closest('[data-twin-asset]');
        if (button) triggerSelection(button.dataset.twinAsset, true);
    });

    canvas.addEventListener('pointermove', event => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        canvas.style.cursor = raycaster.intersectObjects(markerMeshes, false).length ? 'pointer' : 'grab';
    });

    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(markerMeshes, false)[0];
        const id = hit?.object?.userData?.assetId;
        if (id) triggerSelection(id, true);
    });

    stage.querySelector('.twin-3d-toolbar')?.addEventListener('click', event => {
        const button = event.target.closest('[data-scene-action]');
        const action = button?.dataset.sceneAction;
        if (action === 'overview') overview();
        if (action === 'focus' && selectedId) focusAsset(selectedId);
        if (action === 'roof') {
            roofGroup.visible = !roofGroup.visible;
            button.classList.toggle('active', roofGroup.visible);
        }
        if (action === 'orbit') {
            controls.autoRotate = !controls.autoRotate;
            button.classList.toggle('active', controls.autoRotate);
            cameraGoal = null;
            targetGoal = null;
        }
    });

    const mapObserver = new MutationObserver(() => {
        const id = document.documentElement.dataset.twinAsset || document.querySelector('#twin-map .twin-asset.selected')?.dataset.twinAsset;
        if (id && id !== selectedId) {
            selectedId = id;
            syncVisuals();
        }
    });
    mapObserver.observe(map, {childList: true, subtree: true});

    function project(item, offset) {
        const v = new THREE.Vector3();
        item.object.getWorldPosition(v);
        v.y += offset;
        v.project(camera);
        const x = (v.x * .5 + .5) * stage.clientWidth;
        const y = (-v.y * .5 + .5) * stage.clientHeight;
        item.element.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
        item.element.style.opacity = (v.z > -1 && v.z < 1) ? '1' : '0';
        item.element.style.zIndex = String(Math.round((1 - v.z) * 100));
    }

    function resize() {
        setStageHeight();
        const width = Math.max(stage.clientWidth, 320);
        const height = Math.max(stage.clientHeight, 480);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    window.addEventListener('resize', resize, {passive: true});
    resize();

    const clock = new THREE.Clock();
    function frame() {
        requestAnimationFrame(frame);
        const t = clock.getElapsedTime();

        pulses.forEach((pulse, index) => {
            const wave = .5 + .5 * Math.sin(t * 2.1 + pulse.offset + index * .07);
            pulse.halo.scale.setScalar(.88 + wave * .42);
            pulse.halo.material.opacity = .07 + wave * .16;
            pulse.ring.material.opacity = .46 + wave * .3;
        });

        animatedRollers.forEach((roller, index) => {
            roller.rotation.z += index % 2 ? .004 : -.004;
        });
        animatedShafts.forEach((shaft, index) => {
            shaft.rotation.x += index % 2 ? -.012 : .016;
        });

        if (cameraGoal) {
            camera.position.lerp(cameraGoal, .055);
            if (camera.position.distanceTo(cameraGoal) < .08) cameraGoal = null;
        }
        if (targetGoal) {
            controls.target.lerp(targetGoal, .075);
            if (controls.target.distanceTo(targetGoal) < .05) targetGoal = null;
        }

        controls.update();
        labels.forEach(item => project(item, 2.55));
        zoneLabels.forEach(item => project(item, 0));
        renderer.render(scene, camera);
    }

    syncVisuals();
    frame();
    requestAnimationFrame(() => stage.querySelector('#twin-3d-loading')?.classList.add('hidden'));
}

mount3dTwin().catch(error => {
    console.error('[digital-twin-3d]', error);
    const stage = document.querySelector('.twin-map-wrap');
    stage?.classList.remove('twin-3d-stage');
    document.querySelector('#twin-map')?.classList.remove('twin-map-hidden');
});

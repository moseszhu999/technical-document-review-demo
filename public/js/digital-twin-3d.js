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
const WORLD = {width: 30, depth: 20, innerWidth: 28, innerDepth: 18};

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
            <button type="button" data-scene-action="orbit">AUTO ORBIT</button>
        </div>
        <div class="twin-3d-loading" id="twin-3d-loading"><span></span><strong>3D WORKSHOP INITIALIZING</strong></div>
    `);

    const canvas = stage.querySelector('#twin-3d-canvas');
    const labelLayer = stage.querySelector('#twin-3d-label-layer');
    if (!canvas || !labelLayer) throw new Error('3D twin DOM mount failed.');

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07111c);
    scene.fog = new THREE.Fog(0x07111c, 34, 75);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
    camera.position.set(24, 18, 26);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.target.set(0, 1.7, 0);
    controls.minDistance = 15;
    controls.maxDistance = 54;
    controls.minPolarAngle = Math.PI * .18;
    controls.maxPolarAngle = Math.PI * .47;
    controls.autoRotateSpeed = .55;

    scene.add(new THREE.HemisphereLight(0x8db7d8, 0x15202b, 1.25));
    const key = new THREE.DirectionalLight(0xe2f3ff, 3.4);
    key.position.set(14, 28, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -26; key.shadow.camera.right = 26;
    key.shadow.camera.top = 24; key.shadow.camera.bottom = -24; key.shadow.camera.far = 70;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x2d83ff, 1.15);
    rim.position.set(-18, 14, -14);
    scene.add(rim);

    const mat = {
        floor: new THREE.MeshStandardMaterial({color: 0x18212b, roughness: .82, metalness: .18}),
        inset: new THREE.MeshStandardMaterial({color: 0x101923, roughness: .9, metalness: .1}),
        wall: new THREE.MeshStandardMaterial({color: 0x263440, roughness: .7, metalness: .28}),
        steel: new THREE.MeshStandardMaterial({color: 0x566778, roughness: .42, metalness: .75}),
        dark: new THREE.MeshStandardMaterial({color: 0x2c3945, roughness: .48, metalness: .72}),
        light: new THREE.MeshStandardMaterial({color: 0x8293a2, roughness: .34, metalness: .74}),
        yellow: new THREE.MeshStandardMaterial({color: 0xf1a51e, roughness: .5, metalness: .3}),
        orange: new THREE.MeshStandardMaterial({color: 0xb8601d, roughness: .6, metalness: .2}),
        blue: new THREE.MeshStandardMaterial({color: 0x1d5f8b, roughness: .5, metalness: .42}),
        red: new THREE.MeshStandardMaterial({color: 0x9c3240, roughness: .5, metalness: .3}),
        crate: new THREE.MeshStandardMaterial({color: 0x9d7450, roughness: .92}),
        pallet: new THREE.MeshStandardMaterial({color: 0x6b4a2c, roughness: 1}),
        tire: new THREE.MeshStandardMaterial({color: 0x11151a, roughness: .95}),
        screen: new THREE.MeshStandardMaterial({color: 0x091826, emissive: 0x1e96c7, emissiveIntensity: 1.6, roughness: .25}),
        white: new THREE.MeshStandardMaterial({color: 0xc8d2da, roughness: .48, metalness: .32}),
    };
    const root = new THREE.Group();
    scene.add(root);

    function box(parent, size, pos, material = mat.steel, rot = 0, cast = true, receive = true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...pos); mesh.rotation.y = rot; mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
    }
    function cylinder(parent, radius, height, pos, material = mat.steel, axis = 'y', segments = 18) {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
        mesh.position.set(...pos); if (axis === 'x') mesh.rotation.z = Math.PI / 2; if (axis === 'z') mesh.rotation.x = Math.PI / 2;
        mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }

    box(root, [WORLD.width, .5, WORLD.depth], [0, -.25, 0], mat.floor);
    box(root, [WORLD.innerWidth, .08, WORLD.innerDepth], [0, .045, 0], mat.inset, 0, false, true);
    box(root, [WORLD.width, 5.6, .35], [0, 2.8, -WORLD.depth / 2], mat.wall);
    box(root, [.35, 5.6, WORLD.depth], [-WORLD.width / 2, 2.8, 0], mat.wall);
    box(root, [.35, 5.6, WORLD.depth * .72], [WORLD.width / 2, 2.8, -2.8], mat.wall);
    for (let x = -12; x <= 12; x += 6) for (const z of [-8.5, -2.8, 2.8, 8.5]) box(root, [.22, 5.4, .22], [x, 2.7, z], mat.dark);
    for (const z of [-8.5, -2.8, 2.8]) box(root, [28, .18, .18], [0, 5.25, z], mat.dark);
    const grid = new THREE.GridHelper(28, 28, 0x324d60, 0x263746);
    grid.position.y = .095; grid.material.transparent = true; grid.material.opacity = .24; root.add(grid);

    const zoneRects = new Map();
    (registry.zones ?? []).forEach((zone, index) => {
        const rect = zoneRect(zone); zoneRects.set(zone.zone_id, rect);
        const zoneMat = new THREE.MeshStandardMaterial({color: [0x164d6a,0x1e596d,0x1b4b58,0x174d60,0x244955,0x294d59][index % 6], transparent: true, opacity: .32, roughness: .76, metalness: .18, depthWrite: false});
        const slab = box(root, [rect.width - .2, .055, rect.depth - .2], [rect.x, .115, rect.z], zoneMat, 0, false, true);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({color: 0x46bce8, transparent: true, opacity: .36}));
        edges.position.copy(slab.position); root.add(edges);
    });
    box(root, [.09, .025, 17.4], [-.7, .16, 0], mat.yellow, 0, false, false);
    box(root, [.09, .025, 17.4], [.7, .16, 0], mat.yellow, 0, false, false);
    for (let i = -4; i <= 4; i++) box(root, [.7, .02, .13], [0, .17, 4.6 + i * .35], mat.white, 0, false, false);

    function palletStack(x, z, layers = 2) {
        box(root, [2.1,.16,1.25],[x,.24,z],mat.pallet);
        for (let l=0;l<layers;l++) for (let i=0;i<3;i++) box(root,[.58,.5,.95],[x-.68+i*.68,.58+l*.52,z],mat.crate);
    }
    function rack(x,z,width=3.2) {
        for (const sx of [-width/2,width/2]) for (const sz of [-.55,.55]) box(root,[.12,3.2,.12],[x+sx,1.6,z+sz],mat.dark);
        for (let l=0;l<3;l++) { const y=.55+l*1.05; box(root,[width+.2,.1,1.25],[x,y,z],mat.orange); for(let i=-1;i<=1;i++) box(root,[.75,.55,.85],[x+i*.9,y+.34,z],mat.crate); }
    }
    function workbench(x,z,width=2.5) {
        const g=new THREE.Group(); g.position.set(x,0,z); root.add(g); box(g,[width,.16,1.05],[0,1,0],mat.light);
        for(const sx of[-width/2+.16,width/2-.16]) for(const sz of[-.4,.4]) box(g,[.12,1,.12],[sx,.5,sz],mat.dark); return g;
    }
    function monitor(x,z,y=1.65) { const g=new THREE.Group();g.position.set(x,0,z);root.add(g);box(g,[.09,.55,.09],[0,y-.34,0],mat.dark);box(g,[.75,.48,.09],[0,y,0],mat.screen); }
    function gearbox(parent,x=0,z=0,scale=1,rot=0) {
        const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.scale.setScalar(scale);parent.add(g);
        box(g,[1.35,1,1.05],[0,.86,0],mat.light);cylinder(g,.42,.34,[.72,.88,0],mat.dark,'x');cylinder(g,.25,1.9,[0,.9,0],mat.steel,'x');cylinder(g,.36,.3,[-.72,.88,0],mat.dark,'x');box(g,[1.55,.14,1.2],[0,.3,0],mat.dark);return g;
    }
    function conveyor(x,z,length=7) { const g=new THREE.Group();g.position.set(x,0,z);root.add(g);box(g,[length,.22,1.1],[0,.8,0],mat.dark);for(let i=-length/2+.35;i<length/2;i+=.48)cylinder(g,.09,.92,[i,.94,0],mat.light,'z',12);return g; }
    function truck(x,z,rot=0,scale=.75) { const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.scale.setScalar(scale);root.add(g);box(g,[5.4,2.1,2],[-.4,1.45,0],mat.white);box(g,[1.55,1.75,2],[3,1.22,0],mat.blue);box(g,[.85,.7,1.84],[3.35,1.8,0],mat.screen);for(const wx of[-2.25,-.35,2.55,3.25])for(const wz of[-1.03,1.03])cylinder(g,.38,.26,[wx,.45,wz],mat.tire,'z',18); }
    function forklift(x,z,rot=0) { const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;root.add(g);box(g,[1.1,.6,1],[0,.55,0],mat.yellow);box(g,[.75,.85,.9],[-.15,1.15,0],mat.dark);box(g,[.12,1.75,1.15],[.72,1,0],mat.dark);for(const zf of[-.35,.35])box(g,[1.25,.06,.08],[1.18,.18,zf],mat.steel); }
    function rail(x,z,length=4) { const g=new THREE.Group();g.position.set(x,0,z);root.add(g);for(let i=-length/2;i<=length/2;i+=1)box(g,[.07,1,.07],[i,.5,0],mat.yellow);box(g,[length,.07,.07],[0,.45,0],mat.yellow);box(g,[length,.07,.07],[0,.9,0],mat.yellow); }

    const receiving=zoneRects.get('receiving'); if(receiving){truck(receiving.x-1.6,receiving.z-.15,Math.PI/2);palletStack(receiving.x+2.25,receiving.z-1.5,1);forklift(receiving.x+1.65,receiving.z+1.25,-.55);rail(receiving.x+2.4,receiving.z+2.2,3.5);}
    const storage=zoneRects.get('storage'); if(storage){rack(storage.x-1.65,storage.z-.9,3);rack(storage.x-1.65,storage.z+.85,3);rack(storage.x+1.75,storage.z-.9,2.8);palletStack(storage.x+1.7,storage.z+1.2,2);}
    const assembly=zoneRects.get('assembly'); if(assembly){conveyor(assembly.x-1.2,assembly.z-.7,8.5);conveyor(assembly.x+2.8,assembly.z+1,6);for(let i=-2;i<=2;i++)gearbox(root,assembly.x-1.4+i*1.65,assembly.z-.7,.62,.12);const w1=workbench(assembly.x+3.8,assembly.z-1.65,2.3);gearbox(w1,0,0,.62,.15);const w2=workbench(assembly.x+3.8,assembly.z+2,2.3);gearbox(w2,0,0,.6,-.1);rail(assembly.x-1,assembly.z-2.35,8.4);}
    const inspection=zoneRects.get('inspection'); if(inspection){for(let i=0;i<3;i++){const x=inspection.x-3.8+i*3.7;const w=workbench(x,inspection.z,2.5);gearbox(w,0,0,.58,.05*i);monitor(x,inspection.z-.38,1.82);}rail(inspection.x,inspection.z+2.25,9.3);box(root,[1,1.55,.75],[inspection.x+5.2,.78,inspection.z-1.65],mat.blue);monitor(inspection.x+5.2,inspection.z-1.2,1.75);}
    const maintenance=zoneRects.get('maintenance'); if(maintenance){workbench(maintenance.x-2,maintenance.z,3);workbench(maintenance.x+1.5,maintenance.z,2.6);box(root,[1.3,2.2,.65],[maintenance.x+4,1.1,maintenance.z-.9],mat.red);box(root,[1.3,2.2,.65],[maintenance.x+4,1.1,maintenance.z+.9],mat.blue);gearbox(root,maintenance.x-2,maintenance.z,.75,.2);}
    const shipping=zoneRects.get('shipping'); if(shipping){truck(shipping.x+2.6,shipping.z+.25,-Math.PI/2,.72);palletStack(shipping.x-3.1,shipping.z-1,2);palletStack(shipping.x-.7,shipping.z-1,1);forklift(shipping.x-2,shipping.z+1.25,.65);}

    [[-7,4.8,-4],[2,4.8,-4],[7,4.8,1.5],[-7,4.8,5.8]].forEach(([x,y,z])=>{const light=new THREE.PointLight(0xb9e7ff,1.45,12,2);light.position.set(x,y,z);root.add(light);box(root,[1.1,.08,.22],[x,y+.08,z],mat.white,0,false,false);});

    const markerMeshes=[]; const markers=new Map(); const pulses=[]; const labels=[]; const zoneLabels=[];
    (registry.assets??[]).forEach(asset=>{
        const p=pointFromPercent(asset.x,asset.y,.18);const color=STATUS_COLORS[asset.status]??STATUS_COLORS.idle;const g=new THREE.Group();g.position.copy(p);root.add(g);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.055,10,30),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);
        const halo=new THREE.Mesh(new THREE.RingGeometry(.42,.72,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.2,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.09;g.add(halo);
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.2,12),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.9}));stem.position.y=.72;g.add(stem);
        const orb=new THREE.Mesh(new THREE.SphereGeometry(.16,18,18),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.4,roughness:.18}));orb.position.y=1.34;g.add(orb);
        const lamp=new THREE.PointLight(color,asset.status==='review_required'?1.8:1,3.2,2.2);lamp.position.y=1.35;g.add(lamp);
        g.traverse(child=>{child.userData.assetId=asset.asset_id;if(child.isMesh)markerMeshes.push(child);});markers.set(asset.asset_id,g);pulses.push({ring,halo,offset:Math.random()*Math.PI*2});
        const label=document.createElement('button');label.type='button';label.className=`twin-3d-asset-label ${asset.status}`;label.dataset.twinAsset=asset.asset_id;label.innerHTML=`<strong>${escapeHtml(asset.asset_id)}</strong><span>${escapeHtml(STATUS_LABELS[asset.status]??asset.status)}</span>`;labelLayer.appendChild(label);labels.push({element:label,object:g,asset});
    });
    (registry.zones??[]).forEach(zone=>{const r=zoneRect(zone);const anchor=new THREE.Object3D();anchor.position.set(r.x,3.45,r.z-r.depth*.18);root.add(anchor);const el=document.createElement('div');el.className='twin-3d-zone-label';el.textContent=String(zone.label).split('/')[0].trim();labelLayer.appendChild(el);zoneLabels.push({element:el,object:anchor});});

    let selectedId=document.documentElement.dataset.twinAsset||registry.default_asset_id||registry.assets?.[0]?.asset_id;let cameraGoal=null;let targetGoal=null;
    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
    function syncVisuals(){labels.forEach(i=>i.element.classList.toggle('selected',i.asset.asset_id===selectedId));markers.forEach((g,id)=>g.scale.setScalar(id===selectedId?1.28:1));}
    function triggerSelection(assetId,focus=true){const button=document.querySelector(`#twin-map [data-twin-asset="${CSS.escape(assetId)}"]`);button?.click();selectedId=assetId;syncVisuals();if(focus)focusAsset(assetId);}
    function focusAsset(assetId){const g=markers.get(assetId);if(!g)return;const p=new THREE.Vector3();g.getWorldPosition(p);targetGoal=p.clone().add(new THREE.Vector3(0,.9,0));cameraGoal=p.clone().add(new THREE.Vector3(8.8,7.5,10.5));controls.autoRotate=false;stage.querySelector('[data-scene-action="orbit"]')?.classList.remove('active');}
    function overview(){targetGoal=new THREE.Vector3(0,1.7,0);cameraGoal=new THREE.Vector3(24,18,26);controls.autoRotate=false;stage.querySelector('[data-scene-action="orbit"]')?.classList.remove('active');}
    labelLayer.addEventListener('click',e=>{const b=e.target.closest('[data-twin-asset]');if(b)triggerSelection(b.dataset.twinAsset,true);});
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);canvas.style.cursor=raycaster.intersectObjects(markerMeshes,false).length?'pointer':'grab';});
    canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(markerMeshes,false)[0];const id=hit?.object?.userData?.assetId;if(id)triggerSelection(id,true);});
    stage.querySelector('.twin-3d-toolbar')?.addEventListener('click',e=>{const b=e.target.closest('[data-scene-action]');const action=b?.dataset.sceneAction;if(action==='overview')overview();if(action==='focus'&&selectedId)focusAsset(selectedId);if(action==='orbit'){controls.autoRotate=!controls.autoRotate;b.classList.toggle('active',controls.autoRotate);cameraGoal=null;targetGoal=null;}});
    const mapObserver=new MutationObserver(()=>{const id=document.documentElement.dataset.twinAsset||document.querySelector('#twin-map .twin-asset.selected')?.dataset.twinAsset;if(id&&id!==selectedId){selectedId=id;syncVisuals();}});mapObserver.observe(map,{childList:true,subtree:true});

    function project(item,offset){const v=new THREE.Vector3();item.object.getWorldPosition(v);v.y+=offset;v.project(camera);const x=(v.x*.5+.5)*stage.clientWidth;const y=(-v.y*.5+.5)*stage.clientHeight;item.element.style.transform=`translate(-50%,-100%) translate(${x}px,${y}px)`;item.element.style.opacity=(v.z>-1&&v.z<1)?'1':'0';item.element.style.zIndex=String(Math.round((1-v.z)*100));}
    function resize(){const w=Math.max(stage.clientWidth,320),h=Math.max(stage.clientHeight,480);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const ro=new ResizeObserver(resize);ro.observe(stage);resize();
    const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const t=clock.getElapsedTime();pulses.forEach((p,i)=>{const wave=.5+.5*Math.sin(t*2.2+p.offset+i*.07);p.halo.scale.setScalar(.88+wave*.45);p.halo.material.opacity=.08+wave*.18;p.ring.material.opacity=.48+wave*.34;});if(cameraGoal){camera.position.lerp(cameraGoal,.055);if(camera.position.distanceTo(cameraGoal)<.08)cameraGoal=null;}if(targetGoal){controls.target.lerp(targetGoal,.075);if(controls.target.distanceTo(targetGoal)<.05)targetGoal=null;}controls.update();labels.forEach(i=>project(i,2));zoneLabels.forEach(i=>project(i,0));renderer.render(scene,camera);}syncVisuals();frame();requestAnimationFrame(()=>stage.querySelector('#twin-3d-loading')?.classList.add('hidden'));
}

mount3dTwin().catch(error => {
    console.error('[digital-twin-3d]', error);
    const stage=document.querySelector('.twin-map-wrap');
    stage?.classList.remove('twin-3d-stage');
    document.querySelector('#twin-map')?.classList.remove('twin-map-hidden');
});

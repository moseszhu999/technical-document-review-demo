import * as THREE from 'three';

const originalRender = THREE.WebGLRenderer.prototype.render;
const structuralMeshes = new Set();
let structureVisible = false;
let scannedScene = null;

function approximately(value, expected, tolerance = 0.03) {
    return Math.abs(Number(value) - expected) <= tolerance;
}

function isToggleableStructure(object) {
    if (!object?.isMesh || object.geometry?.type !== 'BoxGeometry') return false;
    const {width, height, depth} = object.geometry.parameters ?? {};

    const isColumn = approximately(width, .26) && approximately(height, 7.9) && approximately(depth, .26);
    const isOverheadBeam = approximately(width, 50) && approximately(height, .22) && approximately(depth, .22);

    return isColumn || isOverheadBeam;
}

function applyStructureVisibility() {
    structuralMeshes.forEach(mesh => {
        mesh.visible = structureVisible;
    });
}

function scanScene(scene) {
    structuralMeshes.clear();
    scene.traverse(object => {
        if (isToggleableStructure(object)) structuralMeshes.add(object);
    });
    scannedScene = scene;
    applyStructureVisibility();
}

THREE.WebGLRenderer.prototype.render = function patchedRender(scene, camera) {
    if (scene !== scannedScene) scanScene(scene);
    return originalRender.call(this, scene, camera);
};

function configureToolbarButton(button) {
    if (!button || button.dataset.structureToggleReady === 'true') return;
    button.dataset.structureToggleReady = 'true';
    button.textContent = 'STRUCTURE';
    button.title = '屋根・柱・上部梁の表示を切り替え';
    button.setAttribute('aria-label', '屋根・柱・上部梁の表示を切り替え');
}

function syncFromButton(button) {
    structureVisible = Boolean(button?.classList.contains('active'));
    applyStructureVisibility();
}

function findAndConfigureButton() {
    const button = document.querySelector('#digital-twin-root [data-scene-action="roof"], .twin-3d-toolbar [data-scene-action="roof"]');
    if (!button) return false;
    configureToolbarButton(button);
    syncFromButton(button);
    return true;
}

const observer = new MutationObserver(() => {
    if (findAndConfigureButton()) observer.disconnect();
});
observer.observe(document.documentElement, {childList: true, subtree: true});
findAndConfigureButton();

document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-scene-action="roof"]');
    if (!button) return;
    window.setTimeout(() => syncFromButton(button), 0);
}, true);

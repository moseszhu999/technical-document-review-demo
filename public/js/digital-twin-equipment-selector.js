(() => {
    const SELECTOR_ID = 'twin-equipment-select';

    function waitForToolbar(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const current = document.querySelector('#digital-twin-root .twin-3d-toolbar');
            if (current) return resolve(current);
            const observer = new MutationObserver(() => {
                const toolbar = document.querySelector('#digital-twin-root .twin-3d-toolbar');
                if (!toolbar) return;
                observer.disconnect();
                resolve(toolbar);
            });
            observer.observe(document.body, {childList: true, subtree: true});
            window.setTimeout(() => {
                observer.disconnect();
                reject(new Error('Digital Twin toolbar did not mount in time.'));
            }, timeout);
        });
    }

    async function mountEquipmentSelector() {
        const toolbar = await waitForToolbar();
        if (toolbar.querySelector(`#${SELECTOR_ID}`)) return;

        const response = await fetch('/data/workshop-assets.json', {headers: {'Accept': 'application/json'}});
        if (!response.ok) throw new Error(`workshop registry HTTP ${response.status}`);
        const registry = await response.json();

        const legacyFocus = toolbar.querySelector('[data-scene-action="focus"]');
        const select = document.createElement('select');
        select.id = SELECTOR_ID;
        select.className = 'twin-equipment-select';
        select.setAttribute('aria-label', '設備を選択');
        select.title = '設備を選択';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '設備を選択';
        placeholder.disabled = true;
        select.appendChild(placeholder);

        for (const asset of registry.assets ?? []) {
            const option = document.createElement('option');
            option.value = asset.asset_id;
            option.textContent = `${asset.asset_id} · ${asset.label}`;
            select.appendChild(option);
        }

        if (legacyFocus) legacyFocus.replaceWith(select);
        else toolbar.insertBefore(select, toolbar.querySelector('[data-scene-action="orbit"]'));

        const currentAsset = () => document.documentElement.dataset.twinAsset || registry.default_asset_id || '';
        const syncValue = () => {
            const id = currentAsset();
            if (id && select.querySelector(`option[value="${CSS.escape(id)}"]`)) select.value = id;
        };
        syncValue();

        select.addEventListener('change', () => {
            const assetId = select.value;
            if (!assetId) return;
            const assetLabel = document.querySelector(`#twin-3d-label-layer [data-twin-asset="${CSS.escape(assetId)}"]`);
            if (assetLabel) {
                assetLabel.click();
                return;
            }
            const fallback = document.querySelector(`#twin-map [data-twin-asset="${CSS.escape(assetId)}"]`);
            fallback?.click();
        });

        const selectionObserver = new MutationObserver(syncValue);
        selectionObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-twin-asset']});
    }

    mountEquipmentSelector().catch(error => console.error('[digital-twin-equipment-selector]', error));
})();

(() => {
    const inflight = new Map();
    const cache = new Map();

    async function getJson(url, options = {}) {
        const key = String(url);
        if (cache.has(key)) return cache.get(key);
        if (inflight.has(key)) return inflight.get(key);

        const controller = new AbortController();
        const timeoutMs = Number(options.timeoutMs ?? 15000);
        const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

        const requestOptions = {...options};
        delete requestOptions.timeoutMs;
        requestOptions.signal = controller.signal;
        requestOptions.headers = {'Accept': 'application/json', ...(options.headers ?? {})};

        const promise = (async () => {
            const response = await window.fetch(key, requestOptions);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            cache.set(key, data);
            return data;
        })();

        inflight.set(key, promise);

        try {
            return await promise;
        } finally {
            window.clearTimeout(timeout);
            if (inflight.get(key) === promise) inflight.delete(key);
        }
    }

    window.DemoApi = Object.freeze({getJson});
})();

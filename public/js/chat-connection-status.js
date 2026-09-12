const status = document.querySelector('#ai-connection-status');

if (status) {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const request = args[0];
        const url = typeof request === 'string' ? request : request?.url ?? '';

        if (url.includes('/api/demo/chat')) {
            response.clone().json().then(data => {
                status.classList.remove('is-fallback', 'is-connected');

                if (data.mode === 'grounded_fallback') {
                    status.textContent = 'AI接続失敗・固定デモ回答に切替';
                    status.classList.add('is-fallback');
                    status.hidden = false;
                    return;
                }

                if (data.mode === 'ark_grounded') {
                    status.textContent = 'AI接続中・火山方舟';
                    status.classList.add('is-connected');
                    status.hidden = false;
                    return;
                }

                status.hidden = true;
            }).catch(() => {
                status.textContent = 'AI接続状態を確認できません';
                status.classList.add('is-fallback');
                status.hidden = false;
            });
        }

        return response;
    };
}

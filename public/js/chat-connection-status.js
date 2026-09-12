const status = document.querySelector('#ai-connection-status');
const chatMessages = document.querySelector('#chat-messages');
const submitButton = document.querySelector('#chat-form button[type="submit"]');
const defaultButtonLabel = submitButton?.textContent ?? '質問する';

const thinkingPhases = [
    'AIが文書を確認中',
    'ルールとエビデンスを照合中',
    '根拠付き回答を生成中',
];

let thinkingNode = null;
let thinkingTimer = null;
let thinkingPhase = 0;

function startChatLoading() {
    if (!chatMessages) return;

    stopChatLoading();
    thinkingPhase = 0;
    thinkingNode = document.createElement('div');
    thinkingNode.className = 'chat-message assistant chat-thinking';
    thinkingNode.setAttribute('role', 'status');
    thinkingNode.setAttribute('aria-live', 'polite');
    thinkingNode.innerHTML = `
        <div class="chat-avatar thinking-avatar" aria-hidden="true">AI</div>
        <div>
            <div class="chat-bubble thinking-bubble">
                <div class="thinking-line">
                    <span class="thinking-orb" aria-hidden="true"></span>
                    <span class="thinking-label">${thinkingPhases[0]}</span>
                    <span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                </div>
                <div class="thinking-progress" aria-hidden="true"><span></span></div>
            </div>
            <div class="chat-sources thinking-note">公開デモの文書・ナレッジ・ルール・エビデンスを参照しています</div>
        </div>
    `;

    chatMessages.appendChild(thinkingNode);
    chatMessages.setAttribute('aria-busy', 'true');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('is-thinking');
        submitButton.textContent = '分析中';
    }

    thinkingTimer = window.setInterval(() => {
        if (!thinkingNode) return;
        thinkingPhase = Math.min(thinkingPhase + 1, thinkingPhases.length - 1);
        const label = thinkingNode.querySelector('.thinking-label');
        if (label) label.textContent = thinkingPhases[thinkingPhase];
    }, 6500);
}

function stopChatLoading() {
    if (thinkingTimer) {
        window.clearInterval(thinkingTimer);
        thinkingTimer = null;
    }

    if (thinkingNode) {
        thinkingNode.remove();
        thinkingNode = null;
    }

    if (chatMessages) chatMessages.removeAttribute('aria-busy');

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('is-thinking');
        submitButton.textContent = defaultButtonLabel;
    }
}

if (status) {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const request = args[0];
        const url = typeof request === 'string' ? request : request?.url ?? '';
        const isChatRequest = url.includes('/api/demo/chat');

        if (isChatRequest) startChatLoading();

        let response;
        try {
            response = await originalFetch(...args);
        } catch (error) {
            if (isChatRequest) {
                status.textContent = 'AI接続状態を確認できません';
                status.classList.remove('is-connected');
                status.classList.add('is-fallback');
                status.hidden = false;
                stopChatLoading();
            }
            throw error;
        }

        if (isChatRequest) {
            response.clone().json().then(data => {
                status.classList.remove('is-fallback', 'is-connected');

                if (data.mode === 'grounded_fallback') {
                    status.textContent = 'AI接続失敗・固定デモ回答に切替';
                    status.classList.add('is-fallback');
                    status.hidden = false;
                    return;
                }

                if (data.mode === 'ark_grounded') {
                    status.textContent = 'AI接続中・火山方舟 Agent Plan';
                    status.classList.add('is-connected');
                    status.hidden = false;
                    return;
                }

                status.hidden = true;
            }).catch(() => {
                status.textContent = 'AI接続状態を確認できません';
                status.classList.remove('is-connected');
                status.classList.add('is-fallback');
                status.hidden = false;
            }).finally(() => {
                window.setTimeout(stopChatLoading, 120);
            });
        }

        return response;
    };
}

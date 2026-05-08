const CHAT_MANAGER = {
    enableInput(status) {
        const input   = document.getElementById('msg-input');
        const sendBtn = document.getElementById('send-btn');
        if (!input || !sendBtn) return;
        input.disabled   = !status;
        sendBtn.disabled = !status;
        input.placeholder = status ? "Type a message…" : "Start a call to chat…";
        if (status) setTimeout(() => input.focus(), 400);
    },

    sendMessage() {
        const input = document.getElementById('msg-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg || typeof currentRoomId === 'undefined' || !currentRoomId) return;

        socket.emit('chat_message', { roomId: currentRoomId, message: msg, sender: socket.id });
        this.appendMessage(msg, 'my-msg');
        input.value = '';
    },

    appendMessage(text, className = '', isSystem = false) {
        const container = document.getElementById('chat-display');
        if (!container) return;

        const overlay = container.querySelector('.overlay-text');
        if (overlay) overlay.remove();

        const msg = document.createElement('div');
        if (isSystem) {
            msg.className = 'system-msg';
            msg.innerText = text;
        } else {
            msg.className = `message-wrapper ${className}`;
            msg.innerHTML = `<div class="message-bubble"><div class="message-text">${this._escape(text)}</div></div>`;
        }
        container.appendChild(msg);
        this.scrollToBottom();
    },

    _escape(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    scrollToBottom() {
        const container = document.getElementById('chat-display');
        if (!container) return;
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    },

    clearChat() {
        const container = document.getElementById('chat-display');
        if (!container) return;
        container.innerHTML = `
            <div class="overlay-text">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8"  y1="23" x2="16" y2="23"/>
                </svg>
                Audio only mode
                <span>Start a call to enable chat</span>
            </div>`;
    },

    toggleMuteUI(isMuted) {
        const btn   = document.getElementById('mute-btn');
        const label = document.getElementById('mute-label');
        if (!btn || !label) return;
        btn.classList.toggle('muted', isMuted);
        label.innerText = isMuted ? 'Muted' : 'Mute';
    }
};

// ── Event listeners ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const input   = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn?.addEventListener('click', () => CHAT_MANAGER.sendMessage());
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); CHAT_MANAGER.sendMessage(); }
    });
    input?.addEventListener('focus', () => {
        setTimeout(() => CHAT_MANAGER.scrollToBottom(), 350);
    });
});

// ── Socket listeners ───────────────────────────────────────
socket.on('chat_message', (data) => {
    if (data.sender === socket.id) return;

    // Route game events to GAME_MANAGER, regular text to chat display
    if (data.gameData) {
        if (typeof GAME_MANAGER !== 'undefined') {
            GAME_MANAGER.handleIncoming(data.gameData);
        }
        return;
    }

    CHAT_MANAGER.appendMessage(data.message, 'peer-msg');
});

socket.on('peer_muted', (data) => {
    CHAT_MANAGER.appendMessage(
        data.isMuted ? '🔇 Partner muted their mic' : '🎤 Partner unmuted their mic',
        '', true
    );
});
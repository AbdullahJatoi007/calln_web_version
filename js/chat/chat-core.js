// ═══════════════════════════════════════════════════════════
// CHAT_MANAGER — CORE
// This file OWNS the `const CHAT_MANAGER = {...}` declaration.
// chat-images.js and chat-typing.js extend it with
// Object.assign(CHAT_MANAGER, {...}) — they must load AFTER this
// file, and must never use `const CHAT_MANAGER` themselves or it
// will throw a redeclaration SyntaxError (same class of bug as
// the CONFIG duplicate in config.js/connection.js).
// ═══════════════════════════════════════════════════════════
const CHAT_MANAGER = {

    // ── ENABLE / DISABLE INPUTS ──
    enableInput(status) {
        const input     = document.getElementById('msg-input');
        const sendBtn   = document.getElementById('send-btn');
        const cameraBtn = document.getElementById('camera-btn');

        if (!input || !sendBtn) return;

        input.disabled   = !status;
        sendBtn.disabled = !status;

        if (cameraBtn) {
            cameraBtn.disabled = !status;
            cameraBtn.classList.toggle('disabled', !status);
        }

        input.placeholder = status
            ? "Type a message…"
            : "Start a call to chat…";

        if (status) setTimeout(() => input.focus(), 400);
    },

    // ── TEXT MESSAGE ──
    sendMessage() {
        const input = document.getElementById('msg-input');
        if (!input) return;

        const msg = input.value.trim();
        if (!msg || !currentRoomId) return;

        this.stopTyping();   // stop typing indicator immediately on send

        socket.emit('chat_message', {
            roomId:  currentRoomId,
            sender:  socket.id,
            message: msg
        });

        this.appendMessage(msg, 'my-msg');
        input.value = '';
    },

    // ── TEXT MESSAGE RENDER ──
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
            msg.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${this._escape(text)}</div>
                </div>
            `;
        }

        container.appendChild(msg);
        this.scrollToBottom();
    },

    _escape(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    // ── SCROLL ──
    scrollToBottom() {
        const container = document.getElementById('chat-display');
        if (!container) return;
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    },

    // ── CLEAR CHAT ──
    clearChat() {
        const container = document.getElementById('chat-display');
        if (!container) return;

        // Reset typing state so showTypingIndicator works cleanly next call
        this._isMeTyping = false;
        clearTimeout(this._typingTimer);

        container.innerHTML = `
            <div class="overlay-text">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="1.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                Audio only mode
                <span>Start a call to enable chat</span>
            </div>
        `;
    },

    // ── MUTE UI ──
    toggleMuteUI(isMuted) {
        const btn   = document.getElementById('mute-btn');
        const label = document.getElementById('mute-label');

        if (!btn || !label) return;

        btn.classList.toggle('muted', isMuted);
        label.innerText = isMuted ? 'Muted' : 'Mute';
    }
};

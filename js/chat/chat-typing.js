// ═══════════════════════════════════════════════════════════
// CHAT_MANAGER — TYPING INDICATOR
// Extends the CHAT_MANAGER declared in chat-core.js. This file
// must load AFTER chat-core.js.
// ═══════════════════════════════════════════════════════════
Object.assign(CHAT_MANAGER, {

    _typingTimer: null,
    _isMeTyping: false,

    // ── TYPING — SEND ──────────────────────────────────────────────
    // Called on every keystroke. Debounced so we don't spam the server.
    notifyTyping() {
        if (!currentRoomId) return;
        if (!this._isMeTyping) {
            this._isMeTyping = true;
            socket.emit('typing', { roomId: currentRoomId, isTyping: true });
        }
        clearTimeout(this._typingTimer);
        this._typingTimer = setTimeout(() => {
            this._isMeTyping = false;
            socket.emit('typing', { roomId: currentRoomId, isTyping: false });
        }, 2000);
    },

    stopTyping() {
        if (!this._isMeTyping) return;
        clearTimeout(this._typingTimer);
        this._isMeTyping = false;
        if (currentRoomId) {
            socket.emit('typing', { roomId: currentRoomId, isTyping: false });
        }
    },

    // ── TYPING — RECEIVE ───────────────────────────────────────────
    showTypingIndicator() {
        const container = document.getElementById('chat-display');
        if (!container) return;

        const stale = document.getElementById('typing-indicator');
        if (stale) stale.remove();

        const overlay = container.querySelector('.overlay-text');
        if (overlay) overlay.remove();

        const wrapper = document.createElement('div');
        wrapper.id = 'typing-indicator';
        wrapper.className = 'message-wrapper peer-msg';
        wrapper.innerHTML = `
            <div class="message-bubble" style="padding: 10px 14px;">
                <div style="display:flex; align-items:center; gap:4px; height:16px;">
                    <span class="typing-dot" style="background: rgba(255,255,255,0.7);"></span>
                    <span class="typing-dot" style="background: rgba(255,255,255,0.7);"></span>
                    <span class="typing-dot" style="background: rgba(255,255,255,0.7);"></span>
                </div>
            </div>
        `;
        container.appendChild(wrapper);
        this.scrollToBottom();
    },

    hideTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    },
});

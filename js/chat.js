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

        this.stopTyping();   // Change 2: Stop typing indicator immediately on send

        socket.emit('chat_message', {
            roomId:  currentRoomId,
            sender:  socket.id,
            message: msg
        });

        this.appendMessage(msg, 'my-msg');
        input.value = '';
    },

    // ── OPEN IMAGE PICKER ──
    openGallery() {
        if (!currentRoomId) return;

        const picker = document.getElementById('image-picker');
        if (picker) picker.click();
    },

    // ── IMAGE SEND ──
    async handleImageSelected(file) {
        if (!file || !currentRoomId) return;

        this.stopTyping();   // Change 3: Stop typing indicator immediately on image selection

        try {
            // Show a sending indicator in chat while compressing
            this.appendMessage('📷 Sending image…', 'my-msg system-sending');

            const compressedBase64 = await this.compressImage(file);

            // Remove the sending indicator
            const sending = document.querySelector('.system-sending');
            if (sending) sending.remove();

            // Render immediately on sender's side
            this.appendImage(compressedBase64, 'my-msg');

            // Emit via socket — server relays to partner, never stored
            socket.emit('chat_message', {
                roomId: currentRoomId,
                sender: socket.id,
                image:  compressedBase64
            });

        } catch (err) {
            console.error('Image send failed:', err);
            const sending = document.querySelector('.system-sending');
            if (sending) sending.remove();
            this.appendMessage('⚠️ Failed to send image.', '', true);
        }
    },

    // ── IMAGE COMPRESSION ──
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx    = canvas.getContext('2d');

                    let width  = img.width;
                    let height = img.height;

                    const MAX_DIM = 1080;
                    if (width > height && width > MAX_DIM) {
                        height = Math.floor((height * MAX_DIM) / width);
                        width  = MAX_DIM;
                    } else if (height > width && height > MAX_DIM) {
                        width  = Math.floor((width * MAX_DIM) / height);
                        height = MAX_DIM;
                    } else if (width > MAX_DIM) {
                        height = Math.floor((height * MAX_DIM) / width);
                        width  = MAX_DIM;
                    }

                    canvas.width  = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const TARGET_B64_BYTES = 100 * 1024;

                    let quality = 0.85;
                    let base64  = canvas.toDataURL('image/jpeg', quality);

                    while (base64.length > TARGET_B64_BYTES && quality > 0.1) {
                        quality -= 0.05;
                        base64   = canvas.toDataURL('image/jpeg', quality);
                    }

                    console.log(
                        `[IMG] compressed to ~${Math.round(base64.length / 1024)}KB ` +
                        `at quality=${quality.toFixed(2)} | original=${file.name}`
                    );

                    resolve(base64);
                };

                img.onerror = () => reject(new Error('Image load failed'));
                img.src = event.target.result;
            };

            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    },

    // ── RENDER IMAGE BUBBLE ──
    appendImage(src, className = '') {
        const container = document.getElementById('chat-display');
        if (!container) return;

        const overlay = container.querySelector('.overlay-text');
        if (overlay) overlay.remove();

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${className}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble image-bubble';

        const img     = document.createElement('img');
        img.src       = src;
        img.alt       = 'photo';
        img.style.cssText = `
            max-width: 200px;
            max-height: 200px;
            border-radius: 10px;
            display: block;
            cursor: pointer;
            object-fit: cover;
        `;

        img.addEventListener('click', () => {
            this.openImageFullscreen(src);
        });

        bubble.appendChild(img);
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);

        this.scrollToBottom();
    },

    // ── FULLSCREEN LIGHTBOX ──
    openImageFullscreen(src) {
        const existing = document.getElementById('img-lightbox');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.id = 'img-lightbox';
        box.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            cursor: pointer;
        `;

        box.innerHTML = `
            <img src="${src}"
                 style="max-width:90vw; max-height:90vh;
                        border-radius:12px; object-fit:contain;" />
        `;

        box.onclick = () => box.remove();
        document.body.appendChild(box);
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

    // Change 1: Added typing methods below clearChat()
    // ── TYPING — SEND ──────────────────────────────────────────────
    // Called on every keystroke. Debounced so we don't spam the server.
    _typingTimer: null,
    _isMeTyping: false,

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

    // ── MUTE UI ──
    toggleMuteUI(isMuted) {
        const btn   = document.getElementById('mute-btn');
        const label = document.getElementById('mute-label');

        if (!btn || !label) return;

        btn.classList.toggle('muted', isMuted);
        label.innerText = isMuted ? 'Muted' : 'Mute';
    }
};

// ══════════════════════════════════════════════════════════════
// DOM EVENTS
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const input     = document.getElementById('msg-input');
    const sendBtn   = document.getElementById('send-btn');
    const cameraBtn = document.getElementById('camera-btn');

    sendBtn?.addEventListener('click', () => CHAT_MANAGER.sendMessage());

    cameraBtn?.addEventListener('click', () => {
        if (cameraBtn.disabled) return;
        CHAT_MANAGER.openGallery();
    });

    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            CHAT_MANAGER.sendMessage();
        }
    });

    // Change 4: Wire up input tracking for keystroke notifications
    input?.addEventListener('input', () => {
        CHAT_MANAGER.notifyTyping();
    });

    // Hidden file input — created once, reused every time
    const picker    = document.createElement('input');
    picker.type     = 'file';
    picker.accept   = 'image/*';
    picker.id       = 'image-picker';
    picker.style.display = 'none';
    document.body.appendChild(picker);

    picker.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) CHAT_MANAGER.handleImageSelected(file);
        picker.value = '';
    });
});

// ══════════════════════════════════════════════════════════════
// SOCKET EVENTS
// ══════════════════════════════════════════════════════════════

// Incoming chat_message — handles both text and image
socket.on('chat_message', (data) => {
    if (data.sender === socket.id) return;

    if (data.image) {
        CHAT_MANAGER.appendImage(data.image, 'peer-msg');
        return;
    }

    if (data.message) {
        CHAT_MANAGER.appendMessage(data.message, 'peer-msg');
    }
});

// Server rejected our image for being too large — show feedback to sender
socket.on('image_too_large', (data) => {
    CHAT_MANAGER.appendMessage(
        `⚠️ ${data.message || 'Image too large to send.'}`,
        '',
        true
    );
});

// Change 5: Handshake the incoming typing updates from the server
socket.on('partner_typing', (data) => {
    if (data.isTyping) {
        CHAT_MANAGER.showTypingIndicator();
    } else {
        CHAT_MANAGER.hideTypingIndicator();
    }
});

// Partner muted / unmuted
socket.on('peer_muted', (data) => {
    CHAT_MANAGER.appendMessage(
        data.isMuted
            ? '🔇 Partner muted their mic'
            : '🎤 Partner unmuted their mic',
        '',
        true
    );
});
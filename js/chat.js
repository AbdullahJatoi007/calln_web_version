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

        socket.emit('chat_message', {
            roomId: currentRoomId,
            sender: socket.id,
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

        try {
            const compressedBase64 = await this.compressImage(file, 1280, 0.7);

            this.appendImage(compressedBase64, 'my-msg');

            socket.emit('chat_message', {
                roomId: currentRoomId,
                sender: socket.id,
                image: compressedBase64
            });

        } catch (err) {
            console.error('Image compression failed:', err);
        }
    },

    // ── IMAGE COMPRESSION ──
    compressImage(file, maxWidth = 1280, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let width  = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.floor((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', quality));
                };

                img.onerror = reject;
                img.src = event.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // ── RENDER IMAGE ──
    appendImage(src, className = '') {
        const container = document.getElementById('chat-display');
        if (!container) return;

        const overlay = container.querySelector('.overlay-text');
        if (overlay) overlay.remove();

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${className}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble image-bubble';

        const img = document.createElement('img');
        img.src = src;
        img.alt = "image";
        img.style.maxWidth = "200px";
        img.style.maxHeight = "200px";
        img.style.borderRadius = "10px";
        img.style.display = "block";
        img.style.cursor = "pointer";
        img.style.objectFit = "cover";

        img.addEventListener('click', () => {
            this.openImageFullscreen(src);
        });

        bubble.appendChild(img);
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);

        this.scrollToBottom();
    },

    // ── FULLSCREEN IMAGE ──
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

// ── EVENTS ──
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

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.id = 'image-picker';
    picker.style.display = 'none';
    document.body.appendChild(picker);

    picker.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) CHAT_MANAGER.handleImageSelected(file);
        picker.value = '';
    });
});

// ── SOCKET ──
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

socket.on('peer_muted', (data) => {
    CHAT_MANAGER.appendMessage(
        data.isMuted
            ? '🔇 Partner muted their mic'
            : '🎤 Partner unmuted their mic',
        '',
        true
    );
});
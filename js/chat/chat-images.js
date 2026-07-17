// ═══════════════════════════════════════════════════════════
// CHAT_MANAGER — IMAGES
// Extends the CHAT_MANAGER declared in chat-core.js. This file
// must load AFTER chat-core.js.
// ═══════════════════════════════════════════════════════════
Object.assign(CHAT_MANAGER, {

    // ── OPEN IMAGE PICKER ──
    openGallery() {
        if (!currentRoomId) return;

        const picker = document.getElementById('image-picker');
        if (picker) picker.click();
    },

    // ── IMAGE SEND ──
    async handleImageSelected(file) {
        if (!file || !currentRoomId) return;

        this.stopTyping();   // stop typing indicator immediately on image selection

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
});

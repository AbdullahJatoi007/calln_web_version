// ═══════════════════════════════════════════════════════════
// MESSAGING UI — the DM dialog opened from a friend's 💬 button
//
// Reuses .message-wrapper / .message-bubble / .my-msg / .peer-msg /
// .image-bubble classes already defined in chat.css for the in-call
// chat — same visual language, no new bubble CSS needed. Only the
// dialog chrome itself (overlay, header, input row) is new.
//
// Image compression reuses CHAT_MANAGER.compressImage() — it's a
// pure function (FileReader/Canvas only, no call-state references),
// safe to call from here unchanged.
// ═══════════════════════════════════════════════════════════

function initMessagingUI() {

    if (!document.getElementById('dm-panel-styles')) {
        const style = document.createElement('style');
        style.id = 'dm-panel-styles';
        style.textContent = `
            .dm-modal-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                display: none; align-items: center; justify-content: center;
                z-index: 9999; padding: 20px;
            }
            .dm-modal-overlay.open { display: flex; }

            .dm-modal-card {
                background: var(--bg-surface); border: 1px solid var(--border);
                border-radius: var(--r-md); width: 100%; max-width: 420px;
                height: 560px; max-height: 85vh;
                display: flex; flex-direction: column; overflow: hidden;
            }
            .dm-modal-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 16px; border-bottom: 1px solid var(--border);
            }
            .dm-modal-header h3 { margin: 0; font-size: 1rem; color: var(--text-1); }
            .dm-modal-close {
                background: none; border: none; color: var(--text-2);
                font-size: 1.2rem; cursor: pointer; line-height: 1;
            }
            .dm-modal-close:hover { color: var(--text-1); }

            .dm-messages {
                flex: 1; overflow-y: auto; padding: 12px;
                display: flex; flex-direction: column;
            }
            .dm-empty { margin: auto; text-align: center; color: var(--text-2); font-size: 0.85rem; padding: 20px; }

            .dm-input-row {
                display: flex; align-items: center; gap: 8px;
                padding: 10px 12px; border-top: 1px solid var(--border);
            }
            .dm-input-row input[type="text"] {
                flex: 1; background: var(--bg-elevated); border: 1px solid var(--border);
                border-radius: 20px; padding: 8px 14px; color: var(--text-1);
                font-size: 0.88rem; outline: none;
            }
            .dm-icon-btn {
                width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
                display: flex; align-items: center; justify-content: center;
                background: var(--bg-elevated); border: 1px solid var(--border);
                color: var(--text-2); cursor: pointer;
            }
            .dm-icon-btn:hover { color: var(--text-1); background: var(--bg-hover); }

            @media (max-width: 480px) {
                .dm-modal-card { max-width: 100%; height: 100%; max-height: 100%; border-radius: 0; }
                .dm-modal-overlay { padding: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ── Modal markup (created once, reused for every friend) ────
    let overlay = document.getElementById('dm-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'dm-modal-overlay';
        overlay.className = 'dm-modal-overlay';
        overlay.innerHTML = `
            <div class="dm-modal-card">
                <div class="dm-modal-header">
                    <h3 id="dm-friend-name">Chat</h3>
                    <button class="dm-modal-close" aria-label="Close">✕</button>
                </div>
                <div class="dm-messages" id="dm-messages">
                    <div class="dm-empty">No messages yet — say hi!</div>
                </div>
                <div class="dm-input-row">
                    <button class="dm-icon-btn" id="dm-camera-btn" title="Send photo" aria-label="Send photo">📷</button>
                    <input type="text" id="dm-msg-input" placeholder="Message…" autocomplete="off" autocorrect="off" spellcheck="false">
                    <button class="dm-icon-btn" id="dm-send-btn" title="Send" aria-label="Send">➤</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Hidden file input, created once
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/*';
        picker.id = 'dm-image-picker';
        picker.style.display = 'none';
        document.body.appendChild(picker);
    }

    const messagesEl  = document.getElementById('dm-messages');
    const nameEl      = document.getElementById('dm-friend-name');
    const closeEl     = overlay.querySelector('.dm-modal-close');
    const inputEl     = document.getElementById('dm-msg-input');
    const sendBtn     = document.getElementById('dm-send-btn');
    const cameraBtn   = document.getElementById('dm-camera-btn');
    const picker      = document.getElementById('dm-image-picker');

    let currentFriendUid  = null;
    let unsubscribe       = null;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderMessages(messages) {
        if (!messages.length) {
            messagesEl.innerHTML = `<div class="dm-empty">No messages yet — say hi!</div>`;
            return;
        }

        // Reuses the SAME classes chat.css already styles for the
        // in-call chat — my-msg / peer-msg / message-bubble / image-bubble.
        messagesEl.innerHTML = messages.map(m => {
            const mine = m.senderUid === window.CALLN_UID;
            const cls  = mine ? 'my-msg' : 'peer-msg';

            if (m.image) {
                return `
                    <div class="message-wrapper ${cls}">
                        <div class="message-bubble image-bubble">
                            <img src="${m.image}" alt="photo" style="max-width:200px;max-height:200px;border-radius:10px;display:block;object-fit:cover;">
                        </div>
                    </div>`;
            }
            return `
                <div class="message-wrapper ${cls}">
                    <div class="message-bubble">
                        <div class="message-text">${escapeHtml(m.text)}</div>
                    </div>
                </div>`;
        }).join('');

        scrollToBottom();

        // Mark any unread incoming messages as read now that they've
        // actually been rendered in the open dialog.
        const unread = messages
            .filter(m => m.senderUid !== window.CALLN_UID && m.read === false)
            .map(m => m.id);

        if (unread.length && currentFriendUid) {
            window.CALLN_MESSAGING.markRead(currentFriendUid, unread)
                .catch(err => console.error('[Messaging] markRead failed:', err));
        }
    }

    async function openConversation(friendUid, friendDisplayName) {
        currentFriendUid = friendUid;
        window.CALLN_OPEN_DM_UID = friendUid;
        nameEl.textContent = friendDisplayName || 'Chat';
        messagesEl.innerHTML = `<div class="dm-empty">Loading…</div>`;
        overlay.classList.add('open');

        if (unsubscribe) { unsubscribe(); unsubscribe = null; }

        try {
            unsubscribe = await window.CALLN_MESSAGING.listenToConversation(friendUid, renderMessages);
        } catch (err) {
            console.error('[Messaging] listenToConversation failed:', err);
            messagesEl.innerHTML = `<div class="dm-empty">Could not load conversation.</div>`;
        }
    }

    function closeDialog() {
        overlay.classList.remove('open');
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        currentFriendUid = null;
        window.CALLN_OPEN_DM_UID = null;
    }

    closeEl?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeDialog();
    });

    async function sendText() {
        const text = inputEl.value.trim();
        if (!text || !currentFriendUid) return;
        inputEl.value = '';
        try {
            await window.CALLN_MESSAGING.sendMessage(currentFriendUid, text);
        } catch (err) {
            console.error('[Messaging] sendMessage failed:', err);
            if (typeof TOAST !== 'undefined') {
                TOAST.show('Message failed to send', { type: 'error', icon: '⚠️', duration: 3000 });
            }
        }
    }

    sendBtn?.addEventListener('click', sendText);
    inputEl?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendText(); }
    });

    cameraBtn?.addEventListener('click', () => {
        if (!currentFriendUid) return;
        picker.click();
    });

    picker?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        picker.value = '';
        if (!file || !currentFriendUid) return;

        if (typeof CHAT_MANAGER === 'undefined' || !CHAT_MANAGER.compressImage) {
            console.error('[Messaging] CHAT_MANAGER.compressImage unavailable — chat/chat-images.js must load before this file.');
            return;
        }

        try {
            const compressed = await CHAT_MANAGER.compressImage(file);
            await window.CALLN_MESSAGING.sendImage(currentFriendUid, compressed);
        } catch (err) {
            console.error('[Messaging] sendImage failed:', err);
            if (typeof TOAST !== 'undefined') {
                TOAST.show('Photo failed to send', { type: 'error', icon: '⚠️', duration: 3000 });
            }
        }
    });

    // Exposed so friends-panel.js's 💬 button can open this dialog.
    window.CALLN_OPEN_DM = openConversation;
}

if (window.CALLN_MESSAGING) {
    initMessagingUI();
} else {
    window.addEventListener('calln-messaging-ready', initMessagingUI, { once: true });
}
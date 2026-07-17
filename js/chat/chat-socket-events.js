// ═══════════════════════════════════════════════════════════
// CHAT — SOCKET EVENTS
// ═══════════════════════════════════════════════════════════

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

// Handshake the incoming typing updates from the server
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

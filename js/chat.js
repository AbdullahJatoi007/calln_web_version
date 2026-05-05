const CHAT_MANAGER = {

    enableInput(status) {
        const input = document.getElementById('msg-input');
        if (!input) return;

        input.disabled = !status;
        input.placeholder = status ? "Type a message..." : "Connect to chat...";
    },

    sendMessage() {
        const input = document.getElementById('msg-input');
        const msg = input?.value?.trim();

        if (!msg || !currentRoomId) return;

        socket.emit('chat_message', {
            roomId: currentRoomId,
            message: msg,
            sender: socket.id
        });

        this.appendMessage(msg, 'my-msg');
        input.value = '';
    },

    appendMessage(text, className, isSystem = false) {
        const container = document.getElementById('chat-display');
        if (!container) return;

        const msg = document.createElement('div');

        if (isSystem) {
            msg.className = 'system-msg';
            msg.innerText = text;
        } else {
            msg.className = `message-wrapper ${className}`;
            msg.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${text}</div>
                </div>
            `;
        }

        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }
};


// ================= CHAT SOCKET ONLY =================

socket.on('chat_message', (data) => {
    if (data.sender !== socket.id) {
        CHAT_MANAGER.appendMessage(data.message, 'peer-msg');
    }
});

// peer mute UI only (NO CALL LOGIC HERE)
socket.on('peer_muted', (data) => {
    CHAT_MANAGER.appendMessage(
        data.isMuted ? "Partner muted mic 🔇" : "Partner unmuted mic 🎤",
        '',
        true
    );
});
const CHAT_MANAGER = {
    enableInput(status) {
        const input = document.getElementById('msg-input');
        const sendBtn = document.getElementById('send-btn');
        if (!input || !sendBtn) return;

        input.disabled = !status;
        sendBtn.disabled = !status;
        input.placeholder = status ? "Type a message..." : "Connect to chat...";
    },

    sendMessage() {
        const input = document.getElementById('msg-input');
        if (!input) return;

        const msg = input.value.trim();
        // Ensure currentRoomId is defined globally
        if (!msg || typeof currentRoomId === 'undefined' || !currentRoomId) return;

        socket.emit('chat_message', {
            roomId: currentRoomId,
            message: msg,
            sender: socket.id
        });

        this.appendMessage(msg, 'my-msg');
        input.value = '';
    },

    appendMessage(text, className = '', isSystem = false) {
        const container = document.getElementById('chat-display');
        if (!container) return;

        // Remove "Audio Only Mode" text on first message
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
                    <div class="message-text">${text}</div>
                </div>
            `;
        }

        container.appendChild(msg);
        
        // Multi-stage scroll fix for mobile browsers
        this.scrollToBottom();
    },

    scrollToBottom() {
        const container = document.getElementById('chat-display');
        if (!container) return;
        
        // Immediate scroll
        container.scrollTop = container.scrollHeight;
        
        // Smooth frame-synced scroll for mobile
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    },

    clearChat() {
        const container = document.getElementById('chat-display');
        if (!container) return;
        container.innerHTML = `<div class="overlay-text">Audio Only Mode</div>`;
    },

    toggleMuteUI(isMuted) {
        const btn = document.getElementById('mute-btn');
        const label = document.getElementById('mute-label');
        if (!btn || !label) return;

        if (isMuted) {
            btn.classList.add('muted');
            label.innerText = "Muted";
        } else {
            btn.classList.remove('muted');
            label.innerText = "Mute";
        }
    }
};

// Initialization and Listeners
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const muteBtn = document.getElementById('mute-btn');

    sendBtn?.addEventListener('click', () => CHAT_MANAGER.sendMessage());

    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            CHAT_MANAGER.sendMessage();
        }
    });

    
    // Merge the focus listeners into one clean block
    input?.addEventListener('focus', () => {
        setTimeout(() => {
            // 1. Ensure the input itself is centered/visible above keyboard
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 2. Ensure the chat messages are scrolled to the bottom
            CHAT_MANAGER.scrollToBottom();
        }, 300);
    });
    // Mute Logic
    muteBtn?.addEventListener('click', () => {
        const currentlyMuted = muteBtn.classList.contains('muted');
        const newState = !currentlyMuted;
        
        // Update UI locally
        CHAT_MANAGER.toggleMuteUI(newState);
        
        // Emit event to partner
        if (typeof currentRoomId !== 'undefined' && currentRoomId) {
            socket.emit('toggle_mute', { isMuted: newState, roomId: currentRoomId });
        }
    });
});

// SOCKET LISTENERS
socket.on('chat_message', (data) => {
    if (data.sender === socket.id) return;
    CHAT_MANAGER.appendMessage(data.message, 'peer-msg');
});

socket.on('peer_muted', (data) => {
    CHAT_MANAGER.appendMessage(
        data.isMuted ? "Partner muted mic 🔇" : "Partner unmuted mic 🎤",
        '',
        true
    );
});
const chatInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const chatScreen = document.getElementById('chat-display');
let activeRoomId = null;

// --- 1. Connection Listeners ---
window.addEventListener('call-connected', (e) => {
    activeRoomId = e.detail.roomId;
    chatInput.disabled = false;
    chatInput.placeholder = "Type a message...";
    chatScreen.innerHTML = '<div class="system-msg">Connected! Chat is now live.</div>';
});

window.addEventListener('call-disconnected', () => {
    activeRoomId = null;
    chatInput.disabled = true;
    chatInput.value = "";
    chatInput.placeholder = "Connect to a call to chat";
});

// --- 2. Messaging Logic ---
function sendMessage() {
    const msg = chatInput.value.trim();
    
    // Check: Empty message na ho aur room active ho
    if (msg && activeRoomId) {
        socket.emit('chat_message', { 
            roomId: activeRoomId, 
            message: msg,
            sender: socket.id 
        });
        
        appendMessage(msg, 'my-msg'); // User ka apna message right side par
        chatInput.value = '';
    }
}

// --- 3. Socket Listener (Single Instance) ---
// .off() ensures double messages don't happen if the script reloads
socket.off('chat_message').on('chat_message', (data) => {
    if (data.sender !== socket.id) {
        appendMessage(data.message, 'peer-msg'); // Stranger ka message left side par
    }
});

// --- 4. UI Rendering & Scroll Fix ---
function appendMessage(text, className) {
    const msgWrapper = document.createElement('div');
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgWrapper.className = `message-wrapper ${className}`;
    msgWrapper.innerHTML = `
        <div class="message-bubble">
            <div class="message-text"></div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    // Security Fix: textContent use kar rahe hain taake koi script inject na kar sake
    msgWrapper.querySelector('.message-text').textContent = text;
    
    chatScreen.appendChild(msgWrapper);
    
    // Mobile aur Desktop scroll fix
    setTimeout(() => {
        msgWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
}

// --- 5. Event Listeners ---
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
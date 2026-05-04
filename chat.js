const chatInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const chatScreen = document.getElementById('chat-display');
let activeRoomId = null;

// Listen for connection from connection.js
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

function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg && activeRoomId) {
        socket.emit('chat_message', { 
            roomId: activeRoomId, 
            message: msg,
            sender: socket.id 
        });
        appendMessage('You', msg, 'my-msg');
        chatInput.value = '';
    }
}

socket.on('chat_message', (data) => {
    appendMessage('Stranger', data.message, 'peer-msg');
});

function appendMessage(sender, text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatScreen.appendChild(msgDiv);
    chatScreen.scrollTop = chatScreen.scrollHeight; // Auto-scroll
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
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
        // Hum message object mein sender ki ID bhej rahe hain
        socket.emit('chat_message', { 
            roomId: activeRoomId, 
            message: msg,
            sender: socket.id 
        });
        
        // Apne message ko right side par dikhane ke liye 'my-msg'
        appendMessage(msg, 'my-msg');
        chatInput.value = '';
    }
}

// Jab server se message aaye
socket.on('chat_message', (data) => {
    // Agar sender ID meri apni hai toh bypass (kyunki hum already append kar chuke hain)
    // Warna 'peer-msg' alignment use karein (Left side)
    if (data.sender !== socket.id) {
        appendMessage(data.message, 'peer-msg');
    }
});

// chat.js
function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    
    // Time format (e.g., 10:30 PM)
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // "message-wrapper" class alignment ko control karegi (left ya right)
    msgDiv.className = `message-wrapper ${className}`;
    
    msgDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${text}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    chatScreen.appendChild(msgDiv);
    
    // Auto-scroll logic
    chatScreen.scrollTo({
        top: chatScreen.scrollHeight,
        behavior: 'smooth'
    });
}

// Jab aap message bhejte hain
function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg && activeRoomId) {
        socket.emit('chat_message', { 
            roomId: activeRoomId, 
            message: msg,
            sender: socket.id 
        });
        appendMessage(msg, 'my-msg'); // Aapka msg right par jayega
        chatInput.value = '';
    }
}

// Jab doosra user bhejta hai
socket.on('chat_message', (data) => {
    if (data.sender !== socket.id) {
        appendMessage(data.message, 'peer-msg'); // Stranger ka msg left par jayega
    }
});

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
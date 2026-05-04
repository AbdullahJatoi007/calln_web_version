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

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    
    // Timestamp create karein (WhatsApp feel)
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ":" + 
                       now.getMinutes().toString().padStart(2, '0');

    msgDiv.className = `message ${className}`;
    
    // WhatsApp structure: Text upar aur chota Time niche
    msgDiv.innerHTML = `
        <div class="msg-content">
            <span class="text">${text}</span>
            <span class="time">${timeString}</span>
        </div>
    `;
    
    chatScreen.appendChild(msgDiv);
    
    // Smooth scroll to bottom
    chatScreen.scrollTo({
        top: chatScreen.scrollHeight,
        behavior: 'smooth'
    });
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
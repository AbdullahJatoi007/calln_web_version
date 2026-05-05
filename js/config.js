// Global Configuration
const CONFIG = {
    SERVER_URL: 'https://calln-webrtc-server.onrender.com',
    ICE_SERVERS: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
};

// Global State
let localStream = null;
let peerConnection = null;
let currentRoomId = null;
let isCalling = false;
let isMuted = false;
let timerInterval = null;

// Socket
const socket = io(CONFIG.SERVER_URL, {
    transports: ['websocket'],
    reconnection: true
});
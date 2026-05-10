// Global Configuration
const CONFIG = {
    SERVER_URL: 'https://calln-webrtc-server.onrender.com',

    // ── ICE / STUN / TURN servers ────────────────────────────────
    // Keep both STUN + TURN, but avoid duplicates and noise.
    // Metered TURN handles NAT traversal for laptop↔mobile calls.

    ICE_SERVERS: {
        iceServers: [
            // STUN (basic discovery)
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },

            // TURN (relay for strict NAT / laptop networks)
            {
                urls: "turn:global.relay.metered.ca:80",
                username: "88c46e49c67c56f77368916a",
                credential: "KjGURGsQWp8AdaDw"
            },
            {
                urls: "turn:global.relay.metered.ca:443",
                username: "88c46e49c67c56f77368916a",
                credential: "KjGURGsQWp8AdaDw"
            },
            {
                urls: "turns:global.relay.metered.ca:443",
                username: "88c46e49c67c56f77368916a",
                credential: "KjGURGsQWp8AdaDw"
            }
        ]
    }
};

// Global WebRTC / call state
let localStream    = null;
let peerConnection = null;
let currentRoomId  = null;
let isCalling      = false;
let isMuted        = false;

// Socket connection
const socket = io(CONFIG.SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true
});
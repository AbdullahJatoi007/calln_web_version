// Global Configuration
const CONFIG = {
    SERVER_URL: 'https://calln-webrtc-server.onrender.com',

    // ── ICE / STUN servers ────────────────────────────────
    // Multiple servers improve the match rate across different
    // network types (NAT, corporate Wi-Fi, mobile carriers).
    // For users behind strict NAT (~30% of mobile users in
    // Pakistan/UAE/SA), a TURN server would be needed too.
    // Add a TURN service (e.g. Metered.ca) here when ready.
    ICE_SERVERS: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302'        },
            { urls: 'stun:stun1.l.google.com:19302'       },
            { urls: 'stun:stun2.l.google.com:19302'       },
            { urls: 'stun:stun.cloudflare.com:3478'       },
            { urls: 'stun:stun.services.mozilla.com:3478' },
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
    transports:  ['websocket', 'polling'],
    reconnection: true,
});
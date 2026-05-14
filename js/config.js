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

// ── Global WebRTC / call state ────────────────────────────────
let localStream    = null;
let peerConnection = null;
let currentRoomId  = null;
let isCalling      = false;
let isMuted        = false;

// ── Real country detected from IP (separate from the filter) ──
// Default to Worldwide until the async lookup completes.
// script.js reads detectedCountry when emitting find_match.
let detectedCountry     = 'Worldwide';
let detectedCountryCode = 'all';

(async () => {
    try {
        // Primary: ipapi.co — 1 000 free req/day, no signup needed
        const res  = await fetch('https://ipapi.co/json/');
        const data = await res.json();

        if (data?.country_name && !data.error) {
            detectedCountry     = data.country_name;            // e.g. "Pakistan"
            detectedCountryCode = (data.country_code || 'all').toLowerCase(); // e.g. "pk"
            return;
        }

        // Fallback: ip-api.com — 45 req/min free, no signup needed
        const res2  = await fetch('http://ip-api.com/json/?fields=country,countryCode');
        const data2 = await res2.json();

        if (data2?.country) {
            detectedCountry     = data2.country;
            detectedCountryCode = (data2.countryCode || 'all').toLowerCase();
        }

    } catch (e) {
        // Network blocked or both APIs down — stay as Worldwide
        console.warn('IP geolocation unavailable, defaulting to Worldwide');
    }
})();

// ── Socket connection ─────────────────────────────────────────
const socket = io(CONFIG.SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true
});

async function initiatePeerConnection(role) {
    peerConnection = new RTCPeerConnection(CONFIG.ICE_SERVERS);

    // LOCAL AUDIO
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // REMOTE AUDIO
    peerConnection.ontrack = async (event) => {
        let remoteAudio = document.getElementById('remote-audio');
        if (!remoteAudio) {
            remoteAudio          = document.createElement('audio');
            remoteAudio.id       = 'remote-audio';
            remoteAudio.autoplay = true;
            remoteAudio.muted    = false;
            remoteAudio.volume   = 1.0;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
        // REQUIRED on desktop — autoplay policy blocks audio without this
        try {
            await remoteAudio.play();
        } catch (err) {
            console.error('Audio play failed:', err);
        }
    };

    // ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice_candidate', {
                roomId:    currentRoomId,
                candidate: event.candidate
            });
        }
    };

    // CALLER creates and sends the offer
    if (role === 'caller') {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { roomId: currentRoomId, offer });
    }
}
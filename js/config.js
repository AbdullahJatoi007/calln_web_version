// ═══════════════════════════════════════════════════════════
// GLOBAL CONFIGURATION
// ═══════════════════════════════════════════════════════════
const CONFIG = {
    SERVER_URL: 'https://calln-webrtc-server.onrender.com',

    // ── ICE / STUN / TURN servers ────────────────────────────
    ICE_SERVERS: {
        iceServers: [
            // STUN (basic NAT discovery)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // TURN — relay for strict NAT / mobile carrier networks
            {
                urls:       'turn:global.relay.metered.ca:80',
                username:   '88c46e49c67c56f77368916a',
                credential: 'KjGURGsQWp8AdaDw'
            },
            {
                urls:       'turn:global.relay.metered.ca:443',
                username:   '88c46e49c67c56f77368916a',
                credential: 'KjGURGsQWp8AdaDw'
            },
            {
                urls:       'turns:global.relay.metered.ca:443',
                username:   '88c46e49c67c56f77368916a',
                credential: 'KjGURGsQWp8AdaDw'
            }
        ]
    }
};

// ── Global WebRTC / call state ───────────────────────────────
let localStream    = null;
let peerConnection = null;
let currentRoomId  = null;
let isCalling      = false;
let isMuted        = false;

// ── Real country detected from IP ───────────────────────────
// Defaults to Worldwide until the async lookup resolves.
let detectedCountry     = 'Worldwide';
let detectedCountryCode = 'all';

(async () => {
    try {
        // Primary: ipapi.co — 1,000 free req/day
        const res  = await fetch('https://ipapi.co/json/');
        const data = await res.json();

        if (data?.country_name && !data.error) {
            detectedCountry     = data.country_name;
            detectedCountryCode = (data.country_code || 'all').toLowerCase();
            return;
        }

        // Fallback: ip-api.com — 45 req/min free
        const res2  = await fetch('https://ip-api.com/json/?fields=country,countryCode');
        const data2 = await res2.json();

        if (data2?.country) {
            detectedCountry     = data2.country;
            detectedCountryCode = (data2.countryCode || 'all').toLowerCase();
        }

    } catch (e) {
        console.warn('IP geolocation unavailable, defaulting to Worldwide');
    }
})();

// ── Socket connection ────────────────────────────────────────
const socket = io(CONFIG.SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true
});

// ═══════════════════════════════════════════════════════════
// PEER CONNECTION
// Fixed for mobile / iOS Safari audio issues:
//   1. playsInline — required on iOS or audio is silently blocked
//   2. MediaStream fallback — event.streams[0] is undefined on
//      some Android/Firefox builds; build stream from the track
//   3. Autoplay toast — when browser blocks autoplay, show a
//      visible tap-to-enable button instead of silently failing
//   4. offerToReceiveAudio — explicitly tells the remote side
//      to open an audio receive channel (fixes some mobile SDPs)
// ═══════════════════════════════════════════════════════════
async function initiatePeerConnection(role) {

    peerConnection = new RTCPeerConnection(CONFIG.ICE_SERVERS);

    // ── Add local audio tracks ───────────────────────────────
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // ── Receive remote audio ─────────────────────────────────
    peerConnection.ontrack = async (event) => {

        // Get or create the persistent audio element
        let remoteAudio = document.getElementById('remote-audio');
        if (!remoteAudio) {
            remoteAudio             = document.createElement('audio');
            remoteAudio.id          = 'remote-audio';
            remoteAudio.autoplay    = true;
            remoteAudio.playsInline = true;   // FIX 1 — iOS Safari REQUIRES this
            remoteAudio.muted       = false;
            remoteAudio.volume      = 1.0;
            document.body.appendChild(remoteAudio);
        }

        // FIX 2 — event.streams[0] is undefined on some Android / Firefox.
        // Fall back to building a MediaStream directly from the arriving track.
        const incomingStream = (event.streams && event.streams[0])
            ? event.streams[0]
            : new MediaStream([event.track]);

        // Only reassign if the stream actually changed (avoids audio glitches)
        if (remoteAudio.srcObject !== incomingStream) {
            remoteAudio.srcObject = incomingStream;
        }

        // FIX 3 — Autoplay is blocked silently on many mobile browsers.
        // Instead of swallowing the error, show a visible tap-to-enable toast.
        try {
            await remoteAudio.play();
        } catch (err) {
            console.warn('Autoplay blocked by browser policy:', err);

            if (typeof TOAST !== 'undefined') {
                TOAST.show('Tap to enable audio', {
                    type:     'warning',
                    icon:     '🔊',
                    duration: 0,   // stays until tapped
                    actions: [{
                        label:   'Enable Audio',
                        primary: true,
                        dismiss: true,
                        onClick: () => {
                            remoteAudio.play().catch(e =>
                                console.error('Audio play failed after tap:', e)
                            );
                        }
                    }]
                });
            }
        }
    };

    // ── ICE candidate exchange ───────────────────────────────
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice_candidate', {
                roomId:    currentRoomId,
                candidate: event.candidate
            });
        }
    };

    // ── Caller: create and send offer ────────────────────────
    if (role === 'caller') {

        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,   // FIX 4 — explicitly open audio receive channel
            offerToReceiveVideo: false   // we're audio-only, keep it clean
        });

        await peerConnection.setLocalDescription(offer);

        socket.emit('offer', {
            roomId: currentRoomId,
            offer
        });
    }
}
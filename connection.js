// Render Server URL yahan dalein
const socket = io('https://calln-webrtc-server.onrender.com', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5
});
let localStream, peerConnection, currentRoomId = null;
let isCalling = false;
let isMuted = false;

const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// UI Elements
const startBtn = document.getElementById('start-btn');
const muteBtn = document.getElementById('mute-btn');
const statusText = document.getElementById('status-display');
const waveBars = document.querySelectorAll('.wave-bar');
const reportBtn = document.getElementById('report-btn');

// --- 1. UI Helpers ---
function setWaveState(running) {
    waveBars.forEach(bar => bar.style.animationPlayState = running ? 'running' : 'paused');
}

function updateStartButton(state) {
    if (state === 'searching') {
        startBtn.style.background = "#c62828"; // Red
        startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>`;
    } else {
        startBtn.style.background = "#2e7d32"; // Green
        startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
    }
}

// --- 2. Socket Events ---
socket.on('online_count', (data) => {
    document.getElementById('user-count').innerText = data.count;
});

socket.on('matched', async (data) => {
    currentRoomId = data.roomId;
    statusText.innerText = `Connected with ${data.partnerCountry}`;
    initiatePeerConnection(data.role);
    window.dispatchEvent(new CustomEvent('call-connected', { detail: { roomId: data.roomId } }));
});

socket.on('peer_disconnected', () => stopCall("Partner disconnected."));
socket.on('call_ended', () => stopCall("Call ended."));

// --- 3. WebRTC Handshake ---
socket.on('offer', async (data) => {
    if (data.role === 'answerer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { roomId: currentRoomId, answer });
    }
});

socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice_candidate', async (data) => {
    if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

async function initiatePeerConnection(role) {
    peerConnection = new RTCPeerConnection(iceServers);
    
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice_candidate', { roomId: currentRoomId, candidate: event.candidate });
        }
    };

    if (role === 'caller') {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { roomId: currentRoomId, offer, role: 'caller' });
    }
}

// --- 4. Logic Control ---
startBtn.addEventListener('click', async () => {
    if (!isCalling) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isCalling = true;
            statusText.innerText = "Searching for someone...";
            updateStartButton('searching');
            setWaveState(true);

            socket.emit('find_match', { 
                userId: 'WebUser_' + Math.floor(Math.random() * 1000),
                myCountry: document.getElementById('current-country-name').innerText,
                targetCountry: 'Worldwide'
            });
        } catch (err) {
            alert("Please allow microphone access!");
            isCalling = false;
        }
    } else {
        // Agar pehle se calling/searching ho rahi ho toh stop karein
        socket.emit('skip', { roomId: currentRoomId }); 
        stopCall("Search cancelled.");
    }
});

function stopCall(msg = "Ready to connect.") {
    if (currentRoomId) socket.emit('end_call', { roomId: currentRoomId });
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    isCalling = false;
    currentRoomId = null;
    statusText.innerText = msg;
    setWaveState(false);
    updateStartButton('idle');
    window.dispatchEvent(new CustomEvent('call-disconnected'));
}

muteBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    muteBtn.style.background = isMuted ? "#b71c1c" : "#222";
    document.getElementById('mute-label').innerText = isMuted ? "Unmute" : "Mute";
});
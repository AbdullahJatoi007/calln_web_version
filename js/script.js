document.addEventListener("DOMContentLoaded", () => {

const elements = {
    status: document.getElementById('status-display'),
    startBtn: document.getElementById('start-btn'),
    muteBtn: document.getElementById('mute-btn'),
    autoCall: document.getElementById('auto-call'),
    userCount: document.getElementById('user-count'),
    chatBox: document.getElementById('chat-display')
};

let timerInterval = null;

// ================= CHAT LOCK SCROLL =================
document.body.style.overflow = "hidden";

if (elements.chatBox) {
    elements.chatBox.style.overflowY = "auto";
    elements.chatBox.style.overscrollBehavior = "contain";
}

// ================= SOCKET EVENTS =================

socket.on('waiting', () => {
    elements.status.innerText = "Waiting for partner...";
});

socket.on('matched', (data) => {
    currentRoomId = data.roomId;
    isCalling = true;

    UI.setButton(true);
    UI.startTimer();
    UI.updateState('connected');

    initiatePeerConnection(data.role);

    CHAT_MANAGER.enableInput(true);

    CHAT_MANAGER.appendMessage(
        `Connected with ${data.partnerCountry}`,
        '',
        true
    );
});

socket.on('peer_disconnected', () => UI.stopCall("Partner left"));
socket.on('call_ended', () => UI.stopCall("Call ended"));

socket.on('online_count', (data) => {
    elements.userCount.innerText = data.count;
});

// ================= UI =================

const UI = {

    setButton(active) {
        if (!elements.startBtn) return;

        elements.startBtn.innerText = active ? "End Call" : "Start Call";
        elements.startBtn.style.background = active ? "#c62828" : "#2e7d32";
    },

    startTimer() {
        let sec = 0;
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            sec++;
            const m = String(Math.floor(sec / 60)).padStart(2, '0');
            const s = String(sec % 60).padStart(2, '0');
            elements.status.innerText = `Live: ${m}:${s}`;
        }, 1000);
    },

    stopTimer() {
        clearInterval(timerInterval);
    },

    startCall() {

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {

                localStream = stream;
                isCalling = true;

                elements.status.innerText = "Searching...";

                this.setButton(true);
                this.updateState('searching');

                socket.emit('find_match', {
                    userId: 'User_' + Math.floor(Math.random() * 1000),
                    myCountry: document.getElementById('current-country-name')?.innerText || 'Worldwide',
                    targetCountry: 'Worldwide'
                });

            })
            .catch(() => alert("Mic permission required"));
    },

    stopCall(msg = "Ready") {

        if (currentRoomId) {
            socket.emit('end_call', { roomId: currentRoomId });
        }

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }

        isCalling = false;
        currentRoomId = null;

        this.stopTimer();
        this.updateState('idle');

        elements.status.innerText = msg;

        CHAT_MANAGER.enableInput(false);

        elements.chatBox.innerHTML = `
            <div class="overlay-text">Audio Only Mode</div>
        `;

        this.setButton(false);
    },

    updateState(state) {
        elements.startBtn.style.background =
            (state === 'connected' || state === 'searching')
                ? "#c62828"
                : "#2e7d32";
    }
};

// ================= BUTTONS =================

elements.startBtn.addEventListener('click', () => {

    if (elements.autoCall.checked && !isCalling) {
        UI.startCall();
        return;
    }

    if (!isCalling) {
        UI.startCall();
    } else {
        UI.stopCall("Call ended");
    }
});

elements.muteBtn.addEventListener('click', () => {
    if (!localStream) return;

    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;

    socket.emit('mute', {
        roomId: currentRoomId,
        isMuted
    });
});

});
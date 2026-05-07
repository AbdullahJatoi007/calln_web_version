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

    // ================= CHAT SCROLL FIX =================

    document.body.style.overflow = "hidden";

    if (elements.chatBox) {
        elements.chatBox.style.overflowY = "auto";
        elements.chatBox.style.overscrollBehavior = "contain";
    }

    // ================= SOCKET EVENTS =================

    socket.on('waiting', () => {
        elements.status.innerText = "Waiting for partner...";
    });

    socket.on('matched', async (data) => {

        currentRoomId = data.roomId;
        isCalling = true;

        UI.setButton(true);
        UI.startTimer();
        UI.updateState('connected');

        // START WEBRTC
        await initiatePeerConnection(data.role);

        // ENABLE CHAT
        CHAT_MANAGER.enableInput(true);

        CHAT_MANAGER.appendMessage(
            `Connected with ${data.partnerCountry}`,
            '',
            true
        );
    });

    // ================= WEBRTC SIGNALING =================

    socket.on('offer', async (data) => {

        if (!peerConnection) {
            await initiatePeerConnection('answerer');
        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', {
            roomId: currentRoomId,
            answer
        });
    });

    socket.on('answer', async (data) => {

        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
    });

    socket.on('ice_candidate', async (data) => {

        if (!peerConnection || !data.candidate) return;

        try {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );

        } catch (err) {

            console.error("ICE ERROR:", err);
        }
    });

    // ================= CALL EVENTS =================

    socket.on('peer_disconnected', () => {
        UI.stopCall("Partner left");
    });

    socket.on('call_ended', () => {
        UI.stopCall("Call ended");
    });

    socket.on('peer_reconnecting', () => {
        elements.status.innerText = "Reconnecting...";
    });

    socket.on('online_count', (data) => {
        elements.userCount.innerText = data.count;
    });

    // ================= UI =================

    const UI = {

        setButton(active) {

            if (!elements.startBtn) return;

            elements.startBtn.innerText =
                active ? "End Call" : "Start Call";

            elements.startBtn.style.background =
                active ? "#c62828" : "#2e7d32";
        },

        startTimer() {

            let sec = 0;

            clearInterval(timerInterval);

            timerInterval = setInterval(() => {

                sec++;

                const m = String(Math.floor(sec / 60))
                    .padStart(2, '0');

                const s = String(sec % 60)
                    .padStart(2, '0');

                elements.status.innerText = `Live: ${m}:${s}`;

            }, 1000);
        },

        stopTimer() {
            clearInterval(timerInterval);
        },

        async startCall() {

            try {

                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });

                isCalling = true;

                elements.status.innerText = "Searching...";

                this.setButton(true);

                this.updateState('searching');

                socket.emit('find_match', {

                    userId:
                        'User_' + Math.floor(Math.random() * 1000),

                    myCountry:
                        document.getElementById('current-country-name')
                        ?.innerText || 'Worldwide',

                    targetCountry: 'Worldwide'
                });

            } catch (err) {

                console.error(err);

                alert("Mic permission required");
            }
        },

        stopCall(msg = "Ready") {

            if (currentRoomId) {

                socket.emit('end_call', {
                    roomId: currentRoomId
                });
            }

            if (peerConnection) {

                peerConnection.close();

                peerConnection = null;
            }

            if (localStream) {

                localStream.getTracks().forEach(track => {
                    track.stop();
                });

                localStream = null;
            }

            isCalling = false;
            currentRoomId = null;

            this.stopTimer();

            this.updateState('idle');

            elements.status.innerText = msg;

            CHAT_MANAGER.enableInput(false);

            CHAT_MANAGER.clearChat();

            this.setButton(false);

            // ================= AUTO RECONNECT =================

            if (elements.autoCall.checked) {

                setTimeout(() => {

                    if (!isCalling) {
                        this.startCall();
                    }

                }, 1500);
            }
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

        elements.muteBtn.style.background =
            isMuted ? "#c62828" : "#1a1a1a";
    });

});
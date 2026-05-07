document.addEventListener("DOMContentLoaded", () => {

    const elements = {
        status:      document.getElementById('status-display'),
        startBtn:    document.getElementById('start-btn'),
        muteBtn:     document.getElementById('mute-btn'),
        autoCall:    document.getElementById('auto-call'),
        userCount:   document.getElementById('user-count'),
        chatBox:     document.getElementById('chat-display'),
        countryFilter:       document.getElementById('country-filter'),
        currentFlag:         document.getElementById('current-flag'),
        currentCountryName:  document.getElementById('current-country-name'),
    };

    let timerInterval = null;

    // ================= CHAT SCROLL FIX =================

    document.body.style.overflow = "hidden";

    if (elements.chatBox) {
        elements.chatBox.style.overflowY        = "auto";
        elements.chatBox.style.overscrollBehavior = "contain";
    }

    // ================= COUNTRY FILTER =================

    if (elements.countryFilter) {
        elements.countryFilter.addEventListener('change', () => {

            const selected = elements.countryFilter
                .options[elements.countryFilter.selectedIndex];

            const value = elements.countryFilter.value;

            if (value === 'all') {
                elements.currentFlag.src        = 'https://flagcdn.com/w20/un.png';
                elements.currentFlag.alt        = 'all';
                elements.currentCountryName.innerText = 'Worldwide';
            } else {
                elements.currentFlag.src        = `https://flagcdn.com/w20/${value}.png`;
                elements.currentFlag.alt        = value;
                // Strip flag emoji + space from option text e.g. "🇵🇰 Pakistan" → "Pakistan"
                elements.currentCountryName.innerText = selected.text
                    .replace(/^\S+\s/, '')
                    .trim();
            }
        });
    }

    // ================= SOCKET EVENTS =================

    socket.on('waiting', () => {
        elements.status.innerText = "Waiting for partner...";
    });

    socket.on('matched', async (data) => {

        currentRoomId = data.roomId;
        isCalling     = true;

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

            // Update the SVG icon inside the button
            if (active) {
                // End call — red phone icon
                elements.startBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36
                        1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1
                        1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2
                        2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                        transform="rotate(135 12 12)"/>
                    </svg>`;
                elements.startBtn.style.background = "#c62828";
            } else {
                // Start call — green phone icon
                elements.startBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36
                        1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1
                        1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2
                        2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>`;
                elements.startBtn.style.background = "#2e7d32";
            }
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

        getSelectedCountry() {
            const filter = elements.countryFilter;
            if (!filter) return { value: 'all', name: 'Worldwide' };

            const value = filter.value;
            const name  = elements.currentCountryName?.innerText || 'Worldwide';

            return { value, name };
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

                // Read the live selected country
                const { value, name } = this.getSelectedCountry();

                socket.emit('find_match', {
                    userId:        'User_' + Math.floor(Math.random() * 1000),
                    myCountry:     name,
                    targetCountry: value === 'all' ? 'Worldwide' : name
                });

            } catch (err) {

                console.error(err);

                elements.status.innerText = "Mic permission denied.";

                alert("Microphone permission is required to start a call.");
            }
        },

        stopCall(msg = "Ready for a new conversation?") {

            if (currentRoomId) {
                socket.emit('end_call', { roomId: currentRoomId });
            }

            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }

            isCalling     = false;
            currentRoomId = null;
            isMuted       = false;

            // Reset mute button visual
            elements.muteBtn.style.background = "#2a2a2a";
            elements.muteBtn.classList.remove('muted');

            this.stopTimer();
            this.updateState('idle');

            elements.status.innerText = msg;

            CHAT_MANAGER.enableInput(false);
            CHAT_MANAGER.clearChat();

            this.setButton(false);

            // ================= AUTO RECONNECT =================

            if (elements.autoCall?.checked) {
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

        // Toggle the audio track
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !isMuted;

        // Emit mute state to server
        socket.emit('mute', {
            roomId: currentRoomId,
            isMuted
        });

        // Update button visual + label class
        if (isMuted) {
            elements.muteBtn.style.background = "#c62828";
            elements.muteBtn.classList.add('muted');
        } else {
            elements.muteBtn.style.background = "#2a2a2a";
            elements.muteBtn.classList.remove('muted');
        }
    });

    // ================= REPORT BUTTON =================

    const reportBtn = document.getElementById('report-btn');

    if (reportBtn) {
        reportBtn.addEventListener('click', () => {

            if (!currentRoomId) {
                alert("You can only report during an active call.");
                return;
            }

            const confirmed = confirm(
                "Report this user for inappropriate behaviour?"
            );

            if (confirmed) {
                socket.emit('report_user', { roomId: currentRoomId });
                UI.stopCall("User reported. Call ended.");
            }
        });
    }

});
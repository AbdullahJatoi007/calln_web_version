document.addEventListener("DOMContentLoaded", () => {

    const elements = {
        status:             document.getElementById('status-display'),
        startBtn:           document.getElementById('start-btn'),
        muteBtn:            document.getElementById('mute-btn'),
        autoCall:           document.getElementById('auto-call'),
        userCount:          document.getElementById('user-count'),
        countryFilter:      document.getElementById('country-filter'),
        currentFlag:        document.getElementById('current-flag'),
        currentCountryName: document.getElementById('current-country-name'),
    };

    let timerInterval      = null;
    let autoReconnectTimer = null;   // tracks the auto-call countdown so we can cancel it
    let countdownInterval  = null;   // visual countdown ticker

    // ════════════════════════════════════════════════
    // COUNTRY FILTER
    // ════════════════════════════════════════════════
    elements.countryFilter?.addEventListener('change', () => {
        const sel   = elements.countryFilter;
        const value = sel.value;

        if (value === 'all') {
            elements.currentFlag.src              = 'https://flagcdn.com/w20/un.png';
            elements.currentFlag.alt              = 'all';
            elements.currentCountryName.innerText = 'Worldwide';
        } else {
            elements.currentFlag.src              = `https://flagcdn.com/w20/${value}.png`;
            elements.currentFlag.alt              = value;
            elements.currentCountryName.innerText = sel.options[sel.selectedIndex].text
                .replace(/^\S+\s/, '').trim();
        }
    });

    // ════════════════════════════════════════════════
    // AUTO-CALL TOGGLE — cancel pending reconnect if
    // user turns OFF the switch while waiting
    // ════════════════════════════════════════════════
    elements.autoCall?.addEventListener('change', () => {
        if (!elements.autoCall.checked) {
            UI.cancelAutoReconnect();
            if (!isCalling) {
                elements.status.innerText = "Ready for a conversation?";
            }
        }
    });

    // ════════════════════════════════════════════════
    // SOCKET EVENTS
    // ════════════════════════════════════════════════
    socket.on('waiting', () => {
        elements.status.innerText = "Waiting for a match…";
    });

    socket.on('matched', async (data) => {
        // Cancel any pending auto-reconnect — we're already connected
        UI.cancelAutoReconnect();

        currentRoomId = data.roomId;
        isCalling     = true;

        UI.setButton(true);
        UI.startTimer();
        UI.updateState('connected');

        await initiatePeerConnection(data.role);

        CHAT_MANAGER.enableInput(true);
        CHAT_MANAGER.appendMessage(
            `Connected with someone from ${data.partnerCountry} 🌍`, '', true
        );
    });

    // ════════════════════════════════════════════════
    // WEBRTC SIGNALLING
    // ════════════════════════════════════════════════
    socket.on('offer', async (data) => {
        if (!peerConnection) await initiatePeerConnection('answerer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { roomId: currentRoomId, answer });
    });

    socket.on('answer', async (data) => {
        if (!peerConnection) return;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on('ice_candidate', async (data) => {
        if (!peerConnection || !data.candidate) return;
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
            console.error("ICE error:", err);
        }
    });

    // ════════════════════════════════════════════════
    // CALL STATE EVENTS
    // ════════════════════════════════════════════════
    socket.on('peer_disconnected', () => UI.stopCall("Partner disconnected"));
    socket.on('call_ended',        () => UI.stopCall("Call ended"));
    socket.on('peer_reconnecting', () => {
        elements.status.innerText = "Reconnecting…";
    });

    socket.on('online_count', (data) => {
        elements.userCount.innerText = data.count;
    });

    // ════════════════════════════════════════════════
    // UI CONTROLLER
    // ════════════════════════════════════════════════
    const UI = {

        // ── Button icon + label + class ──────────────
        setButton(active) {
            if (!elements.startBtn) return;
            const callLabel = document.getElementById('call-label');

            if (active) {
                elements.startBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36
                        1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1
                        1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2
                        2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                        transform="rotate(135 12 12)"/>
                    </svg>`;
                elements.startBtn.classList.add('ending');
                if (callLabel) callLabel.innerText = 'End';
            } else {
                elements.startBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36
                        1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1
                        1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2
                        2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>`;
                elements.startBtn.classList.remove('ending');
                if (callLabel) callLabel.innerText = 'Start';
            }
        },

        // ── Call timer ───────────────────────────────
        startTimer() {
            let sec = 0;
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                sec++;
                const m = String(Math.floor(sec / 60)).padStart(2, '0');
                const s = String(sec % 60).padStart(2, '0');
                elements.status.innerText = `Live  ${m}:${s}`;
            }, 1000);
        },

        stopTimer() { clearInterval(timerInterval); },

        // ── Country helper ───────────────────────────
        getSelectedCountry() {
            const filter = elements.countryFilter;
            if (!filter) return { value: 'all', name: 'Worldwide' };
            return {
                value: filter.value,
                name:  elements.currentCountryName?.innerText || 'Worldwide'
            };
        },

        // ── Start a call ─────────────────────────────
        async startCall() {
            // Don't start if already in progress
            if (isCalling) return;

            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                isCalling = true;
                elements.status.innerText = "Looking for someone…";

                this.setButton(true);
                this.updateState('searching');

                const { value, name } = this.getSelectedCountry();
                socket.emit('find_match', {
                    userId:        'User_' + Math.floor(Math.random() * 9999),
                    myCountry:     name,
                    targetCountry: value === 'all' ? 'Worldwide' : name
                });

            } catch (err) {
                console.error(err);
                elements.status.innerText = "Mic access denied.";
                alert("Microphone permission is required to start a call.");
                isCalling = false;
                this.setButton(false);
                this.updateState('idle');
            }
        },

        // ── End a call & optionally auto-reconnect ───
        stopCall(msg = "Ready for a conversation?") {
            // Clear any in-progress auto-reconnect first
            this.cancelAutoReconnect();

            // Emit end to server
            if (currentRoomId) socket.emit('end_call', { roomId: currentRoomId });

            // Tear down WebRTC
            if (peerConnection) { peerConnection.close(); peerConnection = null; }
            if (localStream)    { localStream.getTracks().forEach(t => t.stop()); localStream = null; }

            isCalling     = false;
            currentRoomId = null;
            isMuted       = false;

            // Reset mute UI
            CHAT_MANAGER.toggleMuteUI(false);

            this.stopTimer();
            this.setButton(false);
            this.updateState('idle');

            CHAT_MANAGER.enableInput(false);
            CHAT_MANAGER.clearChat();

            // ── AUTO-CALL LOOP ────────────────────────
            // If the toggle is ON, always reconnect automatically.
            // Turn the toggle OFF first if you want to stop.
            if (elements.autoCall?.checked) {
                this.scheduleAutoReconnect();
            } else {
                elements.status.innerText = msg;
            }
        },

        // ── Schedule the next auto-call with countdown ──
        scheduleAutoReconnect() {
            const DELAY = 3; // seconds before reconnecting
            let remaining = DELAY;

            elements.status.innerText = `Auto connecting in ${remaining}s…`;

            countdownInterval = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    elements.status.innerText = `Auto connecting in ${remaining}s…`;
                } else {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
            }, 1000);

            autoReconnectTimer = setTimeout(() => {
                autoReconnectTimer = null;
                if (!isCalling && elements.autoCall?.checked) {
                    this.startCall();
                }
            }, DELAY * 1000);
        },

        // ── Cancel any pending auto-reconnect ────────
        cancelAutoReconnect() {
            if (autoReconnectTimer) {
                clearTimeout(autoReconnectTimer);
                autoReconnectTimer = null;
            }
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        },

        // ── Update logo + wave state ─────────────────
        updateState(state) {
            const waveContainer = document.getElementById('wave-container');
            const appLogo       = document.getElementById('app-logo');

            if (waveContainer) {
                waveContainer.classList.toggle('active', state === 'connected');
            }
            if (appLogo) {
                appLogo.classList.remove('connected', 'searching');
                if (state === 'connected') appLogo.classList.add('connected');
                if (state === 'searching') appLogo.classList.add('searching');
            }
        }
    };

    // ════════════════════════════════════════════════
    // BUTTON HANDLERS
    // ════════════════════════════════════════════════

    elements.startBtn?.addEventListener('click', () => {
        if (!isCalling) {
            // Cancel any pending auto-reconnect, then start fresh
            UI.cancelAutoReconnect();
            UI.startCall();
        } else {
            // Manually end — auto-call will still reconnect if toggle is ON
            UI.stopCall("Call ended");
        }
    });

    elements.muteBtn?.addEventListener('click', () => {
        if (!localStream) return;

        isMuted = !isMuted;

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !isMuted;

        socket.emit('mute', { roomId: currentRoomId, isMuted });

        // Update UI via CHAT_MANAGER (class only, no inline styles)
        CHAT_MANAGER.toggleMuteUI(isMuted);
    });

    document.getElementById('report-btn')?.addEventListener('click', () => {
        if (!currentRoomId) {
            alert("You can only report during an active call.");
            return;
        }
        if (confirm("Report this user for inappropriate behaviour?")) {
            socket.emit('report_user', { roomId: currentRoomId });
            // Reported user: don't auto-reconnect to the same pool immediately
            elements.autoCall.checked = false;
            UI.stopCall("User reported. Call ended.");
        }
    });

});
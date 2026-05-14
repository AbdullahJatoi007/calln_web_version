document.addEventListener("DOMContentLoaded", () => {

    // ════════════════════════════════════════════════
    // DOM ELEMENT REFERENCES
    // ════════════════════════════════════════════════
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

    // ════════════════════════════════════════════════
    // FIX: Force filter to "Worldwide" on every page load
    // (HTML has Pakistan hardcoded — this overrides it)
    // ════════════════════════════════════════════════
    if (elements.countryFilter) {
        elements.countryFilter.value          = 'all';
        elements.currentFlag.src              = 'https://flagcdn.com/w20/un.png';
        elements.currentFlag.alt              = 'all';
        elements.currentCountryName.innerText = 'Worldwide';
    }

    // ════════════════════════════════════════════════
    // SHARED TIMERS
    // ════════════════════════════════════════════════
    let timerInterval      = null;   // live call duration ticker
    let autoReconnectTimer = null;   // tracks the auto-call countdown so we can cancel it
    let countdownInterval  = null;   // visual "Auto connecting in Xs…" ticker

    // ════════════════════════════════════════════════
    // COUNTRY FILTER
    // Updates the flag + label in the navbar pill
    // whenever the user picks a new country/region
    // ════════════════════════════════════════════════
    if (elements.countryFilter) {
        elements.countryFilter.addEventListener('change', () => {
            const sel   = elements.countryFilter;
            const value = sel.value;

            if (value === 'all') {
                elements.currentFlag.src              = 'https://flagcdn.com/w20/un.png';
                elements.currentFlag.alt              = 'all';
                elements.currentCountryName.innerText = 'Worldwide';
            } else {
                elements.currentFlag.src              = `https://flagcdn.com/w20/${value}.png`;
                elements.currentFlag.alt              = value;
                // Strip the flag emoji + space: "🇵🇰 Pakistan" → "Pakistan"
                elements.currentCountryName.innerText = sel.options[sel.selectedIndex].text
                    .replace(/^\S+\s/, '')
                    .trim();
            }
        });
    }

    // ════════════════════════════════════════════════
    // AUTO-CALL TOGGLE LISTENER
    // If the user flips the switch OFF while a
    // reconnect is counting down, cancel it immediately
    // ════════════════════════════════════════════════
    if (elements.autoCall) {
        elements.autoCall.addEventListener('change', () => {
            if (!elements.autoCall.checked) {
                UI.cancelAutoReconnect();
                if (!isCalling) {
                    elements.status.innerText = "Ready for a conversation?";
                }
            }
        });
    }

    // ════════════════════════════════════════════════
    // SOCKET EVENTS
    // ════════════════════════════════════════════════

    // Server confirmed we're in the queue
    socket.on('waiting', () => {
        elements.status.innerText = "Waiting for a match…";
    });

    // Server found a partner — set up the call
    socket.on('matched', async (data) => {

        // Cancel any pending auto-reconnect — we're already connected
        UI.cancelAutoReconnect();

        currentRoomId = data.roomId;
        isCalling     = true;

        UI.setButton(true);
        UI.startTimer();
        UI.updateState('connected');

        // Start WebRTC peer connection
        await initiatePeerConnection(data.role);

        // Hook network monitor onto the new peer connection
        if (typeof NETWORK !== 'undefined') NETWORK.watchPeer();

        // Enable the text chat input
        CHAT_MANAGER.enableInput(true);

        // Show a system message with partner's country
        CHAT_MANAGER.appendMessage(
            `Connected with someone from ${data.partnerCountry} 🌍`,
            '',
            true
        );

        if (typeof trackEvent === 'function') {
            trackEvent('call_matched', { partner_country: data.partnerCountry });
        }

        // Unlock the Play panel and initialise games
        if (typeof GAME_MANAGER !== 'undefined') {
            GAME_MANAGER.activate();
        }
    });

    // ════════════════════════════════════════════════
    // WEBRTC SIGNALLING
    // ════════════════════════════════════════════════

    // Answerer: receives the caller's offer, replies with an answer
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

    // Caller: receives the answerer's answer, completes handshake
    socket.on('answer', async (data) => {

        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
    });

    // Both sides: exchange ICE candidates to establish the best path
    socket.on('ice_candidate', async (data) => {

        if (!peerConnection || !data.candidate) return;

        try {
            await peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
        } catch (err) {
            console.error("ICE error:", err);
        }
    });

    // ════════════════════════════════════════════════
    // CALL STATE EVENTS
    // ════════════════════════════════════════════════

    // Partner's socket disconnected
    socket.on('peer_disconnected', () => {
        UI.stopCall("Partner disconnected");
    });

    // Partner ended the call cleanly
    socket.on('call_ended', () => {
        UI.stopCall("Call ended");
    });

    // Partner dropped briefly — show reconnecting message
    socket.on('peer_reconnecting', () => {
        elements.status.innerText = "Reconnecting…";
    });

    // Live online user count from the server
    socket.on('online_count', (data) => {
        elements.userCount.innerText = data.count;
    });

    // ════════════════════════════════════════════════
    // UI CONTROLLER
    // Central object for all UI state mutations
    // ════════════════════════════════════════════════
    const UI = {

        // ── Toggle the Start/End button icon, colour, and label ──
        setButton(active) {

            if (!elements.startBtn) return;

            const callLabel = document.getElementById('call-label');

            if (active) {
                // End-call icon — rotated phone (hang-up position)
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
                // Start-call icon — upright phone
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

        // ── Tick up a live MM:SS call-duration timer ──
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

        // ── Stop and clear the call timer ──
        stopTimer() {
            clearInterval(timerInterval);
            timerInterval = null;
        },

        // ── Read the currently selected FILTER country from the navbar ──
        // NOTE: this is the TARGET preference only, not the user's real country.
        getSelectedCountry() {

            const filter = elements.countryFilter;
            if (!filter) return { value: 'all', name: 'Worldwide' };

            const value = filter.value;
            const name  = elements.currentCountryName?.innerText || 'Worldwide';

            return { value, name };
        },

        // ── Request mic, join the queue, update UI ──
        async startCall() {

            // Prevent double-calling
            if (isCalling) return;

            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                isCalling = true;
                elements.status.innerText = "Looking for someone…";

                if (typeof trackEvent === 'function') {
                    // Track with real detected country, not the filter
                    trackEvent('call_started', { country: detectedCountry });
                }

                this.setButton(true);
                this.updateState('searching');

                // ── FIX: myCountry = real IP-detected country
                //         targetCountry = what the user FILTERED for
                const { value } = this.getSelectedCountry();

                socket.emit('find_match', {
                    userId:        'User_' + Math.floor(Math.random() * 9999),
                    myCountry:     detectedCountry,   // real country, never the filter
                    targetCountry: value === 'all' ? 'Worldwide' : elements.currentCountryName.innerText
                });

            } catch (err) {
                console.error(err);
                elements.status.innerText = "Mic access denied.";
                alert("Microphone permission is required to start a call.");

                // Reset state — don't leave the button in the 'active' position
                isCalling = false;
                this.setButton(false);
                this.updateState('idle');
            }
        },

        // ── Tear down everything and optionally auto-reconnect ──
        stopCall(msg = "Ready for a conversation?") {

            // Always kill any pending reconnect countdown first
            this.cancelAutoReconnect();

            // Tell the server we're done
            if (currentRoomId) {
                socket.emit('end_call', { roomId: currentRoomId });
            }

            // Close the peer connection
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }

            // Stop microphone tracks
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }

            // Reset all global state
            isCalling     = false;
            currentRoomId = null;
            isMuted       = false;

            if (typeof trackEvent === 'function') trackEvent('call_ended');

            // Reset mute button visual (class-only, no inline styles)
            CHAT_MANAGER.toggleMuteUI(false);

            // Stop the live timer
            this.stopTimer();

            // Reset button to "Start" green state
            this.setButton(false);

            // Return logo + wave bars to idle state
            this.updateState('idle');

            // Disable and clear the chat input
            CHAT_MANAGER.enableInput(false);
            CHAT_MANAGER.clearChat();

            // Lock Play panel and switch back to Chat tab
            if (typeof GAME_MANAGER !== 'undefined') {
                GAME_MANAGER.deactivate();
            }

            // ── AUTO-CALL LOOP ────────────────────────────
            if (elements.autoCall?.checked) {
                this.scheduleAutoReconnect();
            } else {
                elements.status.innerText = msg;
            }
        },

        // ── Show a 3-second countdown then re-start the call ──
        scheduleAutoReconnect() {

            const DELAY_SECONDS = 3;
            let remaining = DELAY_SECONDS;

            // Show initial countdown immediately
            elements.status.innerText = `Auto connecting in ${remaining}s…`;

            // Tick down every second for visual feedback
            countdownInterval = setInterval(() => {
                remaining--;

                if (remaining > 0) {
                    elements.status.innerText = `Auto connecting in ${remaining}s…`;
                } else {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
            }, 1000);

            // Fire the actual reconnect after the delay
            autoReconnectTimer = setTimeout(() => {
                autoReconnectTimer = null;

                // Double-check toggle is still ON and we're not already calling
                if (!isCalling && elements.autoCall?.checked) {
                    this.startCall();
                }
            }, DELAY_SECONDS * 1000);
        },

        // ── Cancel a pending auto-reconnect (clears both timers) ──
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

        // ── Sync logo colour/animation and wave bars to call state ──
        updateState(state) {

            const waveContainer = document.getElementById('wave-container');
            const appLogo       = document.getElementById('app-logo');

            // Wave bars: only visible when actively connected
            if (waveContainer) {
                waveContainer.classList.toggle('active', state === 'connected');
            }

            // Logo: three states — idle (blue), searching (pulsing), connected (green)
            if (appLogo) {
                appLogo.classList.remove('connected', 'searching');

                if (state === 'connected') {
                    appLogo.classList.add('connected');
                }
                if (state === 'searching') {
                    appLogo.classList.add('searching');
                }
            }
        }
    };

    // ════════════════════════════════════════════════
    // CALL BRIDGE — lets toast.js reach the UI object
    // without breaking the closure scope
    // ════════════════════════════════════════════════
    window._callBridge = {
        stopCall:       (msg) => UI.stopCall(msg),
        startCall:      ()    => UI.startCall(),
        stopAndFindNew: ()    => {
            UI.stopCall("Reconnect cancelled — finding someone new…");
            setTimeout(() => { if (!isCalling) UI.startCall(); }, 800);
        }
    };

    // ════════════════════════════════════════════════
    // BUTTON CLICK HANDLERS
    // ════════════════════════════════════════════════

    // Start / End button
    elements.startBtn?.addEventListener('click', () => {

        if (!isCalling) {
            // Cancel any pending auto-reconnect countdown, then start fresh
            UI.cancelAutoReconnect();
            UI.startCall();
        } else {
            // Manually end the call.
            // Note: if Auto Call is ON, stopCall() will still schedule
            // a reconnect — turn the toggle OFF to break the loop.
            UI.stopCall("Call ended");
        }
    });

    // Mute / Unmute button
    elements.muteBtn?.addEventListener('click', () => {

        // No stream = not in a call, nothing to mute
        if (!localStream) return;

        isMuted = !isMuted;

        // Silence the actual audio track
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !isMuted;
        }

        // Emit mute state so the partner sees a system message
        socket.emit('mute', {
            roomId: currentRoomId,
            isMuted
        });

        // Update button CSS class and label (no inline styles)
        CHAT_MANAGER.toggleMuteUI(isMuted);
    });

    // Report button
    document.getElementById('report-btn')?.addEventListener('click', () => {

        if (!currentRoomId) {
            alert("You can only report during an active call.");
            return;
        }

        const confirmed = confirm(
            "Report this user for inappropriate behaviour?"
        );

        if (confirmed) {
            socket.emit('report_user', { roomId: currentRoomId });
            if (typeof trackEvent === 'function') trackEvent('user_report_submitted');

            // Turn off auto-call — don't immediately reconnect after a report
            if (elements.autoCall) {
                elements.autoCall.checked = false;
            }

            UI.stopCall("User reported. Call ended.");
        }
    });

});
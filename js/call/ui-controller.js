// ═══════════════════════════════════════════════════════════
// UI CONTROLLER
// Central object for all UI state mutations tied to the call panel.
//
// Depends on globals owned by config.js/connection.js (unchanged,
// still loaded earlier in index.html): CONFIG, socket, localStream,
// peerConnection, currentRoomId, isCalling, isMuted, detectedCountry.
//
// Depends on `elements` (shared/dom-elements.js) and
// `clearFallbackTimer` (call/matchmaking.js) — both must be loaded
// before this file per the documented <script> order.
// ═══════════════════════════════════════════════════════════

let timerInterval      = null;   // live call duration ticker
let autoReconnectTimer = null;   // tracks the auto-call countdown so we can cancel it
let countdownInterval  = null;   // visual "Auto connecting in Xs…" ticker

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
                trackEvent('call_started', { country: detectedCountry });
            }

            this.setButton(true);
            this.updateState('searching');

            const { value, name } = this.getSelectedCountry();

            socket.emit('find_match', {
                userId:        'User_' + Math.floor(Math.random() * 9999),
                myCountry:     detectedCountry,   // real IP-detected country
                targetCountry: value === 'all' ? 'Worldwide' : name
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

        // Kill all pending timers — reconnect, countdown, and fallback
        this.cancelAutoReconnect();
        clearFallbackTimer();

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

// ═══════════════════════════════════════════════════════════
// FALLBACK MATCHMAKING
// If the user picked a specific country and nobody from that
// country is in the queue after FALLBACK_DELAY_MS, we silently
// expand to Worldwide.
//
// Flow:
//   1. server emits 'waiting' → startFallbackTimer()
//   2. status shows "Searching India… expanding in 12s"
//   3. timer fires → emit find_match with Worldwide
//   4. server re-queues and matches anyone available
//   5. on match → clearFallbackTimer() so it never fires late
//
// `startFallbackTimer`/`clearFallbackTimer` are plain top-level
// function declarations (not wrapped) so they're callable from
// other files (call/ui-controller.js's stopCall, for example).
// ═══════════════════════════════════════════════════════════
let fallbackTimer     = null;
let fallbackCountdown = null;
const FALLBACK_DELAY_MS = 12000; // 12 s before expanding search

function startFallbackTimer(targetCountryName) {

    // Only needed when a specific country was chosen
    if (!targetCountryName || targetCountryName === 'Worldwide') return;

    clearFallbackTimer();

    let remaining = Math.round(FALLBACK_DELAY_MS / 1000);

    // Tick the status down so the user knows something is happening
    fallbackCountdown = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            elements.status.innerText =
                `Searching ${targetCountryName}… expanding in ${remaining}s`;
        } else {
            clearInterval(fallbackCountdown);
            fallbackCountdown = null;
        }
    }, 1000);

    // After the delay, widen the search to everyone
    fallbackTimer = setTimeout(() => {
        fallbackTimer = null;

        // Guard: only act if still in the searching state (not yet matched)
        if (!isCalling || currentRoomId) return;

        elements.status.innerText =
            `No one from ${targetCountryName} found — expanding search worldwide…`;

        socket.emit('find_match', {
            userId:        'User_' + Math.floor(Math.random() * 9999),
            myCountry:     detectedCountry,
            targetCountry: 'Worldwide',   // ← open the search to everyone
            firebaseUid:   window.CALLN_UID || null,
            displayName:   window.CALLN_DISPLAY_NAME || null,
        });

    }, FALLBACK_DELAY_MS);
}

function clearFallbackTimer() {
    if (fallbackTimer)     { clearTimeout(fallbackTimer);       fallbackTimer     = null; }
    if (fallbackCountdown) { clearInterval(fallbackCountdown);  fallbackCountdown = null; }
}

// ═══════════════════════════════════════════════════════════
// SOCKET EVENTS — matchmaking
// ═══════════════════════════════════════════════════════════

// Server confirmed we're in the queue
socket.on('waiting', () => {
    const { value, name } = UI.getSelectedCountry();

    if (value === 'all') {
        // Worldwide — generic message, no fallback needed
        elements.status.innerText = "Waiting for a match…";
        clearFallbackTimer();
    } else {
        // Specific country — show targeted message and start fallback timer
        elements.status.innerText = `Searching for someone from ${name}…`;
        startFallbackTimer(name);
    }
});

// Server found a partner — set up the call
socket.on('matched', async (data) => {

    // Cancel any pending auto-reconnect or fallback — we're connected
    UI.cancelAutoReconnect();
    clearFallbackTimer();

    currentRoomId = data.roomId;
    isCalling     = true;

    // NEW — capture who the partner is, so "Add Friend" knows who to send to
    currentPartnerUid         = data.partnerUid || null;
    currentPartnerDisplayName = data.partnerDisplayName || null;
    if (elements.friendBtn) {
        elements.friendBtn.disabled = !currentPartnerUid;
        elements.friendBtn.classList.remove('friend-btn-sent');
    }

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
// ═══════════════════════════════════════════════════════════
// CALL BRIDGE — lets toast.js reach the UI object
// without breaking the closure scope
// ═══════════════════════════════════════════════════════════
window._callBridge = {
    stopCall:       (msg) => UI.stopCall(msg),
    startCall:      ()    => UI.startCall(),
    stopAndFindNew: ()    => {
        UI.stopCall("Reconnect cancelled — finding someone new…");
        setTimeout(() => { if (!isCalling) UI.startCall(); }, 800);
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // ── AUTO-CALL TOGGLE LISTENER ────────────────────────────
    // If the user flips the switch OFF while a reconnect is
    // counting down, cancel it immediately.
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

    // ── START / END BUTTON ───────────────────────────────────
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

    // ── MUTE / UNMUTE BUTTON ─────────────────────────────────
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

    // ── REPORT BUTTON ─────────────────────────────────────────
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

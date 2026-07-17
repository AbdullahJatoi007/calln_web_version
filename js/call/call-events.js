// ═══════════════════════════════════════════════════════════
// CALL STATE EVENTS
// Partner-driven lifecycle notifications. NOTE: this is the file
// we'll extend for the "wait 5-7s before treating a drop as a
// real hangup" feature — 'peer_reconnecting' and 'peer_disconnected'
// both land here.
// ═══════════════════════════════════════════════════════════

// Partner's socket disconnected
socket.on('peer_disconnected', () => {
    CHAT_MANAGER.hideTypingIndicator();
    UI.stopCall("Partner disconnected");
});

// Partner ended the call cleanly
socket.on('call_ended', () => {
    CHAT_MANAGER.hideTypingIndicator();
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

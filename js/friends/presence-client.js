// ═══════════════════════════════════════════════════════════
// PRESENCE CLIENT
// Tells the server "this socket belongs to Firebase UID X" so
// friends can see online/offline status. Re-sends on every
// (re)connect, since a new connection means a new socket.id
// server-side — the old registration is gone.
//
// IMPORTANT: firebase-init.js is `type="module"`, which runs
// DEFERRED — after the whole page finishes parsing — regardless of
// tag order. This file is a classic script and runs immediately, so
// `window.firebaseReady` is GUARANTEED not to exist yet at the
// moment this file's top-level code runs. Checking it synchronously
// here was the actual bug — this now listens for the
// 'calln-auth-ready' EVENT that firebase-init.js dispatches once
// auth actually finishes, which works regardless of script order.
// ═══════════════════════════════════════════════════════════
(function () {
    async function sendIdentify() {
        try {
            const uid = window.CALLN_UID || (window.firebaseReady && await window.firebaseReady);

            if (!uid) {
                console.warn('[Presence] sendIdentify: no UID available yet — skipping');
                return;
            }
            if (!socket || !socket.connected) {
                console.warn('[Presence] sendIdentify: socket not connected yet — skipping');
                return;
            }

            socket.emit('identify', { firebaseUid: uid });
            console.log('[Presence] Sent identify for uid:', uid);
        } catch (e) {
            console.error('[Presence] sendIdentify failed:', e);
        }
    }

    // Fire whenever the socket (re)connects (covers reconnects, where
    // a new socket.id needs a fresh identify).
    socket.on('connect', sendIdentify);

    // Fire the moment Firebase auth actually finishes — the reliable
    // trigger, since it doesn't depend on script load order at all.
    window.addEventListener('calln-auth-ready', sendIdentify);

    // Cover the case where auth already finished AND the socket is
    // already connected by the time this script happens to run.
    if (window.CALLN_UID && socket && socket.connected) {
        sendIdentify();
    }
})();
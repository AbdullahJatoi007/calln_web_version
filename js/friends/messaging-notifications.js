// ═══════════════════════════════════════════════════════════
// MESSAGING NOTIFICATIONS
// Maintains one unread-count listener per friend, feeds totals into
// friends-panel.js's badges — counters only, deliberately no toast
// or push-style alert for new messages.
//
// Waits for both 'calln-messaging-ready' (CALLN_MESSAGING API) and
// 'calln-friends-panel-ready' (CALLN_SET_UNREAD_COUNT + nav badge)
// before doing anything, since neither is guaranteed to exist yet
// when this classic script first runs.
// ═══════════════════════════════════════════════════════════

function initMessagingNotifications() {

    // friendUid -> unsubscribe function, so we don't leak listeners
    // if the friends list changes (friend removed, etc.)
    const activeListeners = new Map();

    function watchFriend(friendUid, friendDisplayName) {
        if (activeListeners.has(friendUid)) return; // already watching

        window.CALLN_MESSAGING.listenUnreadCount(friendUid, (count) => {
            console.log('[Notifications] unread count for', friendUid, '=', count);

            if (typeof window.CALLN_SET_UNREAD_COUNT === 'function') {
                window.CALLN_SET_UNREAD_COUNT(friendUid, count);
            } else {
                console.warn('[Notifications] CALLN_SET_UNREAD_COUNT not available yet — badge will not update');
            }
        }).then(unsub => activeListeners.set(friendUid, unsub))
          .catch(err => console.error('[Notifications] listenUnreadCount failed for', friendUid, err));
    }

    function syncWatchedFriends(friends) {
        const currentUids = new Set(friends.map(f => f.uid));

        // Stop watching anyone no longer a friend (removed).
        for (const [uid, unsub] of activeListeners) {
            if (!currentUids.has(uid)) {
                unsub();
                activeListeners.delete(uid);
                if (typeof window.CALLN_SET_UNREAD_COUNT === 'function') {
                    window.CALLN_SET_UNREAD_COUNT(uid, 0);
                }
            }
        }

        // Start watching any new friends.
        for (const f of friends) {
            watchFriend(f.uid, f.displayName);
        }
    }

    // Friends list updates live — friends-panel.js dispatches this
    // every time its own listenFriendsList callback fires.
    window.addEventListener('calln-friends-list-updated', (e) => {
        console.log('[Notifications] calln-friends-list-updated received — friends:', (e.detail.friends || []).map(f => f.uid));
        syncWatchedFriends(e.detail.friends || []);
    });

    console.log('[Notifications] initMessagingNotifications() finished setting up listeners');
}

function boot() {
    console.log('[Notifications] boot() called — CALLN_MESSAGING exists:', !!window.CALLN_MESSAGING, '| CALLN_SET_UNREAD_COUNT exists:', !!window.CALLN_SET_UNREAD_COUNT);

    const messagingReady = window.CALLN_MESSAGING
        ? Promise.resolve()
        : new Promise(res => window.addEventListener('calln-messaging-ready', () => {
              console.log('[Notifications] calln-messaging-ready event fired');
              res();
          }, { once: true }));

    const panelReady = window.CALLN_SET_UNREAD_COUNT
        ? Promise.resolve()
        : new Promise(res => window.addEventListener('calln-friends-panel-ready', () => {
              console.log('[Notifications] calln-friends-panel-ready event fired');
              res();
          }, { once: true }));

    Promise.all([messagingReady, panelReady]).then(() => {
        console.log('[Notifications] both dependencies ready — starting initMessagingNotifications()');
        initMessagingNotifications();
    });
}

boot();
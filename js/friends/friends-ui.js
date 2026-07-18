// ═══════════════════════════════════════════════════════════
// FRIENDS UI
// Plain classic script — calls window.CALLN_FRIENDS (from the
// friends.js module) and window.TOAST (from toast.js), both of
// which already exist as globals by the time their functions are
// actually invoked. Waits for the 'calln-friends-ready' event
// before doing anything, since module load timing isn't
// guaranteed relative to this classic script's tag position.
// ═══════════════════════════════════════════════════════════

function initFriendsUI() {

    // ── ADD FRIEND BUTTON ────────────────────────────────────
    if (elements.friendBtn) {
        elements.friendBtn.addEventListener('click', async () => {
            if (!currentPartnerUid) return; // shouldn't happen, button is disabled otherwise

            elements.friendBtn.disabled = true;

            try {
                await window.CALLN_FRIENDS.sendRequest(
                    currentPartnerUid,
                    window.CALLN_DISPLAY_NAME,
                    currentPartnerDisplayName
                );

                elements.friendBtn.classList.add('friend-btn-sent');

                if (typeof TOAST !== 'undefined') {
                    TOAST.show('Friend request sent!', {
                        type: 'success', icon: '🤝', duration: 3000,
                    });
                }

                if (typeof CHAT_MANAGER !== 'undefined' && currentRoomId) {
                    CHAT_MANAGER.appendMessage('🤝 Friend request sent', '', true);
                }

            } catch (err) {
                console.error('[Friends] sendRequest failed:', err);
                elements.friendBtn.disabled = false; // allow retry

                if (typeof TOAST !== 'undefined') {
                    TOAST.show('Could not send friend request', {
                        type: 'error', icon: '⚠️', duration: 4000,
                    });
                }
            }
        });
    }

    // ── INCOMING FRIEND REQUESTS ─────────────────────────────
    // Shown as an actionable toast, same pattern already used for
    // the network-lost / autoplay-blocked toasts in toast.js.
    const shownRequestIds = new Set();

    window.CALLN_FRIENDS.listenIncomingRequests((requests) => {
        for (const req of requests) {
            if (shownRequestIds.has(req.id)) continue;
            shownRequestIds.add(req.id);

            if (typeof TOAST === 'undefined') continue;

            // Escape before interpolating — toast.js inserts `message`
            // via innerHTML, and displayName is technically
            // client-controlled data (same reasoning as friends-panel.js).
            const escapeHtml = (str) => String(str || '')
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            const fromName = escapeHtml(req.fromDisplayName || 'Someone');

            TOAST.show(`${fromName} wants to be friends`, {
                id:       `friend-req-${req.id}`,
                type:     'info',
                icon:     '👋',
                duration: 0, // stays until the user responds
                actions: [
                    {
                        label:   'Accept',
                        primary: true,
                        dismiss: true,
                        onClick: async () => {
                            try {
                                await window.CALLN_FRIENDS.acceptRequest(req.id, req);
                                TOAST.show(`You and ${fromName} are now friends!`, {
                                    type: 'success', icon: '🎉', duration: 3500,
                                });
                            } catch (err) {
                                console.error('[Friends] acceptRequest failed:', err);
                                TOAST.show('Could not accept request', {
                                    type: 'error', icon: '⚠️', duration: 4000,
                                });
                            }
                        }
                    },
                    {
                        label:   'Decline',
                        danger:  true,
                        dismiss: true,
                        onClick: () => {
                            window.CALLN_FRIENDS.declineRequest(req.id)
                                .catch(err => console.error('[Friends] declineRequest failed:', err));
                        }
                    }
                ]
            });
        }
    }).catch(err => console.error('[Friends] listenIncomingRequests failed to start:', err));
}

if (window.CALLN_FRIENDS) {
    initFriendsUI();
} else {
    window.addEventListener('calln-friends-ready', initFriendsUI, { once: true });
}
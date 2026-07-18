// ═══════════════════════════════════════════════════════════
// FRIEND CALL — direct call to a specific friend, bypassing the
// random matchmaking queue. Once connected, the server sends the
// exact same 'matched' event random calls use, so the EXISTING
// matchmaking.js handler (WebRTC setup, chat enable, etc.) already
// handles everything from that point on — nothing else to wire up.
// ═══════════════════════════════════════════════════════════

const FRIEND_CALL_TOAST_ID = (callId) => `friend-call-${callId}`;
const OUTGOING_CALL_TOAST_ID = 'outgoing-friend-call';

function escapeHtmlFriendCall(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Caller side ────────────────────────────────────────────────
async function callFriend(targetUid, targetDisplayName) {
    const ok = await UI.prepareLocalStream();
    if (!ok) return;

    const name = escapeHtmlFriendCall(targetDisplayName || 'friend');
    elements.status.innerText = `Calling ${targetDisplayName || 'friend'}…`;

    if (typeof TOAST !== 'undefined') {
        TOAST.show(`Calling ${name}…`, {
            id: OUTGOING_CALL_TOAST_ID,
            type: 'info',
            spinner: true,
            sub: 'Connecting…', // needed so updateSub() has something to target later
            duration: 0, // stays until ringing/connected/failed/declined/timeout
        });
    }

    socket.emit('call_friend', {
        targetUid,
        myDisplayName: window.CALLN_DISPLAY_NAME || null,
    });
}

// Exposed so friends-panel.js's 📞 button can trigger this.
window.CALLN_CALL_FRIEND = callFriend;

document.addEventListener('DOMContentLoaded', () => {

    // Server confirmed the invite reached the friend — update "Calling…"
    // to "Ringing…" so the caller knows it's actually gotten through.
    socket.on('friend_call_ringing', () => {
        if (typeof TOAST !== 'undefined') {
            TOAST.updateSub(OUTGOING_CALL_TOAST_ID, 'Ringing…');
        }
    });

    // Connected (via this friend call OR a random match — harmless
    // no-op if the outgoing-call toast doesn't exist).
    socket.on('matched', () => {
        if (typeof TOAST !== 'undefined') {
            TOAST.hide(OUTGOING_CALL_TOAST_ID);
        }
    });

    socket.on('friend_call_failed', ({ reason }) => {
        UI.stopCall("Ready for a conversation?");
        if (typeof TOAST !== 'undefined') TOAST.hide(OUTGOING_CALL_TOAST_ID);
        const messages = {
            offline:        "Your friend isn't online right now.",
            self:           "You can't call yourself.",
            not_identified: "Not ready yet — try again in a moment.",
        };
        if (typeof TOAST !== 'undefined') {
            TOAST.show(messages[reason] || "Couldn't start the call.", {
                type: 'error', icon: '📵', duration: 3500,
            });
        }
    });

    socket.on('friend_call_no_answer', () => {
        UI.stopCall("Ready for a conversation?");
        if (typeof TOAST !== 'undefined') {
            TOAST.hide(OUTGOING_CALL_TOAST_ID);
            TOAST.show('No answer.', { type: 'info', icon: '📵', duration: 3000 });
        }
    });

    socket.on('friend_call_declined', () => {
        UI.stopCall("Ready for a conversation?");
        if (typeof TOAST !== 'undefined') {
            TOAST.hide(OUTGOING_CALL_TOAST_ID);
            TOAST.show('Call declined.', { type: 'info', icon: '📵', duration: 3000 });
        }
    });

    // ── Callee side: someone is calling ME ────────────────────────
    socket.on('incoming_friend_call', ({ callId, fromDisplayName }) => {
        if (typeof TOAST === 'undefined') return;

        const name = escapeHtmlFriendCall(fromDisplayName || 'A friend');

        TOAST.show(`${name} is calling you`, {
            id:       FRIEND_CALL_TOAST_ID(callId),
            type:     'info',
            icon:     '📞',
            duration: 0, // stays until answered, declined, or the caller gives up
            actions: [
                {
                    label:   'Accept',
                    primary: true,
                    dismiss: true,
                    onClick: async () => {
                        const ok = await UI.prepareLocalStream();
                        if (!ok) {
                            socket.emit('decline_friend_call', { callId });
                            return;
                        }
                        socket.emit('accept_friend_call', {
                            callId,
                            myDisplayName: window.CALLN_DISPLAY_NAME || null,
                        });
                    }
                },
                {
                    label:   'Decline',
                    danger:  true,
                    dismiss: true,
                    onClick: () => {
                        socket.emit('decline_friend_call', { callId });
                    }
                }
            ]
        });
    });

    // Caller gave up / disconnected / the 10s timer expired — dismiss
    // the ring toast if it's still showing.
    socket.on('friend_call_cancelled', ({ callId }) => {
        if (typeof TOAST !== 'undefined') {
            TOAST.hide(FRIEND_CALL_TOAST_ID(callId));
        }
    });
});
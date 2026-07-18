// ═══════════════════════════════════════════════════════════
// FRIENDS PANEL
// Injects its own nav button + modal dialog into the page (same
// dynamic-DOM pattern already used for the image lightbox and
// remote-audio element elsewhere in this codebase) — no manual
// HTML editing needed.
//
// Message + Call actions are visually present but show a
// "Coming soon" toast — real friend-to-friend messaging and
// direct-call-a-specific-friend matching aren't built yet.
// ═══════════════════════════════════════════════════════════

function initFriendsPanel() {

    // ── Inject styles once ────────────────────────────────────
    if (!document.getElementById('friends-panel-styles')) {
        const style = document.createElement('style');
        style.id = 'friends-panel-styles';
        style.textContent = `
            .friends-nav-btn {
                display: inline-flex; align-items: center; gap: 6px;
                font-size: 0.875rem; font-weight: 500; color: var(--text-2);
                background: var(--bg-elevated); border: 1px solid var(--border);
                border-radius: 50px; padding: 5px 12px; cursor: pointer;
                transition: color 0.2s, background 0.2s, border-color 0.2s;
            }
            .friends-nav-btn:hover { color: var(--text-1); background: var(--bg-hover); border-color: var(--border-md); }

            .friends-modal-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.6);
                display: none; align-items: center; justify-content: center;
                z-index: 9998; padding: 20px;
            }
            .friends-modal-overlay.open { display: flex; }

            .friends-modal-card {
                background: var(--bg-surface); border: 1px solid var(--border);
                border-radius: var(--r-md); width: 100%; max-width: 420px;
                max-height: 80vh; display: flex; flex-direction: column;
                overflow: hidden;
            }
            .friends-modal-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 18px; border-bottom: 1px solid var(--border);
            }
            .friends-modal-header h3 { margin: 0; font-size: 1.05rem; color: var(--text-1); }
            .friends-modal-close {
                background: none; border: none; color: var(--text-2);
                font-size: 1.2rem; cursor: pointer; line-height: 1;
            }
            .friends-modal-close:hover { color: var(--text-1); }

            .friends-modal-list { overflow-y: auto; padding: 8px; }
            .friends-empty {
                padding: 40px 20px; text-align: center; color: var(--text-2); font-size: 0.9rem;
            }

            .friend-row {
                display: flex; align-items: center; gap: 12px;
                padding: 10px 10px; border-radius: var(--r-md);
            }
            .friend-row:hover { background: var(--bg-hover); }

            .friend-avatar {
                width: 38px; height: 38px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-weight: 700; color: white; font-size: 0.95rem;
                flex-shrink: 0; position: relative;
            }
            .friend-dot {
                position: absolute; bottom: -1px; right: -1px;
                width: 11px; height: 11px; border-radius: 50%;
                border: 2px solid var(--bg-surface);
                background: #6b7280; /* offline = gray */
            }
            .friend-dot.online { background: #22c55e; } /* online = green */

            .friend-info { flex: 1; min-width: 0; }
            .friend-name {
                color: var(--text-1); font-size: 0.9rem; font-weight: 600;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .friend-status { color: var(--text-2); font-size: 0.78rem; }

            .friend-actions { display: flex; gap: 4px; flex-shrink: 0; }
            .friend-action-btn {
                width: 32px; height: 32px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                background: var(--bg-elevated); border: 1px solid var(--border);
                color: var(--text-2); cursor: pointer;
            }
            .friend-action-btn:hover { color: var(--text-1); background: var(--bg-hover); }
            .friend-action-btn.danger:hover { color: #ef4444; border-color: #ef4444; }

            .friends-nav-badge {
                display: inline-flex; align-items: center; justify-content: center;
                min-width: 16px; height: 16px; padding: 0 4px;
                background: #ef4444; color: white; font-size: 0.68rem; font-weight: 700;
                border-radius: 10px; margin-left: 2px;
            }
            .friend-row-badge {
                min-width: 18px; height: 18px; padding: 0 5px;
                display: inline-flex; align-items: center; justify-content: center;
                background: #ef4444; color: white; font-size: 0.7rem; font-weight: 700;
                border-radius: 10px; margin-left: 6px; flex-shrink: 0;
            }

            .friends-section-label {
                font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.06em; color: var(--text-2);
                padding: 12px 10px 6px;
            }

            /* ── Responsive: nav button collapses to icon+badge only ──
               Your existing navbar already hides About/Blog/Get App at
               768px and shows the hamburger — this button wasn't part
               of that rule at all, which is what caused it to overflow
               past the viewport edge. 900px (wider than that breakpoint)
               so it shrinks BEFORE things get tight, not after. */
            @media (max-width: 900px) {
                .friends-nav-btn-label { display: none; }
                .friends-nav-btn { padding: 6px 9px; }
            }

            @media (max-width: 480px) {
                .friends-modal-card { max-width: 100%; }
                .friend-actions { gap: 2px; }
                .friend-action-btn { width: 28px; height: 28px; font-size: 0.85rem; }
                .friend-row { gap: 8px; padding: 8px 6px; }
            }
        `;
        document.head.appendChild(style);
    }

    // ── Nav button ─────────────────────────────────────────────
    const navRight = document.querySelector('.nav-right');
    let navBtn = document.getElementById('friends-nav-btn');
    if (navRight && !navBtn) {
        navBtn = document.createElement('button');
        navBtn.id = 'friends-nav-btn';
        navBtn.className = 'friends-nav-btn';
        navBtn.title = 'Friends';
        navBtn.innerHTML = `👥 <span class="friends-nav-btn-label">Friends</span><span class="friends-nav-badge" id="friends-nav-badge" style="display:none;">0</span>`;
        const hamburger = document.getElementById('nav-hamburger');
        navRight.insertBefore(navBtn, hamburger || null);
    }

    // ── Modal markup ───────────────────────────────────────────
    let overlay = document.getElementById('friends-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'friends-modal-overlay';
        overlay.className = 'friends-modal-overlay';
        overlay.innerHTML = `
            <div class="friends-modal-card">
                <div class="friends-modal-header">
                    <h3>Friends</h3>
                    <button class="friends-modal-close" aria-label="Close">✕</button>
                </div>
                <div class="friends-modal-list" id="friends-modal-list">
                    <div class="friends-empty">Loading…</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const listEl  = document.getElementById('friends-modal-list');
    const closeEl = overlay.querySelector('.friends-modal-close');

    function openModal()  { overlay.classList.add('open'); }
    function closeModal() { overlay.classList.remove('open'); }

    navBtn?.addEventListener('click', openModal);
    closeEl?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    // ── Rendering ──────────────────────────────────────────────
    let latestFriends = [];
    let onlineUids     = new Set();
    let unreadCounts   = {}; // friendUid -> count, fed in by messaging-notifications.js
    let incomingRequests = []; // requests sent TO me, still pending
    let outgoingRequests = []; // requests I sent, still pending

    function updateNavBadge() {
        const total = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);
        const badge = document.getElementById('friends-nav-badge');
        if (!badge) return;
        if (total > 0) {
            badge.textContent = total > 99 ? '99+' : String(total);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Called by messaging-notifications.js whenever any conversation's
    // unread count changes.
    window.CALLN_SET_UNREAD_COUNT = function (friendUid, count) {
        unreadCounts[friendUid] = count;
        updateNavBadge();
        render();
    };

    function initials(name) {
        return (name || '?').slice(0, 1).toUpperCase();
    }

    // Same-purpose helper as CHAT_MANAGER._escape() — displayName is
    // technically client-controlled data (a user could tamper with
    // their own stored name via devtools), so it must never be
    // inserted into innerHTML unescaped.
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function colorFor(uid) {
        // Deterministic color from the uid so each friend gets a
        // stable, distinct avatar color across sessions.
        let hash = 0;
        for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 55%, 45%)`;
    }

    // type: 'incoming' (they sent it to me) | 'outgoing' (I sent it to them)
    function renderRequestRow(req, type) {
        const otherUid  = type === 'incoming' ? req.fromUid : req.toUid;
        const otherName = type === 'incoming' ? req.fromDisplayName : req.toDisplayName;
        const safeName  = escapeHtml(otherName) || 'Unknown';

        const actionsHtml = type === 'incoming'
            ? `<button class="friend-action-btn request-accept-btn" title="Accept" aria-label="Accept">✅</button>
               <button class="friend-action-btn danger request-decline-btn" title="Decline" aria-label="Decline">✖️</button>`
            : `<button class="friend-action-btn danger request-cancel-btn" title="Cancel request" aria-label="Cancel request">✖️</button>`;

        return `
            <div class="friend-row" data-request-id="${req.id}" data-request-type="${type}">
                <div class="friend-avatar" style="background:${colorFor(otherUid || req.id)}">
                    ${escapeHtml(initials(otherName))}
                </div>
                <div class="friend-info">
                    <div class="friend-name">${safeName}</div>
                    <div class="friend-status">${type === 'incoming' ? 'Wants to be friends' : 'Pending…'}</div>
                </div>
                <div class="friend-actions">${actionsHtml}</div>
            </div>
        `;
    }

    function render() {
        console.log('[Presence] render() — latestFriends:', latestFriends.map(f => f.uid), '| onlineUids:', [...onlineUids]);

        const hasAnything = latestFriends.length || incomingRequests.length || outgoingRequests.length;
        if (!hasAnything) {
            listEl.innerHTML = `<div class="friends-empty">No friends yet — meet someone on a call and send a request!</div>`;
            return;
        }

        const sections = [];

        if (incomingRequests.length) {
            sections.push(`<div class="friends-section-label">Friend Requests</div>`);
            sections.push(incomingRequests.map(r => renderRequestRow(r, 'incoming')).join(''));
        }

        if (outgoingRequests.length) {
            sections.push(`<div class="friends-section-label">Sent Requests</div>`);
            sections.push(outgoingRequests.map(r => renderRequestRow(r, 'outgoing')).join(''));
        }

        const hasRequestSections = incomingRequests.length || outgoingRequests.length;

        if (latestFriends.length) {
            if (hasRequestSections) sections.push(`<div class="friends-section-label">Friends</div>`);

            sections.push(latestFriends.map(f => {
                const online = onlineUids.has(f.uid);
                const safeName = escapeHtml(f.displayName);
                const unread = unreadCounts[f.uid] || 0;
                const badgeHtml = unread > 0
                    ? `<span class="friend-row-badge">${unread > 99 ? '99+' : unread}</span>`
                    : '';
                return `
                    <div class="friend-row" data-uid="${f.uid}">
                        <div class="friend-avatar" style="background:${colorFor(f.uid)}">
                            ${escapeHtml(initials(f.displayName))}
                            <span class="friend-dot ${online ? 'online' : ''}"></span>
                        </div>
                        <div class="friend-info">
                            <div class="friend-name">${safeName || 'Unknown'}</div>
                            <div class="friend-status">${online ? 'Online' : 'Offline'}</div>
                        </div>
                        ${badgeHtml}
                        <div class="friend-actions">
                            <button class="friend-action-btn friend-message-btn" title="Message" aria-label="Message">💬</button>
                            <button class="friend-action-btn friend-call-btn" title="Call" aria-label="Call">📞</button>
                            <button class="friend-action-btn danger friend-remove-btn" title="Remove friend" aria-label="Remove friend">🗑️</button>
                        </div>
                    </div>
                `;
            }).join(''));
        } else if (hasRequestSections) {
            sections.push(`<div class="friends-empty" style="padding:16px;">No friends yet</div>`);
        }

        listEl.innerHTML = sections.join('');

        // ── Request row actions ──────────────────────────────────
        listEl.querySelectorAll('.request-accept-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const id = row?.dataset.requestId;
                const req = incomingRequests.find(r => r.id === id);
                if (!id || !req) return;

                window.CALLN_FRIENDS.acceptRequest(id, req)
                    .then(() => {
                        if (typeof TOAST !== 'undefined') {
                            TOAST.show('Friend added!', { type: 'success', icon: '🎉', duration: 2500 });
                        }
                    })
                    .catch(err => {
                        console.error('[Friends] acceptRequest failed:', err);
                        if (typeof TOAST !== 'undefined') {
                            TOAST.show('Could not accept request', { type: 'error', icon: '⚠️', duration: 3000 });
                        }
                    });
            });
        });

        listEl.querySelectorAll('.request-decline-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const id = row?.dataset.requestId;
                if (!id) return;

                window.CALLN_FRIENDS.declineRequest(id)
                    .catch(err => console.error('[Friends] declineRequest failed:', err));
            });
        });

        listEl.querySelectorAll('.request-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const id = row?.dataset.requestId;
                if (!id) return;

                window.CALLN_FRIENDS.cancelRequest(id)
                    .catch(err => console.error('[Friends] cancelRequest failed:', err));
            });
        });

        // ── Friend row actions ────────────────────────────────────
        listEl.querySelectorAll('.friend-message-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const uid = row?.dataset.uid;
                const friend = latestFriends.find(f => f.uid === uid);
                if (!uid) return;

                if (typeof window.CALLN_OPEN_DM === 'function') {
                    window.CALLN_OPEN_DM(uid, friend?.displayName);
                } else if (typeof TOAST !== 'undefined') {
                    TOAST.show('Messaging is still loading — try again in a moment', { type: 'info', duration: 2500 });
                }
            });
        });

        listEl.querySelectorAll('.friend-call-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const uid = row?.dataset.uid;
                const friend = latestFriends.find(f => f.uid === uid);
                if (!uid) return;

                if (!onlineUids.has(uid)) {
                    if (typeof TOAST !== 'undefined') {
                        TOAST.show('This friend is offline right now', { type: 'info', icon: '📵', duration: 3000 });
                    }
                    return;
                }

                if (typeof window.CALLN_CALL_FRIEND === 'function') {
                    closeModal();
                    window.CALLN_CALL_FRIEND(uid, friend?.displayName);
                } else if (typeof TOAST !== 'undefined') {
                    TOAST.show('Calling is still loading — try again in a moment', { type: 'info', duration: 2500 });
                }
            });
        });

        listEl.querySelectorAll('.friend-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.friend-row');
                const uid = row?.dataset.uid;
                const friend = latestFriends.find(f => f.uid === uid);
                if (!uid) return;

                const confirmed = confirm(`Remove ${friend?.displayName || 'this friend'}?`);
                if (!confirmed) return;

                window.CALLN_FRIENDS.removeFriend(uid).catch(err => {
                    console.error('[Friends] removeFriend failed:', err);
                    if (typeof TOAST !== 'undefined') {
                        TOAST.show('Could not remove friend', { type: 'error', icon: '⚠️', duration: 3500 });
                    }
                });
            });
        });
    }

    // ── Presence: real-time push, not polling ────────────────────
    function subscribeToFriendsPresence() {
        const uids = latestFriends.map(f => f.uid).filter(Boolean);
        console.log('[Presence] subscribeToFriendsPresence — friend uids:', uids, '| socket connected:', typeof socket !== 'undefined' && socket.connected);
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.emit('subscribe_presence', { uids });
        }
    }

    if (typeof socket !== 'undefined') {
        // Initial state for everyone we're subscribed to, sent once
        // right after subscribing.
        socket.on('presence_snapshot', ({ online }) => {
            console.log('[Presence] presence_snapshot received — online:', online);
            onlineUids = new Set(online || []);
            render();
        });

        // Live push — fires the instant a specific friend's status
        // actually changes, no polling delay.
        socket.on('presence_changed', ({ uid, online }) => {
            console.log('[Presence] presence_changed received — uid:', uid, 'online:', online);
            if (online) onlineUids.add(uid);
            else onlineUids.delete(uid);
            render();
        });

        // Subscriptions live on the server per-socket and are lost on
        // reconnect (new socket.id) — resubscribe whenever we (re)connect.
        socket.on('connect', subscribeToFriendsPresence);
    }

    navBtn?.addEventListener('click', subscribeToFriendsPresence);

    // ── Live friends list subscription ──────────────────────────
    window.CALLN_FRIENDS.listenFriendsList((friends) => {
        latestFriends = friends;
        render();
        subscribeToFriendsPresence(); // friend list changed — resubscribe with the new set
        window.dispatchEvent(new CustomEvent('calln-friends-list-updated', { detail: { friends } }));
    }).catch(err => console.error('[Friends] listenFriendsList failed to start:', err));

    // ── Live pending-request subscriptions ──────────────────────
    // Gives both people a persistent place to see a request that
    // isn't just the one-shot toast — covers "I dismissed the toast",
    // "I wasn't online when it arrived", and "who am I still waiting on."
    window.CALLN_FRIENDS.listenIncomingRequests((requests) => {
        incomingRequests = requests;
        render();
    }).catch(err => console.error('[Friends] listenIncomingRequests failed to start:', err));

    window.CALLN_FRIENDS.listenOutgoingRequests((requests) => {
        outgoingRequests = requests;
        render();
    }).catch(err => console.error('[Friends] listenOutgoingRequests failed to start:', err));

    // Lets other files (messaging-notifications.js) safely know the
    // nav button/badge element and CALLN_SET_UNREAD_COUNT exist now,
    // regardless of script load order.
    window.dispatchEvent(new CustomEvent('calln-friends-panel-ready'));
}

if (window.CALLN_FRIENDS) {
    initFriendsPanel();
} else {
    window.addEventListener('calln-friends-ready', initFriendsPanel, { once: true });
}
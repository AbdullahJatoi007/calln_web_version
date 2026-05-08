/* =============================================
   TOAST — lightweight notification manager
   ============================================= */
const TOAST = {

    _counter: 0,
    _active:  {},   // id → DOM element

    // ── Show a toast ─────────────────────────────
    // options: { type, icon, sub, duration, spinner, actions, id }
    //   type:     'info' | 'success' | 'warning' | 'error'  (default: 'info')
    //   icon:     emoji string shown on the left             (default: none)
    //   sub:      smaller subtitle text                      (default: none)
    //   duration: ms before auto-dismiss; 0 = stay forever  (default: 4000)
    //   spinner:  show animated spinner instead of icon      (default: false)
    //   actions:  array of { label, primary, danger, onClick, dismiss }
    //   id:       stable id so the same toast can be updated/hidden by name
    show(message, options = {}) {

        const {
            type     = 'info',
            icon     = null,
            sub      = null,
            duration = 4000,
            spinner  = false,
            actions  = [],
            id       = null,
        } = options;

        const toastId = id || `toast-${++this._counter}`;

        // Replace if same id already exists
        this.hide(toastId);

        const container = document.getElementById('toast-container');
        if (!container) return toastId;

        // ── Build DOM ────────────────────────────
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.id = toastId;

        // Left icon / spinner
        let leftHtml = '';
        if (spinner) {
            leftHtml = `<div class="toast-icon-wrap"><div class="toast-spinner"></div></div>`;
        } else if (icon) {
            leftHtml = `<div class="toast-icon-wrap"><span class="toast-emoji">${icon}</span></div>`;
        }

        // Optional subtitle
        const subHtml = sub
            ? `<p class="toast-sub" data-sub="1">${sub}</p>`
            : '';

        // Optional action buttons
        const actionsHtml = actions.length
            ? `<div class="toast-actions">
                ${actions.map((a, i) => `
                    <button
                        class="toast-btn ${a.primary ? 'toast-btn-primary' : ''} ${a.danger ? 'toast-btn-danger' : ''}"
                        data-action-idx="${i}">
                        ${a.label}
                    </button>`).join('')}
               </div>`
            : '';

        el.innerHTML = `
            ${leftHtml}
            <div class="toast-body">
                <p class="toast-title">${message}</p>
                ${subHtml}
                ${actionsHtml}
            </div>
            <button class="toast-close" aria-label="Dismiss">✕</button>
        `;

        // ── Wire buttons ─────────────────────────
        el.querySelector('.toast-close')
            ?.addEventListener('click', () => this.hide(toastId));

        actions.forEach((action, i) => {
            el.querySelector(`[data-action-idx="${i}"]`)
                ?.addEventListener('click', () => {
                    if (typeof action.onClick === 'function') action.onClick();
                    if (action.dismiss !== false) this.hide(toastId);
                });
        });

        // ── Mount + animate ───────────────────────
        container.appendChild(el);
        this._active[toastId] = el;

        // Double rAF so the browser registers the starting state first
        requestAnimationFrame(() =>
            requestAnimationFrame(() => el.classList.add('toast-show'))
        );

        // ── Auto-dismiss ──────────────────────────
        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }

        return toastId;
    },

    // ── Hide / remove a toast ────────────────────
    hide(id) {
        const el = this._active[id] || document.getElementById(id);
        if (!el) return;

        el.classList.remove('toast-show');
        el.classList.add('toast-hide');

        setTimeout(() => {
            el.remove();
            delete this._active[id];
        }, 320);
    },

    // ── Update the subtitle of an existing toast ─
    updateSub(id, text) {
        const el  = this._active[id] || document.getElementById(id);
        const sub = el?.querySelector('[data-sub]');
        if (sub) sub.innerText = text;
    },

    // ── Hide every active toast ──────────────────
    hideAll() {
        Object.keys(this._active).forEach(id => this.hide(id));
    }
};


/* =============================================
   NETWORK — monitors connection quality and
   socket / WebRTC state; shows TOAST alerts
   ============================================= */
const NETWORK = {

    _wasInCall:    false,   // were we in a call when we lost connection?
    _slowWarnedAt: 0,       // timestamp of last "slow connection" toast

    // ── Boot: attach all listeners ───────────────
    init() {

        // Browser-level online / offline
        window.addEventListener('offline', () => this._onOffline());
        window.addEventListener('online',  () => this._onOnline());

        // Network Information API — connection type change (Chrome / Android)
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => this._onConnChange());
            // Also check right now in case we're already on a slow network
            this._onConnChange();
        }

        // Socket.IO events
        socket.on('disconnect',        (reason)  => this._onSocketDisconnect(reason));
        socket.on('reconnect',         ()        => this._onSocketReconnect());
        socket.on('reconnect_attempt', (attempt) => this._onReconnectAttempt(attempt));
        socket.on('reconnect_failed',  ()        => this._onReconnectFailed());
    },

    // ── Must be called right after peerConnection is created ──
    // (called from script.js after initiatePeerConnection)
    watchPeer() {
        if (!peerConnection) return;

        peerConnection.addEventListener('iceconnectionstatechange', () => {
            this._onIceState(peerConnection.iceConnectionState);
        });
    },

    // ════════════════════════════════════════════
    // BROWSER NETWORK EVENTS
    // ════════════════════════════════════════════

    _onOffline() {
        this._wasInCall = (typeof isCalling !== 'undefined') ? isCalling : false;

        TOAST.show('No internet connection', {
            id:       'toast-reconnect',
            type:     'error',
            spinner:  true,
            sub:      'Waiting for network to return…',
            duration: 0,    // persistent
            actions:  [{
                label:   'Skip & find new person',
                danger:  true,
                dismiss: true,
                onClick: () => this._cancelAndSkip()
            }]
        });
    },

    _onOnline() {
        TOAST.hide('toast-reconnect');

        if (this._wasInCall) {
            TOAST.show('Network restored!', {
                type:     'success',
                icon:     '✅',
                sub:      'Reconnecting to server…',
                duration: 3500
            });
        }
        this._wasInCall = false;
    },

    _onConnChange() {
        const conn = navigator.connection;
        if (!conn) return;

        const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
        const now  = Date.now();

        // Rate-limit the warning to once per 30 seconds
        if (slow && (now - this._slowWarnedAt) > 30_000) {
            this._slowWarnedAt = now;
            TOAST.show('Slow connection detected', {
                type:     'warning',
                icon:     '⚡',
                sub:      'Call quality may be affected',
                duration: 5000
            });
        }
    },

    // ════════════════════════════════════════════
    // SOCKET.IO EVENTS
    // ════════════════════════════════════════════

    _onSocketDisconnect(reason) {
        // 'io server disconnect' means the SERVER kicked us intentionally (e.g. ban).
        // Don't show a network error for that.
        if (reason === 'io server disconnect') return;

        const inCall = (typeof isCalling !== 'undefined') ? isCalling : false;
        if (inCall) {
            this._wasInCall = true;
            TOAST.show('Connection lost', {
                id:       'toast-reconnect',
                type:     'error',
                spinner:  true,
                sub:      'Reconnecting…',
                duration: 0,
                actions:  [{
                    label:   'Skip & find new person',
                    danger:  true,
                    dismiss: true,
                    onClick: () => this._cancelAndSkip()
                }]
            });
        }
    },

    _onSocketReconnect() {
        TOAST.hide('toast-reconnect');

        if (this._wasInCall) {
            // The server will have cleaned up the room after 10 s.
            // The existing peer_disconnected event handler will fire
            // and reset the UI. We just show a friendly notice.
            TOAST.show('Reconnected to server!', {
                type:     'success',
                icon:     '✅',
                sub:      'The previous call could not be restored',
                duration: 4000
            });
        }
        this._wasInCall = false;
    },

    _onReconnectAttempt(attempt) {
        // Update the subtitle of the persistent toast while retrying
        TOAST.updateSub('toast-reconnect', `Reconnecting… (attempt ${attempt})`);
    },

    _onReconnectFailed() {
        // Socket.IO gave up — show a hard-fail toast
        TOAST.hide('toast-reconnect');
        TOAST.show('Could not reconnect', {
            type:     'error',
            icon:     '❌',
            sub:      'Please check your connection and refresh',
            duration: 0,
            actions:  [{
                label:   'Refresh page',
                primary: true,
                onClick: () => location.reload()
            }]
        });
    },

    // ════════════════════════════════════════════
    // WEBRTC ICE CONNECTION STATE
    // ════════════════════════════════════════════

    _onIceState(state) {

        if (state === 'disconnected') {
            // Warn — WebRTC may self-heal within a few seconds
            TOAST.show('Connection unstable', {
                id:       'toast-ice-warn',
                type:     'warning',
                icon:     '⚡',
                sub:      'Trying to stabilise the call…',
                duration: 5000
            });

        } else if (state === 'failed') {
            // Hard failure — give the user a clear action
            TOAST.hide('toast-ice-warn');
            TOAST.show('Call connection failed', {
                id:       'toast-reconnect',
                type:     'error',
                icon:     '📡',
                sub:      'Could not maintain a connection with your partner',
                duration: 0,
                actions:  [{
                    label:   'Find new person',
                    primary: true,
                    dismiss: true,
                    onClick: () => this._cancelAndSkip()
                }]
            });

        } else if (state === 'connected' || state === 'completed') {
            // Connection came back on its own — clear any warnings
            TOAST.hide('toast-ice-warn');
            TOAST.hide('toast-reconnect');
        }
    },

    // ════════════════════════════════════════════
    // CANCEL RECONNECT — clean up & find new person
    // ════════════════════════════════════════════

    _cancelAndSkip() {
        this._wasInCall = false;

        TOAST.hide('toast-reconnect');
        TOAST.hide('toast-ice-warn');

        // Use the bridge exposed by script.js to access the UI controller
        if (window._callBridge) {
            window._callBridge.stopAndFindNew();
        }
    }
};

// Auto-initialise once the DOM is ready
document.addEventListener('DOMContentLoaded', () => NETWORK.init());
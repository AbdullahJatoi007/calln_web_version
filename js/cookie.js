/* =============================================
   COOKIE CONSENT — GDPR compliant
   
   Analytics (Firebase) is NEVER loaded until
   the user explicitly clicks "Accept".
   A "Decline" stores the choice and uses a
   silent no-op for all trackEvent() calls.
   ============================================= */
const COOKIE_CONSENT = {

    STORAGE_KEY: 'calln_cookie_consent',

    init() {
        const stored = localStorage.getItem(this.STORAGE_KEY);

        if (stored === 'accepted') {
            // Returning visitor who accepted — load analytics silently
            this._loadAnalytics();
            return;
        }

        if (stored === 'declined') {
            // Returning visitor who declined — permanent no-op
            this._setNoOp();
            return;
        }

        // First visit — show the banner.
        // Small delay so the age-gate renders first and takes focus.
        setTimeout(() => this._show(), 600);
    },

    _show() {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;
        // Double rAF for CSS transition to register
        requestAnimationFrame(() =>
            requestAnimationFrame(() => banner.classList.add('active'))
        );
    },

    _hide() {
        document.getElementById('cookie-banner')?.classList.remove('active');
    },

    // ── User clicked "Accept" ─────────────────
    accept() {
        localStorage.setItem(this.STORAGE_KEY, 'accepted');
        this._hide();
        this._loadAnalytics();
    },

    // ── User clicked "Decline" ────────────────
    decline() {
        localStorage.setItem(this.STORAGE_KEY, 'declined');
        this._hide();
        this._setNoOp();
    },

    // ── Load Firebase Analytics dynamically ───
    // Only called when consent is confirmed.
    _loadAnalytics() {
        // Don't double-inject
        if (document.querySelector('script[src*="analytics.js"]')) return;

        const s = document.createElement('script');
        s.type  = 'module';
        s.src   = 'js/analytics.js';
        document.head.appendChild(s);
    },

    // ── No-op tracker (analytics declined) ───
    _setNoOp() {
        window.trackEvent    = () => {};   // silent stub
        window._eventQueue   = null;       // discard queued events
    }
};

document.addEventListener('DOMContentLoaded', () => COOKIE_CONSENT.init());
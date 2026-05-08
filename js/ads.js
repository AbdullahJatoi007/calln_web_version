/* =============================================
   AD_MANAGER — Calln Ad Strategy

   ┌─────────────────────────────────────────┐
   │  Zone 1 — Footer banner: always visible │
   │                                          │
   │  Zone 2 + 3 — Fullscreen every 10 min:  │
   │    • Fires every 10 minutes globally    │
   │    • = 2 ads per 20 minutes per user    │
   │    • Regardless of call state           │
   │    • Auto-closes after 5 seconds        │
   └─────────────────────────────────────────┘

   ╔══════════════════════════════════════════╗
   ║  BEFORE GOING LIVE — replace these:     ║
   ║                                          ║
   ║  1. Un-comment the AdSense <script> in  ║
   ║     index.html and add your publisher ID ║
   ║     ca-pub-XXXXXXXXXXXXXXXX             ║
   ║                                          ║
   ║  2. Replace data-ad-slot="000…" in each ║
   ║     ad zone with your real slot IDs.    ║
   ╚══════════════════════════════════════════╝
   ============================================= */

const AD_MANAGER = {

    // ── Config ────────────────────────────────
    // A fullscreen ad fires every AD_INTERVAL_MINUTES.
    // 10 minutes = 2 ads every 20 minutes.
    AD_INTERVAL_MINUTES: 10,

    // How long each fullscreen stays on screen (seconds)
    FULLSCREEN_DURATION: 5,

    // ── State ────────────────────────────────
    _intervalHandle: null,   // the global repeating timer
    _timerHandle:    null,   // the per-ad countdown handle
    _adCount:        0,      // total ads shown this session

    // ════════════════════════════════════════
    // INIT — runs on page load
    // Starts the global interval immediately.
    // ════════════════════════════════════════
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this._pushBannerAd();
            this._startGlobalTimer();
        });
    },

    _startGlobalTimer() {
        const ms = this.AD_INTERVAL_MINUTES * 60 * 1000;

        // Use setInterval so it fires repeatedly every AD_INTERVAL_MINUTES
        this._intervalHandle = setInterval(() => {
            this._fireFullscreenAd();
        }, ms);
    },

    // ════════════════════════════════════════
    // FIRE A FULLSCREEN AD
    // Called automatically every 10 minutes.
    // Alternates between the two ad slots so
    // each serves different AdSense ad content.
    // ════════════════════════════════════════
    _fireFullscreenAd() {
        this._adCount++;

        // Odd  → Zone 2 slot (ad-fs-connect)
        // Even → Zone 3 slot (ad-fs-random)
        const overlayId = this._adCount % 2 === 1
            ? 'ad-fs-connect'
            : 'ad-fs-random';

        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        this._runFullscreen(overlay, this.FULLSCREEN_DURATION);

        if (typeof trackEvent === 'function') {
            trackEvent('ad_fullscreen_shown', { slot: overlayId });
        }
    },

    // ════════════════════════════════════════
    // FULLSCREEN RUNNER
    // Shows the overlay for `duration` seconds
    // then auto-closes. Nothing is paused or
    // interrupted — calls keep running.
    // ════════════════════════════════════════
    _runFullscreen(overlay, duration) {
        clearInterval(this._timerHandle);

        const secEl   = overlay.querySelector('.ad-fs-seconds');
        const bar     = overlay.querySelector('.ad-fs-progress-bar');
        let remaining = duration;

        // Reset progress bar
        if (bar) {
            bar.style.transition = 'none';
            bar.style.transform  = 'scaleX(1)';
        }

        // Show overlay
        overlay.style.display = 'flex';
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                if (bar) {
                    bar.style.transition = `transform ${duration}s linear`;
                    bar.style.transform  = 'scaleX(0)';
                }
            })
        );

        if (secEl) secEl.innerText = remaining;

        // Countdown tick
        this._timerHandle = setInterval(() => {
            remaining--;
            if (secEl) secEl.innerText = Math.max(remaining, 0);

            if (remaining <= 0) {
                clearInterval(this._timerHandle);
                this._timerHandle = null;
                this._closeFullscreen(overlay);
            }
        }, 1000);
    },

    _closeFullscreen(overlay) {
        overlay.classList.remove('active');
        setTimeout(() => { overlay.style.display = 'none'; }, 320);
    },

    // ════════════════════════════════════════
    // FOOTER BANNER
    // Pushes the always-on banner to AdSense.
    // ════════════════════════════════════════
    _pushBannerAd() {
        try {
            const pool = window.adsbygoogle = window.adsbygoogle || [];
            document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])')
                .forEach(() => pool.push({}));
        } catch (_) {
            // Ad blocker or not yet approved — silent fail
        }
    },
};

AD_MANAGER.init();
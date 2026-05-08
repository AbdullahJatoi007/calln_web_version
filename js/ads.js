/* =============================================
   AD_MANAGER — Calln Ad Orchestration
   
   ╔══════════════════════════════════════════╗
   ║  BEFORE GOING LIVE — replace these:     ║
   ║                                          ║
   ║  1. Un-comment the AdSense <script>      ║
   ║     in index.html <head> and add your    ║
   ║     publisher ID: ca-pub-XXXXXXXXXX      ║
   ║                                          ║
   ║  2. Replace each data-ad-slot="000…"     ║
   ║     with real slot IDs from AdSense.     ║
   ║                                          ║
   ║  3. AdSense won't serve until your site  ║
   ║     is approved (apply at adsense.google ║
   ║     .com). Placeholders show meanwhile.  ║
   ╚══════════════════════════════════════════╝
   ============================================= */

const AD_MANAGER = {

    // ── Timing ───────────────────────────────
    // How long each fullscreen ad shows (seconds)
    FULLSCREEN_DURATION: 5,

    // Show Zone 2 (call-connect ad) every N connections
    // 1 = every connect, 3 = every third connect (recommended)
    CONNECT_FREQUENCY: 3,

    // Show Zone 3 (random ad) every N call ends
    RANDOM_FREQUENCY: 3,

    // ── State ────────────────────────────────
    _callCount:    0,
    _connectCount: 0,
    _timerHandle:  null,

    // ════════════════════════════════════════
    // INIT — push all AdSense units on load
    // ════════════════════════════════════════
    init() {
        document.addEventListener('DOMContentLoaded', () => this._pushAll());
    },

    // Tell AdSense to fill every <ins class="adsbygoogle"> on the page.
    // Safe to call even if AdSense script hasn't loaded yet.
    _pushAll() {
        try {
            const pool = window.adsbygoogle = window.adsbygoogle || [];
            document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status])')
                .forEach(() => pool.push({}));
        } catch (_) {
            // Ad blocker present or AdSense not approved yet — silent fail.
            // The app always works regardless of ad state.
        }
    },

    // ════════════════════════════════════════
    // ZONE 2 — Call-connect fullscreen (5s)
    // Called from script.js when a match is
    // found. WebRTC runs in background during
    // these 5 seconds so no extra delay.
    // Returns a Promise that resolves when done.
    // ════════════════════════════════════════
    showConnectAd() {
        return new Promise(resolve => {
            this._connectCount++;

            // Only show every CONNECT_FREQUENCY connections
            if (this._connectCount % this.CONNECT_FREQUENCY !== 0) {
                resolve();
                return;
            }

            const overlay = document.getElementById('ad-fs-connect');
            if (!overlay) { resolve(); return; }
            this._runFullscreen(overlay, this.FULLSCREEN_DURATION, resolve);
        });
    },

    // ════════════════════════════════════════
    // ZONE 3 — Random fullscreen
    // Called from script.js when a call ends.
    // Respects RANDOM_FREQUENCY cap.
    // Returns a Promise.
    // ════════════════════════════════════════
    showRandomAd() {
        return new Promise(resolve => {
            this._callCount++;

            if (this._callCount % this.RANDOM_FREQUENCY !== 0) {
                resolve();
                return;
            }

            const overlay = document.getElementById('ad-fs-random');
            if (!overlay) { resolve(); return; }
            this._runFullscreen(overlay, this.FULLSCREEN_DURATION, resolve);
        });
    },

    // ════════════════════════════════════════
    // INTERNAL — shared fullscreen runner
    // ════════════════════════════════════════
    _runFullscreen(overlay, duration, onDone) {
        clearInterval(this._timerHandle);

        const secEl    = overlay.querySelector('.ad-fs-seconds');
        const bar      = overlay.querySelector('.ad-fs-progress-bar');
        let remaining  = duration;

        // Set progress bar to drain over `duration` seconds
        if (bar) {
            bar.style.transition = 'none';
            bar.style.transform  = 'scaleX(1)';
        }

        // Reveal overlay
        overlay.style.display = 'flex';
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                // Start draining the progress bar
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
                this._closeFullscreen(overlay, onDone);
            }
        }, 1000);
    },

    _closeFullscreen(overlay, onDone) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
            onDone?.();
        }, 320);
    },
};

AD_MANAGER.init();
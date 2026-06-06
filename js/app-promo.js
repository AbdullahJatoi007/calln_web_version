/* js/app-promo.js — first-visit "Get the app" popup (all devices) */
(function () {
    'use strict';

    var STORAGE_KEY = 'calln_app_promo_seen';
    var PLAY_URL =
        'https://play.google.com/store/apps/details?id=io.calln.voice.global';

    function alreadySeen() {
        try {
            return localStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false; // storage blocked → treat as not seen
        }
    }

    function markSeen() {
        try {
            localStorage.setItem(STORAGE_KEY, '1');
        } catch (e) {
            /* ignore */
        }
    }

    function close(el) {
        el.classList.remove('show');
        setTimeout(function () {
            el.remove();
        }, 320);
    }

    function build() {
        var overlay = document.getElementById('app-promo');
        if (!overlay) return;

        // set the correct Play URL on the button
        overlay.querySelector('.app-promo-btn').setAttribute('href', PLAY_URL);

        overlay.querySelector('.app-promo-btn').addEventListener(
            'click',
            function () {
                if (window.trackEvent) {
                    window.trackEvent('app_promo_install_click', {});
                }
                markSeen();
                // let the Play Store open, then close the popup
                setTimeout(function () { close(overlay); }, 150);
            }
        );

        overlay.querySelector('.app-promo-close').addEventListener(
            'click',
            function () { markSeen(); close(overlay); }
        );

        overlay.querySelector('.app-promo-dismiss').addEventListener(
            'click',
            function () { markSeen(); close(overlay); }
        );

        // tap outside the card to dismiss
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) { markSeen(); close(overlay); }
        });

        requestAnimationFrame(function () {
            overlay.classList.add('show');
        });
    }

    function maybeShow() {
        if (alreadySeen()) return;
        build();
    }

    // Case 1: first visit — the age gate mounts, then dialog.js fires this
    // event after the user accepts. Show the promo right after.
    document.addEventListener('calln:agegate-done', maybeShow);

    // Case 2: returning visitor — dialog.js returns early and never mounts the
    // gate, so no event fires. Detect "no gate on the page" shortly after load
    // and show then (no-ops anyway if the promo was already seen).
    function checkNoGate() {
        if (!document.getElementById('age-gate')) maybeShow();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(checkNoGate, 200); // let dialog.js init() run first
        });
    } else {
        setTimeout(checkNoGate, 200);
    }
})();
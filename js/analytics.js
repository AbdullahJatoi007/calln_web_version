// analytics.js — Firebase Analytics for Calln
// Loaded ONLY after the user accepts cookies (via cookie.js).
// This file is never included in the HTML directly.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js';

// ── Safety guard ──────────────────────────────────────────
// cookie.js only loads this module when consent = 'accepted',
// but we double-check here to be sure.
const CONSENT_KEY = 'calln_cookie_consent';
if (localStorage.getItem(CONSENT_KEY) !== 'accepted') {
    window.trackEvent  = () => {};
    window._eventQueue = null;
} else {

    // ── Firebase config ───────────────────────────────────
    const firebaseConfig = {
        apiKey:            'AIzaSyC8kjMdgwxWXjyR2ekMplguLfK2Mhmsax0',
        authDomain:        'calln-e9f85.firebaseapp.com',
        projectId:         'calln-e9f85',
        storageBucket:     'calln-e9f85.firebasestorage.app',
        messagingSenderId: '977999428889',
        appId:             '1:977999428889:web:0b86eddbfccc662e0f5988',
        measurementId:     'G-BZLNZTPXSQ',
    };

    // ── Init ──────────────────────────────────────────────
    const app       = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);

    // ── Core tracker ──────────────────────────────────────
    const _track = (name, params = {}) => {
        try {
            logEvent(analytics, name, {
                ...params,
                app_version:  '2.0',
                app_platform: 'web',
            });
        } catch (_) {
            // Analytics errors must never affect app behaviour
        }
    };

    // ── Flush pre-consent queue ───────────────────────────
    // Events fired before this module loaded are buffered by
    // the inline stub in index.html. Drain them now.
    (window._eventQueue || []).forEach(({ name, params }) => _track(name, params));
    window._eventQueue = null;

    // ── Expose globally ───────────────────────────────────
    window.trackEvent = _track;

    // ── First page view ───────────────────────────────────
    _track('page_view', {
        page_title:    document.title,
        page_location: window.location.href,
    });
}
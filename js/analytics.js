// analytics.js — Firebase Analytics for Calln
// Loaded as <script type="module"> in index.html
// Uses the Firebase CDN so no npm/bundler is needed.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js';

// ── Firebase config ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyC8kjMdgwxWXjyR2ekMplguLfK2Mhmsax0',
  authDomain:        'calln-e9f85.firebaseapp.com',
  projectId:         'calln-e9f85',
  storageBucket:     'calln-e9f85.firebasestorage.app',
  messagingSenderId: '977999428889',
  appId:             '1:977999428889:web:0b86eddbfccc662e0f5988',
  measurementId:     'G-BZLNZTPXSQ',
};

// ── Init ───────────────────────────────────────────────────
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ── Core track function ────────────────────────────────────
// Wraps logEvent so analytics errors never crash the app.
const _track = (name, params = {}) => {
  try {
    logEvent(analytics, name, {
      ...params,
      app_version:  '2.0',
      app_platform: 'web',
    });
  } catch (_) {
    // silent — analytics must never affect UX
  }
};

// ── Flush queued events ────────────────────────────────────
// Events fired before this module loaded are buffered in
// window._eventQueue by the inline <script> in index.html.
// We drain that queue now and then replace the stub.
(window._eventQueue || []).forEach(({ name, params }) => _track(name, params));
window._eventQueue = null;

// Replace the no-op stub with the real Firebase tracker
window.trackEvent = _track;

// ── First page view ────────────────────────────────────────
_track('page_view', {
  page_title:    document.title,
  page_location: window.location.href,
});
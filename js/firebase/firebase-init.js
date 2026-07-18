// ═══════════════════════════════════════════════════════════
// FIREBASE INIT — Anonymous Auth + Firestore
//
// IMPORTANT: this file must be loaded with
//   <script type="module" src="js/firebase/firebase-init.js"></script>
// NOT a plain <script src="...">. Firebase v9+ requires ES module
// import syntax, which classic scripts can't use.
//
// Module scripts execute asynchronously relative to your other
// classic scripts (regardless of tag order in the HTML) — so
// nothing else in the app should assume this file has finished
// by the time it runs. Instead:
//   - Anything needing the signed-in user's UID should do:
//       if (window.CALLN_UID) { ...use it... }
//       window.addEventListener('calln-auth-ready', (e) => { ...use e.detail.uid... });
//   - Or, in an async function: await window.firebaseReady;
// ═══════════════════════════════════════════════════════════

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore }
    from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Public web config — safe to expose; actual security comes from
// Firestore security rules + server-side token verification (Track 2),
// not from hiding this object.
const firebaseConfig = {
    apiKey:            "AIzaSyC8kjMdgwxWXjyR2ekMplguLfK2Mhmsax0",
    authDomain:        "calln-e9f85.firebaseapp.com",
    projectId:         "calln-e9f85",
    storageBucket:     "calln-e9f85.firebasestorage.app",
    messagingSenderId: "977999428889",
    appId:             "1:977999428889:web:0b86eddbfccc662e0f5988",
    measurementId:     "G-BZLNZTPXSQ"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Analytics can fail to init in some environments (ad blockers,
// unsupported browsers) — never let that break auth/Firestore.
analyticsIsSupported()
    .then((supported) => { if (supported) getAnalytics(app); })
    .catch(() => { /* analytics unsupported here — not fatal */ });

// Expose the app/auth/db instances for later Firestore work
// (friend requests, etc.) without re-initializing Firebase elsewhere.
window.firebaseApp  = app;
window.firebaseAuth = auth;
window.firebaseDb   = db;

// ── Anonymous sign-in ─────────────────────────────────────────
// window.firebaseReady resolves with the UID once signed in.
// Firebase persists this session on the device automatically —
// the SAME uid comes back on every future visit, no code needed
// to manage that ourselves. This uid is also what will later be
// passed to linkWithCredential() when real Google sign-in is added,
// so friends/history carry over instead of resetting.
window.firebaseReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.CALLN_UID = user.uid;
            console.log('[Firebase] Signed in anonymously. UID:', user.uid);

            window.dispatchEvent(new CustomEvent('calln-auth-ready', {
                detail: { uid: user.uid }
            }));

            resolve(user.uid);
        }
    });

    signInAnonymously(auth).catch((err) => {
        console.error('[Firebase] Anonymous sign-in failed:', err);
    });
});
// ═══════════════════════════════════════════════════════════
// SHARED DOM ELEMENT CACHE
//
// Built at top level (not inside DOMContentLoaded) because these
// <script> tags load at the very bottom of <body>, after all the
// markup below already exists — the DOM is already there by the
// time this file runs. Any file after this one can read/write
// `elements.*` directly.
// ═══════════════════════════════════════════════════════════
const elements = {
    status:             document.getElementById('status-display'),
    startBtn:           document.getElementById('start-btn'),
    muteBtn:            document.getElementById('mute-btn'),
    autoCall:           document.getElementById('auto-call'),
    userCount:          document.getElementById('user-count'),
    countryFilter:      document.getElementById('country-filter'),
    currentFlag:        document.getElementById('current-flag'),
    currentCountryName: document.getElementById('current-country-name'),
};

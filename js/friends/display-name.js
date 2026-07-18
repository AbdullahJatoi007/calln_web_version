// ═══════════════════════════════════════════════════════════
// DISPLAY NAME — persistent, random, no account needed
// Plain classic script, no Firebase dependency — generates a
// name like "SilverFalcon482" on first visit and reuses it from
// localStorage on every future visit. Available synchronously
// as window.CALLN_DISPLAY_NAME as soon as this script runs.
// ═══════════════════════════════════════════════════════════
(function () {
    const STORAGE_KEY = 'calln_display_name';

    const ADJECTIVES = [
        'Silver', 'Crimson', 'Golden', 'Midnight', 'Electric', 'Silent',
        'Rapid', 'Frozen', 'Wild', 'Cosmic', 'Velvet', 'Neon',
    ];
    const NOUNS = [
        'Falcon', 'Tiger', 'Comet', 'Wolf', 'Raven', 'Phoenix',
        'Panther', 'Otter', 'Hawk', 'Fox', 'Lynx', 'Eagle',
    ];

    function generateName() {
        const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        const num  = Math.floor(Math.random() * 900) + 100; // 100-999
        return `${adj}${noun}${num}`;
    }

    let name;
    try {
        name = localStorage.getItem(STORAGE_KEY);
        if (!name) {
            name = generateName();
            localStorage.setItem(STORAGE_KEY, name);
        }
    } catch (e) {
        // localStorage unavailable (private browsing edge cases, etc.)
        // — fall back to a per-session name rather than crashing.
        name = generateName();
    }

    window.CALLN_DISPLAY_NAME = name;
})();
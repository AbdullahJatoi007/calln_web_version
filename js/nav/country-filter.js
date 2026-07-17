// ═══════════════════════════════════════════════════════════
// COUNTRY FILTER
// Updates the flag + label in the navbar pill whenever the user
// picks a new country/region. Depends on `elements`
// (shared/dom-elements.js — must load before this file).
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // FIX: Force filter to "Worldwide" on every page load
    // (HTML has Pakistan hardcoded — this overrides it)
    if (elements.countryFilter) {
        elements.countryFilter.value          = 'all';
        elements.currentFlag.src              = 'https://flagcdn.com/w20/un.png';
        elements.currentFlag.alt              = 'all';
        elements.currentCountryName.innerText = 'Worldwide';
    }

    if (elements.countryFilter) {
        elements.countryFilter.addEventListener('change', () => {
            const sel   = elements.countryFilter;
            const value = sel.value;

            if (value === 'all') {
                elements.currentFlag.src              = 'https://flagcdn.com/w20/un.png';
                elements.currentFlag.alt              = 'all';
                elements.currentCountryName.innerText = 'Worldwide';
            } else {
                elements.currentFlag.src              = `https://flagcdn.com/w20/${value}.png`;
                elements.currentFlag.alt              = value;
                // Strip the flag emoji + space: "🇵🇰 Pakistan" → "Pakistan"
                elements.currentCountryName.innerText = sel.options[sel.selectedIndex].text
                    .replace(/^\S+\s/, '')
                    .trim();
            }
        });
    }
});

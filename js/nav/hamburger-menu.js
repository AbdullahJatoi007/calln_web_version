// ═══════════════════════════════════════════════════════════
// MOBILE HAMBURGER MENU
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const navHamburger  = document.getElementById('nav-hamburger');
    const navMobileMenu = document.getElementById('nav-mobile-menu');

    if (navHamburger && navMobileMenu) {
        navHamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMobileMenu.classList.toggle('open');
            navHamburger.setAttribute('aria-expanded', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!navMobileMenu.contains(e.target) && !navHamburger.contains(e.target)) {
                navMobileMenu.classList.remove('open');
                navHamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }
});

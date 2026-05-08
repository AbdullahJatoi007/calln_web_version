/* =============================================
   AGE GATE — 18+ & Terms confirmation dialog
   Shows on first visit; result persisted in
   localStorage so it only appears once.
   Bump STORAGE_KEY version when ToS changes.
   ============================================= */
const AGE_GATE = {

    STORAGE_KEY: 'calln_accepted_v1',

    init() {
        // Already accepted — don't show
        if (localStorage.getItem(this.STORAGE_KEY) === 'true') return;
        this._show();
    },

    _show() {
        const gate = document.getElementById('age-gate');
        if (!gate) return;

        // Lock page scroll while dialog is open
        document.body.style.overflow = 'hidden';

        // Reveal with CSS transition
        requestAnimationFrame(() =>
            requestAnimationFrame(() => gate.classList.add('active'))
        );

        this._wireCheckboxes();
    },

    _wireCheckboxes() {
        const items   = document.querySelectorAll('.age-check-item');
        const btn     = document.getElementById('age-gate-btn');
        const checks  = document.querySelectorAll('.age-chk');

        // Toggle checked state + style on each item
        items.forEach(item => {
            item.addEventListener('click', () => {
                const chk = item.querySelector('.age-chk');
                if (!chk) return;

                chk.checked = !chk.checked;
                item.classList.toggle('checked', chk.checked);

                // Enable button only when ALL boxes are ticked
                const allDone = [...checks].every(c => c.checked);
                if (btn) {
                    btn.disabled = !allDone;
                    btn.classList.toggle('ready', allDone);
                }
            });
        });

        // Accept
        btn?.addEventListener('click', () => {
            if (!btn.classList.contains('ready')) return;
            localStorage.setItem(this.STORAGE_KEY, 'true');
            this._close();
        });
    },

    _close() {
        const gate = document.getElementById('age-gate');
        if (!gate) return;

        gate.classList.remove('active');
        document.body.style.overflow = '';
    },

    // Called externally to re-show (e.g. after ToS update)
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        this._show();
    }
};

document.addEventListener('DOMContentLoaded', () => AGE_GATE.init());
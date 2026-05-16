/* =============================================
   AGE GATE — 18+ confirmation dialog
   ============================================= */
const AGE_GATE = {
    STORAGE_KEY: 'calln_accepted_v1',

    init() {
        if (localStorage.getItem(this.STORAGE_KEY) === 'true') return;
        this._mount();
    },

    _mount() {
        const tpl = document.getElementById('age-gate-template');
        if (!tpl) return console.warn('AGE_GATE: <template> not found in index.html');
        document.body.prepend(tpl.content.cloneNode(true));
        this._show();
    },

    _show() {
        const gate = document.getElementById('age-gate');
        const btn  = document.getElementById('age-gate-btn');
        if (!gate || !btn) return;

        // Lock scroll on both body and html
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        // Trigger CSS enter transition
        requestAnimationFrame(() =>
            requestAnimationFrame(() => gate.classList.add('active'))
        );

        // { once: true } auto-removes listener — no dataset.bound hack needed
        btn.addEventListener('click', () => this.accept(), { once: true });
    },

    accept() {
        localStorage.setItem(this.STORAGE_KEY, 'true');
        this._close();
    },

    _close() {
        const gate = document.getElementById('age-gate');
        if (!gate) return;

        gate.classList.remove('active');

        // Wait for CSS transition before cleanup
        setTimeout(() => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            gate.remove();
        }, 350);
    },

    // Call from console to re-test: AGE_GATE.reset()
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        this._mount();
    }
};

document.addEventListener('DOMContentLoaded', () => AGE_GATE.init());
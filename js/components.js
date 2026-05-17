/* =============================================
   COMPONENTS LOADER
   Fetches external HTML snippets and injects
   them into their placeholder elements.

   Called by script.js on DOMContentLoaded:
       await loadComponents();
       CHAT_MANAGER.init();  ← after injection

   File must be loaded BEFORE script.js in
   index.html so loadComponents() is defined
   when script.js calls it.
   ============================================= */

async function loadComponents() {

    // ── Chat + Play panel ──────────────────────
    // Lives at: components/chat-panel.html
    // Injected into: <div id="chat-panel-container">
    const chatContainer = document.getElementById('chat-panel-container');

    if (chatContainer) {
        try {
            const response = await fetch('components/chat-panel.html');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} — could not load components/chat-panel.html`);
            }

            const html = await response.text();
            chatContainer.innerHTML = html;

        } catch (err) {
            console.error('components.js: failed to load chat panel —', err.message);

            // Degrade gracefully — show a minimal placeholder so the
            // page doesn't appear completely broken
            chatContainer.innerHTML = `
                <div class="chat-container" style="display:flex;align-items:center;
                     justify-content:center;color:var(--text-3);font-size:0.85rem;padding:20px;">
                    Chat unavailable — please refresh the page.
                </div>`;
        }
    }

    // ── Add more components here as needed ─────
    // Example:
    // const sidebar = document.getElementById('sidebar-container');
    // if (sidebar) { ... }
}
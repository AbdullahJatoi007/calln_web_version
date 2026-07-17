// ═══════════════════════════════════════════════════════════
// CHAT — DOM EVENTS
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const input     = document.getElementById('msg-input');
    const sendBtn   = document.getElementById('send-btn');
    const cameraBtn = document.getElementById('camera-btn');

    sendBtn?.addEventListener('click', () => CHAT_MANAGER.sendMessage());

    cameraBtn?.addEventListener('click', () => {
        if (cameraBtn.disabled) return;
        CHAT_MANAGER.openGallery();
    });

    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            CHAT_MANAGER.sendMessage();
        }
    });

    // Wire up input tracking for keystroke notifications
    input?.addEventListener('input', () => {
        CHAT_MANAGER.notifyTyping();
    });

    // Hidden file input — created once, reused every time
    const picker    = document.createElement('input');
    picker.type     = 'file';
    picker.accept   = 'image/*';
    picker.id       = 'image-picker';
    picker.style.display = 'none';
    document.body.appendChild(picker);

    picker.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) CHAT_MANAGER.handleImageSelected(file);
        picker.value = '';
    });
});

/* =============================================
   GAME_MANAGER — in-call mini-games
   Relays moves through the existing chat_message
   socket event (server needs no changes).
   ============================================= */

const GAME_MANAGER = {

    // ── Would You Rather questions ──────────────
    wyrQuestions: [
        ['Fight 100 duck-sized horses 🦆', 'Fight 1 horse-sized duck 🦕'],
        ['Always have to whisper 🤫', 'Always have to shout 📢'],
        ['Have WiFi everywhere but no AC ❄️', 'Have AC everywhere but no WiFi 📶'],
        ['Fly at walking speed 🦅', 'Teleport only 10 feet at a time ✨'],
        ['Eat pizza for every single meal 🍕', 'Never eat pizza again 🚫'],
        ['Always be 10 minutes late ⏰', 'Always be 3 hours early 😅'],
        ['Have a pause button on life ⏸️', 'Have a rewind button on life ⏪'],
        ['Lose all your money 💸', 'Lose all your photos forever 📸'],
        ['Know exactly when you\'ll die ☠️', 'Know exactly how you\'ll die 🔮'],
        ['Speak every language fluently 🌍', 'Play every instrument perfectly 🎸'],
        ['Be famous but hated 😤', 'Be unknown but deeply loved ❤️'],
        ['Be invisible whenever you want 👻', 'Be able to fly whenever you want 🚀'],
        ['Live 200 years in the past 🕰️', 'Live 200 years in the future 🤖'],
        ['Never use social media again 📵', 'Never watch any TV or films again 📺'],
        ['Have to sing everything you say 🎤', 'Have to dance everywhere you go 💃'],
        ['Read minds but you can\'t turn it off 🧠', 'See the future but only bad events 😱'],
        ['Be allergic to your phone 📵', 'Be allergic to the internet 🌐'],
        ['Have a rewind for embarrassing moments 😳', 'Have a mute button for annoying people 🔇'],
        ['Swim in a pool of Nutella 🍫', 'Swim in a pool of maple syrup 🍁'],
        ['Only be able to use stairs 🚶', 'Only be able to use elevators 🛗'],
        ['Have hiccups for the rest of your life 😖', 'Feel like you need to sneeze but can\'t 😤'],
        ['Win the lottery but lose all your friends 💰', 'Keep all your friends but stay broke ❤️'],
        ['Always feel slightly too cold 🥶', 'Always feel slightly too hot 🥵'],
        ['Have the power of super speed ⚡', 'Have the power of super strength 💪'],
        ['Only eat sweet food for life 🍭', 'Only eat savoury food for life 🧂'],
    ],

    // ── Ice Breaker questions ───────────────────
    iceBreakers: [
        'What\'s the most useless talent you have? 🎭',
        'If you could only eat one food forever, what would it be? 🍽️',
        'What\'s the weirdest dream you can remember? 🌙',
        'If animals could talk, which would be the rudest? 🐻',
        'What\'s a skill you wish you had but never learned? 🎯',
        'What\'s the funniest thing that\'s ever happened to you? 😂',
        'If you could time travel, where would you go first? ⏰',
        'What\'s your most controversial hot take? 🌶️',
        'What\'s the strangest food combination you actually enjoy? 🤔',
        'If you had a theme song that played when you walked in, what would it be? 🎵',
        'What\'s a job you know you\'d be absolutely terrible at? 😅',
        'What\'s the most embarrassing thing in your search history? 🔍',
        'If you could have dinner with anyone alive or dead, who would you pick? 🍴',
        'What\'s the most irrational fear you have? 😨',
        'If you could instantly become an expert in one thing, what would it be? 🎓',
        'What\'s a rule your family had growing up that you thought was weird? 🏠',
        'What\'s the last thing that made you genuinely laugh out loud? 😂',
        'If your life was a movie, what genre would it be? 🎬',
        'What\'s something you believed as a child that turned out to be totally wrong? 🤦',
        'If you could only listen to one song for the rest of your life, what would it be? 🎵',
        'What\'s the most overrated thing in the world? 🙄',
        'What random skill do you wish was more impressive to others? 😏',
        'What\'s the worst advice someone ever gave you? 🤦',
        'If you could remove one thing from the world, what would it be? 🗑️',
        'What\'s the nicest thing a stranger has ever done for you? 🥹',
    ],

    // ── Game info for invite toasts ─────────────
    // Each game has a specific invite with its own icon, name, and subtitle.
    _GAME_INFO: {
        wyr: {
            icon:    '🤔',
            name:    'Would You Rather',
            sub:     'They\'ve already picked their side — what will you choose?',
            cardId:  'game-card-wyr',
        },
        rps: {
            icon:    '🪨',
            name:    'Rock Paper Scissors',
            sub:     'They\'ve locked in their move — play to reveal who wins!',
            cardId:  'game-card-rps',
        },
        icebreaker: {
            icon:    '💬',
            name:    'Ice Breaker',
            sub:     'They shared a conversation starter — open it up!',
            cardId:  'game-card-icebreaker',
        },
    },

    // ── State ───────────────────────────────────
    wyrMyChoice:            null,
    wyrPartnerChoice:       null,
    rpsMyChoice:            null,
    rpsPartnerChoice:       null,
    currentWyrIndex:        0,
    currentIcebreakerIndex: -1,
    _invitesSent:           new Set(),   // tracks per-game invites; cleared on deactivate

    // ════════════════════════════════════════════
    // CORE — socket relay & incoming routing
    // ════════════════════════════════════════════
    sendEvent(gameData) {
        if (typeof currentRoomId === 'undefined' || !currentRoomId) return;
        socket.emit('chat_message', {
            roomId: currentRoomId,
            sender: socket.id,
            gameData,
        });
    },

    handleIncoming(gameData) {
        switch (gameData.type) {
            // ── Notification events ─────────────
            case 'play_tab_open': this._onPartnerOpenedPlay();         break;
            case 'play_invite':   this._onPlayInvite(gameData);        break;

            // ── Game events ─────────────────────
            case 'wyr_pick':      this._onPartnerWyrPick(gameData);    break;
            case 'wyr_sync':      this._onWyrSync(gameData);           break;
            case 'rps_pick':      this._onPartnerRpsPick(gameData);    break;
            case 'emoji_burst':   this.showEmojiBurst(gameData.emoji, true); break;
            case 'icebreaker':    this._showIcebreaker(gameData.index, false); break;
        }
    },

    // ════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════

    // Called when a call connects
    activate() {
        this.wyrMyChoice      = null;
        this.wyrPartnerChoice = null;
        this.rpsMyChoice      = null;
        this.rpsPartnerChoice = null;
        this._invitesSent.clear();
        this.currentWyrIndex  = Math.floor(Math.random() * this.wyrQuestions.length);

        this.renderWyr();
        this.renderRps();
        this._showIcebreaker(
            Math.floor(Math.random() * this.iceBreakers.length), false
        );

        // Sync starting question with partner
        this.sendEvent({ type: 'wyr_sync', questionIndex: this.currentWyrIndex });

        // Unlock the panel
        document.getElementById('game-locked')?.classList.add('hidden');
    },

    // Called when call ends
    deactivate() {
        this.wyrMyChoice      = null;
        this.wyrPartnerChoice = null;
        this.rpsMyChoice      = null;
        this.rpsPartnerChoice = null;
        this._invitesSent.clear();

        this.renderWyr();
        this.renderRps();

        // Lock the panel & switch back to chat tab
        document.getElementById('game-locked')?.classList.remove('hidden');
        switchTab('chat');
    },

    // ════════════════════════════════════════════
    // INVITE SYSTEM
    // Each game sends its own specific invite the
    // first time a user interacts with it per call.
    // ════════════════════════════════════════════

    // ── Invite for a specific game (called inside each game's pick/action) ──
    _sendGameInvite(game) {
        if (this._invitesSent.has(game)) return;   // one invite per game per call
        if (!currentRoomId) return;
        this._invitesSent.add(game);
        this.sendEvent({ type: 'play_invite', game });
        if (typeof trackEvent === 'function') trackEvent('game_invite_sent', { game });
    },

    // ── Partner opened the Play tab (soft informational notice) ──
    _onPartnerOpenedPlay() {
        if (typeof TOAST === 'undefined') return;
        TOAST.show('Partner is in the Play zone 🎮', {
            type:     'info',
            icon:     '🎮',
            sub:      'Switch to Play to join them!',
            duration: 5000,   // auto-dismisses — no action required
            actions:  [{
                label:   'Join →',
                primary: true,
                dismiss: true,
                onClick: () => switchTab('play'),
            }],
        });
    },

    // ── Partner interacted with a specific game — show rich invite ──
    _onPlayInvite(data) {
        if (typeof TOAST === 'undefined') return;

        const info = this._GAME_INFO[data.game] || {
            icon:   '🎮',
            name:   'a game',
            sub:    'Check the Play tab!',
            cardId: null,
        };

        TOAST.show(`${info.icon} Partner wants to play ${info.name}!`, {
            id:       `toast-invite-${data.game || 'game'}`,
            type:     'info',
            icon:     info.icon,
            sub:      info.sub,
            duration: 0,   // persistent until user responds
            actions:  [
                {
                    label:   'Not now',
                    dismiss: true,
                    onClick: () => {},
                },
                {
                    label:   `Play ${info.name.split(' ')[0]} →`,
                    primary: true,
                    dismiss: true,
                    onClick: () => {
                        // Switch to Play tab then scroll directly to that game's card
                        switchTab('play');
                        if (info.cardId) {
                            setTimeout(() => {
                                document.getElementById(info.cardId)
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 250);
                        }
                    },
                },
            ],
        });
    },

    // ════════════════════════════════════════════
    // WOULD YOU RATHER
    // ════════════════════════════════════════════
    pickWyr(choice) {
        if (this.wyrMyChoice) return;

        // Send a specific WYR invite on first pick (partner sees exactly which game)
        this._sendGameInvite('wyr');

        this.wyrMyChoice = choice;
        this.sendEvent({ type: 'wyr_pick', choice, questionIndex: this.currentWyrIndex });
        this.renderWyr();
        if (this.wyrPartnerChoice !== null) this.renderWyr(true);

        // Analytics
        if (typeof trackEvent === 'function') trackEvent('game_wyr_played');
    },

    _onPartnerWyrPick(data) {
        this.wyrPartnerChoice = data.choice;
        this.renderWyr();
        if (this.wyrMyChoice !== null) this.renderWyr(true);
    },

    _onWyrSync(data) {
        // Partner started a new question — follow along if we haven't picked yet
        this.currentWyrIndex  = data.questionIndex;
        this.wyrMyChoice      = null;
        this.wyrPartnerChoice = null;
        this.renderWyr();
    },

    nextWyrQuestion() {
        this.currentWyrIndex  = (this.currentWyrIndex + 1) % this.wyrQuestions.length;
        this.wyrMyChoice      = null;
        this.wyrPartnerChoice = null;
        this.sendEvent({ type: 'wyr_sync', questionIndex: this.currentWyrIndex });
        this.renderWyr();
    },

    renderWyr(isReveal = false) {
        const el = document.getElementById('wyr-content');
        if (!el) return;

        const q      = this.wyrQuestions[this.currentWyrIndex];
        const myPick = this.wyrMyChoice;
        const pPick  = this.wyrPartnerChoice;
        const bothIn = myPick !== null && pPick !== null;

        const clsA = ['wyr-btn',
            myPick === 'A' ? 'selected' : '',
            bothIn && pPick === 'A' ? 'partner-picked' : '',
        ].filter(Boolean).join(' ');
        const clsB = ['wyr-btn',
            myPick === 'B' ? 'selected' : '',
            bothIn && pPick === 'B' ? 'partner-picked' : '',
        ].filter(Boolean).join(' ');

        let status = '';
        if (!myPick) {
            status = `<p class="wyr-status">Tap your answer 👆</p>`;
        } else if (!pPick) {
            status = `<p class="wyr-status waiting">Waiting for partner… ⏳</p>`;
        } else {
            const same = myPick === pPick;
            status = `
                <p class="wyr-status reveal">${same ? '🎉 Same choice — you agree!' : '⚔️ You disagree — discuss!'}</p>
                <button class="wyr-next-btn" onclick="GAME_MANAGER.nextWyrQuestion()">Next Question →</button>
            `;
        }

        el.innerHTML = `
            <p class="wyr-question">Would you rather…</p>
            <div class="wyr-options">
                <button class="${clsA}" onclick="GAME_MANAGER.pickWyr('A')" ${myPick ? 'disabled' : ''}>
                    ${q[0]}
                </button>
                <button class="${clsB}" onclick="GAME_MANAGER.pickWyr('B')" ${myPick ? 'disabled' : ''}>
                    ${q[1]}
                </button>
            </div>
            ${status}
        `;
    },

    // ════════════════════════════════════════════
    // ROCK PAPER SCISSORS
    // ════════════════════════════════════════════
    pickRps(choice) {
        if (this.rpsMyChoice) return;

        // Send specific RPS invite on first pick
        this._sendGameInvite('rps');

        this.rpsMyChoice = choice;
        this.sendEvent({ type: 'rps_pick', choice });
        this.renderRps();
        if (this.rpsPartnerChoice !== null) this._revealRps();

        // Analytics
        if (typeof trackEvent === 'function') trackEvent('game_rps_played');
    },

    _onPartnerRpsPick(data) {
        this.rpsPartnerChoice = data.choice;
        this.renderRps();
        if (this.rpsMyChoice !== null) this._revealRps();
    },

    _revealRps() { this.renderRps(true); },

    _rpsResult() {
        const m = this.rpsMyChoice, p = this.rpsPartnerChoice;
        if (m === p) return 'tie';
        if (
            (m === 'rock' && p === 'scissors') ||
            (m === 'scissors' && p === 'paper') ||
            (m === 'paper' && p === 'rock')
        ) return 'win';
        return 'lose';
    },

    _rpsEmoji(c) { return { rock: '🪨', paper: '📄', scissors: '✂️' }[c] || '❓'; },

    renderRps() {
        const el = document.getElementById('rps-content');
        if (!el) return;

        const my = this.rpsMyChoice;
        const p  = this.rpsPartnerChoice;

        if (!my) {
            el.innerHTML = `
                <p class="rps-label">Pick your move!</p>
                <div class="rps-options">
                    <button class="rps-btn" onclick="GAME_MANAGER.pickRps('rock')">🪨</button>
                    <button class="rps-btn" onclick="GAME_MANAGER.pickRps('paper')">📄</button>
                    <button class="rps-btn" onclick="GAME_MANAGER.pickRps('scissors')">✂️</button>
                </div>`;
        } else if (!p) {
            el.innerHTML = `
                <p class="rps-label">You picked ${this._rpsEmoji(my)} — waiting for partner… ⏳</p>
                <div class="rps-options">
                    <button class="rps-btn selected">${this._rpsEmoji(my)}</button>
                </div>`;
        } else {
            const result = this._rpsResult();
            const msg = { win: '🏆 You win!', lose: '😅 You lose!', tie: '🤝 It\'s a tie!' }[result];
            el.innerHTML = `
                <div class="rps-reveal">
                    <div class="rps-reveal-item">
                        <span class="rps-reveal-emoji">${this._rpsEmoji(my)}</span>
                        <span class="rps-reveal-label">You</span>
                    </div>
                    <span class="rps-reveal-vs">VS</span>
                    <div class="rps-reveal-item">
                        <span class="rps-reveal-emoji">${this._rpsEmoji(p)}</span>
                        <span class="rps-reveal-label">Partner</span>
                    </div>
                </div>
                <p class="rps-result">${msg}</p>
                <button class="wyr-next-btn" onclick="GAME_MANAGER.resetRps()">Play Again 🔄</button>`;
        }
    },

    resetRps() {
        this.rpsMyChoice      = null;
        this.rpsPartnerChoice = null;
        this.renderRps();
    },

    // ════════════════════════════════════════════
    // EMOJI BURST
    // ════════════════════════════════════════════
    sendEmoji(emoji) {
        this.sendEvent({ type: 'emoji_burst', emoji });
        this.showEmojiBurst(emoji, false);
        if (typeof trackEvent === 'function') trackEvent('emoji_reaction_sent', { emoji });
    },

    showEmojiBurst(emoji, incoming = false) {
        const overlay = document.getElementById('emoji-burst-overlay');
        if (!overlay) return;

        for (let i = 0; i < 14; i++) {
            const span = document.createElement('span');
            span.className           = 'flying-emoji' + (incoming ? ' incoming' : '');
            span.innerText           = emoji;
            span.style.left          = (5 + Math.random() * 90) + '%';
            span.style.top           = (incoming ? 55 : 60 + Math.random() * 20) + '%';
            span.style.fontSize      = (1.2 + Math.random() * 1.4) + 'rem';
            span.style.animationDelay    = (Math.random() * 0.5) + 's';
            span.style.animationDuration = (1.8 + Math.random() * 0.8) + 's';
            overlay.appendChild(span);
            setTimeout(() => span.remove(), 3000);
        }
    },

    // ════════════════════════════════════════════
    // ICE BREAKER
    // ════════════════════════════════════════════
    newIceBreaker() {
        // Send ice breaker invite the first time this is used
        this._sendGameInvite('icebreaker');

        let idx;
        do { idx = Math.floor(Math.random() * this.iceBreakers.length); }
        while (idx === this.currentIcebreakerIndex && this.iceBreakers.length > 1);

        this.currentIcebreakerIndex = idx;
        this._showIcebreaker(idx, true);   // true = relay to partner

        if (typeof trackEvent === 'function') trackEvent('icebreaker_used');
    },

    _showIcebreaker(idx, sendToPartner = false) {
        const el = document.getElementById('icebreaker-text');
        if (!el) return;

        if (sendToPartner) {
            this.sendEvent({ type: 'icebreaker', index: idx });
        }

        el.style.opacity = '0';
        setTimeout(() => {
            el.innerText     = this.iceBreakers[idx] || this.iceBreakers[0];
            el.style.opacity = '1';
        }, 180);
    },
};

// ════════════════════════════════════════════════
// TAB SWITCHER (global so other files can call it)
// ════════════════════════════════════════════════
function switchTab(tab) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.chat-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('active');
}

// ════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // ── Chat tab ────────────────────────────────
    document.getElementById('tab-chat')?.addEventListener('click', () => {
        switchTab('chat');
    });

    // ── Play tab ────────────────────────────────
    document.getElementById('tab-play')?.addEventListener('click', () => {
        if (typeof currentRoomId !== 'undefined' && currentRoomId) {
            // Send a soft "I'm in the Play zone" notice — NOT a game invite.
            // Game invites are sent individually when each game is first played.
            GAME_MANAGER.sendEvent({ type: 'play_tab_open' });
        }

        // Dismiss any game invite toasts when the user accepts by clicking the tab
        if (typeof TOAST !== 'undefined') {
            TOAST.hide('toast-invite-wyr');
            TOAST.hide('toast-invite-rps');
            TOAST.hide('toast-invite-icebreaker');
            TOAST.hide('toast-invite-game');
        }

        switchTab('play');

        // Lazy-init game cards when Play tab is opened for the first time
        GAME_MANAGER.renderWyr();
        GAME_MANAGER.renderRps();

        if (GAME_MANAGER.currentIcebreakerIndex === -1) {
            GAME_MANAGER._showIcebreaker(
                Math.floor(Math.random() * GAME_MANAGER.iceBreakers.length), false
            );
        }
    });

    // Initial render so cards aren't blank if user opens Play tab before connecting
    GAME_MANAGER.renderWyr();
    GAME_MANAGER.renderRps();
});
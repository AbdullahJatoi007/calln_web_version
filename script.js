// Placeholder for Signaling Server (Socket.io)
const socket = io('https://your-signaling-server.com'); 

// DOM Elements
const startBtn = document.getElementById('start-btn');
const muteBtn = document.getElementById('mute-btn');
const statusText = document.getElementById('status-display');
const waveBars = document.querySelectorAll('.wave-bar');
const autoCallToggle = document.getElementById('auto-call');

// Country Filter Elements
const countrySelect = document.getElementById('country-filter');
const currentFlagImg = document.getElementById('current-flag');
const currentCountryName = document.getElementById('current-country-name');

let isCalling = false;
let isMuted = false;
let userStream = null;

// 1. Country & Flag Change Logic
countrySelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const countryCode = selectedOption.getAttribute('data-flag');
    const countryName = selectedOption.getAttribute('data-name');

    // Update UI Flag and Text
    currentFlagImg.src = countryCode === 'un' 
        ? "https://flagcdn.com/w20/un.png" 
        : `https://flagcdn.com/w20/${countryCode}.png`;
    
    currentCountryName.innerText = countryName;

    console.log(`Filtering for: ${countryName} (${countryCode})`);
    
    // Agar call chal rahi hai to hum filters update kar sakte hain
    if (isCalling) {
        console.log("Updating matching criteria mid-call...");
    }
});

// 2. Wave Animation Controller
function setWaveState(running) {
    waveBars.forEach(bar => {
        bar.style.animationPlayState = running ? 'running' : 'paused';
    });
}

// 3. Start/Stop Call Logic
startBtn.addEventListener('click', async () => {
    if (!isCalling) {
        await startCall();
    } else {
        stopCall();
    }
});

async function startCall() {
    statusText.innerText = "Searching for a stranger...";
    
    // UI Update: Green to Red (End Call Icon)
    startBtn.style.background = "#c62828"; 
    startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>`;
    
    isCalling = true;
    
    try {
        // Microphone access request
        userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setWaveState(true);
        
        // Simulating connection delay
        setTimeout(() => {
            if(isCalling) statusText.innerText = "Connected! Start talking.";
        }, 2000);

    } catch (err) {
        console.error("Mic Error:", err);
        alert("Microphone is required for calling!");
        stopCall();
    }
}

function stopCall() {
    isCalling = false;
    setWaveState(false);
    
    // Stop Microphone Stream
    if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
    }

    // UI Update: Back to Green
    startBtn.style.background = "#2e7d32"; 
    startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
    statusText.innerText = "Call ended.";

    // Auto-Call Logic: Agar toggle on ho to 2 seconds baad call khud shuru ho jaye
    if (autoCallToggle.checked) {
        statusText.innerText = "Auto-call: Searching in 2s...";
        setTimeout(() => {
            if (!isCalling && autoCallToggle.checked) startCall();
        }, 2000);
    }
}

// 4. Mute Toggle Logic
muteBtn.addEventListener('click', () => {
    if (!userStream) return;
    
    isMuted = !isMuted;
    userStream.getAudioTracks()[0].enabled = !isMuted; // Asli mute logic
    
    muteBtn.style.background = isMuted ? "#b71c1c" : "#222";
    document.getElementById('mute-label').innerText = isMuted ? "Unmute" : "Mute";
});
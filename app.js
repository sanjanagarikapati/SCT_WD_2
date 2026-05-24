// Stopwatch Controller Logic

// UI Elements
const elTimeMain = document.getElementById('time-main');
const elTimeSub = document.getElementById('time-sub');
const elBtnStartPause = document.getElementById('btn-start-pause');
const elBtnStartText = document.getElementById('btn-start-text');
const elBtnReset = document.getElementById('btn-reset');
const elBtnLap = document.getElementById('btn-lap');
const elLapsCount = document.getElementById('laps-count');
const elLapsWrapper = document.getElementById('laps-wrapper');
const elLapsEmpty = document.getElementById('laps-empty');
const elLapTable = document.getElementById('lap-table');
const elLapRows = document.getElementById('lap-rows');
const elLapsActions = document.getElementById('laps-actions');
const elBtnCopy = document.getElementById('btn-copy');
const elBtnExport = document.getElementById('btn-export');
const elBtnTheme = document.getElementById('btn-theme');
const elBtnSound = document.getElementById('btn-sound');
const elBtnShortcuts = document.getElementById('btn-shortcuts');
const elShortcutsPanel = document.getElementById('shortcuts-panel');
const elBtnCloseShortcuts = document.getElementById('btn-close-shortcuts');
const elToastContainer = document.getElementById('toast-container');
const elRingCircle = document.querySelector('.progress-ring__circle');

// SVG Icons (dynamic switching)
const elIconPlay = document.getElementById('icon-play');
const elIconPause = document.getElementById('icon-pause');
const elIconThemeDark = document.getElementById('icon-theme-dark');
const elIconThemeLight = document.getElementById('icon-theme-light');
const elIconSoundOn = document.getElementById('icon-sound-on');
const elIconSoundOff = document.getElementById('icon-sound-off');

// Constants
const RING_CIRCUMFERENCE = 754; // 2 * pi * 120 (rounded)

// State Variables
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;
let laps = [];
let theme = 'dark'; // 'dark' or 'light'
let isMuted = false;
let animationFrameId = null;

// Audio Context (Initialized lazily on first user interaction)
let audioCtx = null;

// Initialize Sound Synthesizer
function playClickSound(frequency = 1200, duration = 0.04) {
    if (isMuted) return;
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        // High-pass filter to make it sound like a mechanical snap
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn('Audio synthesis failed:', e);
    }
}

// Show Toast Alert Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>${message}</span>
    `;
    elToastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2500);
}

// Time Formatting Helper
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hundredths = Math.floor((ms % 1000) / 10);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num) => String(num).padStart(2, '0');
    
    return {
        main: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
        sub: `.${pad(hundredths)}`
    };
}

// Update DOM Time Display
function updateDisplay(ms) {
    const formatted = formatTime(ms);
    elTimeMain.textContent = formatted.main;
    elTimeSub.textContent = formatted.sub;
    
    // Update SVG Circular Ring Progress (cycle every 60 seconds)
    const progress = (ms % 60000) / 60000;
    const offset = RING_CIRCUMFERENCE - (progress * RING_CIRCUMFERENCE);
    elRingCircle.style.strokeDashoffset = offset;
}

// Animation tick loop
function tick() {
    if (!isRunning) return;
    
    const currentElapsed = Date.now() - startTime;
    updateDisplay(currentElapsed);
    
    animationFrameId = requestAnimationFrame(tick);
}

// Stopwatch actions
function startTimer() {
    if (isRunning) return;
    
    playClickSound(1000);
    isRunning = true;
    startTime = Date.now() - elapsedTime;
    document.body.classList.add('timer-running');
    
    // Toggle play/pause buttons
    elIconPlay.style.display = 'none';
    elIconPause.style.display = 'block';
    elBtnStartPause.className = 'btn btn-pause';
    elBtnStartText.textContent = 'Pause';
    
    // Enable/Disable controls
    elBtnReset.disabled = false;
    elBtnLap.disabled = false;
    
    saveState();
    tick();
}

function pauseTimer() {
    if (!isRunning) return;
    
    playClickSound(800);
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    elapsedTime = Date.now() - startTime;
    document.body.classList.remove('timer-running');
    
    // Toggle play/pause buttons
    elIconPlay.style.display = 'block';
    elIconPause.style.display = 'none';
    elBtnStartPause.className = 'btn btn-start';
    elBtnStartText.textContent = 'Resume';
    
    elBtnLap.disabled = true;
    
    saveState();
}

function resetTimer() {
    playClickSound(600, 0.08);
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    
    startTime = 0;
    elapsedTime = 0;
    laps = [];
    document.body.classList.remove('timer-running');
    
    // Revert Buttons
    elIconPlay.style.display = 'block';
    elIconPause.style.display = 'none';
    elBtnStartPause.className = 'btn btn-start';
    elBtnStartText.textContent = 'Start';
    
    elBtnReset.disabled = true;
    elBtnLap.disabled = true;
    
    updateDisplay(0);
    renderLaps();
    saveState();
}

// Lap Management
function addLap() {
    if (!isRunning) return;
    
    playClickSound(1200);
    const currentElapsed = Date.now() - startTime;
    
    let lapDuration = 0;
    if (laps.length === 0) {
        lapDuration = currentElapsed;
    } else {
        const lastLapSplit = laps[0].splitTime; // Laps are sorted descending (latest first)
        lapDuration = currentElapsed - lastLapSplit;
    }
    
    // Insert new lap at the front of the list
    laps.unshift({
        id: Date.now(), // Unique ID
        lapNumber: laps.length + 1,
        splitTime: currentElapsed,
        duration: lapDuration
    });
    
    renderLaps();
    saveState();
    
    // Visual scroll to top of lap list
    elLapsWrapper.scrollTop = 0;
}

// Render Laps Table
function renderLaps() {
    elLapsCount.textContent = `${laps.length} Lap${laps.length === 1 ? '' : 's'}`;
    
    if (laps.length === 0) {
        elLapsEmpty.style.display = 'flex';
        elLapTable.style.display = 'none';
        elLapsActions.style.opacity = '0.5';
        elLapsActions.style.pointerEvents = 'none';
        return;
    }
    
    elLapsEmpty.style.display = 'none';
    elLapTable.style.display = 'table';
    elLapsActions.style.opacity = '1';
    elLapsActions.style.pointerEvents = 'auto';
    
    // Find min and max durations for highlighting
    let minDur = Infinity;
    let maxDur = -Infinity;
    
    // We only highlight if there are at least 2 laps
    if (laps.length >= 2) {
        laps.forEach(lap => {
            if (lap.duration < minDur) minDur = lap.duration;
            if (lap.duration > maxDur) maxDur = lap.duration;
        });
    }
    
    elLapRows.innerHTML = '';
    
    laps.forEach(lap => {
        const row = document.createElement('tr');
        row.className = 'lap-row';
        
        let isFastest = laps.length >= 2 && lap.duration === minDur;
        let isSlowest = laps.length >= 2 && lap.duration === maxDur;
        
        if (isFastest) {
            row.classList.add('fastest');
        } else if (isSlowest) {
            row.classList.add('slowest');
        }
        
        const splitFormatted = formatTime(lap.splitTime);
        const durationFormatted = formatTime(lap.duration);
        
        row.innerHTML = `
            <td class="lap-num">Lap ${lap.lapNumber}</td>
            <td>${splitFormatted.main}${splitFormatted.sub}</td>
            <td class="lap-duration">
                ${durationFormatted.main}${durationFormatted.sub}
                ${isFastest ? '<span class="lap-badge">Best</span>' : ''}
                ${isSlowest ? '<span class="lap-badge">Worst</span>' : ''}
            </td>
        `;
        
        elLapRows.appendChild(row);
    });
}

// Export and Copy Functions
function exportToCSV() {
    if (laps.length === 0) return;
    
    playClickSound(1100);
    
    // Construct CSV content
    let csvContent = "Lap Number,Split Time (Total),Lap Duration\n";
    laps.slice().reverse().forEach(lap => {
        const split = formatTime(lap.splitTime);
        const duration = formatTime(lap.duration);
        csvContent += `${lap.lapNumber},"${split.main}${split.sub}","${duration.main}${duration.sub}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stopwatch-laps-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Laps exported as CSV");
}

function copyToClipboard() {
    if (laps.length === 0) return;
    
    playClickSound(1100);
    
    // Construct text representation
    let textContent = "Stopwatch Pro Laps Table\n";
    textContent += "--------------------------------------\n";
    textContent += "Lap\tSplit Time\tLap Duration\n";
    textContent += "--------------------------------------\n";
    
    laps.slice().reverse().forEach(lap => {
        const split = formatTime(lap.splitTime);
        const duration = formatTime(lap.duration);
        textContent += `Lap ${lap.lapNumber}\t${split.main}${split.sub}\t${duration.main}${duration.sub}\n`;
    });
    
    navigator.clipboard.writeText(textContent).then(() => {
        showToast("Laps copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Config Panel Controls
function toggleTheme() {
    playClickSound(1050);
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        elIconThemeDark.style.display = 'block';
        elIconThemeLight.style.display = 'none';
    } else {
        elIconThemeDark.style.display = 'none';
        elIconThemeLight.style.display = 'block';
    }
}

function toggleMute() {
    isMuted = !isMuted;
    applyMute();
    saveState();
    playClickSound(1200); // Click sound right away to give instant toggle confirmation if unmuted
}

function applyMute() {
    if (isMuted) {
        elIconSoundOn.style.display = 'none';
        elIconSoundOff.style.display = 'block';
        elBtnSound.title = "Unmute Sound Feedback (Click S)";
    } else {
        elIconSoundOn.style.display = 'block';
        elIconSoundOff.style.display = 'none';
        elBtnSound.title = "Mute Sound Feedback (Click S)";
    }
}

function toggleShortcuts() {
    playClickSound(950);
    elShortcutsPanel.classList.add('visible');
}

function closeShortcuts() {
    playClickSound(900);
    elShortcutsPanel.classList.remove('visible');
}

// LocalStorage Persistence
function saveState() {
    localStorage.setItem('stopwatch_theme', theme);
    localStorage.setItem('stopwatch_muted', isMuted ? 'true' : 'false');
    localStorage.setItem('stopwatch_isRunning', isRunning ? 'true' : 'false');
    localStorage.setItem('stopwatch_elapsedTime', String(elapsedTime));
    localStorage.setItem('stopwatch_startTime', String(startTime));
    localStorage.setItem('stopwatch_laps', JSON.stringify(laps));
}

function loadState() {
    // 1. Theme
    const savedTheme = localStorage.getItem('stopwatch_theme');
    if (savedTheme) {
        theme = savedTheme;
        applyTheme();
    } else {
        // Match system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
        applyTheme();
    }
    
    // 2. Sound Mute
    const savedMuted = localStorage.getItem('stopwatch_muted');
    if (savedMuted) {
        isMuted = savedMuted === 'true';
        applyMute();
    }
    
    // 3. Laps List
    const savedLaps = localStorage.getItem('stopwatch_laps');
    if (savedLaps) {
        laps = JSON.parse(savedLaps);
        renderLaps();
    }
    
    // 4. Timer State
    const savedIsRunning = localStorage.getItem('stopwatch_isRunning') === 'true';
    const savedStartTime = Number(localStorage.getItem('stopwatch_startTime')) || 0;
    const savedElapsedTime = Number(localStorage.getItem('stopwatch_elapsedTime')) || 0;
    
    if (savedIsRunning && savedStartTime > 0) {
        // If it was running when closed, resume and compensate for time passed
        isRunning = true;
        startTime = savedStartTime;
        document.body.classList.add('timer-running');
        
        // Update Buttons
        elIconPlay.style.display = 'none';
        elIconPause.style.display = 'block';
        elBtnStartPause.className = 'btn btn-pause';
        elBtnStartText.textContent = 'Pause';
        
        elBtnReset.disabled = false;
        elBtnLap.disabled = false;
        
        tick();
    } else {
        // Load paused/stopped state
        isRunning = false;
        elapsedTime = savedElapsedTime;
        
        if (elapsedTime > 0) {
            elBtnReset.disabled = false;
            // Setup "Resume" text since there's elapsed time
            elBtnStartText.textContent = 'Resume';
        }
        
        updateDisplay(elapsedTime);
    }
}

// Register Listeners
elBtnStartPause.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

elBtnReset.addEventListener('click', resetTimer);
elBtnLap.addEventListener('click', addLap);
elBtnExport.addEventListener('click', exportToCSV);
elBtnCopy.addEventListener('click', copyToClipboard);

elBtnTheme.addEventListener('click', toggleTheme);
elBtnSound.addEventListener('click', toggleMute);
elBtnShortcuts.addEventListener('click', toggleShortcuts);
elBtnCloseShortcuts.addEventListener('click', closeShortcuts);

// Close modal when clicking outside card content
elShortcutsPanel.addEventListener('click', (e) => {
    if (e.target === elShortcutsPanel) {
        closeShortcuts();
    }
});

// Keyboard Shortcuts Controller
window.addEventListener('keydown', (e) => {
    // Avoid interfering if user is focused inside a dialog or typing somewhere
    const active = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (active === 'input' || active === 'textarea') return;
    
    const key = e.key.toLowerCase();
    
    if (e.code === 'Space') {
        e.preventDefault(); // Stop window space scroll
        if (isRunning) {
            pauseTimer();
            showToast("Stopwatch Paused");
        } else {
            startTimer();
            showToast("Stopwatch Started");
        }
    } else if (key === 'l') {
        if (isRunning) {
            addLap();
            showToast(`Lap ${laps[0].lapNumber} Recorded`);
        }
    } else if (key === 'r') {
        if (elapsedTime > 0 || laps.length > 0) {
            resetTimer();
            showToast("Stopwatch Reset");
        }
    } else if (key === 't') {
        toggleTheme();
        showToast(`Theme switched to ${theme}`);
    } else if (key === 's') {
        toggleMute();
        showToast(isMuted ? "Sound Muted" : "Sound Enabled");
    } else if (key === 'k') {
        if (elShortcutsPanel.classList.contains('visible')) {
            closeShortcuts();
        } else {
            toggleShortcuts();
        }
    } else if (e.key === 'Escape') {
        if (elShortcutsPanel.classList.contains('visible')) {
            closeShortcuts();
        }
    }
});

// Setup App State on Page Load
window.addEventListener('DOMContentLoaded', loadState);

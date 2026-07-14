// MagnetEngine — Popup Controller

let cdInterval = null;

function fmt(ms) {
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function setStatus(state) {
    const badge = document.getElementById('badge');
    const dot   = document.getElementById('dot');
    const text  = document.getElementById('badgeText');
    badge.className = 'badge';
    dot.className   = 'dot';
    const map = {
        running: ['badge-running', 'Running',  true],
        paused:  ['badge-paused',  'Paused',   false],
        done:    ['badge-done',    'Complete', false],
        idle:    ['badge-idle',    'Idle',     false],
    };
    const [cls, label, pulse] = map[state] || map.idle;
    badge.classList.add(cls);
    text.textContent = label;
    if (pulse) dot.classList.add('dot-pulse');
}

function setButtons(state) {
    document.getElementById('btnStart').disabled = state !== 'paused';
    document.getElementById('btnPause').disabled = state !== 'running';
    document.getElementById('btnStop').disabled  = state === 'idle';
}

function render(d) {
    const {
        campaignQueue  = [],
        isExecuting    = false,
        isPaused       = false,
        dailySentCount = 0,
        dailyResetDate,
        currentTask    = null,
        nextAlarmTime  = null,
        minDelay       = 3,
        maxDelay       = 8,
        failedCount    = 0,
        originalTotal  = 0,
    } = d;

    const today    = new Date().toDateString();
    const todayCnt = dailyResetDate === today ? dailySentCount : 0;
    const left     = campaignQueue.length;
    const total    = originalTotal || (todayCnt + left);
    const sent     = Math.max(0, total - left);
    const pct      = total > 0 ? Math.round((sent / total) * 100) : 0;
    const hasCampaign = total > 0 || isExecuting;

    document.getElementById('empty').style.display = hasCampaign ? 'none' : 'block';
    document.getElementById('view').style.display  = hasCampaign ? 'block' : 'none';
    if (!hasCampaign) { setStatus('idle'); setButtons('idle'); return; }

    document.getElementById('sentNum').textContent    = sent;
    document.getElementById('totalNum').textContent   = total;
    document.getElementById('bar').style.width        = pct + '%';
    document.getElementById('statToday').textContent  = todayCnt;
    document.getElementById('statLeft').textContent   = left;
    document.getElementById('statFailed').textContent = failedCount;
    document.getElementById('modeLabel').textContent  = `Delay: ${minDelay}–${maxDelay} min`;

    const leadEl = document.getElementById('activeLead');
    if (isExecuting && currentTask) {
        leadEl.classList.add('show');
        document.getElementById('activeHandle').textContent = '@' + currentTask.handle;
    } else {
        leadEl.classList.remove('show');
    }

    if (left === 0 && !isExecuting) {
        setStatus('done'); setButtons('idle');
        document.getElementById('countdown').textContent = 'Done ✓';
        clearInterval(cdInterval); return;
    }
    if (isPaused) {
        setStatus('paused'); setButtons('paused');
        document.getElementById('countdown').textContent = 'Paused';
        clearInterval(cdInterval); return;
    }
    if (isExecuting) {
        setStatus('running'); setButtons('running');
        document.getElementById('countdown').textContent = 'Sending…';
        clearInterval(cdInterval); return;
    }

    setStatus('running'); setButtons('running');
    clearInterval(cdInterval);
    if (nextAlarmTime) {
        cdInterval = setInterval(() => {
            const ms = nextAlarmTime - Date.now();
            document.getElementById('countdown').textContent = ms > 0 ? fmt(ms) : '00:00';
            if (ms <= 0) clearInterval(cdInterval);
        }, 500);
    } else {
        document.getElementById('countdown').textContent = '—';
    }
}

function refresh() { chrome.storage.local.get(null, render); }

refresh();
setInterval(refresh, 1000);

document.getElementById('btnStart').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resumeCampaign' }, refresh);
});
document.getElementById('btnPause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseCampaign' }, refresh);
});
document.getElementById('btnStop').addEventListener('click', () => {
    if (confirm('Clear the queue? This cannot be undone.')) {
        chrome.runtime.sendMessage({ action: 'clearCampaign' }, refresh);
    }
});

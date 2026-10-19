// ═══════════════════════════════════════════════════════════════════
// Magnet Engine — Content Script
// Runs on localhost (campaign handoff) and instagram.com (DM execution)
// ═══════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Message names come from protocol.js, loaded first in content_scripts — the
// same definition the background worker and the app use.
const { APP_TO_EXT, EXT_TO_APP, RUNTIME } = MAGNET_PROTOCOL;

// ── Web app: Relay campaign payload to background worker ──────
// Runs on every non-Instagram page the manifest matches (localhost + the
// production dashboard domain). To support a new domain, add it to
// "content_scripts.matches" in manifest.json — no change needed here.
if (!window.location.hostname.includes("instagram.com")) {
    // Background → page: relay "actually sent" events and stat pushes into the
    // page so the app can reconcile real sends (not handoffs).
    chrome.runtime.onMessage.addListener((message) => {
        if (isAppMessage(message)) {
            window.postMessage(message, '*');
        }
    });

    // ── Version handshake ──────────────────────────────────────────
    // Answered here rather than in the background worker: the content script
    // already knows the manifest version and the protocol it was shipped with,
    // and answering locally means no service-worker wake and no round trip.
    //
    // Announced unsolicited on injection AND on request, because either side
    // can be first — the content script runs at document_idle, which may land
    // before or after React mounts and posts its HELLO.
    const announce = () => window.postMessage(describeExtension(), '*');
    announce();

    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data.type) return;

        // Page → extension: "which version are you, and what do you accept?"
        if (event.data.type === APP_TO_EXT.HELLO) {
            announce();
            return;
        }

        // Page → background: the app asks for the real sent count + sent log.
        if (event.data.type === APP_TO_EXT.GET_STATS) {
            try {
                if (!chrome?.runtime?.sendMessage) return;
                chrome.runtime.sendMessage({ action: RUNTIME.GET_STATS }, (stats) => {
                    if (chrome.runtime.lastError || !stats) return;
                    window.postMessage({ type: EXT_TO_APP.STATS, ...stats }, '*');
                });
            } catch (e) {
                console.warn("[MagnetEngine] getStats relay error:", e);
            }
            return;
        }

        // Page → background: the Operator changed their sending settings.
        // The worker stores them and answers with fresh stats, so the
        // dashboard's "sent today" pill shows the new cap straight away.
        if (event.data.type === APP_TO_EXT.SETTINGS) {
            try {
                if (!chrome?.runtime?.sendMessage) return;
                chrome.runtime.sendMessage({ type: APP_TO_EXT.SETTINGS, payload: event.data.payload }, (stats) => {
                    if (chrome.runtime.lastError || !stats) return;
                    window.postMessage({ type: EXT_TO_APP.STATS, ...stats }, '*');
                });
            } catch (e) {
                console.warn("[MagnetEngine] settings relay error:", e);
            }
            return;
        }

        // Page → background: the app asks for the latest inbox snapshot.
        if (event.data.type === APP_TO_EXT.GET_INBOX) {
            try {
                if (!chrome?.runtime?.sendMessage) return;
                chrome.runtime.sendMessage({ action: RUNTIME.GET_INBOX }, (res) => {
                    if (chrome.runtime.lastError || !res) return;
                    window.postMessage({ type: EXT_TO_APP.INBOX, threads: res.threads ?? [] }, '*');
                });
            } catch (e) {
                console.warn("[MagnetEngine] getInbox relay error:", e);
            }
            return;
        }

        if (event.data.type === APP_TO_EXT.CAMPAIGN) {
            console.log("[MagnetEngine] Campaign intercepted. Relaying to background...");
            try {
                if (!chrome?.runtime?.sendMessage) {
                    alert("Magnet Engine extension disconnected. Please HARD REFRESH this page (Ctrl+R) and try again.");
                    return;
                }
                chrome.runtime.sendMessage(event.data, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("[MagnetEngine] Background unreachable:", chrome.runtime.lastError.message);
                        alert("Extension disconnected. Hard refresh this page and try again.");
                        return;
                    }
                    if (response?.status === 'rejected') {
                        alert("Campaign rejected: " + response.reason);
                        return;
                    }
                    console.log("[MagnetEngine] Background confirmed:", response);
                    alert(`Campaign queued! ${response.count} DMs will be sent. Check the extension popup for progress.`);
                });
            } catch (e) {
                console.error("[MagnetEngine] Relay error:", e);
                alert("Extension disconnected. Hard refresh this page and try again.");
            }
        }
    }, false);
}

// ── Instagram: Inbox poller (read replies into the app) ─────────────
// Runs from the instagram.com page context so the request is SAME-ORIGIN and
// the user's session cookie attaches automatically (a background-worker fetch
// would be cross-origin and IG's SameSite sessionid would NOT be sent). We read
// IG's own private web JSON API — the same endpoints the website itself calls.
if (window.location.hostname.includes("instagram.com") && !window.__magnetInboxPoller) {
    window.__magnetInboxPoller = true;

    const IG_APP_ID = "936619743392459"; // public web app id used by instagram.com
    const POLL_MS = 100000;              // ~1.6 min — conservative for account health

    const readCookie = (name) => {
        const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    };

    // Normalize one IG thread → { threadId, handle, name, avatarUrl, messages[] }
    function normalizeThread(thread) {
        const viewerId = String(thread.viewer_id ?? '');
        const other = (thread.users && thread.users[0]) || {};
        const handle = other.username || '';
        if (!handle) return null;

        const messages = [];
        for (const item of (thread.items || [])) {
            // Only capture text-bearing items; skip reactions/media for MVP.
            const text = typeof item.text === 'string' ? item.text
                       : (item.link && item.link.text) ? item.link.text
                       : '';
            if (!text) continue;
            const tsMicros = Number(item.timestamp) || 0;
            messages.push({
                id: String(item.item_id || `${thread.thread_id}_${tsMicros}`),
                direction: String(item.user_id ?? '') === viewerId ? 'out' : 'in',
                text,
                createdAt: new Date(tsMicros ? tsMicros / 1000 : Date.now()).toISOString(),
            });
        }
        // IG returns items newest-first; store oldest-first.
        messages.reverse();
        if (messages.length === 0) return null;

        return {
            threadId: String(thread.thread_id || thread.thread_v2_id || ''),
            handle,
            name: other.full_name || '',
            avatarUrl: other.profile_pic_url || '',
            messages,
        };
    }

    async function pollInbox() {
        try {
            const csrf = readCookie('csrftoken');
            const res = await fetch(
                'https://www.instagram.com/api/v1/direct_v2/inbox/?visual_message_return_type=unseen&thread_message_limit=10&persistentBadging=true&limit=20',
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'X-IG-App-ID': IG_APP_ID,
                        'X-ASBD-ID': '129477',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': csrf,
                    },
                },
            );
            if (!res.ok) {
                // 401/403 = logged out or challenge; just skip this cycle.
                console.debug('[MagnetEngine] inbox poll skipped, status', res.status);
                return;
            }
            const data = await res.json();
            const rawThreads = (data && data.inbox && data.inbox.threads) || [];
            const threads = rawThreads
                .map(normalizeThread)
                .filter((t) => t && t.threadId);
            if (threads.length === 0) return;

            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage(
                    { action: RUNTIME.INBOX_SYNC, threads },
                    () => void chrome.runtime.lastError,
                );
            }
        } catch (e) {
            console.debug('[MagnetEngine] inbox poll error:', e && e.message);
        }
    }

    // Let the session settle, then poll on an interval for the tab's lifetime.
    setTimeout(pollInbox, 8000);
    setInterval(pollInbox, POLL_MS);
}

// ── Instagram: the Sender Tab ───────────────────────────────────
// The background worker sends every DM of a campaign from ONE tab (the
// Sender Tab), navigating it from profile to profile. On each page load this
// script asks whether it is that tab. If it is, it covers the page with an
// overlay that blocks the Operator's clicks and keys, and runs the DM the
// worker hands it. Every other instagram.com tab stays untouched.
if (window.location.hostname.includes("instagram.com")) {
    console.log("[MagnetEngine] Injected into Instagram.");

    // ── The overlay ─────────────────────────────────────────────
    // A shadow root keeps Instagram's CSS out and ours in. It blocks the
    // pointer by covering the page, and the keyboard by swallowing trusted key
    // events before Instagram sees them. Our own automation is untouched: its
    // clicks are element.click() and its typing is execCommand, neither of
    // which is a trusted key event.
    const SenderOverlay = (() => {
        const TITLE_PREFIX = '● Sending DMs · ';
        const BLOCKED = ['keydown', 'keypress', 'keyup', 'paste', 'drop', 'contextmenu'];
        let host = null;
        let tabId = null;
        let ticker = null;
        let state = {};

        const block = (e) => {
            if (!e.isTrusted || e.target === host) return;
            e.preventDefault();
            e.stopImmediatePropagation();
        };

        function loadFonts() {
            // @font-face does not work inside a shadow root; FontFace on the
            // document does, under names Instagram will never use.
            try {
                const faces = [
                    new FontFace('ME Grotesk', `url(${chrome.runtime.getURL('fonts/schibsted-grotesk-latin-wght-normal.woff2')})`, { weight: '400 900' }),
                    new FontFace('ME Mono', `url(${chrome.runtime.getURL('fonts/sometype-mono-latin-wght-normal.woff2')})`, { weight: '400 700' }),
                ];
                for (const f of faces) f.load().then(() => document.fonts.add(f)).catch(() => {});
            } catch { /* system fonts it is */ }
        }

        const CSS = `
            :host { all: initial; }
            .veil {
                position: fixed; inset: 0; z-index: 2147483647;
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
                display: flex; align-items: center; justify-content: center;
                padding: 16px; box-sizing: border-box;
                font-family: 'ME Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;
                color: #fff; -webkit-font-smoothing: antialiased;
                cursor: not-allowed;
            }
            .card {
                cursor: default;
                width: 100%; max-width: 380px; box-sizing: border-box;
                background: #08080a;
                border: 1px solid rgba(255, 255, 255, 0.10);
                border-radius: 24px;
                box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.04), 0 24px 80px rgba(0, 0, 0, 0.6);
                padding: 26px 26px 22px;
            }
            .eyebrow {
                display: flex; align-items: center; gap: 8px;
                font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
                color: #a3a3a3;
            }
            .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6); animation: pulse 1.8s ease-out infinite; }
            .dot.idle { background: #a3a3a3; animation: none; }
            @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55); } 100% { box-shadow: 0 0 0 9px rgba(52, 211, 153, 0); } }
            h1 { margin: 14px 0 8px; font-size: 21px; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
            p { margin: 0; font-size: 13.5px; line-height: 1.55; color: #d4d4d4; }
            .status {
                margin-top: 20px; padding: 14px 16px; border-radius: 16px;
                background: #101014; border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .now { font-size: 13.5px; font-weight: 600; color: #fff; }
            .num { font-family: 'ME Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
            .meta { margin-top: 4px; font-size: 12px; color: #a3a3a3; }
            .bar { margin-top: 12px; height: 4px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
            .fill { height: 100%; background: #fff; border-radius: 4px; transform-origin: left; transition: transform 0.6s ease; }
            .actions { margin-top: 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
            .hint { font-size: 11.5px; color: #a3a3a3; line-height: 1.45; }
            button {
                all: unset; cursor: pointer; flex-shrink: 0;
                padding: 9px 16px; border-radius: 12px;
                font-family: inherit; font-size: 13px; font-weight: 600;
                color: #fff; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15);
                transition: background 0.15s ease;
            }
            button:hover { background: rgba(255, 255, 255, 0.12); }
            button:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.6); outline-offset: 2px; }
            button[disabled] { opacity: 0.5; cursor: default; }
            @media (prefers-reduced-motion: reduce) { .dot { animation: none; } .fill { transition: none; } }
        `;

        function fmt(ms) {
            const s = Math.max(0, Math.round(ms / 1000));
            return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        }

        function render() {
            if (!host) return;
            const root = host.shadowRoot;
            const {
                campaignQueue = [], originalTotal = 0, isExecuting = false,
                currentTask = null, nextAlarmTime = null, isPaused = false,
            } = state;
            const left = campaignQueue.length + (isExecuting ? 1 : 0);
            const total = Math.max(originalTotal, left);
            const sent = Math.max(0, total - left);

            let now;
            let live = true;
            if (isExecuting && currentTask && isPaused) {
                now = `Finishing the DM to <span class="num">@${escapeHtml(currentTask.handle)}</span>, then pausing…`;
            } else if (isExecuting && currentTask) {
                now = `Sending to <span class="num">@${escapeHtml(currentTask.handle)}</span>…`;
            } else if (isPaused) {
                now = 'Pausing…';
                live = false;
            } else if (nextAlarmTime && nextAlarmTime > Date.now()) {
                now = `Next DM in <span class="num">${fmt(nextAlarmTime - Date.now())}</span>`;
            } else {
                now = 'Getting the next DM ready…';
            }

            root.querySelector('.dot').classList.toggle('idle', !live);
            root.querySelector('.now').innerHTML = now;
            root.querySelector('.meta').innerHTML =
                `<span class="num">${sent}</span> of <span class="num">${total}</span> sent · <span class="num">${Math.max(0, total - sent)}</span> to go`;
            root.querySelector('.fill').style.transform = `scaleX(${total ? sent / total : 0})`;
            root.querySelector('button').disabled = isPaused;

            if (!document.title.startsWith(TITLE_PREFIX)) document.title = TITLE_PREFIX + document.title;
        }

        function escapeHtml(s) {
            return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        const KEYS = ['campaignQueue', 'originalTotal', 'isExecuting', 'currentTask', 'nextAlarmTime', 'isPaused'];

        function onStorage(changes, area) {
            if (area !== 'local') return;
            // Released (paused, capped, logged out) or replaced: hand the tab back.
            if (changes.senderTabId && changes.senderTabId.newValue !== tabId) {
                unmount();
                return;
            }
            let dirty = false;
            for (const k of KEYS) {
                if (changes[k]) { state[k] = changes[k].newValue; dirty = true; }
            }
            if (dirty) render();
        }

        function mount(id) {
            tabId = id;
            if (host) return;
            loadFonts();

            host = document.createElement('magnetengine-sender');
            const root = host.attachShadow({ mode: 'open' });
            root.innerHTML = `
                <style>${CSS}</style>
                <div class="veil" role="dialog" aria-modal="true" aria-labelledby="me-title">
                    <div class="card">
                        <div class="eyebrow"><span class="dot"></span>MagnetEngine</div>
                        <h1 id="me-title">This tab is sending your DMs</h1>
                        <p>Leave it open and let it work. Every approved DM goes out from here, one after another. Use Instagram in any other tab as normal.</p>
                        <div class="status" aria-live="polite">
                            <div class="now"></div>
                            <div class="meta"></div>
                            <div class="bar"><div class="fill"></div></div>
                        </div>
                        <div class="actions">
                            <span class="hint">Pausing gives you this tab back.</span>
                            <button type="button">Pause sending</button>
                        </div>
                    </div>
                </div>`;
            root.querySelector('button').addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: RUNTIME.PAUSE }, () => void chrome.runtime.lastError);
            });
            // Clicks on the veil itself go nowhere.
            root.querySelector('.veil').addEventListener('mousedown', (e) => {
                if (e.target === e.currentTarget) e.preventDefault();
            });
            (document.body || document.documentElement).appendChild(host);

            for (const type of BLOCKED) window.addEventListener(type, block, true);
            chrome.storage.onChanged.addListener(onStorage);
            chrome.storage.local.get(KEYS, (r) => { state = r || {}; render(); });
            ticker = setInterval(render, 1000);

            // Instagram re-renders its root; keep the overlay attached.
            new MutationObserver(() => {
                if (host && !host.isConnected) (document.body || document.documentElement).appendChild(host);
            }).observe(document.documentElement, { childList: true, subtree: false });
        }

        function unmount() {
            if (!host) return;
            for (const type of BLOCKED) window.removeEventListener(type, block, true);
            chrome.storage.onChanged.removeListener(onStorage);
            clearInterval(ticker);
            host.remove();
            host = null;
            if (document.title.startsWith(TITLE_PREFIX)) document.title = document.title.slice(TITLE_PREFIX.length);
        }

        return { mount };
    })();

    // ── Utility: Wait for a DOM element via MutationObserver ────
    function waitForElement(selector, timeout = 20000) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: ${selector}`));
            }, timeout);
        });
    }

    // ── Utility: TreeWalker to find visible element by exact text ─
    function findByExactText(text) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue && node.nodeValue.trim() === text) {
                let el = node.parentElement;
                while (el && el.offsetHeight === 0 && el.parentElement) el = el.parentElement;
                if (el && el.offsetHeight > 0) return el;
            }
        }
        return null;
    }

    // ── Utility: Find the SVG send button ───────────────────────
    function findSendButton() {
        // Method 1: Look for SVG with aria-label (most reliable)
        let btn = document.querySelector('div[role="button"] svg[aria-label="Send"]');
        if (btn) return btn.closest('div[role="button"]');

        // Method 2: Look for any clickable element near the textbox with send-like attributes
        let allButtons = document.querySelectorAll('div[role="button"]');
        for (const b of allButtons) {
            const svg = b.querySelector('svg');
            if (svg && b.offsetHeight > 0 && b.offsetHeight < 60) {
                // Check if this button appeared after text was entered (send buttons are typically small)
                const rect = b.getBoundingClientRect();
                const textbox = document.querySelector('div[role="textbox"]');
                if (textbox) {
                    const tbRect = textbox.getBoundingClientRect();
                    // Send button should be vertically near the textbox
                    if (Math.abs(rect.top - tbRect.top) < 100) {
                        return b;
                    }
                }
            }
        }

        // Method 3: Fallback to text match
        return findByExactText("Send");
    }

    // ── Utility: Type text into contenteditable, a word at a time ──
    // A word per keystroke-burst rather than a character: the Sender Tab is
    // often in the background now, where Chrome stretches every timer to at
    // least a second — character-by-character, a long DM would take minutes.
    async function humanType(element, text) {
        element.click();
        await sleep(300);
        element.focus();
        await sleep(300);

        // Place cursor at end
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        await sleep(200);

        for (const chunk of text.match(/\s+|\S+/g) || []) {
            document.execCommand('insertText', false, chunk);
            await sleep(60 + Math.random() * 140);
        }
    }

    // ── Utility: Check if logged into Instagram ─────────────────
    function isLoggedIn() {
        // Instagram shows a Log In button or login form when not authenticated
        const loginButton = findByExactText("Log in") || findByExactText("Log In");
        const loginForm = document.querySelector('input[name="username"]');
        return !loginButton && !loginForm;
    }

    // ── Signal task completion to background ─────────────────────
    // The worker clears the task and decides what the tab does next; the page
    // never closes itself any more — it is the next DM's tab too.
    function reportComplete(result, handle) {
        console.log(`[MagnetEngine] Reporting ${result} for @${handle}`);
        chrome.runtime.sendMessage({
            action: RUNTIME.TASK_COMPLETE,
            result: result, // 'success' | 'failed' | 'skipped' | 'logged_out'
            handle: handle
        }, () => void chrome.runtime.lastError);
    }

    // ── One DM ──────────────────────────────────────────────────
    async function runTask(task) {
        console.log("[MagnetEngine] ═══ EXECUTING TASK ═══");
        console.log("[MagnetEngine] Target: @" + task.handle);

        try {
            // ── STEP 1: Wait for page load ──────────────────────
            await sleep(5000);

            // ── STEP 1.5: Check login state ─────────────────────
            // Logged out, every DM would fail the same way. The worker puts this
            // one back, pauses, and hands the tab over so the Operator can log in.
            if (!isLoggedIn()) {
                console.error("[MagnetEngine] ABORT: Not logged into Instagram.");
                reportComplete('logged_out', task.handle);
                return;
            }

            // ── STEP 2: Find and click "Message" button ─────────
            const messageBtn = findByExactText("Message");
            if (!messageBtn) {
                console.error("[MagnetEngine] ABORT: 'Message' button not found.");
                reportComplete('skipped', task.handle);
                return;
            }
            messageBtn.click();

            // ── STEP 3: Wait for textbox to appear ──────────────
            let textbox;
            try {
                textbox = await waitForElement('div[role="textbox"][contenteditable="true"]', 15000);
            } catch {
                try {
                    textbox = await waitForElement('textarea', 5000);
                } catch {
                    try {
                        textbox = await waitForElement('div[contenteditable="true"]', 5000);
                    } catch {
                        console.error("[MagnetEngine] ABORT: Textbox never appeared.");
                        reportComplete('failed', task.handle);
                        return;
                    }
                }
            }
            await sleep(2000);

            // ── STEP 4: Type the message ────────────────────────
            await humanType(textbox, task.message);
            await sleep(2000);

            // ── STEP 5: Click the Send button ───────────────────
            // Try up to 3 times with delays (button may take time to activate)
            let sendBtn = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                sendBtn = findSendButton();
                if (sendBtn) break;
                await sleep(2000);
            }

            if (sendBtn) {
                sendBtn.click();
                await sleep(2000);
                console.log("[MagnetEngine] ═══ SUCCESS: DM sent to @" + task.handle + " ═══");
                reportComplete('success', task.handle);
            } else {
                // Enter as the last resort, then check the textbox emptied.
                textbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                await sleep(3000);
                const textboxContent = textbox.textContent || textbox.innerText || '';
                if (textboxContent.trim().length === 0) {
                    console.log("[MagnetEngine] ═══ SUCCESS (via Enter): DM sent to @" + task.handle + " ═══");
                    reportComplete('success', task.handle);
                } else {
                    console.error("[MagnetEngine] FAILED: Message was typed but could not be sent.");
                    reportComplete('failed', task.handle);
                }
            }
        } catch (error) {
            console.error("[MagnetEngine] Unexpected error:", error);
            reportComplete('failed', task.handle);
        }
    }

    // ── Am I the Sender Tab? ────────────────────────────────────
    // Asked once on load, and once more shortly after: on the very first send
    // the worker records this tab's id only after creating it, which can land
    // just after this page starts.
    function checkSender(retry) {
        try {
            chrome.runtime.sendMessage({ action: RUNTIME.SENDER_CHECK }, (res) => {
                if (chrome.runtime.lastError || !res) return;
                if (!res.isSender) {
                    if (retry) setTimeout(() => checkSender(false), 2500);
                    return;
                }
                SenderOverlay.mount(res.tabId);
                if (res.task && res.task.message) runTask(res.task);
            });
        } catch (e) {
            console.debug('[MagnetEngine] sender check failed:', e && e.message);
        }
    }
    checkSender(true);
}

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

    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data.type) return;

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

// ── Instagram: Execute DM automation ────────────────────────────
if (window.location.hostname.includes("instagram.com")) {
    console.log("[MagnetEngine] Injected into Instagram.");

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

    // ── Utility: Type text char-by-char into contenteditable ────
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

        // Type character by character
        for (const char of text) {
            document.execCommand('insertText', false, char);
            await sleep(30 + Math.random() * 60); // 30-90ms human-like delay
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
    function reportComplete(result, handle) {
        console.log(`[MagnetEngine] Reporting ${result} for @${handle}`);
        chrome.runtime.sendMessage({
            action: RUNTIME.TASK_COMPLETE,
            result: result, // 'success', 'failed', 'skipped'
            handle: handle
        });
    }

    // ── Main execution flow ─────────────────────────────────────
    chrome.storage.local.get(['currentTask'], async (result) => {
        const task = result.currentTask;
        if (!task || !task.message) {
            console.log("[MagnetEngine] No active task. Idle.");
            return;
        }

        console.log("[MagnetEngine] ═══ EXECUTING TASK ═══");
        console.log("[MagnetEngine] Target: @" + task.handle);
        console.log("[MagnetEngine] Message preview:", task.message.substring(0, 60) + "...");

        try {
            // ── STEP 1: Wait for page load ──────────────────────
            console.log("[MagnetEngine] Step 1: Waiting for page load...");
            await sleep(5000);

            // ── STEP 1.5: Check login state ─────────────────────
            if (!isLoggedIn()) {
                console.error("[MagnetEngine] ABORT: Not logged into Instagram.");
                chrome.storage.local.remove('currentTask');
                reportComplete('skipped', task.handle);
                await sleep(2000);
                chrome.runtime.sendMessage({ action: "closeCurrentTab" });
                return;
            }

            // ── STEP 2: Find and click "Message" button ─────────
            console.log("[MagnetEngine] Step 2: Looking for Message button...");
            let messageBtn = findByExactText("Message");

            if (!messageBtn) {
                console.error("[MagnetEngine] ABORT: 'Message' button not found.");
                chrome.storage.local.remove('currentTask');
                reportComplete('skipped', task.handle);
                await sleep(2000);
                chrome.runtime.sendMessage({ action: "closeCurrentTab" });
                return;
            }

            console.log("[MagnetEngine] Step 2: Clicking Message...");
            messageBtn.click();

            // ── STEP 3: Wait for textbox to appear ──────────────
            console.log("[MagnetEngine] Step 3: Waiting for chat textbox...");
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
                        chrome.storage.local.remove('currentTask');
                        reportComplete('failed', task.handle);
                        await sleep(2000);
                        chrome.runtime.sendMessage({ action: "closeCurrentTab" });
                        return;
                    }
                }
            }

            console.log("[MagnetEngine] Step 3: Textbox found!");
            await sleep(2000);

            // ── STEP 4: Type the message ────────────────────────
            console.log("[MagnetEngine] Step 4: Typing message...");
            await humanType(textbox, task.message);
            console.log("[MagnetEngine] Step 4: Typing complete.");
            await sleep(2000);

            // ── STEP 5: Click the Send button ───────────────────
            console.log("[MagnetEngine] Step 5: Finding Send button...");

            // Try up to 3 times with delays (button may take time to activate)
            let sendBtn = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                sendBtn = findSendButton();
                if (sendBtn) break;
                console.log(`[MagnetEngine] Step 5: Send button not found, attempt ${attempt}/3...`);
                await sleep(2000);
            }

            if (sendBtn) {
                console.log("[MagnetEngine] Step 5: Clicking Send!");
                sendBtn.click();
                await sleep(2000);
                console.log("[MagnetEngine] ═══ SUCCESS: DM sent to @" + task.handle + " ═══");
                chrome.storage.local.remove('currentTask');
                reportComplete('success', task.handle);
            } else {
                console.error("[MagnetEngine] Step 5: Send button not found after 3 attempts.");
                // DON'T clear task — try Enter as absolute last resort
                console.log("[MagnetEngine] Step 5: Attempting Enter key as fallback...");
                textbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
                await sleep(3000);

                // Check if the message was sent (textbox should be empty)
                const textboxContent = textbox.textContent || textbox.innerText || '';
                if (textboxContent.trim().length === 0) {
                    console.log("[MagnetEngine] ═══ SUCCESS (via Enter): DM sent to @" + task.handle + " ═══");
                    chrome.storage.local.remove('currentTask');
                    reportComplete('success', task.handle);
                } else {
                    console.error("[MagnetEngine] FAILED: Message was typed but could not be sent.");
                    chrome.storage.local.remove('currentTask');
                    reportComplete('failed', task.handle);
                }
            }

            // ── STEP 6: Close tab ───────────────────────────────
            await sleep(3000);
            chrome.runtime.sendMessage({ action: "closeCurrentTab" });

        } catch (error) {
            console.error("[MagnetEngine] Unexpected error:", error);
            chrome.storage.local.remove('currentTask');
            reportComplete('failed', task.handle);
        }
    });
}

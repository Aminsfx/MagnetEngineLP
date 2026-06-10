// ═══════════════════════════════════════════════════════════════════
// Magnet Engine — Content Script
// Runs on localhost (campaign handoff) and instagram.com (DM execution)
// ═══════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Localhost: Relay campaign payload to background worker ──────
if (window.location.hostname === "localhost") {
    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data.type) return;

        if (event.data.type === 'MAGNET_ENGINE_CAMPAIGN') {
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
            action: "TASK_COMPLETE",
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

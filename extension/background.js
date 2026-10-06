// MagnetEngine — Background Service Worker v4

// The wire protocol is defined once, in protocol.js, and shared with the
// content script (loaded first in content_scripts) and the app (which has a
// typed adapter asserted to match).
importScripts('protocol.js');
const { APP_TO_EXT, EXT_TO_APP, RUNTIME, APP_HOSTS } = MAGNET_PROTOCOL;

// Fallbacks used only if the web app didn't send a value with the campaign.
const DEFAULT_DAILY_CAP = 40;   // the app passes its own dailySendCap from Settings
const DEFAULT_MIN_DELAY = 3;
const DEFAULT_MAX_DELAY = 8;

// A send that hasn't reported back by now is counted as failed, so a reload
// or a hung page can't stall the whole campaign with isExecuting stuck on.
const SEND_TIMEOUT_MINUTES = 5;

// ── The Sender Tab ────────────────────────────────────────────────
// One Instagram tab per campaign, reused for every DM: opened for the first
// send, navigated to each next profile, closed when the queue runs out. Its
// id lives in storage (`senderTabId`) because the service worker can be
// stopped between sends. While a tab is the Sender Tab, the content script
// covers it with an overlay that blocks the Operator's clicks and keys — so
// nobody types into a thread the extension is typing into. Removing the id
// ("releasing" the tab) takes the overlay down and gives the tab back.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // One dispatch key. The campaign handoff used to arrive under `type` while
    // everything else used `action`, so the listener read two different fields.
    const kind = messageKind(request);

    // ── New campaign from web app ──────────────────────────────────
    if (kind === APP_TO_EXT.CAMPAIGN) {
        chrome.storage.local.get(['isExecuting'], (result) => {
            if (result.isExecuting) {
                sendResponse({ status: 'rejected', reason: 'A campaign is already running. Pause or clear it first.' });
                return;
            }
            // Payload shape + defaults live with the protocol, so the app and
            // the extension can't disagree about what a campaign looks like.
            const { leads, minDelay, maxDelay, dailyCap } = readCampaign(request.payload, {
                minDelay: DEFAULT_MIN_DELAY,
                maxDelay: DEFAULT_MAX_DELAY,
                dailyCap: DEFAULT_DAILY_CAP,
            });
            chrome.storage.local.set({
                campaignQueue: leads,
                originalTotal: leads.length,
                minDelay:      minDelay,
                maxDelay:      maxDelay,
                dailyCap:      dailyCap,
                isExecuting:   false,
                isPaused:      false,
                failedCount:   0,
            }, () => {
                processNextLead();
                sendResponse({ status: 'queued', count: leads.length });
            });
        });
        return true;
    }

    // ── An Instagram page asks: am I the Sender Tab, and is there a DM for me? ──
    // The task is handed out once. A reload mid-send gets the overlay back but
    // not the task, so a half-typed message is never typed a second time; the
    // send timeout settles it instead.
    if (kind === RUNTIME.SENDER_CHECK) {
        const tabId = sender.tab && sender.tab.id;
        chrome.storage.local.get(['senderTabId', 'currentTask', 'isExecuting'], (result) => {
            if (!tabId || result.senderTabId !== tabId) {
                sendResponse({ isSender: false });
                return;
            }
            const task = result.isExecuting && result.currentTask && !result.currentTask.dispatched
                ? result.currentTask
                : null;
            if (!task) {
                sendResponse({ isSender: true, tabId, task: null });
                return;
            }
            chrome.storage.local.set({ currentTask: { ...task, dispatched: true } }, () => {
                sendResponse({ isSender: true, tabId, task });
            });
        });
        return true;
    }

    // ── Task completed by content script ──────────────────────────
    if (kind === RUNTIME.TASK_COMPLETE) {
        completeTask(request.result, request.handle);
        sendResponse({ status: 'acknowledged' });
        return true;
    }

    // ── Settings from the web app (the Send Cap changed in Settings) ───────
    // Stored at once rather than waiting for the next campaign handoff, which
    // is refused while a campaign runs — so the cap enforced here and the one
    // the dashboard shows both follow Settings. Answered with fresh stats.
    if (kind === APP_TO_EXT.SETTINGS) {
        chrome.storage.local.get(['dailyCap'], (stored) => {
            const { dailyCap } = readSendSettings(request.payload, {
                dailyCap: Number(stored.dailyCap) || DEFAULT_DAILY_CAP,
            });
            chrome.storage.local.set({ dailyCap }, () => {
                resumeIfStalled();
                readStats(sendResponse);
            });
        });
        return true;
    }

    // ── Stats request from the web app (real sent count + sent log) ────────
    if (kind === RUNTIME.GET_STATS) {
        readStats(sendResponse);
        return true;
    }

    // ── Inbox snapshot from the IG content-script poller ───────────────────
    // Store the latest snapshot and push it to any open dashboard tab so the
    // app can persist conversations/messages to Supabase and render the inbox.
    if (kind === RUNTIME.INBOX_SYNC) {
        const threads = Array.isArray(request.threads) ? request.threads : [];
        chrome.storage.local.set({ inboxThreads: threads, inboxSyncedAt: Date.now() }, () => {
            broadcastToApp({ type: EXT_TO_APP.INBOX, threads });
        });
        sendResponse({ status: 'ok', count: threads.length });
        return true;
    }

    // ── Inbox request from the web app (latest snapshot) ───────────────────
    if (kind === RUNTIME.GET_INBOX) {
        chrome.storage.local.get(['inboxThreads'], (result) => {
            sendResponse({ threads: result.inboxThreads || [] });
        });
        return true;
    }

    // ── Pause campaign (popup, or the button on the Sender Tab's overlay) ──
    // The tab is handed back at once when nothing is mid-send; a DM being
    // typed finishes first, and completeTask hands it back then.
    if (kind === RUNTIME.PAUSE) {
        chrome.alarms.clear('dripEngine');
        chrome.storage.local.set({ isPaused: true, nextAlarmTime: null }, () => {
            chrome.storage.local.get(['isExecuting'], (result) => {
                if (!result.isExecuting) releaseSenderTab();
            });
        });
        sendResponse({ status: 'paused' });
        return true;
    }

    // ── Resume campaign ────────────────────────────────────────────
    if (kind === RUNTIME.RESUME) {
        chrome.storage.local.set({ isPaused: false }, () => {
            processNextLead();
        });
        sendResponse({ status: 'resumed' });
        return true;
    }

    // ── Clear campaign ─────────────────────────────────────────────
    if (kind === RUNTIME.CLEAR) {
        chrome.alarms.clear('dripEngine');
        chrome.alarms.clear('sendWatchdog');
        chrome.storage.local.set({
            campaignQueue: [],
            currentTask:   null,
            isExecuting:   false,
            isPaused:      false,
            nextAlarmTime: null,
            originalTotal: 0,
            failedCount:   0,
        }, closeSenderTab);
        sendResponse({ status: 'cleared' });
        return true;
    }
});

// ── A send finished (or gave up) ──────────────────────────────────
// Ignores a report for anything but the task in flight, so a late report
// after the send timeout already settled it can't count a send twice.
function completeTask(outcome, handle) {
    chrome.storage.local.get(
        ['currentTask', 'isExecuting', 'campaignQueue', 'dailySentCount', 'dailyResetDate', 'failedCount', 'minDelay', 'maxDelay', 'dailyCap', 'isPaused', 'sentLog', 'sentHandles'],
        (result) => {
            const task = result.currentTask;
            if (!result.isExecuting || !task || (handle && task.handle !== handle)) return;
            chrome.alarms.clear('sendWatchdog');

            const queue = result.campaignQueue || [];

            // Logged out of Instagram: nothing was sent, and every next lead
            // would fail the same way. Put this one back, pause, and give the
            // tab back so the Operator can log in right there.
            if (outcome === 'logged_out') {
                chrome.alarms.clear('dripEngine');
                chrome.storage.local.set({
                    campaignQueue: [task, ...queue],
                    currentTask:   null,
                    isExecuting:   false,
                    isPaused:      true,
                    nextAlarmTime: null,
                }, releaseSenderTab);
                return;
            }

            const today  = new Date().toDateString();
            const newDay = result.dailyResetDate !== today;
            let count    = newDay ? 0  : (result.dailySentCount || 0);
            let sentLog  = newDay ? [] : (result.sentLog || []);   // handles actually sent today

            // Every handle ever sent, across days. `sentLog` resets each midnight
            // because it drives the daily counter — so on its own it lets the app
            // forget yesterday's sends and queue them all over again the next
            // morning. This list never resets.
            let sentHandles = Array.isArray(result.sentHandles) ? result.sentHandles : [];

            let failed = result.failedCount || 0;
            if (outcome === 'success') {
                count++;
                sentLog.push({ handle: task.handle, at: Date.now() });
                if (sentLog.length > 2000) sentLog = sentLog.slice(-2000);

                const normalized = String(task.handle).toLowerCase().replace(/^@/, '');
                if (normalized && !sentHandles.includes(normalized)) sentHandles.push(normalized);
                if (sentHandles.length > 5000) sentHandles = sentHandles.slice(-5000);
            }
            if (outcome === 'failed') failed++;

            const cap = Number(result.dailyCap) || DEFAULT_DAILY_CAP;

            chrome.storage.local.set({
                dailySentCount: count,
                dailyResetDate: today,
                failedCount:    failed,
                sentLog:        sentLog,
                sentHandles:    sentHandles,
                isExecuting:    false,
                currentTask:    null,
            }, () => {
                // Tell any open MagnetEngine tab what actually got sent, so the
                // app marks the lead sent for real (not on handoff).
                if (outcome === 'success') {
                    broadcastToApp({
                        type: EXT_TO_APP.SENT,
                        handle: task.handle,
                        dailySentCount: count,
                        dailyCap: cap,
                    });
                }

                // Done: the Sender Tab has nothing left to do.
                if (queue.length === 0) { closeSenderTab(); return; }
                // Stopping for a while (cap reached, or paused mid-send): give the
                // tab back rather than leave it blocked until tomorrow.
                if (count >= cap || result.isPaused) { releaseSenderTab(); return; }

                scheduleNext(result);
            });
        },
    );
}

// Random wait within the user-chosen min–max range (minutes).
function scheduleNext(settings) {
    const min = Number(settings.minDelay) || DEFAULT_MIN_DELAY;
    const max = Math.max(min, Number(settings.maxDelay) || DEFAULT_MAX_DELAY);
    const delayMinutes = min + Math.random() * (max - min);
    chrome.storage.local.set({ nextAlarmTime: Date.now() + delayMinutes * 60 * 1000 }, () => {
        chrome.alarms.create('dripEngine', { delayInMinutes: delayMinutes });
    });
}

// ── Alarm fires → process next lead / keep an IG tab alive for polling ─────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dripEngine') {
        chrome.storage.local.set({ nextAlarmTime: null }, processNextLead);
    } else if (alarm.name === 'sendWatchdog') {
        chrome.storage.local.get(['currentTask'], (result) => {
            if (result.currentTask) completeTask('failed', result.currentTask.handle);
        });
    } else if (alarm.name === 'inboxKeepAlive') {
        ensureInboxTab();
    }
});

// ── The Operator closed the Sender Tab ────────────────────────────
// Read as "stop for now": the DM in flight (if any) goes back to the front of
// the queue and the campaign pauses, rather than a new tab popping open at
// the next send. Resume from the popup carries on.
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get(['senderTabId', 'currentTask', 'isExecuting', 'campaignQueue'], (result) => {
        if (result.senderTabId !== tabId) return;
        chrome.alarms.clear('dripEngine');
        chrome.alarms.clear('sendWatchdog');
        const queue = result.campaignQueue || [];
        const requeue = result.isExecuting && result.currentTask;
        chrome.storage.local.remove('senderTabId');
        chrome.storage.local.set({
            campaignQueue: requeue ? [stripDispatch(result.currentTask), ...queue] : queue,
            currentTask:   null,
            isExecuting:   false,
            isPaused:      queue.length > 0 || !!requeue,
            nextAlarmTime: null,
        });
    });
});

// A lead going back into the queue must be handed out again.
function stripDispatch(task) {
    const rest = { ...task };
    delete rest.dispatched;
    return rest;
}

// Periodic heartbeat so the inbox poller has a live instagram.com tab during
// active outreach (the content-script poller only runs on an IG page).
chrome.alarms.create('inboxKeepAlive', { periodInMinutes: 3 });

// Ensure a background IG tab exists ONLY while a campaign is active — avoids
// popping tabs open when the user isn't running outreach. The Sender Tab
// counts: it is an instagram.com tab.
function ensureInboxTab() {
    chrome.storage.local.get(['campaignQueue', 'isExecuting'], (result) => {
        const active = result.isExecuting || (result.campaignQueue && result.campaignQueue.length > 0);
        if (!active) return;
        chrome.tabs.query({}, (tabs) => {
            const hasIg = tabs.some((t) => t.url && t.url.includes('instagram.com'));
            if (hasIg) return;
            chrome.tabs.create(
                { url: 'https://www.instagram.com/direct/inbox/', active: false, pinned: true },
                () => void chrome.runtime.lastError,
            );
        });
    });
}

// ── Recover orphaned task on browser restart ──────────────────────
// Tab ids don't survive a restart, so the old Sender Tab is forgotten too.
chrome.runtime.onStartup?.addListener(() => {
    chrome.storage.local.remove('senderTabId');
    chrome.storage.local.get(['currentTask', 'isExecuting', 'campaignQueue'], (result) => {
        if (result.currentTask && result.isExecuting) {
            const queue = result.campaignQueue || [];
            queue.unshift(stripDispatch(result.currentTask));
            chrome.storage.local.set({
                campaignQueue: queue,
                currentTask:   null,
                isExecuting:   false,
            }, processNextLead);
        }
    });
});

// ── Notify open MagnetEngine dashboard tabs ───────────────────────
// The content script on those tabs relays the message into the page.
function broadcastToApp(message) {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (!tab.id || !tab.url) continue;
            const isAppTab = APP_HOSTS.some((h) => tab.url.includes(h)) ||
                            tab.url.startsWith('http://localhost');
            if (isAppTab) {
                chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
            }
        }
    });
}

// ── Today's sending, as the dashboard reads it ───────────────────
function readStats(sendResponse) {
    chrome.storage.local.get(['dailySentCount', 'dailyResetDate', 'dailyCap', 'sentLog', 'sentHandles'], (result) => {
        const fresh = result.dailyResetDate === new Date().toDateString();
        sendResponse({
            dailySentCount: fresh ? (result.dailySentCount || 0) : 0,
            dailyCap:       Number(result.dailyCap) || DEFAULT_DAILY_CAP,
            sentLog:        fresh ? (result.sentLog || []) : [],
            // Not date-gated: the app reconciles against this so leads sent
            // on earlier days stay marked as sent and never get re-queued.
            sentHandles:    result.sentHandles || [],
        });
    });
}

// ── Restart a campaign that stopped at its cap ─────────────────────
// A campaign that reaches the Send Cap simply stops scheduling (see
// completeTask). When the cap is raised — or a new day resets the count —
// the queued leads should carry on, but nothing ever woke the drip back up.
// This does, one paced step from now: never an immediate send, and never a
// second schedule on top of one already waiting.
function resumeIfStalled() {
    chrome.storage.local.get(
        ['campaignQueue', 'isExecuting', 'isPaused', 'dailySentCount', 'dailyResetDate', 'dailyCap', 'minDelay', 'maxDelay'],
        (result) => {
            const queue = result.campaignQueue || [];
            if (queue.length === 0 || result.isExecuting || result.isPaused) return;

            const today = new Date().toDateString();
            const count = result.dailyResetDate === today ? (result.dailySentCount || 0) : 0;
            const cap = Number(result.dailyCap) || DEFAULT_DAILY_CAP;
            if (count >= cap) return;

            chrome.alarms.get('dripEngine', (alarm) => {
                if (alarm) return;
                scheduleNext(result);
            });
        },
    );
}

// ── Core: send the next DM in the Sender Tab ──────────────────────
function processNextLead() {
    chrome.storage.local.get(
        ['campaignQueue', 'isExecuting', 'isPaused', 'dailySentCount', 'dailyResetDate', 'dailyCap'],
        (result) => {
            if (result.isExecuting) return;
            if (result.isPaused)    return;

            const today = new Date().toDateString();
            const count = result.dailyResetDate === today ? (result.dailySentCount || 0) : 0;
            const cap = Number(result.dailyCap) || DEFAULT_DAILY_CAP;
            if (count >= cap) return;

            const queue = result.campaignQueue || [];
            if (queue.length === 0) {
                chrome.storage.local.set({ isExecuting: false }, closeSenderTab);
                return;
            }

            const [nextLead, ...rest] = queue;
            chrome.storage.local.set({
                campaignQueue: rest,
                currentTask:   stripDispatch(nextLead),
                isExecuting:   true,
            }, () => {
                chrome.alarms.create('sendWatchdog', { delayInMinutes: SEND_TIMEOUT_MINUTES });
                openInSenderTab(`https://www.instagram.com/${nextLead.handle}/`);
            });
        }
    );
}

// Navigate the Sender Tab to `url`, opening it first if there isn't one.
// Only the first open takes focus — so the Operator sees the overlay explain
// itself once — and every later send loads in place without stealing focus.
function openInSenderTab(url) {
    chrome.storage.local.get(['senderTabId'], ({ senderTabId }) => {
        const create = () => {
            chrome.tabs.create({ url, active: true }, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    // No tab, no send: put the lead back and stop rather than spin.
                    chrome.storage.local.get(['currentTask', 'campaignQueue'], (r) => {
                        chrome.alarms.clear('sendWatchdog');
                        chrome.storage.local.set({
                            campaignQueue: r.currentTask ? [r.currentTask, ...(r.campaignQueue || [])] : (r.campaignQueue || []),
                            currentTask:   null,
                            isExecuting:   false,
                            isPaused:      true,
                        });
                    });
                    return;
                }
                chrome.storage.local.set({ senderTabId: tab.id });
            });
        };
        if (!senderTabId) { create(); return; }
        chrome.tabs.update(senderTabId, { url }, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                chrome.storage.local.remove('senderTabId', create);
            }
        });
    });
}

// Take the overlay down and hand the tab back to the Operator, open.
function releaseSenderTab() {
    chrome.storage.local.remove('senderTabId');
}

// The campaign is over: close the tab it was sending from.
function closeSenderTab() {
    chrome.storage.local.get(['senderTabId'], ({ senderTabId }) => {
        if (!senderTabId) return;
        chrome.storage.local.remove('senderTabId', () => {
            chrome.tabs.remove(senderTabId, () => void chrome.runtime.lastError);
        });
    });
}

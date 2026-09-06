// MagnetEngine — Background Service Worker v2

// The wire protocol is defined once, in protocol.js, and shared with the
// content script (loaded first in content_scripts) and the app (which has a
// typed adapter asserted to match).
importScripts('protocol.js');
const { APP_TO_EXT, EXT_TO_APP, RUNTIME, APP_HOSTS } = MAGNET_PROTOCOL;

// Fallbacks used only if the web app didn't send a value with the campaign.
const DEFAULT_DAILY_CAP = 40;   // the app passes its own dailySendCap from Settings
const DEFAULT_MIN_DELAY = 3;
const DEFAULT_MAX_DELAY = 8;

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

    // ── Task completed by content script ──────────────────────────
    if (kind === RUNTIME.TASK_COMPLETE) {
        chrome.storage.local.get(['dailySentCount', 'dailyResetDate', 'failedCount', 'minDelay', 'maxDelay', 'dailyCap', 'isPaused', 'sentLog', 'sentHandles'], (result) => {
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
            if (request.result === 'success') {
                count++;
                if (request.handle) {
                    sentLog.push({ handle: request.handle, at: Date.now() });
                    if (sentLog.length > 2000) sentLog = sentLog.slice(-2000);

                    const normalized = String(request.handle).toLowerCase().replace(/^@/, '');
                    if (normalized && !sentHandles.includes(normalized)) sentHandles.push(normalized);
                    if (sentHandles.length > 5000) sentHandles = sentHandles.slice(-5000);
                }
            }
            if (request.result === 'failed') failed++;

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
                if (request.result === 'success' && request.handle) {
                    broadcastToApp({
                        type: EXT_TO_APP.SENT,
                        handle: request.handle,
                        dailySentCount: count,
                        dailyCap: cap,
                    });
                }

                if (count >= cap || result.isPaused) return;

                // Random wait within the user-chosen min–max range (minutes).
                const min = Number(result.minDelay) || DEFAULT_MIN_DELAY;
                const max = Math.max(min, Number(result.maxDelay) || DEFAULT_MAX_DELAY);
                const delayMinutes = min + Math.random() * (max - min);

                const nextAlarmTime = Date.now() + delayMinutes * 60 * 1000;
                chrome.storage.local.set({ nextAlarmTime }, () => {
                    chrome.alarms.create('dripEngine', { delayInMinutes: delayMinutes });
                });
            });
        });
        sendResponse({ status: 'acknowledged' });
        return true;
    }

    // ── Stats request from the web app (real sent count + sent log) ────────
    if (kind === RUNTIME.GET_STATS) {
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

    // ── Pause campaign ─────────────────────────────────────────────
    if (kind === RUNTIME.PAUSE) {
        chrome.alarms.clear('dripEngine');
        chrome.storage.local.set({ isPaused: true, nextAlarmTime: null });
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
        chrome.storage.local.set({
            campaignQueue: [],
            currentTask:   null,
            isExecuting:   false,
            isPaused:      false,
            nextAlarmTime: null,
            originalTotal: 0,
            failedCount:   0,
        });
        sendResponse({ status: 'cleared' });
        return true;
    }

    // ── Close tab ──────────────────────────────────────────────────
    if (kind === RUNTIME.CLOSE_TAB && sender.tab) {
        chrome.tabs.remove(sender.tab.id);
        sendResponse({ status: 'closed' });
        return true;
    }
});

// ── Alarm fires → process next lead / keep an IG tab alive for polling ─────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dripEngine') {
        chrome.storage.local.set({ nextAlarmTime: null }, processNextLead);
    } else if (alarm.name === 'inboxKeepAlive') {
        ensureInboxTab();
    }
});

// Periodic heartbeat so the inbox poller has a live instagram.com tab during
// active outreach (the content-script poller only runs on an IG page).
chrome.alarms.create('inboxKeepAlive', { periodInMinutes: 3 });

// Ensure a background IG tab exists ONLY while a campaign is active — avoids
// popping tabs open when the user isn't running outreach.
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

// ── Recover orphaned task on service worker restart ───────────────
chrome.runtime.onStartup?.addListener(() => {
    chrome.storage.local.get(['currentTask', 'isExecuting', 'campaignQueue'], (result) => {
        if (result.currentTask && result.isExecuting) {
            const queue = result.campaignQueue || [];
            queue.unshift(result.currentTask);
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

// ── Core: open next Instagram tab ─────────────────────────────────
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
                chrome.storage.local.set({ isExecuting: false });
                return;
            }

            const [nextLead, ...rest] = queue;
            chrome.storage.local.set({
                campaignQueue: rest,
                currentTask:   nextLead,
                isExecuting:   true,
            }, () => {
                chrome.tabs.create({ url: `https://www.instagram.com/${nextLead.handle}/` }, (_tab) => {
                    if (chrome.runtime.lastError) {
                        chrome.storage.local.set({ isExecuting: false });
                    }
                });
            });
        }
    );
}

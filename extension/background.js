// MagnetEngine — Background Service Worker v2

// Fallbacks used only if the web app didn't send a value with the campaign.
const DEFAULT_DAILY_CAP = 40;   // the app passes its own dailySendCap from Settings
const DEFAULT_MIN_DELAY = 3;
const DEFAULT_MAX_DELAY = 8;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // ── New campaign from web app ──────────────────────────────────
    if (request.type === 'MAGNET_ENGINE_CAMPAIGN') {
        chrome.storage.local.get(['isExecuting'], (result) => {
            if (result.isExecuting) {
                sendResponse({ status: 'rejected', reason: 'A campaign is already running. Pause or clear it first.' });
                return;
            }
            const leads = request.payload.leads;
            // User-chosen random delay range (minutes) between each DM.
            const minDelay = Number(request.payload.minDelay) || DEFAULT_MIN_DELAY;
            const maxDelay = Math.max(minDelay, Number(request.payload.maxDelay) || DEFAULT_MAX_DELAY);
            // Daily send cap comes from the app's Settings (config.dailySendCap).
            const dailyCap = Number(request.payload.dailyCap) || DEFAULT_DAILY_CAP;
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
    if (request.action === 'TASK_COMPLETE') {
        chrome.storage.local.get(['dailySentCount', 'dailyResetDate', 'failedCount', 'minDelay', 'maxDelay', 'dailyCap', 'isPaused'], (result) => {
            const today = new Date().toDateString();
            let count = result.dailySentCount || 0;
            if (result.dailyResetDate !== today) count = 0;

            let failed = result.failedCount || 0;
            if (request.result === 'success') count++;
            if (request.result === 'failed')  failed++;

            chrome.storage.local.set({
                dailySentCount: count,
                dailyResetDate: today,
                failedCount:    failed,
                isExecuting:    false,
                currentTask:    null,
            }, () => {
                const cap = Number(result.dailyCap) || DEFAULT_DAILY_CAP;
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

    // ── Pause campaign ─────────────────────────────────────────────
    if (request.action === 'pauseCampaign') {
        chrome.alarms.clear('dripEngine');
        chrome.storage.local.set({ isPaused: true, nextAlarmTime: null });
        sendResponse({ status: 'paused' });
        return true;
    }

    // ── Resume campaign ────────────────────────────────────────────
    if (request.action === 'resumeCampaign') {
        chrome.storage.local.set({ isPaused: false }, () => {
            processNextLead();
        });
        sendResponse({ status: 'resumed' });
        return true;
    }

    // ── Clear campaign ─────────────────────────────────────────────
    if (request.action === 'clearCampaign') {
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
    if (request.action === 'closeCurrentTab' && sender.tab) {
        chrome.tabs.remove(sender.tab.id);
        sendResponse({ status: 'closed' });
        return true;
    }
});

// ── Alarm fires → process next lead ───────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dripEngine') {
        chrome.storage.local.set({ nextAlarmTime: null }, processNextLead);
    }
});

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
                chrome.tabs.create({ url: `https://www.instagram.com/${nextLead.handle}/` }, (tab) => {
                    if (chrome.runtime.lastError) {
                        chrome.storage.local.set({ isExecuting: false });
                    }
                });
            });
        }
    );
}

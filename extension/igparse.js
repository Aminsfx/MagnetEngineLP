// ═══════════════════════════════════════════════════════════════════
// MagnetEngine — Instagram inbox parser
// ═══════════════════════════════════════════════════════════════════
//
// Turns the inbox data Instagram's own web app loads into the extension's
// snapshot shape: { threadId, handle, name, avatarUrl, messages[] }.
//
// In August 2026 Instagram retired the web REST inbox (/api/v1/direct_v2/,
// now a 404) and moved DMs to GraphQL ("Slide"): the inbox arrives as
// PolarisDirectInboxQuery, more threads as IGDThreadListOffMsysPaginationQuery,
// one thread as IGDThreadDetailQuery and its history as
// IGDMessageListOffMsysQuery. The field names below follow those responses,
// as documented by the open-source mautrix-meta bridge (pkg/instameow/slidetypes).
//
// Each response nests its threads differently, so threads are found by the
// one key every response shares — `as_ig_direct_thread` — rather than by
// path. Pure and Chrome-free: loaded as a classic content script before
// content.js, and evaluated by src/lib/igparse.test.ts.

(function () {
    const MAX_DEPTH = 12;

    /** Every object under `as_ig_direct_thread`, wherever the response put it. */
    function findThreads(node, out, depth) {
        if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return out;
        if (Array.isArray(node)) {
            for (const item of node) findThreads(item, out, depth + 1);
            return out;
        }
        for (const [key, value] of Object.entries(node)) {
            if (key === 'as_ig_direct_thread' && value && typeof value === 'object') out.push(value);
            else findThreads(value, out, depth + 1);
        }
        return out;
    }

    const str = (v) => (v === undefined || v === null ? '' : String(v));

    /** The text a person typed. Media, stickers and shares have none, and are skipped. */
    function messageText(m) {
        return str(m.text_body || (m.content && m.content.text_body)).trim();
    }

    function toIso(ms) {
        const n = Number(ms);
        return new Date(Number.isFinite(n) && n > 0 ? n : Date.now()).toISOString();
    }

    /** Who is reading the inbox: the thread's `viewer`, with both of their ids. */
    function readViewer(t) {
        const v = t.viewer || {};
        const pk = str(v.pk || v.id || t.viewer_id);
        if (!pk) return null;
        return {
            id: pk,
            username: str(v.username),
            avatarUrl: str(v.profile_pic_url),
            fbid: str(v.interop_messaging_user_fbid || v.fbid_v2),
        };
    }

    function normalizeThread(t) {
        if (t.is_group) return null; // a group has no single prospect behind it
        const viewer = readViewer(t);
        const users = Array.isArray(t.users) ? t.users : [];
        const other = users.find((u) => viewer === null || str(u.pk || u.id) !== viewer.id) || users[0] || null;

        const edges = (t.slide_messages && Array.isArray(t.slide_messages.edges)) ? t.slide_messages.edges : [];
        const messages = [];
        for (const edge of edges) {
            const m = edge && (edge.node || edge);
            if (!m) continue;
            const text = messageText(m);
            if (!text) continue;
            const senderFbid = str(m.sender_fbid);
            const senderIg = str(m.sender && (m.sender.igid || (m.sender.user_dict && m.sender.user_dict.pk)));
            const outbound = (viewer && viewer.fbid && senderFbid === viewer.fbid) || (viewer && senderIg && senderIg === viewer.id);
            messages.push({
                id: str(m.message_id || m.id),
                direction: outbound ? 'out' : 'in',
                text,
                createdAt: toIso(m.timestamp_ms),
            });
        }
        messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        return {
            threadId: str(t.thread_id || t.thread_key || t.id),
            handle: other ? str(other.username) : '',
            name: other ? str(other.full_name) : '',
            avatarUrl: other ? str(other.profile_pic_url) : '',
            messages: messages.filter((m) => m.id),
            viewer,
        };
    }

    /**
     * Parse one GraphQL response's `data`.
     * Returns the threads it held (a thread from a history-only response has
     * no handle; the background worker fills it from what it already knows)
     * and the viewer, if any thread named one.
     */
    function parseSlideInbox(data) {
        const threads = [];
        let viewer = null;
        for (const raw of findThreads(data, [], 0)) {
            const t = normalizeThread(raw);
            if (!t || !t.threadId) continue;
            if (!viewer && t.viewer) viewer = t.viewer;
            delete t.viewer;
            threads.push(t);
        }
        return { threads, viewer: viewer ? { id: viewer.id, username: viewer.username, avatarUrl: viewer.avatarUrl } : null };
    }

    globalThis.parseSlideInbox = parseSlideInbox;
})();

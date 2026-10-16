// ═══════════════════════════════════════════════════════════════════
// MagnetEngine — Instagram page hook (runs in the page's MAIN world)
// ═══════════════════════════════════════════════════════════════════
//
// Instagram's web app loads the inbox itself, over GraphQL (see igparse.js).
// This file listens to those responses as they arrive — it adds no request of
// its own to read them — and hands each one to the extension's content script
// with window.postMessage. It has to run in the page's own world, at
// document_start, so it is in place before Instagram's scripts make the calls.
//
// To pick up replies that arrive while the tab sits open, it replays the last
// inbox request Instagram itself made, at the same cadence the old inbox
// poller used. Replaying Instagram's own request (its doc_id, variables and
// tokens) rather than building one keeps this working when Instagram rotates
// a query id: the next page load hands us the new one.
//
// Nothing runs until the content script says someone is signed in to
// MagnetEngine in this browser (`enabled`).

(function () {
    if (window.__magnetEngineIgHook) return;
    window.__magnetEngineIgHook = true;

    const OUT = 'magnet-engine-ig';      // page hook → content script
    const IN = 'magnet-engine-ig-ctl';   // content script → page hook
    const POLL_MS = 100000;              // same pace as the old poller
    const INBOX_QUERY = 'PolarisDirectInboxQuery';
    const READ_QUERIES = new Set([
        INBOX_QUERY,
        'IGDThreadListOffMsysPaginationQuery',
        'IGDThreadDetailQuery',
        'IGDMessageListOffMsysQuery',
    ]);

    let enabled = false;
    /** The last inbox request Instagram made: replayed to poll. */
    let template = null;

    const isGraphql = (url) => /\/(api\/graphql|graphql\/query)\b/.test(String(url || ''));

    function friendlyName(body, headers) {
        const fromHeader = headers && (headers['x-fb-friendly-name'] || headers['X-FB-Friendly-Name']);
        if (fromHeader) return String(fromHeader);
        try {
            if (typeof body === 'string') return new URLSearchParams(body).get('fb_api_req_friendly_name');
            if (body instanceof URLSearchParams || body instanceof FormData) return body.get('fb_api_req_friendly_name');
        } catch { /* not a form body */ }
        return null;
    }

    function headersToObject(h) {
        const out = {};
        if (!h) return out;
        try {
            if (h instanceof Headers) h.forEach((v, k) => { out[k] = v; });
            else if (Array.isArray(h)) for (const [k, v] of h) out[k] = v;
            else Object.assign(out, h);
        } catch { /* leave it empty */ }
        return out;
    }

    /** A response may be one JSON document or several, one per line (deferred fragments). */
    function emit(name, text) {
        const clean = String(text || '').replace(/^for \(;;\);/, '');
        const docs = [];
        try { docs.push(JSON.parse(clean)); } catch {
            for (const line of clean.split('\n')) {
                try { if (line.trim()) docs.push(JSON.parse(line)); } catch { /* skip a partial line */ }
            }
        }
        for (const doc of docs) {
            if (doc && doc.data) window.postMessage({ source: OUT, name, data: doc.data }, window.location.origin);
        }
    }

    /** A request body as the form string it is, or null when it can't be read without consuming it. */
    function bodyText(body) {
        if (typeof body === 'string') return body;
        try {
            if (body instanceof URLSearchParams) return body.toString();
            if (body instanceof FormData) return new URLSearchParams(body).toString();
        } catch { /* a file in the form, or something stranger */ }
        return null;
    }

    function remember(name, url, body, headers) {
        const text = bodyText(body);
        if (name !== INBOX_QUERY || text === null) return;
        // A FormData body is replayed form-encoded, which /api/graphql accepts;
        // its multipart content-type (with the old boundary) must not travel with it.
        const replayHeaders = { ...headers };
        if (typeof body !== 'string') {
            for (const k of Object.keys(replayHeaders)) if (k.toLowerCase() === 'content-type') delete replayHeaders[k];
            replayHeaders['content-type'] = 'application/x-www-form-urlencoded';
        }
        template = { url: String(url), body: text, headers: replayHeaders };
    }

    // ── XMLHttpRequest ──
    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSend = XMLHttpRequest.prototype.send;
    const xhrHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.__magnet = { url: String(url), headers: {} };
        return xhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
        if (this.__magnet) this.__magnet.headers[String(k).toLowerCase()] = v;
        return xhrHeader.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        const meta = this.__magnet;
        if (meta && isGraphql(meta.url)) {
            const name = friendlyName(body, meta.headers);
            if (name && READ_QUERIES.has(name)) {
                remember(name, meta.url, body, meta.headers);
                this.addEventListener('load', () => {
                    if (this.status !== 200) return;
                    try {
                        const text = this.responseType === '' || this.responseType === 'text'
                            ? this.responseText
                            : JSON.stringify(this.response);
                        emit(name, text);
                    } catch { /* unreadable response */ }
                });
            }
        }
        return xhrSend.apply(this, arguments);
    };

    // ── fetch ──
    // Instagram's first inbox load on a full page load goes through fetch with
    // a Request object, whose body and headers live on the Request rather than
    // in `init` — and whose body can only be read from a copy taken before the
    // page's own fetch consumes it.
    const pageFetch = window.fetch;
    window.fetch = function (input, init) {
        let url = null;
        let copy = null;
        try {
            const req = typeof Request !== 'undefined' && input instanceof Request ? input : null;
            url = req ? req.url : String(input && input.url ? input.url : input);
            if (isGraphql(url) && req && !(init && init.body)) copy = req.clone();
        } catch { url = null; }

        const promise = pageFetch.apply(this, arguments);
        if (!url || !isGraphql(url)) return promise;

        (async () => {
            const headers = { ...(copy ? headersToObject(copy.headers) : {}), ...headersToObject(init && init.headers) };
            const body = init && init.body ? init.body : copy ? await copy.text() : null;
            const name = friendlyName(body, headers);
            if (!name || !READ_QUERIES.has(name)) return;
            remember(name, url, body, headers);
            const res = await promise;
            if (res.ok) emit(name, await res.clone().text());
        })().catch(() => { /* never break the page's own request */ });
        return promise;
    };

    // ── Polling: replay Instagram's own inbox request ──
    async function poll() {
        if (!enabled || !template || document.visibilityState === 'prerender') return;
        try {
            const res = await window.fetch(template.url, {
                method: 'POST',
                credentials: 'include',
                headers: template.headers,
                body: template.body,
            });
            // A token Instagram has since rotated: forget the request and wait
            // for the page to make a fresh one.
            if (!res.ok) template = null;
        } catch { /* offline; try again next tick */ }
    }
    setInterval(poll, POLL_MS);

    window.addEventListener('message', (event) => {
        if (event.source !== window || !event.data || event.data.source !== IN) return;
        const was = enabled;
        enabled = !!event.data.enabled;
        // Just signed in: read now rather than at the next tick.
        if (enabled && !was) setTimeout(poll, 2000);
    });
})();

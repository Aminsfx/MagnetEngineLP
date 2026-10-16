// Records Instagram-Reel B-roll (1080×1920, 9:16) of the real Campaign Builder
// and Approval Queue, on sample data (scripts/broll/broll.tsx).
//
//   npm run demo                                  # serves the harness on :3000
//   node scripts/broll/record.mjs search broll-output/campaign-search.mp4
//   node scripts/broll/record.mjs queue  broll-output/approve.mp4
//
// Headless Chrome renders the page at 810×1440 CSS px × 4/3 = 1080×1920 and
// streams every painted frame (Page.startScreencast). A second Chrome window
// draws those frames onto a 1080×1920 canvas and records it with MediaRecorder,
// so Chrome itself encodes the MP4 — no ffmpeg needed. A drawn cursor shows
// where each click lands, because screen captures include no pointer.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [scene = 'queue', out = `broll-output/${scene}.mp4`, base = 'http://localhost:3000'] = process.argv.slice(2);
const W = 810, H = 1440, SCALE = 4 / 3;            // → 1080 × 1920
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Chrome + CDP plumbing ──
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(process.env.TEMP || '.', `broll-${port}`)}`,
    '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    'about:blank',
], { stdio: 'ignore' });

async function json(path, method = 'GET') {
    for (let i = 0; i < 60; i++) {
        try { return await (await fetch(`http://127.0.0.1:${port}${path}`, { method })).json(); } catch { await sleep(200); }
    }
    throw new Error('Chrome did not start');
}

function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const listeners = [];
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) listeners.forEach((l) => l(m));
    });
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expression) => {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || 'evaluate failed');
        return res.result?.result?.value;
    };
    return new Promise((resolve) => ws.addEventListener('open', () => resolve({ send, evaluate, on: (l) => listeners.push(l), ws }), { once: true }));
}

const [first] = (await json('/json/list')).filter((t) => t.type === 'page');
const app = await connect(first.webSocketDebuggerUrl);
// The encoder gets its own WINDOW: a second tab would push the app into the
// background, and a background tab sends no screencast frames.
const browser = await connect((await json('/json/version')).webSocketDebuggerUrl);
const { result: { targetId } } = await browser.send('Target.createTarget', { url: 'about:blank', newWindow: true });
const encTarget = (await json('/json/list')).find((t) => t.id === targetId);
const enc = await connect(encTarget.webSocketDebuggerUrl);
await app.send('Page.bringToFront');

// ── The encoder window: frames in, MP4 out ──
// Frames are replayed at the moment they were painted (their screencast
// timestamps), after recording — forwarding them live let them queue up behind
// CDP and the clip came out slow at the start and rushed at the end.
const mime = await enc.evaluate(`(() => {
    const types = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    window.MIME = types.find((t) => MediaRecorder.isTypeSupported(t));
    window.FRAMES = [];
    window.addFrames = (list) => { window.FRAMES.push(...list); return window.FRAMES.length; };
    window.render = async (tailMs, warps) => {
        const canvas = Object.assign(document.createElement('canvas'), { width: 1080, height: 1920 });
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        const bitmaps = await Promise.all(FRAMES.map(async (f) => {
            const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
            return { ts: f.ts, img: await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' })) };
        }));
        // Replay clock: real time between frames, divided by a warp's speed
        // inside its frame range (the sample search's waiting, sped up).
        let clock = 0;
        bitmaps.forEach((b, k) => {
            if (k > 0) {
                const w = warps.find((x) => k > x.from && k <= x.to);
                clock += (b.ts - bitmaps[k - 1].ts) / (w ? w.speed : 1);
            }
            b.at = clock;
        });
        const t0 = 0;
        const stream = canvas.captureStream(30);
        const rec = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: 12_000_000 });
        const chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        ctx.drawImage(bitmaps[0].img, 0, 0, 1080, 1920);
        rec.start(500);
        const startAt = performance.now();
        const total = bitmaps[bitmaps.length - 1].at * 1000 + tailMs;
        let i = 0;
        await new Promise((done) => {
            const tick = () => {
                const now = performance.now() - startAt;
                while (i + 1 < bitmaps.length && (bitmaps[i + 1].at - t0) * 1000 <= now) i++;
                ctx.drawImage(bitmaps[i].img, 0, 0, 1080, 1920);
                if (now >= total) return done();
                setTimeout(tick, 1000 / 60);
            };
            tick();
        });
        await new Promise((r) => { rec.onstop = r; rec.stop(); });
        const buf = new Uint8Array(await new Blob(chunks, { type: MIME }).arrayBuffer());
        let s = ''; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode(...buf.subarray(k, k + 0x8000));
        return btoa(s);
    };
    return window.MIME;
})()`);

// ── The app window ──
await app.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
await app.send('Page.enable');
await app.send('Page.navigate', { url: `${base}/scripts/broll/index.html?scene=${scene}` });
await sleep(4500);

// Framing: drop the dev-only demo notice from the recording.
await app.evaluate(`(() => {
    const demo = [...document.querySelectorAll('div')].find((e) => e.textContent.trim().startsWith('Demo mode.') && e.children.length < 6);
    demo?.setAttribute('data-broll-hide', '');
})()`);
await sleep(300);

const center = (js) => app.evaluate(`(() => { const el = ${js}; if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
const moveCursor = async (p, ms = 650) => {
    await app.evaluate(`(() => { const c = document.getElementById('broll-cursor'); c.style.left = '${p.x}px'; c.style.top = '${p.y}px'; })()`);
    await sleep(ms);
};
const click = async (p) => {
    await app.evaluate(`document.getElementById('broll-cursor').style.transform = 'scale(0.75)'`);
    await app.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    await app.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await sleep(90);
    await app.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await app.evaluate(`document.getElementById('broll-cursor').style.transform = 'scale(1)'`);
};
const type = async (text) => {
    for (const ch of text) { await app.send('Input.insertText', { text: ch }); await sleep(65 + Math.random() * 45); }
};
const scrollBy = async (dy, ms = 1100) => {
    await app.evaluate(`window.scrollBy({ top: ${dy}, behavior: 'smooth' })`);
    await sleep(ms);
};

// ── Record ──
const captured = [];
const warps = [];
app.on((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    app.send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
    captured.push({ data: m.params.data, ts: m.params.metadata.timestamp });
});
await app.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
await moveCursor({ x: W * 0.62, y: H * 0.78 }, 50);
await sleep(900);

if (scene === 'search') {
    const input = await center(`document.querySelector('input[placeholder^="coaches"]')`);
    await moveCursor(input, 750);
    await click(input);
    await sleep(250);
    await type('business coach');
    await sleep(450);
    const start = await center(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Start scrape')`);
    await moveCursor(start, 700);
    await click(start);
    await sleep(1200);
    // The sample search takes ~12 s; that wait is played back 4x faster.
    const from = captured.length;
    await moveCursor({ x: W * 0.8, y: H * 0.86 }, 400);
    for (let i = 0; i < 120; i++) {
        await sleep(250);
        const done = await app.evaluate(`[...document.querySelectorAll('button')].some((b) => /^Add \\d+ to Queue/.test(b.textContent.trim()))`);
        if (done) break;
    }
    warps.push({ from, to: captured.length, speed: 4 });
    await sleep(700);
    await scrollBy(Math.round(H * 0.5), 1700);
    await sleep(1500);
    const add = await center(`[...document.querySelectorAll('button')].reverse().find((b) => /^Add \\d+ to Queue/.test(b.textContent.trim()))`);
    if (add) {
        await moveCursor(add, 800);
        await click(add);
    }
    await sleep(1600);
} else {
    const firstDm = await center(`document.querySelector('tbody tr td:nth-child(4)')`);
    await moveCursor(firstDm, 900);
    await sleep(700);
    for (let i = 0; i < 3; i++) {
        const approve = await center(`document.querySelector('button[aria-label^="Approve the DM to"]')`);
        await moveCursor(approve, i === 0 ? 800 : 650);
        await click(approve);
        await sleep(i === 2 ? 900 : 750);
    }
    const tab = await center(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('Approved'))`);
    await moveCursor(tab, 800);
    await click(tab);
    await sleep(500);
    await moveCursor({ x: W * 0.72, y: H * 0.5 }, 600);
    await sleep(2200);
}

await app.send('Page.stopScreencast');
await sleep(400);
for (let i = 0; i < captured.length; i += 12) {
    await enc.evaluate(`addFrames(${JSON.stringify(captured.slice(i, i + 12))})`);
}
const frames = captured.length;
const b64 = await enc.evaluate(`render(900, ${JSON.stringify(warps)})`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(JSON.stringify({ scene, out, mime, frames, bytes: Math.round(b64.length * 0.75) }));
chrome.kill();
process.exit(0);

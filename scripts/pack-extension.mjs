// Packs extension/ into magnetengine-extension.zip for the Chrome Web Store.
//
// The store wants manifest.json at the ROOT of the zip. Windows' "Compress"
// on the folder nests everything under extension/ (→ "No manifest found in
// package"), and PowerShell 5's Compress-Archive writes backslash paths, so
// this writes the zip itself with Node built-ins — no `zip` binary needed.
//
// Run: npm run ext:zip
import { deflateRawSync, crc32 } from 'node:zlib';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'extension');
const outFile = join(root, 'magnetengine-extension.zip');

/** Notes for the listing, not part of the package. */
const EXCLUDE = new Set(['store-listing.md']);

function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
        if (name.startsWith('.') || EXCLUDE.has(name)) return [];
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : [full];
    });
}

const manifest = JSON.parse(readFileSync(join(srcDir, 'manifest.json'), 'utf8'));

// The store build drops the dev-only localhost match: reviewers ask why a
// store extension injects into every local server, and no customer runs one.
const DEV_MATCHES = new Set(['http://localhost:*/*']);
for (const cs of manifest.content_scripts ?? []) cs.matches = cs.matches.filter((m) => !DEV_MATCHES.has(m));

// The store's own upload checks, run here so a bad zip never gets that far.
// https://developer.chrome.com/docs/extensions/reference/manifest
const problems = [];
if (manifest.manifest_version !== 3) problems.push('manifest_version must be 3');
if (!manifest.name || manifest.name.length > 75) problems.push(`name must be 1–75 characters (is ${manifest.name?.length ?? 0})`);
if (!manifest.description || manifest.description.length > 132) {
    problems.push(`description must be 1–132 characters (is ${manifest.description?.length ?? 0})`);
}
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version ?? '') || manifest.version.split('.').some((n) => Number(n) > 65535 || (n.length > 1 && n[0] === '0'))) {
    problems.push(`version "${manifest.version}" must be 1–4 dot-separated integers, 0–65535, no leading zeros`);
}
if (!manifest.icons?.['128']) problems.push('icons must include a 128px icon');
if (problems.length) {
    console.error('extension/manifest.json would be rejected by the Chrome Web Store:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}

const files = walk(srcDir).map((full) => {
    const name = relative(srcDir, full).split('\\').join('/');
    const data = name === 'manifest.json' ? Buffer.from(JSON.stringify(manifest, null, 2) + '\n') : readFileSync(full);
    return { name, data };
});
if (!files.some((f) => f.name === 'manifest.json')) throw new Error('manifest.json missing from extension/');
const missing = [manifest.background?.service_worker, manifest.action?.default_popup,
    ...Object.values(manifest.icons ?? {}), ...(manifest.content_scripts ?? []).flatMap((cs) => cs.js ?? [])]
    .filter((p) => p && !files.some((f) => f.name === p));
if (missing.length) throw new Error(`manifest.json names files that aren't in extension/: ${missing.join(', ')}`);

const local = [];
const central = [];
let offset = 0;
for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = crc32(data);
    // Fixed timestamp (1980-01-01) so the same sources give the same zip.
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6); // UTF-8 names
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt16LE(0, 10);
    head.writeUInt16LE(0x21, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    head.writeUInt16LE(0, 28);
    local.push(head, nameBuf, body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    head.copy(dir, 8, 6, 26); // flags, method, time, date, crc, sizes
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + body.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(outFile, Buffer.concat([...local, centralBuf, end]));
console.log(`magnetengine-extension.zip — v${manifest.version}, ${files.length} files:`);
for (const f of files) console.log(`  ${f.name}`);

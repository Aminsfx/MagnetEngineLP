// Renders the MagnetEngine extension icon (emerald magnet "M" on near-black)
// at the four sizes Chrome requires. Run: npm run ext:icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'extension', 'icons');
mkdirSync(outDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#030A06"/><path d="M32 96V48a16 16 0 0 1 32 0v20a8 8 0 0 0 16 0V48a16 16 0 0 1 16-16" stroke="#10B981" stroke-width="14" stroke-linecap="round" fill="none"/><rect x="25" y="88" width="28" height="14" rx="4" fill="#34D399"/><rect x="75" y="24" width="28" height="14" rx="4" fill="#34D399"/></svg>`;

for (const size of [16, 32, 48, 128]) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
    const file = join(outDir, `icon${size}.png`);
    writeFileSync(file, png);
    console.log(`wrote ${file} (${png.length} bytes)`);
}

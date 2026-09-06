// Renders the extension icon at the four sizes Chrome requires.
//
// This is the landing page's mark, not a second logo: `src/components/Logo.tsx`
// draws a white disc with Lucide's `Magnet` glyph rotated 90° in near-black
// (#030604) at 2.5 stroke, and so does the SVG below — same glyph path, same
// colours, same 55% glyph-to-disc ratio the component's `w-10`/`22px` pair gives.
//
// Run: npm run ext:icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'extension', 'icons');
mkdirSync(outDir, { recursive: true });

/** Lucide `magnet` (v0.563.0) — the exact paths <Magnet /> renders. */
const MAGNET = [
    'm12 15 4 4',
    'M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z',
    'm5 8 4 4',
];

const SIZE = 128;          // canvas the SVG is authored on
const GLYPH = SIZE * 0.55; // Logo.tsx: a 22px glyph inside a 40px disc
const OFFSET = (SIZE - GLYPH) / 2;
const SCALE = GLYPH / 24;  // Lucide's viewBox is 24×24

/**
 * Logo.tsx's `strokeWidth={2.5}`, at every size. Bumping it for the 16px slot
 * is the obvious optical-sizing move and it was tried: at 16px this glyph's
 * inner gaps close up and the horseshoe reads as a blob, so a heavier stroke
 * is worse, not better.
 */
const STROKE = 2.5;

const icon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">\
<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#ffffff"/>\
<g transform="translate(${OFFSET} ${OFFSET}) scale(${SCALE}) rotate(90 12 12)" \
fill="none" stroke="#030604" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">\
${MAGNET.map((d) => `<path d="${d}"/>`).join('')}\
</g></svg>`;

for (const size of [16, 32, 48, 128]) {
    const png = new Resvg(icon(), { fitTo: { mode: 'width', value: size } })
        .render()
        .asPng();
    const file = join(outDir, `icon${size}.png`);
    writeFileSync(file, png);
    console.log(`wrote ${file} (${png.length} bytes)`);
}

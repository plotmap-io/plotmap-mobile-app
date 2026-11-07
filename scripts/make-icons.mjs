/**
 * Render every app icon from one source: assets/brand/mark.svg, the Plotmap
 * mark, the same file the web uses.
 *
 *   npm i -D sharp && node scripts/make-icons.mjs
 *
 * sharp is not a dependency of the app — icons change about once a year, and
 * carrying a native image library in every install and every CI run to do it
 * is not worth it. Install it when you need it; the PNGs are committed.
 *
 * The insets are the part worth keeping: each platform crops differently, so
 * the mark is drawn at a different size on each canvas rather than one image
 * being reused and hoping.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'assets/brand/mark.svg');
const OUT = resolve(ROOT, 'assets/images');
const BRAND = '#a13348';
const PAPER = '#ffffff';

const svg = readFileSync(SRC, 'utf8');

/** The mark recoloured, for the monochrome Android layer. */
function recoloured(hex) {
  return Buffer.from(svg.replaceAll(BRAND, hex));
}

/**
 * @param size    canvas edge in pixels
 * @param cover   how much of that edge the mark spans
 * @param ground  background colour, or null for transparency
 */
async function icon(file, { size, cover, ground = null, source = Buffer.from(svg) }) {
  const mark = cover > 0 ? await sharp(source, { density: 900 })
    .resize(Math.round(size * cover), Math.round(size * cover), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer() : null;

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ground ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  mkdirSync(dirname(resolve(OUT, file)), { recursive: true });
  const composed = mark ? canvas.composite([{ input: mark, gravity: 'centre' }]) : canvas;
  // An icon on a ground keeps no alpha channel — the App Store rejects one
  // that does, even when every pixel in it is opaque.
  await (ground ? composed.removeAlpha() : composed).png().toFile(resolve(OUT, file));
  console.log(`  ${file}  ${size}×${size}`);
}

console.log('assets/images/');

// iOS and the universal fallback: no transparency allowed, so it sits on paper.
await icon('icon.png', { size: 1024, cover: 0.78, ground: PAPER });

// Android masks an adaptive icon to a shape and may crop to the middle 66%,
// so the foreground is drawn smaller and the background is just the ground.
await icon('android-icon-foreground.png', { size: 1024, cover: 0.52 });
await icon('android-icon-background.png', { size: 1024, cover: 0, ground: PAPER });
await icon('android-icon-monochrome.png', {
  size: 1024,
  cover: 0.52,
  source: recoloured('#000000'),
});

// Splash and favicon keep their transparency; the splash ground is in app.json.
await icon('splash-icon.png', { size: 512, cover: 0.86 });
await icon('favicon.png', { size: 96, cover: 0.88, ground: PAPER });

// The iOS 26 layered icon (assets/expo.icon) takes the mark as an SVG layer.
const composer = resolve(ROOT, 'assets/expo.icon');
mkdirSync(resolve(composer, 'Assets'), { recursive: true });
writeFileSync(resolve(composer, 'Assets/mark.svg'), svg);
writeFileSync(
  resolve(composer, 'icon.json'),
  JSON.stringify(
    {
      fill: { 'automatic-gradient': 'extended-srgb:1.00000,1.00000,1.00000,1.00000' },
      groups: [
        {
          layers: [{ 'image-name': 'mark.svg', name: 'mark' }],
          shadow: { kind: 'neutral', opacity: 0.35 },
        },
      ],
      'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
    },
    null,
    2,
  ) + '\n',
);
console.log('assets/expo.icon/  mark.svg + icon.json');

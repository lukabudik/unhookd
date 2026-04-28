import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
const appDir = join(__dirname, '../src/app')

// ─── Logo design ──────────────────────────────────────────────────────────────
//
// A stylised U shape where the right arm curves outward into an open fishhook.
// The hook end is marked with a small green accent dot — the moment of release.
// Reads as: "U" for Unhookd + a hook that's been freed.
//
// Palette:
//   Background  #1a1612 → #272010  (the app's dark bg with a warm radial lift)
//   Mark        #f4c490 → #c87840  (amber gradient, top-light to bottom-deep)
//   Accent dot  #7fb069            (success green — freedom)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="42%" cy="36%" r="66%">
      <stop offset="0%" stop-color="#282012"/>
      <stop offset="100%" stop-color="#1a1612"/>
    </radialGradient>
    <linearGradient id="mark" x1="15%" y1="8%" x2="72%" y2="92%">
      <stop offset="0%" stop-color="#f4c490"/>
      <stop offset="48%" stop-color="#e8a87c"/>
      <stop offset="100%" stop-color="#c87840"/>
    </linearGradient>
    <linearGradient id="dot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#97c882"/>
      <stop offset="100%" stop-color="#6aa058"/>
    </linearGradient>
  </defs>

  <!-- Rounded-square background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!--
    Hook path:
      M 148 98         — top of left arm
      L 148 318        — left arm descends
      A 108 108 0 0 1  — bottom arc (clockwise, dips to y≈426)
        364 318        — top of right arm base
      L 364 198        — right arm ascends
      C 364 132        — cubic bezier: first control (pull upward)
        420 106        — second control (swing right + up)
        420 152        — hook tip lands here
  -->
  <path
    d="M 148 98 L 148 318 A 108 108 0 0 1 364 318 L 364 198 C 364 132 420 106 420 152"
    fill="none"
    stroke="url(#mark)"
    stroke-width="64"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Liberation dot — the freed tip of the hook -->
  <circle cx="420" cy="152" r="22" fill="url(#dot)"/>
</svg>`

// Save master SVG
writeFileSync(join(publicDir, 'icon.svg'), svg)
writeFileSync(join(appDir, 'icon.svg'), svg)
console.log('✓ icon.svg written')

const buf = Buffer.from(svg)

const sizes = [
  { file: join(publicDir, 'icon-512.png'), size: 512 },
  { file: join(publicDir, 'icon-192.png'), size: 192 },
  { file: join(publicDir, 'apple-touch-icon.png'), size: 180 },
  { file: join(publicDir, 'favicon-32.png'), size: 32 },
  { file: join(publicDir, 'favicon-16.png'), size: 16 },
]

for (const { file, size } of sizes) {
  await sharp(buf, { density: Math.ceil((size / 512) * 300) })
    .resize(size, size)
    .png()
    .toFile(file)
  console.log(`✓ ${size}×${size} → ${file.split('/').slice(-2).join('/')}`)
}

console.log('\nAll icons generated.')

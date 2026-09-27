// Three style directions for the IATI ad (1200 x 1200). Usage: node src/directions/build-directions.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', 'export', 'directions');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const check = (c, s, w = 3) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// "We fixed that." signature at a given font size
const sig = (size, style) => {
  const b = Math.round(size * 0.92);
  return `<div class="sig" style="font-size: ${size}px; gap: ${Math.round(size * 0.28)}px; padding-bottom: ${Math.round(size * 0.22)}px; ${style}">
    <span>We fixed that.</span>
    <span class="badge" style="width: ${b}px; height: ${b}px; box-shadow: 0 0 0 ${Math.round(size * 0.18)}px rgba(90,182,255,0.16);">${check('#003872', Math.round(b * 0.6), 3)}</span>
    <svg class="swoosh" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true" style="bottom: -${Math.round(size * 0.12)}px; width: calc(100% - ${b + Math.round(size * 0.28)}px); height: ${Math.round(size * 0.3)}px;"><path d="M4 16 C 90 5, 210 2, 300 8 S 380 15, 396 7" stroke="#5ab6ff" stroke-width="${Math.max(5, Math.round(size / 14))}" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
  </div>`;
};

const logo = (style) => `<div class="logo" style="${style}"><img src="../../assets/impactid-logo.png" alt="impactID"></div>`;

const rings = (cx, cy, radii, color = '255,255,255', base = 0.14) =>
  radii.map((r, i) => `<div class="ring" style="left: ${cx - r}px; top: ${cy - r}px; width: ${2 * r}px; height: ${2 * r}px; border: ${i === 0 ? 2 : 1.5}px solid rgba(${color},${(base * (1 - i / (radii.length + 1))).toFixed(3)});"></div>`).join('');

const glow = (cx, cy, r, a = 0.38) =>
  `<div class="ring" style="left: ${cx - r}px; top: ${cy - r}px; width: ${2 * r}px; height: ${2 * r}px; background: radial-gradient(circle, rgba(0,127,216,${a}) 0%, rgba(0,127,216,0) 62%);"></div>`;

const HEAD = 'Another quarter lost to your IATI export?';

// ---------- A: typographic ----------
const A = `
  ${glow(900, 780, 640, 0.42)}
  ${rings(900, 780, [230, 360, 500, 650])}
  <div class="abs" style="left: 80px; top: 84px; width: 1000px; font-size: 76px; line-height: 1.06; font-weight: 700; letter-spacing: -0.025em;">${HEAD}</div>
  <div class="abs" style="left: 76px; top: 318px; display: flex; align-items: baseline; gap: 26px;">
    <span style="position: relative; font-size: 170px; font-weight: 800; letter-spacing: -0.045em; line-height: 1; color: #6f8fb3;">1 week
      <span style="position: absolute; left: -12px; right: -12px; top: 52%; height: 16px; border-radius: 999px; background: #cc0254; transform: rotate(-5deg);"></span>
    </span>
  </div>
  <div class="abs" style="left: 70px; top: 510px; font-size: 290px; font-weight: 800; letter-spacing: -0.055em; line-height: 1; color: #ffffff;">10 min.</div>
  ${sig(92, 'left: 80px; top: 872px;')}
  ${logo('right: 72px; bottom: 64px;')}
`;

// ---------- B: before / after split ----------
const sheet = (x, y, rot, z) => `
  <div class="abs" style="left: ${x}px; top: ${y}px; width: 250px; height: 180px; transform: rotate(${rot}deg); z-index: ${z}; background: #e9eef4; border-radius: 10px; box-shadow: 0 14px 30px rgba(0,10,30,0.45); padding: 14px; display: grid; grid-template-columns: 1.4fr 1fr 1fr; grid-auto-rows: 20px; gap: 5px;">
    ${Array.from({ length: 18 }, (_, i) => `<span style="border-radius: 3px; background: ${i < 3 ? '#9fb3c9' : '#ffffff'};"></span>`).join('')}
  </div>`;
const errDot = (x, y) => `<div class="abs" style="left: ${x}px; top: ${y}px; z-index: 9; width: 52px; height: 52px; border-radius: 50%; background: #cc0254; color: #fff; font-size: 34px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.35);">!</div>`;

const B = `
  <div class="abs" style="left: 80px; top: 80px; width: 1040px; font-size: 64px; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em;">${HEAD}</div>

  <div class="abs" style="left: 60px; top: 290px; width: 520px; height: 600px; border-radius: 28px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.16); overflow: hidden;">
    ${sheet(46, 40, -9, 1)}${sheet(210, 34, 7, 2)}${sheet(70, 160, 4, 3)}${sheet(230, 190, -6, 4)}${sheet(120, 290, -2, 5)}
    ${errDot(56, 150)}${errDot(398, 260)}${errDot(210, 400)}
    <div class="abs" style="left: 0; right: 0; bottom: 34px; z-index: 10; text-align: center; font-size: 54px; font-weight: 800; letter-spacing: -0.02em; color: #8fa8c4;"><span style="text-decoration: line-through; text-decoration-color: #cc0254; text-decoration-thickness: 7px;">1 week</span></div>
  </div>

  <div class="abs" style="left: 620px; top: 290px; width: 520px; height: 600px; border-radius: 28px; background: radial-gradient(circle at 50% 42%, rgba(0,127,216,0.55) 0%, rgba(0,127,216,0.10) 60%), rgba(255,255,255,0.05); border: 2px solid rgba(90,182,255,0.45); overflow: hidden;">
    ${rings(260, 250, [150, 210, 270], '90,182,255', 0.35)}
    <div class="abs" style="left: 130px; top: 110px; width: 260px; height: 290px; background: #ffffff; border-radius: 22px; box-shadow: 0 24px 50px rgba(0,10,30,0.5); padding: 28px; display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 26px; font-weight: 800; color: #003872;">IATI file</div>
      <div style="height: 12px; border-radius: 6px; background: #ebeff4;"></div>
      <div style="height: 12px; width: 80%; border-radius: 6px; background: #ebeff4;"></div>
      <div style="height: 12px; width: 60%; border-radius: 6px; background: #ebeff4;"></div>
      <div style="flex: 1;"></div>
      <div style="font-size: 20px; font-weight: 700; color: #00912b;">14 of 14 valid</div>
    </div>
    <div class="abs" style="left: 330px; top: 70px; width: 104px; height: 104px; border-radius: 50%; background: #00912b; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 14px rgba(0,145,43,0.22), 0 12px 30px rgba(0,0,0,0.35);">${check('#ffffff', 60, 3.4)}</div>
    <div class="abs" style="left: 0; right: 0; bottom: 34px; text-align: center; font-size: 54px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">10 minutes</div>
  </div>

  <div class="abs" style="left: 560px; top: 548px; z-index: 10; width: 80px; height: 80px; border-radius: 50%; background: #5ab6ff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 10px #003872;">
    <svg width="40" height="40" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" stroke="#003872" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>

  ${sig(76, 'left: 80px; top: 968px;')}
  ${logo('right: 72px; bottom: 64px;')}
`;

// ---------- C: one product moment ----------
const C = `
  ${glow(600, 760, 620, 0.5)}
  ${rings(600, 760, [190, 290, 400, 520, 650], '90,182,255', 0.34)}
  <div class="abs" style="left: 80px; top: 80px; width: 1040px; font-size: 64px; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em;">${HEAD}</div>
  ${sig(76, 'left: 80px; top: 256px;')}

  <div class="abs" style="left: 395px; top: 560px; display: flex; align-items: center; gap: 12px; padding: 12px 24px 12px 12px; border-radius: 999px; background: #ffffff; color: #003872; font-size: 26px; font-weight: 700; box-shadow: 0 14px 36px rgba(0,15,40,0.35);">
    <span style="width: 42px; height: 42px; border-radius: 50%; background: #00912b; display: flex; align-items: center; justify-content: center;">${check('#ffffff', 24, 3.4)}</span>14 of 14 activities valid
  </div>

  <div class="abs" style="left: 250px; top: 690px; width: 700px; height: 140px; border-radius: 999px; background: #cc0254; display: flex; align-items: center; justify-content: center; gap: 20px; font-size: 46px; font-weight: 800; letter-spacing: -0.01em; box-shadow: 0 0 0 14px rgba(204,2,84,0.22), 0 30px 60px rgba(0,10,30,0.5);">
    Publish to IATI
    <svg width="44" height="44" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>

  <svg class="abs" style="left: 800px; top: 790px; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.4));" width="84" height="100" viewBox="0 0 24 28" aria-hidden="true">
    <path d="M3 2 L3 22 L8.5 17 L12 26 L15.5 24.5 L12 16 L19.5 16 Z" fill="#ffffff" stroke="#003872" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>

  <div class="abs" style="left: 0; right: 0; top: 930px; display: flex; justify-content: center;">
    <div style="display: flex; align-items: center; gap: 22px; padding: 16px 30px; border-radius: 20px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.18); font-size: 38px; font-weight: 700;">
      <span style="color: #9fb6cf; text-decoration: line-through; text-decoration-color: rgba(159,182,207,0.8); font-weight: 500;">1 week</span>
      <svg width="34" height="34" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" stroke="#5ab6ff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>10 minutes</span>
    </div>
  </div>
  ${logo('left: 72px; bottom: 64px;')}
`;

const DIRS = { 'a-typographic': A, 'b-before-after': B, 'c-one-click': C };

const page = (body, name) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>IATI ${name}</title><link rel="stylesheet" href="dir.css"></head>
<body><div class="ad">${body}</div></body></html>`;

mkdirSync(out, { recursive: true });
const browser = await playwright.chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
for (const [name, body] of Object.entries(DIRS)) {
  const file = join(here, `iati-${name}.html`);
  writeFileSync(file, page(body, name));
  await tab.goto('file://' + file);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(150);
  const png = join(out, `impactid-li-iati-${name}-1200x1200.png`);
  await tab.locator('.ad').screenshot({ path: png });
  console.log('rendered', png);
}
await browser.close();

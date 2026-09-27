// Generates the LinkedIn ad HTML files (one per concept and format) and renders them to PNG.
// Usage: node src/build.mjs            (from linkedin-campaign/)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const check = (c = '#ffffff', s = 14, w = 3.2) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const arrow = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5" stroke="#5ab6ff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const tick = `<span class="tick">${check('#ffffff', 13, 3.4)}</span>`;

const fixedLine = `<div class="fixed"><span>We fixed that.</span><span class="badge">${check('#003872', 26, 3)}</span><svg class="swoosh" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 16 C 90 5, 210 2, 300 8 S 380 15, 396 7" stroke="#5ab6ff" stroke-width="5" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>`;

const metric = (k, b, a) => `<div class="metric"><span class="k">${k}</span><span class="ba"><span class="b">${b}</span>${arrow}<span class="a">${a}</span></span></div>`;

// ---------- Visuals (drawn on a 520 x 520 stage) ----------
const V = {
  iati: `
    <div class="card" style="left: 36px; top: 26px; width: 444px; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
      <div class="card-h"><div><div class="card-t">IATI validation</div><div class="card-s">14 activities · IATI Standard 2.03</div></div><span class="pill pink">Q3 2026</span></div>
      <div class="rows">
        <div class="row"><span class="l">${tick}Required fields complete</span></div>
        <div class="row"><span class="l">${tick}Activity dates consistent</span></div>
        <div class="row"><span class="l">${tick}Sector splits add up to 100%</span></div>
        <div class="row"><span class="l">${tick}Valid against the IATI schema</span></div>
      </div>
      <div class="foot"><span>14 of 14 activities valid</span><span style="color:#00912b">Ready</span></div>
      <div class="btn pink">Publish to IATI Registry</div>
    </div>
    <div class="chip" style="left: 110px; top: 438px;"><span class="dot" style="background:#007fd8">${check()}</span>IATI file ready in 10 minutes</div>`,

  donor_reporting: `
    <div style="position: absolute; left: 96px; top: 0; width: 430px; height: 300px; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,20,50,0.42);">
      <img src="../assets/photo-programme-officer.jpg" alt="" style="width: 100%; height: 100%; object-fit: cover; object-position: 55% 35%; display: block;">
    </div>
    <div class="card" style="left: 8px; top: 168px; width: 350px; padding: 20px; display: flex; flex-direction: column; gap: 14px;">
      <div class="card-h"><div class="card-t">Report generator</div><span class="pill sky">Q3 2026</span></div>
      <div style="display: flex; gap: 6px; font-size: 12.5px; font-weight: 700;">
        <span style="padding: 6px 12px; border-radius: 999px; background: #003872; color: #fff;">Donor report</span>
        <span style="padding: 6px 12px; border-radius: 999px; background: #ebeff4; color: #33608e;">KPIs</span>
        <span style="padding: 6px 12px; border-radius: 999px; background: #ebeff4; color: #33608e;">IATI file</span>
      </div>
      <div class="rows">
        <div class="row"><span class="l">${tick}WASH programme Malawi</span></div>
        <div class="row"><span class="l">${tick}Girls' education Ghana</span></div>
        <div class="row"><span class="l">${tick}Emergency response Sudan</span></div>
      </div>
      <div class="btn sky">Generate donor report</div>
    </div>
    <div class="chip" style="left: 296px; top: 318px;"><span class="dot" style="background:#00912b">${check()}</span>Matches your IATI file</div>`,

  portfolio: `
    <img src="../assets/projectconnect-dashboard.png" alt="" style="position: absolute; left: -24px; top: 6px; width: 580px; height: auto; display: block; filter: drop-shadow(0 24px 40px rgba(0,15,40,0.45));">
    <div class="chip" style="left: -40px; top: 58px;"><span class="dot" style="background:#00912b">${check()}</span>All 6 projects, one dashboard</div>
    <div class="chip" style="left: 300px; top: 356px;"><span class="dot" style="background:#007fd8"><span style="width:9px;height:9px;border-radius:50%;background:#fff"></span></span>Live, updated today</div>`,

  field_data: `
    <div class="card" style="left: 236px; top: 64px; width: 280px; padding: 20px 20px 20px 58px; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #003872;"><span style="width: 11px; height: 11px; border-radius: 50%; background: #cc0254;"></span>ProjectConnect</div>
      <div style="font-size: 17px; font-weight: 800; color: #003872;">Clean water programme</div>
      <div class="rows">
        <div class="row" style="font-size: 12.5px;"><span>Household survey</span><span style="color:#00912b; white-space: nowrap;">+14 new</span></div>
        <div class="row" style="font-size: 12.5px;"><span>Well inspection</span><span style="color:#00912b; white-space: nowrap;">+3 new</span></div>
      </div>
      <div style="font-size: 12px; font-weight: 600; color: #4d6a88;">Updated just now, from the field</div>
    </div>
    <div style="position: absolute; left: 28px; top: 16px; width: 250px; height: 500px; border-radius: 40px; background: #0b2447; padding: 11px; box-shadow: 0 30px 70px rgba(0,10,30,0.55);">
      <div style="width: 100%; height: 100%; border-radius: 30px; background: #ffffff; padding: 22px 18px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: #003872;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #00912b;"></span>FieldCollab</span>
          <span style="font-size: 11px; font-weight: 700; color: #33608e; background: #ebeff4; padding: 3px 9px; border-radius: 999px;">Offline</span>
        </div>
        <div style="font-size: 46px; font-weight: 800; color: #00912b; line-height: 1; margin-top: 8px;">14</div>
        <div style="font-size: 13px; color: #33608e; margin-top: -6px;">Forms today</div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
          <div class="row" style="justify-content: flex-start; font-size: 12.5px;"><span style="width: 13px; height: 13px; border-radius: 50%; background: #00912b;"></span>Household survey</div>
          <div class="row" style="justify-content: flex-start; font-size: 12.5px;"><span style="width: 13px; height: 13px; border-radius: 50%; background: #00912b;"></span>Water point check</div>
          <div class="row" style="justify-content: flex-start; font-size: 12.5px;"><span style="width: 13px; height: 13px; border-radius: 50%; border: 2px solid #99d3aa;"></span>Well inspection</div>
        </div>
        <div style="flex: 1;"></div>
        <div class="btn green" style="border-radius: 999px;">Sync when online</div>
      </div>
    </div>
    <div class="chip" style="left: 204px; top: 404px;"><span class="dot" style="background:#00912b">${check()}</span>Synced to the project</div>`,

  benchmark: `
    <div class="card" style="left: 24px; top: 26px; width: 464px; padding: 28px; display: flex; flex-direction: column; gap: 22px;">
      <div class="card-h"><div><div class="card-t">IATI Health Check</div><div class="card-s">Public IATI records of 927 NGOs</div></div><span class="pill pink">Sept 2026</span></div>
      ${[
        ['78%', 'publish later than the frequency they committed to', 78],
        ['47%', 'of activities contain at least one inconsistency', 47],
        ['35%', 'of files never ran through the IATI validator', 35],
      ].map(([n, t, p]) => `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: baseline; gap: 12px;"><span style="font-size: 34px; font-weight: 800; color: #003872; letter-spacing: -0.02em; line-height: 1;">${n}</span><span style="font-size: 13.5px; font-weight: 600; color: #33608e; line-height: 1.35;">${t}</span></div>
        <div style="height: 10px; border-radius: 999px; background: #ebeff4; overflow: hidden;"><div style="width: ${p}%; height: 100%; border-radius: 999px; background: #cc0254;"></div></div>
      </div>`).join('')}
    </div>
    <div class="chip" style="left: 60px; top: 384px;"><span class="dot" style="background:#007fd8">${check()}</span>Free check of your own record</div>`,

  healthcheck: `
    <div class="card" style="left: 24px; top: 26px; width: 464px; padding: 26px; display: flex; flex-direction: column; gap: 16px;">
      <div class="card-h"><div><div class="card-t">Your IATI health check</div><div class="card-s">Your organisation · public IATI record</div></div><span class="pill sky">Before the call</span></div>
      <div class="rows">
        <div class="row"><span>Timeliness</span><span class="pill orange">Behind schedule</span></div>
        <div class="row"><span>Completeness</span><span class="pill orange">Fields missing</span></div>
        <div class="row"><span>Validation</span><span class="pill pink">Errors found</span></div>
        <div class="row"><span>Partners and countries</span><span class="pill green">Complete</span></div>
      </div>
      <div style="height: 1px; background: #ebeff4;"></div>
      <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: #003872;">${tick}In the demo: how each one gets fixed</div>
    </div>
    <div class="chip" style="left: 150px; top: 420px;"><span class="dot" style="background:#007fd8">${check()}</span>No preparation from your side</div>`,
};

// ---------- Concepts ----------
const WFT = 'https://impactid.nl/we-fixed-that/';
const IATI = 'https://impactid.nl/iati-reporting-demo/';
const utm = (base, campaign, content) =>
  `${base}?utm_source=linkedin&utm_medium=paid_social&utm_campaign=${campaign}&utm_content=${content}`;

export const concepts = [
  {
    id: 'wft-iati', page: '/we-fixed-that/', variant: 'iati',
    eyebrow: 'For NGOs publishing to IATI', h1: 'Another quarter lost to your IATI export?', fixed: true,
    metric: ['IATI FILE', 'A week per quarter', '10 minutes'], visual: V.iati,
    url: utm(WFT, 'we_fixed_that', 'iati'),
    intro: 'Another quarter, another week lost to the IATI export? impactID turns the project data you already keep into a validated IATI file. In 10 minutes.',
    headline: 'Your IATI file in 10 minutes, not a week',
  },
  {
    id: 'wft-donor-reporting', page: '/we-fixed-that/', variant: 'donor_reporting',
    eyebrow: 'For programme and finance teams', h1: 'Three colleagues, one week, one donor report?', fixed: true,
    metric: ['DONOR REPORT', '3 people, a week', 'One button'], visual: V.donor_reporting,
    url: utm(WFT, 'we_fixed_that', 'donor_reporting'),
    intro: 'Three colleagues, one week, one donor report? In impactID every donor report comes from one dataset, so the numbers match. One button, every period.',
    headline: 'Donor reports in one click, from one dataset',
  },
  {
    id: 'wft-portfolio', page: '/we-fixed-that/', variant: 'portfolio',
    eyebrow: 'For programme managers and directors', h1: 'Six projects running. Three you cannot see?', fixed: true,
    metric: ['PORTFOLIO', 'Quarterly updates', 'One live dashboard'], visual: V.portfolio,
    url: utm(WFT, 'we_fixed_that', 'portfolio'),
    intro: 'Six projects running. How many can you actually see today? impactID puts every programme, budget and result on one live dashboard.',
    headline: 'Every project on one live dashboard',
  },
  {
    id: 'wft-field-data', page: '/we-fixed-that/', variant: 'field_data',
    eyebrow: 'For M&E and field teams', h1: 'Field data that takes two weeks to reach the office?', fixed: true,
    metric: ['FIELD DATA', 'Two weeks', 'The moment it syncs'], visual: V.field_data,
    url: utm(WFT, 'we_fixed_that', 'field_data'),
    intro: 'Field results taking two weeks to reach the office? Teams record data on their phone, online or offline. It lands in the project the moment it syncs.',
    headline: 'Field data in your project the moment it syncs',
  },
  {
    id: 'iati-benchmark', page: '/iati-reporting-demo/', variant: 'benchmark',
    eyebrow: 'IATI benchmark · 927 NGOs', h1: '78% of NGOs publish their IATI data late.', fixed: true,
    sub: 'See how your own record scores in a free 30-minute demo.',
    source: 'Source: impactID IATI Health Check, September 2026, 927 organisations.',
    visual: V.benchmark,
    url: utm(IATI, 'iati_reporting_demo', 'benchmark'),
    intro: 'We checked the public IATI records of 927 NGOs. 78% publish later than they committed to. In a free demo we show you how your own record scores.',
    headline: 'Free IATI health check of your own record',
  },
  {
    id: 'iati-healthcheck', page: '/iati-reporting-demo/', variant: 'healthcheck',
    eyebrow: 'Free with your IATI demo', h1: 'We check your IATI record before the call.',
    sub: 'Timeliness, completeness and validation errors, on screen. No preparation from your side.',
    visual: V.healthcheck,
    url: utm(IATI, 'iati_reporting_demo', 'healthcheck'),
    intro: 'Before your demo we run your public IATI record through our health check: timeliness, completeness, validation. You see the results on screen.',
    headline: 'See your IATI health check in a 30-minute demo',
  },
];

const page = (c, format) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${c.id} ${format}</title><link rel="stylesheet" href="ads.css"></head>
<body>
<div class="ad ${format}">
  <div class="topbar"><img src="../assets/impactid-logo.png" alt="impactID"><span class="demo">Request a demo ${arrow.replace('#5ab6ff', '#007fd8')}</span></div>
  <div class="hero">
    <div class="ripple"><div class="glow"></div><div class="r1"></div><div class="r2"></div><div class="r3"></div></div>
    <div class="copy">
      <span class="eyebrow">${c.eyebrow}</span>
      <div class="h1">${c.h1}</div>
      ${c.fixed ? fixedLine : ''}
      ${c.sub ? `<div class="sub">${c.sub}</div>` : ''}
      ${c.metric ? metric(...c.metric) : ''}
      ${c.source ? `<div class="source">${c.source}</div>` : ''}
    </div>
    <div class="stage">${c.visual}</div>
  </div>
</div>
</body></html>`;

const FORMATS = { landscape: [1200, 627], square: [1200, 1200] };

async function main() {
  mkdirSync(join(root, 'export'), { recursive: true });
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const tab = await ctx.newPage();
  for (const c of concepts) {
    for (const [format, [w, h]] of Object.entries(FORMATS)) {
      const file = join(here, `${c.id}-${format}.html`);
      writeFileSync(file, page(c, format));
      await tab.setViewportSize({ width: w, height: h });
      await tab.goto('file://' + file);
      await tab.evaluate(() => document.fonts.ready);
      await tab.waitForTimeout(150);
      const out = join(root, 'export', `impactid-li-${c.id}-${w}x${h}.png`);
      await tab.locator('.ad').screenshot({ path: out });
      console.log('rendered', out);
    }
  }
  await browser.close();
  writeFileSync(join(root, 'export', 'ads.json'), JSON.stringify(concepts.map(({ visual, ...c }) => c), null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

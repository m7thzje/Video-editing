# Builds gallery.html (the review page) from export/ads.json.
import json, html
ads = json.load(open('export/ads.json'))
E = html.escape

pages = [
  ('/we-fixed-that/', 'We fixed that.', 'Four hero variants. The landing page reads utm_content and swaps headline and before/after line to match the ad, and writes the key into the hidden field ad_variant. Form tags leads as lead_source_detail = "LI We fixed that".', 'we_fixed_that'),
  ('/iati-reporting-demo/', 'IATI reporting demo', 'For IATI publishers. Leads the benchmark and the free IATI health check that the landing page offers before the demo. Form tags leads as lead_source_detail = "LI IATI kern".', 'iati_reporting_demo'),
]

def card(c):
    fid = c['id']
    return f'''
<article class="ad" id="{fid}">
  <div class="shots">
    <figure class="land"><img src="export/impactid-li-{fid}-1200x627.png" alt="{E(c['h1'])} (1200 by 627)" loading="lazy" width="1200" height="627"><figcaption>1200 × 627 · landscape</figcaption></figure>
    <figure class="sq"><img src="export/impactid-li-{fid}-1200x1200.png" alt="{E(c['h1'])} (1200 by 1200)" loading="lazy" width="1200" height="1200"><figcaption>1200 × 1200 · square</figcaption></figure>
  </div>
  <div class="copy">
    <div class="copy-head"><h3>{E(c['h1'])}</h3><span class="key">utm_content={E(c['variant'])}</span></div>
    <dl>
      <div><dt>Intro text <span class="count">{len(c['intro'])}/150</span></dt><dd>{E(c['intro'])}</dd></div>
      <div><dt>Headline <span class="count">{len(c['headline'])}/70</span></dt><dd class="hl">{E(c['headline'])}</dd></div>
      <div><dt>CTA button</dt><dd>Request demo</dd></div>
      <div><dt>Destination URL</dt><dd class="url"><code id="u-{fid}">{E(c['url'])}</code><button type="button" class="copybtn" data-target="u-{fid}">Copy</button></dd></div>
    </dl>
  </div>
</article>'''

sections = ''
for path, name, note, camp in pages:
    items = [c for c in ads if c['page'] == path]
    sections += f'''
<section class="page">
  <header class="page-head">
    <p class="eyebrow">Landing page · {len(items)} concepts · {len(items)*2} images</p>
    <h2>{E(name)} <code>{E(path)}</code></h2>
    <p class="lede">{E(note)} utm_campaign={camp}.</p>
  </header>
  {''.join(card(c) for c in items)}
</section>'''

page = f'''<title>impactID LinkedIn Ads</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root {{
  --ground: #f5f7f9; --surface: #ffffff; --ink: #003872; --body: #26313f; --muted: #4d6a88;
  --line: #dde5ee; --accent: #007fd8; --accent-soft: #e0effa; --chip: #ebeff4; --shadow: 0 8px 24px rgba(0,56,114,0.10);
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{ color-scheme: dark;
    --ground: #0b1a2e; --surface: #11243d; --ink: #e6f1fa; --body: #c7d6e6; --muted: #93aac2;
    --line: #22395a; --accent: #5ab6ff; --accent-soft: #15345a; --chip: #1a3150; --shadow: 0 8px 24px rgba(0,0,0,0.35); }}
}}
:root[data-theme="dark"] {{ color-scheme: dark;
  --ground: #0b1a2e; --surface: #11243d; --ink: #e6f1fa; --body: #c7d6e6; --muted: #93aac2;
  --line: #22395a; --accent: #5ab6ff; --accent-soft: #15345a; --chip: #1a3150; --shadow: 0 8px 24px rgba(0,0,0,0.35); }}
* {{ box-sizing: border-box; }}
body {{ background: var(--ground); color: var(--body); font: 16px/1.55 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; padding: 0 20px; }}
main {{ max-width: 1240px; margin: 0 auto; padding-block: 48px 72px; display: flex; flex-direction: column; gap: 56px; }}
h1, h2, h3 {{ color: var(--ink); margin: 0; text-wrap: balance; letter-spacing: -0.01em; }}
h1 {{ font-size: clamp(30px, 5vw, 44px); font-weight: 800; line-height: 1.1; }}
h2 {{ font-size: clamp(22px, 3.2vw, 30px); font-weight: 800; display: flex; flex-wrap: wrap; align-items: baseline; gap: 12px; }}
h2 code {{ font: 500 15px/1 'JetBrains Mono', ui-monospace, monospace; color: var(--accent); background: var(--accent-soft); padding: 6px 10px; border-radius: 8px; }}
h3 {{ font-size: 19px; font-weight: 700; line-height: 1.3; }}
p {{ margin: 0; }}
.eyebrow {{ font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }}
.intro {{ display: flex; flex-direction: column; gap: 14px; max-width: 760px; }}
.intro .lede {{ font-size: 17px; }}
.facts {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }}
.facts span {{ font-size: 13px; font-weight: 600; color: var(--ink); background: var(--chip); padding: 6px 12px; border-radius: 999px; }}
.lede {{ color: var(--muted); max-width: 70ch; }}
.page {{ display: flex; flex-direction: column; gap: 28px; }}
.page-head {{ display: flex; flex-direction: column; gap: 10px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }}
.ad {{ background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 20px; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 24px; }}
.shots {{ display: grid; grid-template-columns: 1.914fr 1fr; gap: 12px; align-items: start; }}
figure {{ margin: 0; display: flex; flex-direction: column; gap: 6px; }}
figure img {{ width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid var(--line); }}
figcaption {{ font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }}
.copy {{ display: flex; flex-direction: column; gap: 14px; min-width: 0; }}
.copy-head {{ display: flex; flex-direction: column; gap: 6px; }}
.key {{ align-self: flex-start; font: 500 12px/1 'JetBrains Mono', ui-monospace, monospace; color: var(--muted); background: var(--chip); padding: 5px 8px; border-radius: 6px; }}
dl {{ margin: 0; display: flex; flex-direction: column; gap: 12px; }}
dl > div {{ display: flex; flex-direction: column; gap: 3px; }}
dt {{ font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }}
.count {{ font-variant-numeric: tabular-nums; letter-spacing: 0; font-weight: 600; }}
dd {{ margin: 0; font-size: 14.5px; }}
dd.hl {{ font-weight: 700; color: var(--ink); }}
dd.url {{ display: flex; gap: 8px; align-items: flex-start; }}
dd.url code {{ flex: 1; min-width: 0; font: 400 12px/1.5 'JetBrains Mono', ui-monospace, monospace; overflow-wrap: anywhere; color: var(--body); background: var(--ground); border: 1px solid var(--line); padding: 8px 10px; border-radius: 8px; }}
.copybtn {{ flex-shrink: 0; font: 700 13px 'Plus Jakarta Sans', sans-serif; color: #ffffff; background: #007fd8; border: 0; border-radius: 999px; padding: 8px 14px; cursor: pointer; }}
.copybtn:hover {{ background: #006bb8; }}
.copybtn:focus-visible {{ outline: none; box-shadow: 0 0 0 4px rgba(0,127,216,0.35); }}
.checks {{ background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 12px; }}
.checks ul {{ margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; max-width: 80ch; }}
@media (max-width: 960px) {{ .ad {{ grid-template-columns: 1fr; }} }}
@media (max-width: 520px) {{ .shots {{ grid-template-columns: 1fr; }} .ad {{ padding: 14px; }} }}
</style>
<main>
  <header class="intro">
    <p class="eyebrow">impactID · LinkedIn demo campaign</p>
    <h1>LinkedIn ads for the two demo landing pages</h1>
    <p class="lede">Each ad repeats the hero of the page it links to: same headline, same “We fixed that.”, same before-and-after line, same dark ripple. Single-image ads in both LinkedIn feed formats, with the ad copy and tracked URL next to each.</p>
    <div class="facts"><span>6 concepts</span><span>12 images</span><span>1200 × 627 and 1200 × 1200</span><span>PNG, under 1 MB each</span></div>
  </header>
  {sections}
  <section class="checks">
    <h2>Before launch</h2>
    <ul>
      <li>Confirm the live domain and paths. The URLs assume <code>impactid.nl/we-fixed-that/</code> and <code>impactid.nl/iati-reporting-demo/</code>, with utm_source=linkedin and utm_medium=paid_social.</li>
      <li>The IATI benchmark figures (927 NGOs, 78%, 47%, 35%) come from the IATI landing page, which flags them as “check before launch”. Check them before the benchmark ad runs.</li>
      <li>The UI cards in the ads (IATI validation, report generator, FieldCollab, health check) are drawn in the style of the product and use the same example programmes as the landing page. The dashboard in the portfolio ad is the real ProjectConnect screen.</li>
      <li>The donor-report ad uses the stock photo from the landing page. Confirm its licence covers paid social.</li>
      <li>Run the square versions on mobile-heavy placements. LinkedIn shows the first 150 characters of intro text before “see more”; every intro stays under that.</li>
    </ul>
  </section>
</main>
<script>
document.querySelectorAll('.copybtn').forEach(function (b) {{
  b.addEventListener('click', function () {{
    var el = document.getElementById(b.dataset.target);
    var done = function () {{ b.textContent = 'Copied'; setTimeout(function () {{ b.textContent = 'Copy'; }}, 1500); }};
    var fallback = function () {{ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected'; }};
    try {{ navigator.clipboard.writeText(el.textContent).then(done, fallback); }} catch (e) {{ fallback(); }}
  }});
}});
</script>
'''
open('gallery.html', 'w').write(page)

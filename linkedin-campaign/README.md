# impactID LinkedIn campaign images

Single-image LinkedIn ads for the two demo landing pages:

- `/we-fixed-that/` — four hero variants, picked by `utm_content` (`iati`, `donor_reporting`, `portfolio`, `field_data`). Each ad repeats its variant's hero headline, "We fixed that." and before/after line.
- `/iati-reporting-demo/` — IATI benchmark (`benchmark`) and free IATI health check (`healthcheck`).

Every concept comes in 1200×627 (landscape) and 1200×1200 (square). Final PNGs are in `export/`; ad copy, headlines and UTM URLs are in `export/ads.json` and on the review page `gallery.html`.

## Rebuild

```
node src/build.mjs      # renders export/*.png with Playwright (Chromium)
python3 src/gallery.py  # rebuilds gallery.html from export/ads.json
```

Copy and visuals live in `src/build.mjs`; shared styling in `src/ads.css`. Assets (logo, product screens, photo, Plus Jakarta Sans) come from the landing-page canvas and the impactID design system.

## Before launch

- Confirm domain and paths in the UTM URLs (`impactid.nl/...`).
- Verify the IATI benchmark figures (927 NGOs, 78%, 47%, 35%) before the benchmark ad runs.
- Confirm the stock photo licence covers paid social.

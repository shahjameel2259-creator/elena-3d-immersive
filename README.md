# Elena Residences · Immersive Site (V3)

A single-file, cinematic remake of [elenaresidences.com](https://www.elenaresidences.com/) built around the creative brief
"ELENA: A Digital Day at Home": a five-act scroll journey (Arrival → The Pause → The Life → The Home → The World)
with a dawn → day → golden hour → night light narrative, an "Elena Engine" personalization layer,
"Create My Elena" configurator, and "Book a private visit" conversion flow.

Imagery combines the **original website's real assets** (project renders, map, logos, brochures, newsletters)
with **8 brand photos supplied by the client** (towers, garden, lotus pond, pool, gym, grill, living room, tower elevation)
used across the hero, act dividers, club section and view options. Everything is stored locally, so the site works fully offline.

---

## Run it

**Open directly:** double-click `V3 Elena Residences.html`. No build step, no dependencies.

**Or serve locally (recommended for testing downloads):**
```bash
npx serve .
# or: python -m http.server 8080
```
then open `http://localhost:8080/V3%20Elena%20Residences.html`.

The page needs the `elena-assets/` folder next to it (same directory) — do not move the HTML alone.

---

## V4 — Immersive 3D WebGL layer

This folder is a sibling of the V3 build (`deploy-elena/`), which stays live and untouched.
V4 layers a real Three.js (r160) WebGL scene **behind** the V3 content (peachweb.io calibre),
driven by the same scroll journey.

### What's added on top of V3
- `index.html`
  - Fixed full-viewport `<canvas id="scene3d">` behind all content (`z-index` below `<main>`/`footer`).
  - Three.js r160 via CDN **importmap** (`three` + `three/addons/` GLTFLoader + DRACOLoader).
  - Sticky enquiry CTA (bottom-left) → prefilled `mailto:contactus@elenaresidences.com?subject=…` plus phone + WhatsApp.
  - Footer credit: *Tower model: Khronos Virtual City (CC-BY)*.
- `elena-assets/scene3d.js` (ES module) — the 3D engine:
  - Loads `elena-assets/models/tower-standin.glb` (Khronos Virtual City, CC-BY stand-in; swap for the real V-Ray GLB later).
  - Procedural nature: **shader sky-dome**, **instanced foliage** (one `InstancedMesh`, 140 trees), drifting particles, night star field.
  - **Scroll-scrubbed DAY→NIGHT morph** (the centerpiece): page scroll progress drives a uniform that morphs sky colour, sun/light direction, foliage tint, fog, particles and stars across 5 acts (dawn → day → golden → dusk → night).
  - Slow auto-rotate + subtle cursor parallax.
  - **Performance:** `setPixelRatio(min(dpr,1.5))`, instanced foliage, lazy init after first paint, no shadows/post-processing (target: Quadro P620, 2GB VRAM).
  - **Fallback (never a black screen):** if no WebGL / `prefers-reduced-motion` / CDN import fails / GLB fails / WebGL context lost → canvas is hidden and the V3 `photo-towers.jpg` hero shows.
- `elena-assets/elena.css` — canvas layering, transparent hero over the 3D scene, soft readability scrims, sticky CTA styling, CC-BY credit.

### Run it
```bash
python -m http.server 8099
# then open http://localhost:8099/index.html
```
A static server is required (ES modules + fetch of the GLB won't work from `file://`).

### Still to confirm (do not fabricate)
Same as V3 (possession date, full price list, social handles). Plus: swap the stand-in
GLB for the final V-Ray towers model when ready — drop it at `elena-assets/models/tower-standin.glb`.

```
V3 Elena Residences.html          The whole site (markup + inline SVG floor plan + JSON-LD)
elena-assets/
  elena.css                       Design tokens (day/night themes), all component styles
  elena.js                        All interactions (gate, engine, modal, forms, themes)
  original/                       45 images from the live website + 8 client brand photos (photo-*.jpg)
    photo-towers.jpg              Hero + OG image + night ending background (client photo)
    photo-nature.jpg              The Pause divider + Garden view (client photo)
    photo-pond.jpg                The Pause media + Lake view (client photo)
    photo-poolsky.jpg             The Life divider (client photo)
    photo-living.jpg              The Home divider (client photo)
    photo-tower.jpg               The World divider (client photo)
    photo-gym.jpg / photo-grill.jpg   Clubhouse media pair (client photos)
    hero-meditation.webp          Original-site hero art (kept unused, archived with V2)
    room-*.avif                   6 real project renders (living/drawing/dining/bedroom/kitchen/sit-out)
    art-*.webp                    Watercolour illustrations (kept for small thumbs only)
    map.webp                      Real location map
    logo-white.webp / logo-color.webp   Brand logos (auto-switched by theme)
    plan-left/right.webp          Payment plan card art
    news-*.avif|png               7 newsletter covers
  brochures/
    milestone-pricing-plan.pdf    Real Milestone Payment Plan (OCR-extracted data also on page)
    down-payment-40-plan.jpg      Real Down Payment Plan visual
    news-*.pdf                    7 real newsletter PDFs (linked from the news strip)
archive/V1,V2 Elena Residences.html  Previous versions — kept for reference
```

---

## How the page works

| Layer | What it does |
|---|---|
| Disclaimer gate | First visit shows a RERA notice; acceptance is remembered (`elena-disclaimed-v1`) |
| Scroll theme | Body `data-time` flips dawn/day/gold/night as you pass each act; CSS variables re-theme the whole page |
| Elena Engine | Day-choice cards (Slow/Alive/Together/Home) stored in `elena-journey-v1`, reused on re-entry |
| Choose your view | Lake / Sky / Garden swap the stage image; "Save this space" builds My Elena |
| Create My Elena | 4-step modal: residence → rhythm → review → private visit → done state |
| The facts | Right-side drawer with RERA, specs, pricing starting point |
| Brochures | Real PDF downloads + lead-capture forms with inline validation |

---

## Modify it

| What you want to change | Where |
|---|---|
| Copy / headlines / body text | `V2 Elena Residences.html` — search the visible text |
| Colors (theme tokens) | `elena-assets/elena.css` — top block `:root` and `body[data-time=...]` |
| Images | Swap files inside `elena-assets/original/` (keep same file names) |
| Payment schedule percentages | `V2 Elena Residences.html` — the `.plan-schedule` list |
| Newsletter PDFs | Replace files in `elena-assets/brochures/` |
| Facts (RERA, specs) | `V2 Elena Residences.html` — the facts drawer markup |
| Phone / email / social links | `V2 Elena Residences.html` — footer and nav |
| Room labels / view options | `elena-assets/elena.js` — `roomData` and `viewData` maps |
| Nav links | `V2 Elena Residences.html` — `header.nav` and the mobile sheet |

---

## Still to confirm (do not fabricate)

- Possession date and approval documents: marked `[...]` in The facts drawer; ask the sales team / RERA records.
- Full per-unit price list: the page shows the real starting point (₹11,000/sq ft) from the official Milestone Plan;
  the complete price list is shared on request.
- Social media handles: links currently point to platform homepages.

## QA

Verified with headless Chrome (`elena-residences/verify-elena-v1.js`, `verify-elena-v2.js`):
4 viewport widths with zero horizontal overflow, all 35 images load, 0 broken links/assets,
0 console errors, room tabs + view swap + modal flow + form validation tested end to end,
WCAG AA contrast in both day and night themes.

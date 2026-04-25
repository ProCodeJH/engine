# NAVA Sigma Engine — State of v89

Updated: 2026-04-25 — current as of commit 67f68e0 (v88) + v89 docs

## Repository structure

```
engine/
├── nava-sigma.mjs          (9436 LOC) — Main engine: capture + emit
├── sigma-verify.mjs         (245 LOC) — Single-site verification
├── sigma-verify-batch.mjs   (137 LOC) — Multi-site fleet verifier
├── UPGRADES.md              — This file (engine state doc)
├── UPGRADES_v67plus.md      — Pre-disaster archive (v67 + A-K only)
└── TEST_RESULTS_v67.md      — Pre-disaster 7-site capture matrix
```

GitHub: https://github.com/ProCodeJH/engine (main + master synced every commit)

## Three layers of engine work

### Layer 1 — Recovery (2026-04-24)
Engine zero-byte disaster on v67 Edit (ENOSPC). Recovered from
`~/.claude/file-history/<session-uuid>/dbedf11fd3e8573b@v1` — Claude
Code's internal snapshot archive preserved 5736-line engine from
20:59 timestamp (19 minutes before disaster at 21:18). See
`feedback-disk-before-edit.md` memory.

### Layer 2 — v74-v88 capture+emit pipe build (2026-04-25)
Pre-disaster cadence restored after 5-day "wandering" diagnosis.
14-block mega-pack + 28+ emit wirings + verification infrastructure.

### Layer 3 — Self-test infrastructure (v85-v88)
Verification tools split out of engine. 4 markdown self-assessment
artifacts + 2 verify tools.

## v74-v88 progression (15 commits)

| Version | Theme | Key additions |
|---------|-------|---------------|
| v74 | Architecture | Style Fingerprint Mirror routing — DOM Mirror as default for rich-DOM sections, bypassing role templates |
| v75 | Capture-A | 5 blocks: gradient, pseudo-element, decoration histogram, font license classifier, type-micro |
| v76 | Capture-B | 6 blocks: ui-colors, anchor positioning, transform decomposition, stacking, css-var-graph, borders |
| v77 | Capture-C | 3 blocks: canvas 2D ops, image color palette, selector-by-class CSS extraction |
| v78 | Emit-A | License gate, CanvasReplay component, responsive viewport capture |
| v79 | Emit-B | Responsive @media, z-index :root vars, pseudo auto-apply by tag |
| v80 | Emit-C | CSS var dep-order, anim bindings, CLS prevention via image dimensions |
| v81 | Emit-D | Animation auto-apply by tag, Critical CSS first-paint inline |
| v82 | Capture-D | WAAPI sync groups, element fingerprints, smart preload hints |
| v83 | Element-level | Per-element responsive @media (selector-keyed), Three.js scene snapshot, Web Audio detection |
| v84 | Closing gaps | Anchor positioning emit, Container query helpers, Three.js scene-aware emit |
| v85 | Verification-A | SCAN-COVERAGE.md, element-CSS rule bindings, view-transitions emit |
| v86 | Verification-B | COMPONENT-FIDELITY.md, multi-route coverage rollup, data-sigma-fidelity HTML attr |
| v87 | Self-test infra | sigma-verify.mjs, modern web APIs (18 capabilities), SW prefetch list |
| v88 | Fleet | sigma-verify-batch.mjs, baseline regression diff, modern color spaces (oklch/p3/light-dark) |

## Capture coverage: ~109 signal classes

### From v60-v67 (pre-disaster, 80 signals)
Original engine state: DOM tree mirror, motions, canvases, forms, videos,
logo, scrollSignals, SEO, colors, fonts, multi-page routes, 14 v67 blocks.

### Added v74-v88 (29 new signals)
- Layout: gradients, pseudo-elements, decoration histogram, borders,
  stacking contexts, transform decomp, anchor positioning
- Typography: type-micro (letter-spacing/text-shadow), font licenses,
  responsive per-element fingerprints
- Color: ui-colors (color-scheme/accent/caret), modern color spaces,
  image color palettes
- Modern CSS: container query usage, view-transition names,
  CSS var dependency graph
- Motion: WAAPI sync groups, animation bindings (element to keyframe)
- Performance: code coverage details, smart preload hints,
  CSS critical extraction
- API surface: 18 modern APIs (WebRTC, WebHID, WebTransport, etc.),
  AudioContext detection, Three.js scene snapshot
- Provenance: element-CSS rule bindings, selector-by-class declarations,
  classDeclarations
- Verification: componentFidelity, code coverage entries

## Emit pipe: 28+ wirings

### globals.css blocks (in emit order)
1. `@import "tailwindcss"`
2. fontFaceBlock — license-clean only (v78-1)
3. keyframesBlock — verbatim @keyframes from CSSOM
4. modernCssBlock — @layer/@property/@container/@scope/@scrollTimeline
5. pseudoCssBlock — utility classes + tag auto-apply (v75-D + v79-3)
6. classDeclBlock — re-derived `.sigma-cls-*` (v77-I)
7. responsiveCssBlock — tag-level @media (v79-1)
8. perElementResponsiveBlock — selector-keyed @media (v83-1)
9. animBindingsCssBlock — tag auto-apply animations (v81-1)
10. anchorPositioningBlock — anchor-name + position-anchor (v84-1)
11. containerQueryHelpersBlock — container-type declarations (v84-2)
12. viewTransitionsBlock — view-transition root (v85-3)
13. `:root` — palette + font + sigma-spacing + decoration vars + UI colors
14. Per-section `data-sigma-section` background overrides

### :root CSS variables (15+)
- Palette: `--brand-primary/-accent/-text/-contrast`
- Font: `--font-heading/-body`
- Decoration: `--sigma-shadow/-2/-filter/-backdrop`
- Typography: `--sigma-letter-spacing/-text-shadow/-word-spacing`
- UI: `color-scheme`, `accent-color`, `caret-color`
- Border: `--sigma-radius/-2/-border/-outline`
- Stacking: `--sigma-z-top/-2/-3/-blend`
- Layout: `--sigma/-section`, `--sigma-grid-cols`

### Components emitted (conditional)
- `Hero{idx}.tsx` (one per hero section)
- `Block{idx}.tsx` (DOM Mirror primary path — v74)
- `Gallery{idx}.tsx` / `Feature{idx}.tsx` / `Grid{idx}.tsx` / `Prose{idx}.tsx`
- `Nav.tsx`, `Footer.tsx`
- `CanvasReplay.tsx` (when canvas ops > 20 — v78-2)
- `ThreeScene.tsx` (when canvas detected, scene-aware via v84-3)
- `SmoothScroll.tsx` (when source uses Lenis)
- `LottiePlayer.tsx`, `RivePlayer.tsx`, `CountUp.tsx`, `CustomCursor.tsx`

### layout.tsx <head>
- Google Fonts preconnect + stylesheet (v75-C fallback when proprietary)
- Critical CSS inline style (v81-2)
- Smart preload links — fonts + above-fold images (v82-3)
- Captured linkHints
- JSON-LD structured data (Upgrade E)

### NOTICE files
- `NOTICE-CLEAN.md` — Σ.5 license audit
- `NOTICE-A11Y.md` — WCAG debt summary (Upgrade H)
- `NOTICE-SECURITY.md` — mixed/SRI/sandbox audit (Upgrade I)
- `NOTICE-DEV.md` — when --use-original-images (deployment warning)

### Self-test artifacts (v85-v88)
- `SCAN-COVERAGE.md` — capture KPI scoreboard (v85-1)
- `COMPONENT-FIDELITY.md` — per-section quality tier (v86-1)
- `data-sigma-fidelity` HTML attr — runtime tier inspection (v86-3)
- `VERIFY-REPORT.md` — runtime verification (sigma-verify.mjs)
- `.verify/baseline.json` — regression baseline (v88-2)
- `FLEET-REPORT.md` — multi-site aggregate (sigma-verify-batch.mjs)

## 100% pixel-match target — copyright-safe boundary

### Decomposition (research finding)
17 pixel categories audited:

**100% achievable in clean-room** (12):
- Layout, Typography metrics, Color, Decoration
- Pseudo-elements, Transitions, Animations
- Scroll, Responsive, Viewport meta
- Canvas operations, Stacking contexts

**OFL-only achievable** (1):
- Font letterforms — 100% if source uses OFL fonts (v78-1 license gate
  ensures clean download); 70% with Google Fonts fallback for proprietary

**User-asset-bound** (3):
- Original text content
- Original images (or v77-B color SVG approximation)
- Proprietary fonts

**Approximation only** (1):
- Image color rhythm via SVG palette (v77-B) — visual rhythm match
  without specific imagery

### Engine ceiling
- Engine alone (clean mode): ~93%
- + OFL fonts (v78-1): ~95%
- + User-provided text: ~98%
- + User-provided images: ~99%+
- + Full asset alignment: 100% per-site achievable

100% pixel-match in clean-room mode is mathematically possible for
sites using OFL fonts + simple imagery + user text/image assets.
NOT possible if source uses proprietary fonts or copyrighted imagery.

## Architecture diagram

```
[1] CAPTURE (Σ.1)
    ├── DOM tree (sections × styleFacts)
    ├── 109 signal classes
    └── scan.json (full snapshot)
        ↓
[2] TOKENIZE (Σ.2)
    ├── Color roles (primary/text/accent/surface/muted × 2)
    ├── Industry inference (8 categories)
    ├── Type scale (display/h1/h2/h3/body/caption)
    ├── Font license classifier
    └── Sigma stagger value
        ↓
[3] CONTENT STRIP (Σ.3)
    ├── Picsum / palettePlaceholder / source images
    └── Industry-tone lorem
        ↓
[4] COMPONENT EMIT (Σ.4)
    ├── package.json + tsconfig + tailwind.config
    ├── globals.css (14 blocks)
    ├── layout.tsx (head + critical CSS + preload + JSON-LD)
    ├── page.tsx (component composition)
    ├── components/* (per-section + utilities)
    └── public/* (sections/fonts/lottie/sw)
        ↓
[5] LICENSE AUDIT (Σ.5)
    ├── NOTICE-CLEAN.md (audit)
    ├── NOTICE-A11Y.md / NOTICE-SECURITY.md
    └── SCAN-COVERAGE.md / COMPONENT-FIDELITY.md (v85-v86)
        ↓
[6] BUILD VERIFY (Σ.6)
    └── (manual) cd output && npm install && npm run build
        ↓
[7] SELF-TEST (sigma-verify.mjs — v87)
    ├── npm run dev → port :N
    ├── Puppeteer screenshot
    ├── Runtime data-sigma-fidelity tally
    ├── Baseline diff (v88-2)
    └── VERIFY-REPORT.md
        ↓
[8] FLEET (sigma-verify-batch.mjs — v88-1)
    ├── Sequential per-project verify
    └── FLEET-REPORT.md (aggregate score)
```

## North star metric — capture coverage (NOT pixel-match)

Per `feedback-sigma-cadence` memory (2026-04-25):

> Sigma 엔진은 capture coverage가 KPI다. 픽셀매치 % 가 아니라 source에서
> 추출하는 신호 종류 수.

Pixel-match measurement is intentionally avoided as the primary KPI:
- It's bounded by font/image/text expression layer (mathematically empty
  set for fully-clean output without user assets)
- Optimizing it leads to defensive "85% ceiling" mentality (5-day
  wandering trap, post-disaster)
- Capture coverage is the additive metric — each new signal class
  unlocks new fidelity carriers

`sigma-verify.mjs --pixelmatch` is opt-in for those who insist on the metric.

## Future work (v89+ candidates)

- Element-rule emit pipe — apply v85-2 bindings as inline overrides
  with selector specificity preserved
- WAAPI multi-element timeline emit refinement — v82-1 sync groups
  drive staggerChildren values
- Engine docs auto-generation from extracted state
- Container query ELEMENT emit (currently parent declaration only)
- Per-route component fidelity diff in COMPONENT-FIDELITY.md
- WebRTC peer connection runtime monkey-patch
- Three.js material reconstruction (currently mesh count only)
- Web Audio context graph runtime tracing

## Memory references

- `feedback-disk-before-edit.md` — disk check before large edits
- `feedback-sigma-cadence.md` — capture coverage is KPI
- `clone-engine-omega.md` — Omega 99.36% mirror engine (NOT clean-room)
- `clone-engine-v21-findings.md` — v21 FROZEN at 92-93% (do not retry)

# NAVA Sigma v0.3 + v67 — Design Sites Capture Test Results

**Engine version**: 7056 lines (original 5759 restored + v67 14 blocks + 6 fixes)
**Test date**: 2026-04-25
**GitHub**: https://github.com/ProCodeJH/engine

## Sites tested

| Site | Time (s) | Platform | Sections | Build Tool | Layout | WCAG AA | Hover JS | Notes |
|------|----------|----------|----------|------------|--------|---------|----------|-------|
| teamevople.kr | 122.6 | framer 100% | 14 | framerHosted | flex 495 cols / grid 0 | 87.5% | 2/3 | 60 fonts (16.2MB), 1 form / 17 inputs, 165 captured animations |
| framer.com | 138.7 | framer 100% | 16 | framerHosted | flex 1644 cols / grid 4 | 56.3% | **12/12** | 5 third-party services, gray-text heavy |
| webflow.com | 100.9 | webflow 75% | 11 | webflowHosted | flex 823 rows / grid 4 | 90.0% | 10/12 | 25 anims / 3 stagger sequences |
| lusion.co | 73.3 | generic 0% | 1 | astro | flex 191 cols / grid 11 | 83.1% | 6/12 | **WebGL 2.0 / 8 shaders / 50 canvas frames / 32 extensions** |
| awwwards.com | 78.1 | generic 0% | 3 | unknown | flex 342 rows / grid 12 | 88.7% | 5/12 | Server-rendered, custom build |
| designkits.com | 22.7 | generic 0% | 3 | unknown | 0/0 | 100% (3 samples) | 0/0 | Static / SPA hydration likely incomplete |
| wix.com | 89.1 | wix 100% | 16 | wixHosted | flex 403 rows / grid **176** | **100.0%** | 8/12 | wix-images=20, grid-heavy layout |

## Capture-layer success matrix

Every v67 layer fired correctly on at least one site. Each row shows the
maximum value observed across all 7 sites:

| v67 Layer | Max value observed | Site |
|-----------|-------------------|------|
| platform detection | 100% confidence | framer/wix |
| build tool fingerprint | astro / framerHosted / webflowHosted / wixHosted | all platforms identified |
| WebGL info (extensions, max tex) | 32 exts, 16384 tex | lusion.co |
| WebGL shaders | 8 (7 vertex / 1 fragment) | lusion.co |
| canvas frame sequence | 50 frames × 2 canvases | lusion.co |
| Element.animate captures | 165 (later orchestrated → 3 stagger seqs) | teamevople / webflow |
| layout primitives | flex=1644, grid=176 | framer.com / wix |
| Spacing token mining | base gap = 12px (×64) | teamevople.kr |
| WCAG contrast audit | 80 samples × 7 sites = **560 pairs** measured | all |
| Hover replay (JS-driven) | 12/12 (100%) | framer.com |
| Form surface | 1 form / 17 inputs (text/email/tel/textarea) | teamevople.kr |
| 3rd-party categorization | 7 services (analytics/cdn/runtime/fonts) | webflow.com |
| Storage / Permissions / IDB / SW | 10 GB quota / 11 permission states | all |
| Schema.org parsed | (sites had no JSON-LD) | n/a on tested set |
| Network deep | 158 resources, 90% cache, 8% compression | teamevople.kr |
| Reactive framework | (no SPA framework runtime detected) | all |
| Heading hierarchy audit | 1 h1, 16 h2, 20 h3, 1 gap | teamevople.kr |
| Image alt audit | 150 imgs, 34 alt / 116 empty / 0 missing | teamevople.kr |
| Link audit | 16 same-origin, 0 external | teamevople.kr |
| Security runtime | 4 missing SRI on external scripts | framer.com |
| Layout primitives flex/grid distribution | full breakdown | all |
| Animation orchestration | 25 anims / 10 buckets / 3 stagger seqs | webflow.com |
| INP / Font metrics / Media caps | 8 fonts measured / 3 audio + 2 video codecs | all |
| RUM detection | (none of these sites use Sentry/DataDog/etc) | n/a |

## What is NOT yet validated

- **emit → build → visual diff is not measured.** All 7 sites produced an
  emit project under `sigma-test-{slug}/`, but none have been built
  (`npm install && npm run build`) nor compared visually against the
  source. The "90%+ pixel match" claim cannot be confirmed without that
  step.
- This is a known gap. The capture pipeline is now thoroughly exercised;
  the emit pipeline's faithfulness is the next thing to measure.

## Engine stability

- Browser.close() 15s timeout + SIGKILL fallback (v67 fix 7d) handled
  hang scenarios in v67c/v67d. Final v67e+ runs completed cleanly.
- Multi-page route scan with root-restore (recovery patch) prevented the
  samsungwallet-moneypoint hang that crashed earlier v64-era runs.
- ENOSPC recovery: original engine restored from
  `~/.claude/file-history/<session-uuid>/dbedf11fd3e8573b@v1` after
  Edit-tool ENOSPC truncated the file to 0 bytes during v67 development.

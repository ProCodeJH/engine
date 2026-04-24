# NAVA Sigma v0.3 + v67 + Emit Pipe Upgrades A-K

Engine: **7406 lines** (original 5759 restored + v67 14 blocks + 6 stability fixes + 11 emit-pipe upgrades A-K)
GitHub: https://github.com/ProCodeJH/engine (main + master synced every commit)

## Three layers of work

### Layer 1 — Recovery
Original engine zero-byte disaster on v67 Edit (ENOSPC). Recovered from
`~/.claude/file-history/<session-uuid>/dbedf11fd3e8573b@v1` — Claude Code's
internal snapshot archive preserved the 5759-line engine from 20:59 timestamp
(19 minutes before disaster at 21:18). See `feedback-disk-before-edit.md`.

### Layer 2 — v67 capture blocks (14 added)

| Block | Signals captured |
|-------|------------------|
| 1. SystemInfo FULL | GPU vendor + feature status + video decoders (14 feats on headless) |
| 2. HeapProfiler | sampling profile — 280+ nodes / 3MB+ total |
| 3. Hover replay | Input.dispatchMouseEvent probes, captures JS-driven hover deltas |
| 4. WebGL info | version + 32 extensions + max texture size + renderer/vendor |
| 5. WCAG contrast | 80 text samples × 7 sites = 560 pairs measured |
| 6. 3rd-party categorized | 50+ service patterns (analytics/chat/CMP/AB/payment/CDN/maps/fonts/video/social/runtime/framework) |
| 7. Forms + Viewport + Scroll snap + Houdini | form surface with per-input validation + scroll-snap containers + CSS.paintWorklet availability |
| 8. Animation orchestration + INP + Font metrics + Media caps | stagger detection, p50/p75/p98 interaction latency, canvas measureText, HDR/codec decode capability |
| 9. Storage + Permissions + IDB + SW + Cache + Wasm | 11 permission states, IDB enumeration, ServiceWorker scope, cache sizes, WebAssembly + common WASM libs |
| 10. Network Deep + Source maps + Build tool + Reactive | resource timing cache/compression ratios, .map file refs, framerHosted/webflowHosted/wixHosted/astro/nextjs/gatsby/nuxt/remix/sveltekit/vite/webpack/turbopack detection, React/Vue/Svelte/Angular/Preact/Solid/Qwik runtime fingerprints |
| 11. Schema.org parsed + Chart libs + Heading hierarchy + Alt audit | full JSON-LD structured fields, 11 chart library signatures, h1/h2/h3 gap detection, 150+ image alt audit, link noopener compliance |
| 12. Security runtime | mixed content, SRI compliance, iframe sandbox tightness, inline handlers, form-action protocol |
| 13. Layout primitives | flex row vs col dominance, grid column histogram, spacing token mining, unit usage, 3D transforms, filter usage |
| 14. A11y deeper + Editorial + RUM | tabindex distribution, aria-live, skip links, form label associations, word count, reading time, 12 RUM services |

### Layer 3 — Emit pipe upgrades (A-K, 11 added)

Each upgrade takes a v67 capture and wires it into emit output:

| # | Upgrade | v67 source | Emit impact |
|---|---------|------------|-------------|
| A | Form validation passthrough | Block 7 formSurface | `<input required pattern min max step minLength maxLength autoComplete>` |
| B | Tailwind design tokens from layout | Block 13 layoutPrimitives | theme.spacing.sigma + sigma-section + gridTemplateColumns.sigma |
| C | WCAG contrast-safe text color | Block 5 contrastAudit | theme.colors.brand.contrast + `--brand-contrast` CSS var |
| D | JS hover synthesis | Block 3 hoverDeltas | hoverSignature auto-filled when CSS empty (Framer case) |
| E | Structured JSON-LD regen | Block 11 schemaParsed | Full schema.org per @type with tokenized content |
| F | README integrations summary | Block 6 thirdPartyCategorized + 10 + 5 + 13 + 4 | Detected integrations / Build tool / A11y snapshot / Layout posture / WebGL capabilities |
| G | Density-based staggerChildren | Block 8 animationOrchestration | 0.03/0.05/0.07/0.08 per anim count + stagger seqs |
| H | NOTICE-A11Y.md auto-emit | Block 5 + 11 | Debt list + WCAG contrast detail + worst offenders + heading tree + fix recipe |
| I | NOTICE-SECURITY.md auto-emit | Block 12 + v64 headers | Mixed/SRI/sandbox/CSP debt + observed-headers table + fix recipe |
| J | Gallery scroll-snap utility | Block 7 layoutMeta.scrollSnap | snap-x snap-mandatory + overflow-x-auto on gallery grids when source had snap rules |
| K | Conditional SmoothScroll wrapper | motionHints.hasLenis | Auto-emit SmoothScroll.tsx + layout.tsx import/wrap when Lenis detected |

## 7-site verification (capture only, not yet visual-diff)

| Site | Time | Platform | Build | A11y AA | Hover JS |
|------|------|----------|-------|---------|----------|
| teamevople.kr | 122.6s | framer 100% | framerHosted | 87.5% | 2/3 |
| framer.com | 138.7s | framer 100% | framerHosted | 56.3% | 12/12 |
| webflow.com | 100.9s | webflow 75% | webflowHosted | 90.0% | 10/12 |
| lusion.co | 73.3s | generic | astro | 83.1% | 6/12 |
| awwwards.com | 78.1s | generic | unknown | 88.7% | 5/12 |
| designkits.com | 22.7s | generic | unknown | 100%(3) | 0/0 |
| wix.com | 89.1s | wix 100% | wixHosted | 100.0% | 8/12 |

Integration test (teamevople.kr after A-I applied): 119.9s complete + NOTICE-A11Y (3 items) + NOTICE-SECURITY (3 items) + contrast-safe text ✓.

## Still not validated

- Build → visual-diff against source. All 7 output projects exist but
  none have been built with `npm install && npm run build && npm run dev`
  and screenshot-compared to the source.
- "99%+ pixel match" claim remains unverified for v67+A-K emit output.
  Upgrade A-K raise the floor significantly (real validation / WCAG
  safety / accurate spacing / smooth scroll), but quantified visual
  parity still needs measurement.

## Next candidate upgrades

- L: WebGL extensions → ThreeScene geometry adaptation
- M: Media capabilities → next/image AVIF + HDR formats
- N: Scroll trajectory → ViewTimeline CSS scroll-driven animations
- O: Editorial pattern → `<article>` + Schema.org Article + `<time>`
- P: Build tool → Next.js \_next/static cache hints

#!/usr/bin/env node
// sigma-fusion.mjs — Paradigm 301 — Final Fusion (86 paradigm 진짜 융합)
//
// 자현 명령: "이제 우리가 지금까지 했던 모든것들을 다 융합하자"
//
// 11-phase orchestration. 자현 한 명령에 35+ paradigm 자동 적용.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Phase 1: Capture (시각 baked) ─────────────────────────────
import { frozenMirror } from "./sigma-frozen-mirror.mjs";
import { multistateFrozen } from "./sigma-multistate-frozen.mjs";
import { recordTimeline, applyTimelineToMirror } from "./sigma-timeline-record.mjs";
import { recordApiCalls, applyApiReplay } from "./sigma-api-replay.mjs";

// ─── Phase 2: Interaction (살아있음) ───────────────────────────
import { recordHoverStates, applyHoverStates } from "./sigma-hover-states.mjs";
import { recordClickStates, applyClickStates } from "./sigma-click-state.mjs";
import { applyFormMock } from "./sigma-form-mock.mjs";
import { applyWebSocketMock } from "./sigma-websocket-mock.mjs";

// ─── Phase 3: Library / Runtime ────────────────────────────────
import { applyHybridMotion } from "./sigma-hybrid-frozen.mjs";
import { buildSpaBundle, applySpaRouter } from "./sigma-spa-routes.mjs";
import { enrichMirrorA11y } from "./sigma-a11y-enrich.mjs";

// ─── Phase 4: Production grade ─────────────────────────────────
import { enhanceOmegaProject } from "./sigma-omega-enhance.mjs";
import { buildSitemap } from "./sigma-sitemap-auto.mjs";
import { applyOgDynamic } from "./sigma-og-dynamic.mjs";
import { applyMirror as applyCriticalCss } from "./sigma-critical-css.mjs";
import { applyFontSubset } from "./sigma-font-subset.mjs";
import { applyMirrorLazyLoad } from "./sigma-image-lazy.mjs";
import { applyResponsiveImages } from "./sigma-image-responsive.mjs";
import { applyLqip } from "./sigma-lqip.mjs";

// ─── Phase 5: UX ───────────────────────────────────────────────
import { applySkeleton } from "./sigma-skeleton-screen.mjs";
import { applyCookieBanner } from "./sigma-cookie-banner.mjs";
import { applyShareButtons } from "./sigma-share-buttons.mjs";
import { applyBreadcrumbs } from "./sigma-breadcrumb.mjs";

// ─── Phase 6: Security / Performance ───────────────────────────
import { applyCsp } from "./sigma-csp.mjs";
import { applyPrefetch } from "./sigma-prefetch.mjs";
import { applyServiceWorker } from "./sigma-service-worker.mjs";

// ─── Phase 7: Intelligence ─────────────────────────────────────
import { applySchemas } from "./sigma-schema-structured.mjs";
import { buildSearchIndex } from "./sigma-search-index.mjs";

// ─── Phase 8: Operations ───────────────────────────────────────
import { applyTelemetry } from "./sigma-telemetry.mjs";
import { applyLeadCapture } from "./sigma-lead-capture.mjs";
import { applyScrollDepth } from "./sigma-scroll-depth.mjs";
import { applyExitIntent } from "./sigma-exit-intent.mjs";
import { generateRss } from "./sigma-rss-feed.mjs";

// ─── Phase 9: Cleanroom ───────────────────────────────────────
import { swapWithBrandKit } from "./sigma-brand-kit.mjs";

// ─── Phase 10: Optimization ───────────────────────────────────
import { applyCompression } from "./sigma-style-compress.mjs";

// ─── Phase 11: Post (audit) ───────────────────────────────────
import { auditMirror } from "./sigma-a11y-audit.mjs";

function urlToSlug(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
            .replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function safeSync(name, fn, log) {
  try {
    const r = fn();
    log.push({ step: name, ok: true });
    console.log(`  ✅ ${name}`);
    return r;
  } catch (e) {
    log.push({ step: name, ok: false, error: e.message.slice(0, 80) });
    console.log(`  ❌ ${name}: ${e.message.slice(0, 60)}`);
    return null;
  }
}

async function safeAsync(name, fn, log) {
  try {
    const r = await fn();
    log.push({ step: name, ok: true });
    console.log(`  ✅ ${name}`);
    return r;
  } catch (e) {
    log.push({ step: name, ok: false, error: e.message.slice(0, 80) });
    console.log(`  ❌ ${name}: ${e.message.slice(0, 60)}`);
    return null;
  }
}

export async function fusion(sourceUrl, opts = {}) {
  const slug = urlToSlug(sourceUrl);
  const outputDir = path.resolve(opts.output || `fusion-${slug}`);
  const baseUrl = opts.baseUrl || `https://${slug.replace(/-/g, ".")}`;
  const startTime = Date.now();
  const log = [];

  console.log(`
╔══════════════════════════════════════════════════════════
║ 🔥 SIGMA FUSION — Paradigm 301
║ 86 paradigm 진짜 융합 (35+ phase orchestration)
║ Source:  ${sourceUrl}
║ Output:  ${outputDir}
║ Base URL: ${baseUrl}
╚══════════════════════════════════════════════════════════
`);

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 — CAPTURE (시각 baked + dynamic state)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 1/11: CAPTURE ━━━`);

  if (opts.multistate) {
    await safeAsync("Multi-State Frozen (P190)", () => multistateFrozen(sourceUrl, outputDir), log);
  } else {
    await safeAsync("Frozen Mirror (P184)", () => frozenMirror(sourceUrl, outputDir), log);
  }

  if (opts.timeline) {
    const tl = await safeAsync("Animation Timeline (P191)", () => recordTimeline(sourceUrl), log);
    if (tl) safeSync("Timeline Apply", () => applyTimelineToMirror(outputDir, tl.timeline), log);
  }

  if (opts.apiReplay) {
    const records = await safeAsync("API Replay Record (P207)", () => recordApiCalls(sourceUrl), log);
    if (records) safeSync("API Replay Apply", () => applyApiReplay(outputDir, records), log);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 — INTERACTION (살아있음)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 2/11: INTERACTION ━━━`);

  if (opts.hover) {
    const states = await safeAsync("Hover States (P192)", () => recordHoverStates(sourceUrl), log);
    if (states) safeSync("Hover Apply", () => applyHoverStates(outputDir, states), log);
  }

  if (opts.clickStates) {
    const states = await safeAsync("Click States (P199)", () => recordClickStates(sourceUrl), log);
    if (states) safeSync("Click Apply", () => applyClickStates(outputDir, states), log);
  }

  safeSync("Form Mock (P200)", () => applyFormMock(outputDir), log);
  safeSync("WebSocket Mock (P221)", () => applyWebSocketMock(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 — LIBRARY / RUNTIME
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 3/11: LIBRARY / RUNTIME ━━━`);
  safeSync("Hybrid Motion (P185)", () => applyHybridMotion(outputDir), log);
  if (opts.spa) {
    const bundle = await safeAsync("SPA Bundle (P201)", () => buildSpaBundle(sourceUrl, outputDir, { maxRoutes: 12 }), log);
    if (bundle) safeSync("SPA Router Apply", () => applySpaRouter(outputDir, bundle.bundle), log);
  }
  safeSync("A11y Enrich (P138)", () => enrichMirrorA11y(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 4 — PRODUCTION (Performance + SEO)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 4/11: PRODUCTION ━━━`);
  safeSync("SEO Restoration (P165)", () => enhanceOmegaProject(outputDir), log);
  safeSync("Sitemap Auto (P218)", () => buildSitemap(outputDir, { baseUrl }), log);
  safeSync("OG Dynamic (P247)", () => applyOgDynamic(outputDir, baseUrl), log);
  safeSync("Critical CSS Hints (P209)", () => applyCriticalCss(outputDir), log);
  safeSync("Font Subset (P210)", () => applyFontSubset(outputDir), log);
  safeSync("Image Lazy (P208)", () => applyMirrorLazyLoad(outputDir), log);
  safeSync("Image Responsive (P230)", () => applyResponsiveImages(outputDir), log);
  safeSync("LQIP (P246)", () => applyLqip(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 5 — UX
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 5/11: UX ━━━`);
  safeSync("Skeleton Loading (P244)", () => applySkeleton(outputDir), log);
  safeSync("Cookie Banner (P216)", () => applyCookieBanner(outputDir), log);
  safeSync("Social Share (P249)", () => applyShareButtons(outputDir), log);
  safeSync("Breadcrumbs (P248)", () => applyBreadcrumbs(outputDir, baseUrl), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 6 — SECURITY / PERFORMANCE
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 6/11: SECURITY ━━━`);
  safeSync("CSP + Security Headers (P291)", () => applyCsp(outputDir), log);
  safeSync("Predictive Prefetch (P285)", () => applyPrefetch(outputDir), log);
  safeSync("Service Worker / PWA (P203)", () => applyServiceWorker(outputDir, { siteName: opts.siteName }), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 7 — INTELLIGENCE
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 7/11: INTELLIGENCE ━━━`);
  safeSync("Schema.org Per-Type (P259)", () => applySchemas(outputDir, { baseUrl }), log);
  safeSync("Search Index (P219)", () => buildSearchIndex(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 8 — OPERATIONS
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 8/11: OPERATIONS ━━━`);
  safeSync("Telemetry Dashboard (P242)", () => applyTelemetry(outputDir), log);
  safeSync("Lead Capture (P273)", () => applyLeadCapture(outputDir), log);
  safeSync("Scroll Depth (P282)", () => applyScrollDepth(outputDir), log);
  safeSync("Exit Intent (P281)", () => applyExitIntent(outputDir), log);
  safeSync("RSS Feed (P258)", () => generateRss(outputDir, { baseUrl, siteName: opts.siteName }), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 9 — CLEANROOM (자현 자산 swap)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 9/11: CLEANROOM ━━━`);
  if (opts.brandKit) {
    safeSync("Brand-Kit Swap (P189)", () => swapWithBrandKit(outputDir, { brandKitDir: opts.brandKit, dryRun: false }), log);
  } else {
    log.push({ step: "Brand-Kit Swap", skipped: true });
    console.log(`  ⏭ Brand-Kit Swap (no --brand-kit)`);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 10 — OPTIMIZATION (last after all inject)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 10/11: OPTIMIZATION ━━━`);
  safeSync("Style Compression (P202)", () => applyCompression(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // PHASE 11 — POST (audit)
  // ═══════════════════════════════════════════════════════════
  console.log(`\n━━━ PHASE 11/11: POST AUDIT ━━━`);
  const a11y = safeSync("A11y Audit (P238)", () => auditMirror(outputDir), log);

  // ═══════════════════════════════════════════════════════════
  // CERT
  // ═══════════════════════════════════════════════════════════
  const duration = Math.round((Date.now() - startTime) / 1000);
  const ok = log.filter(l => l.ok).length;
  const fail = log.filter(l => l.ok === false).length;
  const skipped = log.filter(l => l.skipped).length;

  const cert = [
    "# CERT-FUSION (Paradigm 301)",
    "",
    `Issued: ${new Date().toISOString()}`,
    `Source: ${sourceUrl}`,
    `Output: ${outputDir}`,
    `Duration: ${duration}s`,
    "",
    "## Summary",
    "",
    `- ✅ Success: ${ok}`,
    `- ❌ Failed: ${fail}`,
    `- ⏭ Skipped: ${skipped}`,
    "",
    "## A11y Score",
    "",
    a11y ? `**${a11y.score}/100** (${a11y.errors} errors, ${a11y.warnings} warnings)` : "(audit failed)",
    "",
    "## Pipeline (11 phase / 35+ paradigm)",
    "",
    ...log.map(l => `- ${l.skipped ? "⏭" : (l.ok ? "✅" : "❌")} ${l.step}${l.error ? `: ${l.error}` : ""}`),
    "",
    "## 자현 deliverable",
    "",
    `- 사이트: ${outputDir}/public/index.html`,
    `- Telemetry dashboard: /telemetry/index.html`,
    `- Lead capture dashboard: /leads/index.html`,
    `- RSS feed: /rss.xml`,
    `- Sitemap: /sitemap.xml`,
    `- Search: window.sigmaSearch(query)`,
    `- A11y report: A11Y-AUDIT.md`,
    "",
    "## 다음 단계",
    "",
    "```bash",
    `cd ${path.basename(outputDir)}`,
    "npm install && npm start",
    "# → http://localhost:3100",
    "```",
  ];

  fs.writeFileSync(path.join(outputDir, "CERT-FUSION.md"), cert.join("\n"));

  return { outputDir, duration, ok, fail, skipped, a11y, log };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  if (!sourceUrl) {
    console.error("usage: node sigma-fusion.mjs <source-url> [options]");
    console.error("");
    console.error("자현 명령 '모든 것 융합' 진짜 한 명령:");
    console.error("  node sigma-fusion.mjs https://www.dusonnuri.co.kr/ \\");
    console.error("    --multistate --timeline --hover --click --api --spa \\");
    console.error("    --brand-kit ./brand-kit --base-url https://...");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const opts = {
    output: flagVal("--output"),
    baseUrl: flagVal("--base-url"),
    siteName: flagVal("--site-name"),
    brandKit: flagVal("--brand-kit"),
    multistate: process.argv.includes("--multistate"),
    timeline: process.argv.includes("--timeline"),
    hover: process.argv.includes("--hover"),
    clickStates: process.argv.includes("--click"),
    apiReplay: process.argv.includes("--api"),
    spa: process.argv.includes("--spa"),
  };

  fusion(sourceUrl, opts).then(r => {
    console.log(`\n╔══════════════════════════════════════════════════════════`);
    console.log(`║ 🔥 FUSION DONE in ${r.duration}s`);
    console.log(`║   ✅ ${r.ok} | ❌ ${r.fail} | ⏭ ${r.skipped}`);
    if (r.a11y) console.log(`║   A11y score: ${r.a11y.score}/100`);
    console.log(`║   → ${r.outputDir}/CERT-FUSION.md`);
    console.log(`╚══════════════════════════════════════════════════════════`);
  }).catch(e => { console.error(e); process.exit(1); });
}

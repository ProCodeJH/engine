#!/usr/bin/env node
// sigma-self-test.mjs — Paradigm 240 — Engine Self-Test Suite
//
// 모든 paradigm module export validate + smoke test.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const PARADIGMS = [
  // Tier 1 — Foundation
  { file: "sigma-frozen-mirror.mjs", exports: ["frozenMirror"] },
  { file: "sigma-hybrid-frozen.mjs", exports: ["applyHybridMotion"] },
  { file: "sigma-a11y-enrich.mjs", exports: ["enrichMirrorA11y", "enrichA11y"] },
  { file: "sigma-omega-enhance.mjs", exports: ["enhanceOmegaProject"] },
  // Tier 2 — Motion / Interaction
  { file: "sigma-runtime-animation.mjs", exports: ["SIGMA_ANIMATION_RUNTIME_JS"] },
  { file: "sigma-motion-keyframes.mjs", exports: ["SIGMA_KEYFRAMES_CSS"] },
  { file: "sigma-reveal-animations.mjs", exports: ["REVEAL_CSS"] },
  { file: "sigma-imweb-runtime-stub.mjs", exports: ["IMWEB_RUNTIME_STUB_JS"] },
  { file: "sigma-timeline-record.mjs", exports: ["recordTimeline", "applyTimelineToMirror"] },
  { file: "sigma-hover-states.mjs", exports: ["recordHoverStates", "applyHoverStates"] },
  { file: "sigma-click-state.mjs", exports: ["recordClickStates", "applyClickStates"] },
  { file: "sigma-form-mock.mjs", exports: ["applyFormMock"] },
  // Tier 3 — Cleanroom / Asset
  { file: "sigma-brand-kit.mjs", exports: ["swapWithBrandKit"] },
  { file: "sigma-asset-audit.mjs", exports: ["auditAssets"] },
  { file: "sigma-asset-swap.mjs", exports: ["swapAssets"] },
  { file: "sigma-procedural-asset.mjs", exports: ["swapMirrorToProcedural"] },
  { file: "sigma-css-cleanroom.mjs", exports: ["regenerateMirrorCss"] },
  { file: "sigma-js-cleanroom.mjs", exports: ["regenerateMirrorJs"] },
  // Tier 4 — Multi-state / SPA
  { file: "sigma-multistate-frozen.mjs", exports: ["multistateFrozen"] },
  { file: "sigma-spa-routes.mjs", exports: ["buildSpaBundle", "applySpaRouter"] },
  // Tier 5 — Production
  { file: "sigma-style-compress.mjs", exports: ["applyCompression"] },
  { file: "sigma-service-worker.mjs", exports: ["applyServiceWorker"] },
  { file: "sigma-image-lazy.mjs", exports: ["applyMirrorLazyLoad"] },
  { file: "sigma-cookie-banner.mjs", exports: ["applyCookieBanner"] },
  { file: "sigma-critical-css.mjs", exports: ["applyMirror"] },
  { file: "sigma-font-subset.mjs", exports: ["applyFontSubset"] },
  { file: "sigma-websocket-mock.mjs", exports: ["applyWebSocketMock"] },
  { file: "sigma-skeleton-screen.mjs", exports: ["applySkeleton"] },
  { file: "sigma-og-dynamic.mjs", exports: ["applyOgDynamic"] },
  { file: "sigma-sitemap-auto.mjs", exports: ["buildSitemap"] },
  { file: "sigma-search-index.mjs", exports: ["buildSearchIndex"] },
  // Tier 6 — Network / Real-time
  { file: "sigma-api-replay.mjs", exports: ["recordApiCalls", "applyApiReplay"] },
  // Tier 7 — Universal
  { file: "sigma-i18n-capture.mjs", exports: ["discoverLanguages"] },
  // Tier 8 — Orchestration / Quality
  { file: "sigma-go.mjs", exports: ["go"] },
  { file: "sigma-batch.mjs", exports: ["batchMirror"] },
  { file: "sigma-deploy.mjs", exports: ["autoDeploy"] },
  { file: "sigma-self-lighthouse.mjs", exports: ["selfAudit"] },
  { file: "sigma-plugin-loader.mjs", exports: ["loadPlugins", "applyPlugins"] },
];

export async function selfTest() {
  const results = [];
  const baseDir = path.dirname(fileURLToPath(import.meta.url));

  for (const p of PARADIGMS) {
    const fullPath = path.join(baseDir, p.file);
    if (!fs.existsSync(fullPath)) {
      results.push({ file: p.file, ok: false, reason: "file missing" });
      continue;
    }

    try {
      const mod = await import(pathToFileURL(fullPath).href);
      const missing = p.exports.filter(e => !(e in mod));
      if (missing.length > 0) {
        results.push({ file: p.file, ok: false, reason: `missing exports: ${missing.join(", ")}` });
      } else {
        results.push({ file: p.file, ok: true, exports: p.exports.length });
      }
    } catch (e) {
      results.push({ file: p.file, ok: false, reason: e.message.slice(0, 80) });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;

  return { total: results.length, ok, fail, results };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  selfTest().then(r => {
    console.log(`[self-test] ${r.ok}/${r.total} passed (${r.fail} failed)`);
    for (const result of r.results) {
      const icon = result.ok ? "✅" : "❌";
      const detail = result.ok
        ? `(${result.exports} exports)`
        : `— ${result.reason}`;
      console.log(`  ${icon} ${result.file} ${detail}`);
    }

    if (r.fail > 0) process.exit(1);
  });
}

// CDP DEEP — raw browser protocol dumps for structure + performance analysis
// Enables additional CDP domains after page load completes. Captures:
//   DOMSnapshot (full serialized DOM + computed styles), Accessibility tree,
//   LayerTree render layers, CSS coverage (used vs unused rules), Memory
//   DOM counters, Performance metrics, Animation timeline, Audits + Security
//   state + SystemInfo GPU feature levels, frame/resource tree inventory,
//   response headers analysis.

import fs from "node:fs";
import path from "node:path";

const ctx = globalThis.__sigma;
const { page, cdp, extracted, dataDir, url, responseHeaders } = ctx;

const t0 = Date.now();
console.log(`[CDP] DEEP 0.0s`);

// ─── CDP domain enables (post-navigate to avoid detach race) ─────────
const safeEnable = async (domain) => {
  try { await cdp.send(`${domain}.enable`); return true; } catch { return false; }
};
const enabled = {
  DOMSnapshot: await safeEnable("DOMSnapshot"),
  Accessibility: await safeEnable("Accessibility"),
  LayerTree: await safeEnable("LayerTree"),
  Animation: await safeEnable("Animation"),
  Memory: await safeEnable("Memory"),
  Performance: await safeEnable("Performance"),
  Profiler: await safeEnable("Profiler"),
  Audits: await safeEnable("Audits"),
  Security: await safeEnable("Security"),
};
console.log(`  domains enabled: ${Object.keys(enabled).filter(k => enabled[k]).length}/${Object.keys(enabled).length}`);

// ─── DOMSnapshot — serialized DOM tree + computed styles ─────────────
// Single-call dump of the entire document with per-node style values.
// Way faster than walking DOM via Runtime.evaluate for large pages.
try {
  const snap = await cdp.send("DOMSnapshot.captureSnapshot", {
    computedStyles: [
      "display", "position", "background-color", "color", "font-family",
      "font-size", "font-weight", "line-height", "opacity", "transform",
      "border-radius", "box-shadow",
    ],
    includeDOMRects: true,
    includeBlendedBackgroundColors: false,
  }).catch(() => null);
  if (snap?.documents?.length) {
    const doc = snap.documents[0];
    extracted.domSnapshot = {
      docCount: snap.documents.length,
      nodeCount: doc.nodes?.nodeType?.length || 0,
      layoutCount: doc.layout?.nodeIndex?.length || 0,
      textNodeCount: doc.textBoxes?.layoutIndex?.length || 0,
      strings: (snap.strings || []).length,
    };
    console.log(`  DOMSnapshot: ${extracted.domSnapshot.nodeCount} nodes / ${extracted.domSnapshot.layoutCount} layout / ${extracted.domSnapshot.textNodeCount} text / ${extracted.domSnapshot.strings} strings`);
  }
} catch (e) { console.log(`  DOMSnapshot: ${e.message.slice(0, 60)}`); }

// ─── DOM stats (element count / stylesheet size) ─────────────────────
try {
  const domStats = await page.evaluate(() => ({
    elementCount: document.querySelectorAll("*").length,
    textNodeCount: (() => {
      let n = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) n++;
      return n;
    })(),
    totalStylesheetBytes: [...document.styleSheets].reduce((s, sh) => {
      try { return s + [...sh.cssRules].reduce((x, r) => x + (r.cssText || "").length, 0); } catch { return s; }
    }, 0),
    stylesheetCount: document.styleSheets.length,
    scriptCount: document.scripts.length,
    iframeCount: document.querySelectorAll("iframe").length,
    videoCount: document.querySelectorAll("video").length,
    audioCount: document.querySelectorAll("audio").length,
    pictureCount: document.querySelectorAll("picture").length,
    svgCount: document.querySelectorAll("svg").length,
  }));
  extracted.domStats = domStats;
  console.log(`  DOM stats: ${domStats.elementCount} elements / ${domStats.textNodeCount} text nodes / ${(domStats.totalStylesheetBytes / 1024).toFixed(1)}KB CSS`);
} catch (e) { console.log(`  DOM stats: ${e.message.slice(0, 60)}`); }

// ─── CSS Coverage — used vs unused CSS rules ─────────────────────────
// Start rule usage tracking, then stop to get a list of rules that
// matched at least one element. Unused CSS = dead styles we can skip.
try {
  await cdp.send("CSS.startRuleUsageTracking").catch(() => {});
  // Scroll to trigger lazy reveal rules
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    window.scrollTo(0, 0);
  });
  const usage = await cdp.send("CSS.stopRuleUsageTracking").catch(() => null);
  if (usage?.ruleUsage) {
    const used = usage.ruleUsage.filter(r => r.used).length;
    const total = usage.ruleUsage.length;
    extracted.cssCoverage = {
      totalRules: total, usedRules: used,
      usedRatio: total > 0 ? +(used / total).toFixed(3) : 0,
    };
    console.log(`  CSS coverage: ${used}/${total} rules used (${((used / total) * 100).toFixed(1)}%)`);
  }
} catch (e) { console.log(`  CSS coverage: ${e.message.slice(0, 60)}`); }

// ─── Accessibility tree — landmark structure ─────────────────────────
try {
  const ax = await cdp.send("Accessibility.getFullAXTree", {}).catch(() => null);
  if (ax?.nodes) {
    const roles = new Map();
    const landmarks = [];
    for (const n of ax.nodes) {
      const role = n.role?.value || "";
      if (role) roles.set(role, (roles.get(role) || 0) + 1);
      if (["banner", "navigation", "main", "contentinfo", "complementary", "search", "form"].includes(role)) {
        landmarks.push({ role, name: n.name?.value || "" });
      }
    }
    extracted.a11yTree = {
      nodeCount: ax.nodes.length,
      topRoles: [...roles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
      landmarks: landmarks.slice(0, 10),
    };
    console.log(`  a11y tree: ${ax.nodes.length} nodes, landmarks=[${landmarks.map(l => l.role).join(",")}]`);
  }
} catch (e) { console.log(`  a11y tree: ${e.message.slice(0, 60)}`); }

// ─── LayerTree — render layer structure ──────────────────────────────
try {
  const layerTree = await cdp.send("LayerTree.compositingReasons", { layerId: "0" }).catch(() => null);
  // LayerTree.layerTreeDidChange is event-based; instead we use getLayers.
  // Fallback: count compositing reasons from enable callback data.
  // Here we just record that LayerTree was enabled.
  extracted.layerTreeEnabled = enabled.LayerTree;
  if (layerTree?.compositingReasons) {
    extracted.compositingReasons = layerTree.compositingReasons;
  }
} catch {}

// ─── Memory counters ─────────────────────────────────────────────────
try {
  const mem = await cdp.send("Memory.getDOMCounters").catch(() => null);
  if (mem) {
    extracted.memoryCounters = mem;
    console.log(`  memory counters: docs=${mem.documents} nodes=${mem.nodes} js-listeners=${mem.jsEventListeners}`);
  }
} catch (e) { console.log(`  memory: ${e.message.slice(0, 60)}`); }

// ─── Performance metrics ─────────────────────────────────────────────
try {
  const perf = await cdp.send("Performance.getMetrics").catch(() => null);
  if (perf?.metrics) {
    const m = Object.fromEntries(perf.metrics.map(x => [x.name, x.value]));
    extracted.perfMetrics = m;
    console.log(`  page metrics: JSHeap=${((m.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(1)}MB layoutCount=${m.LayoutCount || 0} styleRecalcs=${m.RecalcStyleCount || 0}`);
  }
} catch (e) { console.log(`  perf metrics: ${e.message.slice(0, 60)}`); }

// ─── Browser-level caps ──────────────────────────────────────────────
try {
  const caps = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform || navigator.userAgentData?.platform || "",
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
    } : null,
    languages: [...(navigator.languages || [])],
    webgl: !!(window.WebGLRenderingContext || window.WebGL2RenderingContext),
    webgl2: typeof WebGL2RenderingContext !== "undefined",
    webgpu: typeof navigator.gpu !== "undefined",
    webAssembly: typeof WebAssembly !== "undefined",
    serviceWorker: "serviceWorker" in navigator,
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    crossOriginIsolated: self.crossOriginIsolated,
    secureContext: self.isSecureContext,
  }));
  extracted.browserCaps = caps;
} catch {}

// ─── Audits — generic console-issue capture ──────────────────────────
const auditIssues = [];
if (enabled.Audits) {
  cdp.on("Audits.issueAdded", (evt) => {
    try {
      if (auditIssues.length < 50) auditIssues.push({
        code: evt.issue.code,
        details: Object.keys(evt.issue.details || {})[0] || "",
      });
    } catch {}
  });
}

// ─── SystemInfo — GPU feature levels ─────────────────────────────────
try {
  const sys = await cdp.send("SystemInfo.getInfo").catch(() => null);
  if (sys?.gpu) {
    extracted.systemInfo = {
      gpuVendor: sys.gpu.devices?.[0]?.vendorString || null,
      gpuDevice: sys.gpu.devices?.[0]?.deviceString || null,
      featureStatus: sys.gpu.featureStatus || {},
      videoDecoding: (sys.videoDecoding || []).slice(0, 5).map(v => ({ profile: v.profile, maxRes: v.maxResolution })),
    };
    console.log(`  system info: gpu=${(extracted.systemInfo.gpuVendor || "").slice(0, 30)} feats=${Object.keys(extracted.systemInfo.featureStatus).length}`);
  }
} catch (e) { console.log(`  system info: ${e.message.slice(0, 60)}`); }

// ─── Frame tree + resource tree ──────────────────────────────────────
try {
  const frameTree = await cdp.send("Page.getFrameTree").catch(() => null);
  if (frameTree?.frameTree) {
    const countFrames = (f) => 1 + (f.childFrames || []).reduce((s, c) => s + countFrames(c), 0);
    extracted.frameTree = { totalFrames: countFrames(frameTree.frameTree) };
    console.log(`  frame tree: ${extracted.frameTree.totalFrames - 1} iframes (${extracted.frameTree.totalFrames} total frames)`);
  }
} catch {}

try {
  const resTree = await cdp.send("Page.getResourceTree").catch(() => null);
  if (resTree?.frameTree) {
    const walkResources = (f, acc = []) => {
      acc.push(...(f.resources || []).map(r => ({ url: r.url, type: r.type, mime: r.mimeType })));
      for (const c of (f.childFrames || [])) walkResources(c, acc);
      return acc;
    };
    const resources = walkResources(resTree.frameTree);
    const typeCounts = {};
    for (const r of resources) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    extracted.resourceTree = {
      total: resources.length,
      byType: typeCounts,
    };
    console.log(`  resource tree: ${resources.length} resources [${Object.entries(typeCounts).map(([k, v]) => `${k}=${v}`).join(", ")}]`);
  }
} catch {}

// ─── Response headers analysis ───────────────────────────────────────
// Pull the security/privacy/caching headers of the document root.
try {
  const rootEntry = responseHeaders.find(r => r.url === url || r.url === url + "/");
  const h = rootEntry?.headers || {};
  const lc = (k) => h[k] || h[k.toLowerCase()] || h[k.toUpperCase()] || null;
  extracted.securityHeaders = {
    csp: lc("content-security-policy") || lc("content-security-policy-report-only"),
    coep: lc("cross-origin-embedder-policy"),
    coop: lc("cross-origin-opener-policy"),
    corp: lc("cross-origin-resource-policy"),
    permissionsPolicy: lc("permissions-policy"),
    referrerPolicy: lc("referrer-policy"),
    xFrameOptions: lc("x-frame-options"),
    xContentTypeOptions: lc("x-content-type-options"),
    strictTransportSecurity: lc("strict-transport-security"),
    reportTo: lc("report-to"),
  };
  const setHeaders = Object.entries(extracted.securityHeaders).filter(([k, v]) => v !== null).map(([k]) => k);
  console.log(`  security headers: ${setHeaders.length > 0 ? setHeaders.join(", ") : "(none set)"}`);
  extracted.responseHeadersCount = responseHeaders.length;
} catch {}

// ─── Cookies (metadata only for privacy) ─────────────────────────────
try {
  const cookies = await cdp.send("Storage.getCookies", {}).catch(() => null);
  if (cookies?.cookies) {
    extracted.cookieMetadata = {
      count: cookies.cookies.length,
      names: cookies.cookies.slice(0, 20).map(c => ({
        name: c.name, domain: c.domain,
        secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
      })),
    };
    console.log(`  cookies: ${extracted.cookieMetadata.count} (names only, values skipped for privacy)`);
  }
} catch {}

// After a moment, flush audit issues queue.
await new Promise(r => setTimeout(r, 400));
extracted.auditIssues = auditIssues;
if (auditIssues.length > 0) {
  const byCode = {};
  for (const i of auditIssues) byCode[i.code] = (byCode[i.code] || 0) + 1;
  console.log(`  audit issues: ${auditIssues.length} [${Object.entries(byCode).map(([k, v]) => `${k}=${v}`).join(", ")}]`);
}

fs.writeFileSync(path.join(dataDir, "scan.json"), JSON.stringify(extracted, null, 2));
extracted.timing.cdpDeep = Date.now() - t0;

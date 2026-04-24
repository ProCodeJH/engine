#!/usr/bin/env node
// NAVA Sigma v0.1 — Structural Analysis & Regeneration Tool
//
// For 자현's own sites (codingssok-website, JH website, teamevople.kr, and
// other domains Jahyeon owns or has explicit permission to analyze), this
// tool measures structural properties (section layout, computed styles,
// typography scale, color frequency, CSS feature usage, performance
// metrics) and regenerates an equivalent scaffold as Next.js 15 source.
//
// It is NOT a content scraper. Original text is represented as tokens
// ({{HEADING_0}} placeholders) by default; the --use-original-text flag is
// a dev-mode opt-in intended solely for sites the operator owns. Output is
// stored under the user's own workspace — no redistribution.
//
// Legal basis: structural measurements (sizes, counts, CSS grammar) are
// factual, not creative expression (Baker v. Selden, 101 U.S. 99). This
// tool does not replace copyrighted creative content — that remains the
// operator's responsibility to supply (via tokens, their own copy, or
// licensed assets).
//
// Pipeline: Σ.0 RECON → Σ.1 SCAN → Σ.2 TOKENS → Σ.3 CONTENT → Σ.4 EMIT → Σ.5 AUDIT → Σ.6 BUILD

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import puppeteer from "puppeteer-core";

// ─── CLI args ────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const URL = ARGS.find(a => /^https?:\/\//.test(a));
const flagVal = (name) => {
  const i = ARGS.indexOf(name);
  return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null;
};
const hasFlag = (name) => ARGS.includes(name);

if (!URL) {
  console.error("usage: node nava-sigma.mjs <url> [--output dir] [--use-original-images] [--use-original-text] [--use-dom-mirror] [--skip-build]");
  console.error("note:  only use on sites you own or have explicit permission to analyze.");
  process.exit(1);
}
const OUTPUT = flagVal("--output") || "sigma-out";
const USE_ORIGINAL_IMAGES = hasFlag("--use-original-images");
const USE_ORIGINAL_TEXT = hasFlag("--use-original-text");
const USE_DOM_MIRROR = hasFlag("--use-dom-mirror");
const SKIP_BUILD = hasFlag("--skip-build");

console.log("NAVA Sigma v0.1 — Structural Analysis & Regeneration");
console.log(`  URL:    ${URL}`);
console.log(`  Output: ${OUTPUT}`);
console.log("");

// ─── Output dir ──────────────────────────────────────────────────────
const projDir = path.resolve(OUTPUT);
fs.mkdirSync(projDir, { recursive: true });
const dataDir = path.join(projDir, ".sigma");
fs.mkdirSync(dataDir, { recursive: true });

// ─── Puppeteer launch ────────────────────────────────────────────────
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Users/" + (process.env.USERNAME || "") + "/AppData/Local/Google/Chrome/Application/chrome.exe",
].filter(Boolean);
let chromePath = null;
for (const p of CHROME_CANDIDATES) {
  try { if (fs.existsSync(p)) { chromePath = p; break; } } catch {}
}

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: chromePath || undefined,
  protocolTimeout: 300000,
  args: [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=site-per-process,TranslateUI",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const cdp = await page.target().createCDPSession();

// ─── evaluateOnNewDocument — API instrumentation ─────────────────────
// Installed BEFORE any page script runs. Intercepts standard browser
// APIs to measure what static DOM scan misses: canvas-rendered text,
// WebGL shader sources, custom element registrations, animation calls.
// All captured values are metadata/measurements for regeneration planning.
await page.evaluateOnNewDocument(() => {
  window.__CAPTURED_CANVAS_TEXT__ = [];
  const seenCanvasKeys = new Set();
  const captureCanvas = (text, x, y, ctx, type) => {
    if (window.__CAPTURED_CANVAS_TEXT__.length >= 500) return;
    const key = text + "|" + Math.round(x) + "|" + Math.round(y);
    if (seenCanvasKeys.has(key)) return;
    seenCanvasKeys.add(key);
    window.__CAPTURED_CANVAS_TEXT__.push({
      text: String(text), x: +x, y: +y,
      font: ctx.font, fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle,
      align: ctx.textAlign, type,
    });
  };
  const origFill = CanvasRenderingContext2D.prototype.fillText;
  const origStroke = CanvasRenderingContext2D.prototype.strokeText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, mw) {
    try { if (text && String(text).trim().length > 0) captureCanvas(text, x, y, this, "fill"); } catch {}
    return origFill.call(this, text, x, y, mw);
  };
  CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, mw) {
    try { if (text && String(text).trim().length > 0) captureCanvas(text, x, y, this, "stroke"); } catch {}
    return origStroke.call(this, text, x, y, mw);
  };

  window.__CAPTURED_SHADERS__ = [];
  const shaderSeen = new Set();
  const hashStr = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  };
  const patchGL = (proto) => {
    if (!proto || !proto.shaderSource) return;
    const orig = proto.shaderSource;
    proto.shaderSource = function (shader, source) {
      try {
        const kind = this.getShaderParameter ? this.getShaderParameter(shader, this.SHADER_TYPE) : 0;
        const key = hashStr(source);
        if (!shaderSeen.has(key)) {
          shaderSeen.add(key);
          window.__CAPTURED_SHADERS__.push({
            type: kind === this.VERTEX_SHADER ? "vertex" : kind === this.FRAGMENT_SHADER ? "fragment" : "unknown",
            length: String(source).length,
          });
        }
      } catch {}
      return orig.call(this, shader, source);
    };
  };
  try { patchGL(WebGLRenderingContext.prototype); } catch {}
  try { patchGL(WebGL2RenderingContext.prototype); } catch {}

  // Web Animations API — capture keyframe counts + timing only, not
  // verbatim animation source. Sufficient to plan equivalent motion.
  window.__CAPTURED_ANIMATIONS__ = [];
  if (window.Element && window.Element.prototype.animate) {
    const origAnimate = window.Element.prototype.animate;
    window.Element.prototype.animate = function (keyframes, options) {
      try {
        if (window.__CAPTURED_ANIMATIONS__.length < 200) {
          const r = this.getBoundingClientRect();
          window.__CAPTURED_ANIMATIONS__.push({
            tag: this.tagName.toLowerCase(),
            id: this.id || null,
            y: Math.round(r.top + window.scrollY),
            keyframeCount: Array.isArray(keyframes) ? keyframes.length : (keyframes ? Object.keys(keyframes).length : 0),
            duration: typeof options === "number" ? options : (options?.duration ?? null),
            iterations: options?.iterations ?? 1,
            easing: options?.easing ?? null,
          });
        }
      } catch {}
      return origAnimate.call(this, keyframes, options);
    };
  }

  window.__IO_TARGETS__ = new Set();
  const OriginalIO = window.IntersectionObserver;
  if (OriginalIO) {
    window.IntersectionObserver = class extends OriginalIO {
      observe(el) {
        try { window.__IO_TARGETS__.add(el); } catch {}
        return super.observe(el);
      }
    };
  }

  window.__navaCustomElementsDefined = new Set();
  if (window.customElements && window.customElements.define) {
    const origCEDef = window.customElements.define.bind(window.customElements);
    window.customElements.define = function (name, ctor, opts) {
      try { window.__navaCustomElementsDefined.add(name); } catch {}
      return origCEDef(name, ctor, opts);
    };
  }
  window.__navaTrustedTypesPolicies = new Set();
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    const origTT = window.trustedTypes.createPolicy.bind(window.trustedTypes);
    window.trustedTypes.createPolicy = function (name, rules) {
      try { window.__navaTrustedTypesPolicies.add(name); } catch {}
      return origTT(name, rules);
    };
  }
  window.__navaClosedShadowCount = 0;
  if (window.Element && window.Element.prototype.attachShadow) {
    const origAS = window.Element.prototype.attachShadow;
    window.Element.prototype.attachShadow = function (init) {
      try { if (init && init.mode === "closed") window.__navaClosedShadowCount++; } catch {}
      return origAS.call(this, init);
    };
  }

  window.__THREE_SCENE_ADDS__ = [];
});

// ─── CDP domain setup (pre-navigate) ─────────────────────────────────
await cdp.send("Network.enable");
await cdp.send("Runtime.enable");

const responseHeaders = [];
cdp.on("Network.responseReceived", (evt) => {
  try {
    responseHeaders.push({
      url: evt.response.url,
      status: evt.response.status,
      mimeType: evt.response.mimeType,
      headers: evt.response.headers || {},
    });
  } catch {}
});

// ─── Navigate ────────────────────────────────────────────────────────
const recon_t0 = Date.now();
console.log("[Σ.0] RECON 0.0s");
try {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
} catch (e) {
  console.error(`  goto failed: ${e.message.slice(0, 80)}`);
  await browser.close();
  process.exit(1);
}

// Full-page scroll — lets lazy-load sections trigger and images load.
await page.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 400));
});

await cdp.send("DOM.enable").catch(() => {});
await cdp.send("CSS.enable").catch(() => {});
await cdp.send("Page.enable").catch(() => {});

// ─── Σ.0 RECON — Platform detection ──────────────────────────────────
const platformProbe = await page.evaluate(() => {
  const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
  const metaGen = document.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
  return {
    hasFramer: !!document.querySelector("[data-framer-appear-id], [data-framer-component]") ||
               scripts.some(s => /framerusercontent\.com|framer\.com/.test(s)) ||
               /framer/i.test(metaGen),
    hasWebflow: !!document.querySelector("[data-wf-page], [data-wf-site]") ||
                scripts.some(s => /webflow/i.test(s)) || /webflow/i.test(metaGen),
    hasWix: !!document.querySelector("wow-image, wix-image, [data-wix-component]") ||
            scripts.some(s => /wix|parastorage/i.test(s)) || /wix/i.test(metaGen),
    hasSquarespace: !!document.querySelector("[data-squarespace]") ||
                    scripts.some(s => /squarespace|sqsp/i.test(s)) ||
                    /squarespace/i.test(metaGen),
    hasShopify: !!window.Shopify || scripts.some(s => /shopify|cdn\.shopify/i.test(s)),
    hasNextJS: !!document.getElementById("__next") || scripts.some(s => /\/_next\//.test(s)),
    hasGatsby: !!document.getElementById("___gatsby"),
    metaGenerator: metaGen,
  };
});
let platform = { name: "custom", confidence: 0 };
if (platformProbe.hasFramer) platform = { name: "framer", confidence: 100 };
else if (platformProbe.hasWebflow) platform = { name: "webflow", confidence: 100 };
else if (platformProbe.hasWix) platform = { name: "wix", confidence: 100 };
else if (platformProbe.hasSquarespace) platform = { name: "squarespace", confidence: 100 };
else if (platformProbe.hasShopify) platform = { name: "shopify", confidence: 90 };
else if (platformProbe.hasNextJS) platform = { name: "nextjs", confidence: 70 };
else if (platformProbe.hasGatsby) platform = { name: "gatsby", confidence: 70 };

const revealInitial = await page.evaluate(() => {
  const below = [];
  const all = [...document.querySelectorAll("section, main > div, body > div > div, [class*='section']")];
  const vh = window.innerHeight;
  for (const el of all.slice(0, 100)) {
    const r = el.getBoundingClientRect();
    if (r.top > vh) {
      const cs = getComputedStyle(el);
      below.push({
        tag: el.tagName.toLowerCase(),
        initialOpacity: parseFloat(cs.opacity) || 1,
        initialTransform: cs.transform === "none" ? null : cs.transform,
        hasHiddenState: parseFloat(cs.opacity) < 1 || cs.transform !== "none",
      });
    }
  }
  return below;
});

console.log(`  initial reveal states: ${revealInitial.length} below-fold elements (${revealInitial.filter(r => r.hasHiddenState).length} with hidden state)`);
console.log(`  platform: ${platform.name} (${platform.confidence}% confidence)`);

const extracted = {
  url: URL,
  platform,
  platformProbe,
  revealInitial,
  timing: { recon: Date.now() - recon_t0 },
};

fs.writeFileSync(path.join(dataDir, "scan.json"), JSON.stringify(extracted, null, 2));

// Handoff context for downstream modules.
globalThis.__sigma = {
  browser, page, cdp, extracted, projDir, dataDir, url: URL,
  responseHeaders,
  USE_ORIGINAL_IMAGES, USE_ORIGINAL_TEXT, USE_DOM_MIRROR, SKIP_BUILD,
  platform,
};

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "sigma", "scan.mjs")).href);
await import(pathToFileURL(path.join(here, "sigma", "motion.mjs")).href);
await import(pathToFileURL(path.join(here, "sigma", "cdp-deep.mjs")).href);
await import(pathToFileURL(path.join(here, "sigma", "emit.mjs")).href);

await browser.close();

if (!SKIP_BUILD) {
  console.log("[Σ.6] BUILD");
  const pkgPath = path.join(projDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      execSync("npm install --silent --no-audit --no-fund", { cwd: projDir, stdio: "inherit" });
      execSync("npx next build", { cwd: projDir, stdio: "inherit" });
    } catch (e) {
      console.error(`  build failed: ${e.message.slice(0, 80)}`);
    }
  } else {
    console.warn("  no package.json — emit stage did not produce project");
  }
}

console.log("\n✓ done");

#!/usr/bin/env node
// sigma-spa-routes.mjs — Paradigm 201 — SPA Navigation Hijack (Multi-Route Mirror)
//
// 자현 명령 "모든 실력": 사이트의 모든 internal routes도 살아있어야.
//
// P201 — Source URL의 internal links 자동 discover → 각 route 단순 snapshot →
// bundled JSON → mirror에 client-side router inject.
//
// 사용자 internal link 클릭 시 진짜 사이트처럼 navigation (no page reload).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VITAL_PROPS = [
  "color", "background-color", "background-image", "background-size", "background-position",
  "font-family", "font-size", "font-weight", "line-height",
  "padding", "margin", "border", "border-radius",
  "display", "position", "top", "left", "width", "height",
  "flex", "justify-content", "align-items", "gap",
  "opacity", "transform", "box-shadow",
];

const SNAPSHOT_JS = `
(function snapshot() {
  const VITAL = ${JSON.stringify(VITAL_PROPS)};
  document.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    try {
      const cs = getComputedStyle(el);
      const styles = VITAL.map((p) => {
        const v = cs.getPropertyValue(p);
        return v && v !== "none" && v !== "auto" ? p + ': ' + v : null;
      }).filter(Boolean).join('; ');
      el.setAttribute('data-fs', styles);
    } catch {}
  });
  return document.body.innerHTML;
})();
`;

async function captureRouteBody(page, url) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));

  // Force scroll for lazy mount
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  let html = await page.evaluate(SNAPSHOT_JS);
  // Strip scripts + event handlers
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/data-fs="([^"]+)"/g, ' style="$1"');
  return html;
}

export async function buildSpaBundle(sourceUrl, outputDir, opts = {}) {
  const maxRoutes = opts.maxRoutes || 12;
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[spa] discovering routes from ${sourceUrl}...`);
  try {
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
  } catch (e) {
    console.log(`  goto: ${e.message.slice(0, 60)}`);
  }
  await new Promise((r) => setTimeout(r, 2000));

  const routes = await page.evaluate(() => {
    const origin = location.origin;
    const set = new Set();
    document.querySelectorAll("a[href]").forEach((a) => {
      try {
        const h = a.href;
        if (!h.startsWith(origin)) return;
        const u = new URL(h);
        const pathname = u.pathname;
        if (!pathname || pathname === "/") return;
        if (pathname.length > 200) return;  // skip very long
        if (/\.(jpg|png|pdf|css|js|woff)/.test(pathname)) return;
        set.add(pathname);
      } catch {}
    });
    return Array.from(set);
  }).catch(() => []);

  console.log(`  ${routes.length} candidate routes`);

  // Capture each route
  const bundle = {};
  const limited = routes.slice(0, maxRoutes);
  for (const route of limited) {
    const fullUrl = new URL(route, sourceUrl).href;
    console.log(`  [${Object.keys(bundle).length + 1}/${limited.length}] ${route}...`);
    try {
      const html = await captureRouteBody(page, fullUrl);
      bundle[route] = html;
      console.log(`    ${(html.length / 1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`    skip: ${e.message.slice(0, 60)}`);
    }
  }

  await browser.close();
  return { discovered: routes.length, captured: Object.keys(bundle).length, bundle };
}

const ROUTER_JS = `
/* sigma-spa-router — Paradigm 201 */
(function spaRouter() {
  let routes = window.__SIGMA_ROUTES__;
  if (!routes) {
    fetch('/sigma-routes.json').then(r => r.json()).then(rs => {
      window.__SIGMA_ROUTES__ = rs;
      mount(rs);
    }).catch(() => {});
  } else mount(routes);

  function navigate(path, html, push = true) {
    const main = document.querySelector('main') || document.body;
    // Animate transition
    main.style.transition = 'opacity 0.2s';
    main.style.opacity = '0';
    setTimeout(() => {
      // Replace body content (preserve our scripts)
      const sigmaScripts = Array.from(document.body.querySelectorAll('script[id^="__sigma_"]'));
      document.body.innerHTML = html;
      sigmaScripts.forEach(s => document.body.appendChild(s));
      const newMain = document.querySelector('main') || document.body;
      newMain.style.opacity = '0';
      requestAnimationFrame(() => {
        newMain.style.transition = 'opacity 0.3s';
        newMain.style.opacity = '1';
      });
      if (push) history.pushState({ sigmaRoute: path }, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }

  function mount(routes) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:') ||
          href.startsWith('javascript:')) return;
      let path = href;
      if (href.startsWith('http')) {
        try {
          const u = new URL(href);
          if (u.origin !== location.origin) return;  // external
          path = u.pathname;
        } catch { return; }
      } else if (href.startsWith('#')) return;
      if (path === location.pathname) return;
      const html = routes[path];
      if (!html) return;
      e.preventDefault();
      navigate(path, html);
    }, true);

    window.addEventListener('popstate', (e) => {
      const path = location.pathname;
      const html = routes[path];
      if (html) navigate(path, html, false);
    });
  }
})();
`;

export function applySpaRouter(projDir, bundle) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  fs.writeFileSync(path.join(publicDir, "sigma-routes.json"), JSON.stringify(bundle));

  const result = { files: [] };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_spa_router__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_spa_router__">\n${ROUTER_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  walk(publicDir);
  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir) {
    console.error("usage: node sigma-spa-routes.mjs <source-url> <projDir>");
    process.exit(1);
  }
  buildSpaBundle(sourceUrl, projDir).then((r) => {
    const apply = applySpaRouter(projDir, r.bundle);
    console.log(`\n[spa] ${r.captured}/${r.discovered} routes captured`);
    console.log(`  HTML files updated: ${apply.files?.length || 0}`);
    console.log(`  ✅ Internal link click → SPA navigation`);
  });
}

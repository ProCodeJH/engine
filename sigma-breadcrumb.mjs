#!/usr/bin/env node
// sigma-breadcrumb.mjs — Paradigm 248 — Breadcrumb Schema (JSON-LD + Visual)
//
// 페이지 path 자동 분석 → BreadcrumbList JSON-LD + visual breadcrumb inject.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function pathToBreadcrumbs(urlPath, baseUrl, homeName = "홈") {
  const parts = urlPath.replace(/^\//, "").replace(/\/$/, "").split("/").filter(Boolean);
  const breadcrumbs = [{ name: homeName, url: baseUrl + "/" }];
  let cur = "";
  for (const part of parts) {
    cur += "/" + part;
    breadcrumbs.push({
      name: decodeURIComponent(part).replace(/-/g, " ").replace(/_/g, " "),
      url: baseUrl + cur + "/",
    });
  }
  return breadcrumbs;
}

function generateJsonLd(breadcrumbs) {
  const items = breadcrumbs.map((b, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: b.name,
    item: b.url,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function generateVisualHtml(breadcrumbs) {
  const items = breadcrumbs.map((b, i) =>
    i === breadcrumbs.length - 1
      ? `<li aria-current="page" style="color:#666;">${b.name}</li>`
      : `<li><a href="${b.url}" style="color:#4f46e5;text-decoration:none;">${b.name}</a></li>`
  ).join('<li style="color:#999;margin:0 8px;">›</li>');

  return `<nav aria-label="Breadcrumb" id="__sigma_breadcrumb__" style="padding:12px 24px;font-size:14px;">
  <ol style="display:flex;list-style:none;padding:0;margin:0;flex-wrap:wrap;align-items:center;">
    ${items}
  </ol>
</nav>`;
}

export function applyBreadcrumbs(projDir, baseUrl = "") {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };
  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;

        // Skip root (no breadcrumbs needed)
        if (!prefix) continue;

        const urlPath = "/" + prefix + "/";
        const breadcrumbs = pathToBreadcrumbs(urlPath, baseUrl);
        const jsonLd = generateJsonLd(breadcrumbs);
        const visual = generateVisualHtml(breadcrumbs);

        // Remove existing
        html = html.replace(/<script[^>]*type="application\/ld\+json"[\s\S]*?BreadcrumbList[\s\S]*?<\/script>\s*/gi, "");
        html = html.replace(/<nav[^>]*id="__sigma_breadcrumb__"[\s\S]*?<\/nav>\s*/gi, "");

        // Inject JSON-LD in head
        const jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
        if (html.includes("</head>")) html = html.replace("</head>", jsonLdScript + "\n</head>");

        // Inject visual at top of <main> or after <header>
        if (html.includes("<main")) {
          html = html.replace(/<main([^>]*)>/i, `<main$1>\n${visual}`);
        } else if (html.includes("</header>")) {
          html = html.replace(/<\/header>/i, `</header>\n${visual}`);
        } else if (html.includes("<body")) {
          html = html.replace(/<body([^>]*)>/i, `<body$1>\n${visual}`);
        }

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
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir> [--base-url ...]"); process.exit(1); }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const baseUrl = flagVal("--base-url") || "";
  const r = applyBreadcrumbs(projDir, baseUrl);
  console.log(`[breadcrumb] HTML files: ${r.files?.length || 0}`);
}

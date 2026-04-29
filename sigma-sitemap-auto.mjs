#!/usr/bin/env node
// sigma-sitemap-auto.mjs — Paradigm 218 — Auto Sitemap with lastmod
//
// Multi-route sitemap.xml + 각 page lastmod. Search engine SEO.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildSitemap(projDir, opts = {}) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const baseUrl = opts.baseUrl || "https://example.com";
  const routes = [];

  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.name === "index.html") {
        const stat = fs.statSync(full);
        const url = prefix ? `${baseUrl}/${prefix}/` : `${baseUrl}/`;
        routes.push({
          loc: url,
          lastmod: stat.mtime.toISOString().split("T")[0],
          priority: prefix === "" ? "1.0" : "0.8",
          changefreq: prefix === "" ? "daily" : "weekly",
        });
      }
    }
  }
  walk(publicDir);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${r.loc}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml);

  // robots.txt
  const robots = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;
  fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

  return { routes: routes.length, baseUrl };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir> [--base-url ...]"); process.exit(1); }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const baseUrl = flagVal("--base-url");
  const r = buildSitemap(projDir, { baseUrl });
  console.log(`[sitemap] ${r.routes} routes → sitemap.xml + robots.txt`);
  console.log(`  Base URL: ${r.baseUrl}`);
}

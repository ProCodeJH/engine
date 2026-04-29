#!/usr/bin/env node
// sigma-og-dynamic.mjs — Paradigm 247 — Open Graph Dynamic Per-Page
//
// Each route별 og:title/description/image 자동 generate.
// Share preview production grade.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled";

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  let description = descMatch ? descMatch[1] : "";

  if (!description) {
    // Use first <p> or h2
    const pMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);
    if (pMatch) description = pMatch[1].trim().slice(0, 200);
  }

  // First img as og:image
  const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
  const image = imgMatch ? imgMatch[1] : "";

  return { title, description, image };
}

export function applyOgDynamic(projDir, baseUrl = "") {
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

        const meta = extractMeta(html);
        const pageUrl = baseUrl ? `${baseUrl}/${prefix}/`.replace(/\/+$/, "/") : (prefix ? `/${prefix}/` : "/");
        const fullImage = meta.image
          ? (meta.image.startsWith("http") ? meta.image : `${baseUrl}${meta.image}`)
          : `${baseUrl}/og-default.png`;

        const ogTags = `
<!-- sigma-og-dynamic (P247) -->
<meta property="og:title" content="${meta.title.replace(/"/g, "&quot;")}">
<meta property="og:description" content="${meta.description.replace(/"/g, "&quot;").slice(0, 200)}">
<meta property="og:image" content="${fullImage}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${meta.title.replace(/"/g, "&quot;")}">
<meta name="twitter:description" content="${meta.description.replace(/"/g, "&quot;").slice(0, 200)}">
<meta name="twitter:image" content="${fullImage}">
`;

        // Remove existing OG/Twitter tags
        html = html.replace(/<meta\s+(?:property|name)=["'](?:og:|twitter:)[^"']+["'][^>]*>\s*/gi, "");
        html = html.replace(/<!-- sigma-og-dynamic[\s\S]*?-->/g, "");

        // Inject fresh
        if (html.includes("</head>")) html = html.replace("</head>", ogTags + "\n</head>");

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
  const r = applyOgDynamic(projDir, baseUrl);
  console.log(`[og-dynamic] HTML files: ${r.files?.length || 0}`);
  console.log(`  Per-page OG/Twitter tags`);
}

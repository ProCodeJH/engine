#!/usr/bin/env node
// sigma-schema-structured.mjs — Paradigm 259 — Schema.org Structured Data Per-Type

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectPageType, analyzeMirror } from "./sigma-page-type.mjs";

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1] : "";
  const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
  const image = imgMatch ? imgMatch[1] : "";
  const lang = (html.match(/<html\s+lang=["']([^"']+)["']/) || [])[1] || "ko";
  return { title, description, image, lang };
}

function generateSchema(pageType, meta, urlPath, baseUrl) {
  const fullUrl = baseUrl + urlPath;
  const fullImage = meta.image
    ? (meta.image.startsWith("http") ? meta.image : baseUrl + meta.image)
    : "";

  const base = {
    "@context": "https://schema.org",
    name: meta.title,
    description: meta.description,
    url: fullUrl,
    inLanguage: meta.lang,
  };

  if (fullImage) base.image = fullImage;

  switch (pageType) {
    case "article":
      return {
        ...base,
        "@type": "NewsArticle",
        headline: meta.title,
        datePublished: new Date().toISOString().split("T")[0],
        author: { "@type": "Organization", name: "자현" },
      };
    case "product":
      return {
        ...base,
        "@type": "Product",
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          priceCurrency: "KRW",
        },
      };
    case "faq":
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [],  // Would be populated from H3/details elements
      };
    case "contact":
      return {
        ...base,
        "@type": "ContactPage",
      };
    case "about":
      return {
        ...base,
        "@type": "AboutPage",
      };
    case "home":
      return {
        ...base,
        "@type": "WebSite",
      };
    case "category":
      return {
        ...base,
        "@type": "CollectionPage",
      };
    default:
      return {
        ...base,
        "@type": "WebPage",
      };
  }
}

export function applySchemas(projDir, opts = {}) {
  const baseUrl = opts.baseUrl || "https://example.com";
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], byType: {} };
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
        const urlPath = "/" + prefix + (prefix ? "/" : "");
        const pageType = detectPageType(html, urlPath);
        const meta = extractMeta(html);
        const schema = generateSchema(pageType, meta, urlPath, baseUrl);

        // Remove existing sigma-schema
        html = html.replace(/<script[^>]*id="__sigma_schema__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_schema__" type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
        if (html.includes("</head>")) html = html.replace("</head>", inject + "\n</head>");

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push({ path: path.relative(projDir, full), pageType });
          result.byType[pageType] = (result.byType[pageType] || 0) + 1;
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
  const baseUrl = flagVal("--base-url");
  const r = applySchemas(projDir, { baseUrl });
  console.log(`[schema] ${r.files?.length || 0} pages`);
  for (const [t, n] of Object.entries(r.byType)) console.log(`  ${t}: ${n}`);
}

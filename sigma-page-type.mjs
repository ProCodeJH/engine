#!/usr/bin/env node
// sigma-page-type.mjs — Paradigm 254 — Page Type Detection
//
// URL pattern + HTML structure → home/article/product/contact/faq/category/landing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function detectPageType(html, urlPath) {
  const path_lower = (urlPath || "").toLowerCase();
  const html_lower = (html || "").toLowerCase().slice(0, 50000);

  // URL-based patterns (fast)
  if (/^\/?$/.test(path_lower)) return "home";
  if (/\/(blog|news|article|post|magazine)/.test(path_lower)) return "article";
  if (/\/(product|item|shop|store)/.test(path_lower)) return "product";
  if (/\/(contact|문의|상담)/.test(path_lower)) return "contact";
  if (/\/(about|소개|company)/.test(path_lower)) return "about";
  if (/\/(faq|qa|question|자주묻는질문)/.test(path_lower)) return "faq";
  if (/\/(category|categories|tag|tags)/.test(path_lower)) return "category";
  if (/\/(login|signin|signup|register|회원가입|로그인)/.test(path_lower)) return "auth";
  if (/\/(search|검색)/.test(path_lower)) return "search";

  // HTML-based patterns
  if (html_lower.includes('<article') && html_lower.match(/<time/)) return "article";
  if (html_lower.includes('itemtype="https://schema.org/product"') ||
      html_lower.includes("add to cart") || html_lower.includes("장바구니")) return "product";
  if (html_lower.includes('<form') &&
      (html_lower.includes("contact") || html_lower.includes("문의"))) return "contact";
  if (html_lower.match(/<details|aria-expanded/) &&
      (html_lower.includes("question") || html_lower.includes("answer") || html_lower.includes("질문"))) return "faq";

  // Heading-based
  const h1Matches = html_lower.match(/<h1[^>]*>([^<]+)<\/h1>/g) || [];
  const h1Text = h1Matches.map(h => h.replace(/<[^>]+>/g, "").toLowerCase()).join(" ");
  if (/(blog|article|post|news)/.test(h1Text)) return "article";
  if (/(product|shop|item)/.test(h1Text)) return "product";

  return "landing";
}

export function analyzeMirror(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const pages = [];
  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === "index.html") {
        const html = fs.readFileSync(full, "utf-8");
        const urlPath = "/" + prefix + (prefix ? "/" : "");
        const pageType = detectPageType(html, urlPath);
        pages.push({ path: urlPath, pageType, htmlSize: html.length });
      }
    }
  }
  walk(publicDir);

  // Group by type
  const byType = {};
  for (const p of pages) {
    if (!byType[p.pageType]) byType[p.pageType] = [];
    byType[p.pageType].push(p.path);
  }

  return { pages, byType };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = analyzeMirror(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[page-type] ${r.pages.length} pages analyzed`);
  for (const [type, paths] of Object.entries(r.byType)) {
    console.log(`  ${type}: ${paths.length} (${paths.slice(0, 3).join(", ")}${paths.length > 3 ? "..." : ""})`);
  }
}

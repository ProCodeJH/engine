#!/usr/bin/env node
// sigma-rss-feed.mjs — Paradigm 258 — RSS Feed Auto Generator
//
// Article pages (P254 detection) → /rss.xml.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectPageType } from "./sigma-page-type.mjs";

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled";
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  let description = descMatch ? descMatch[1] : "";
  if (!description) {
    const pMatch = html.match(/<p[^>]*>([^<]{20,400})<\/p>/i);
    if (pMatch) description = pMatch[1].trim().slice(0, 300).replace(/<[^>]+>/g, "");
  }
  return { title, description };
}

function escapeXml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateRss(projDir, opts = {}) {
  const baseUrl = opts.baseUrl || "https://example.com";
  const siteName = opts.siteName || "Sigma Mirror";
  const description = opts.description || "Production-grade mirror";
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const articles = [];
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
        if (pageType === "article" || pageType === "category") {
          const meta = extractMeta(html);
          const stat = fs.statSync(full);
          articles.push({
            title: meta.title,
            description: meta.description,
            url: baseUrl + urlPath,
            pubDate: stat.mtime.toUTCString(),
          });
        }
      }
    }
  }
  walk(publicDir);

  // Limit to 50 most recent
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const limited = articles.slice(0, 50);

  const itemsXml = limited.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <description>${escapeXml(a.description)}</description>
      <link>${escapeXml(a.url)}</link>
      <guid isPermaLink="true">${escapeXml(a.url)}</guid>
      <pubDate>${a.pubDate}</pubDate>
    </item>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(description)}</description>
    <atom:link href="${escapeXml(baseUrl + "/rss.xml")}" rel="self" type="application/rss+xml"/>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(publicDir, "rss.xml"), xml);

  // Inject feed link into all index.html
  const result = { articles: limited.length, files: [] };
  function inject(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) inject(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<link[^>]*type="application\/rss\+xml"[^>]*>\s*/gi, "");
        const tag = `<link rel="alternate" type="application/rss+xml" title="${escapeXml(siteName)}" href="/rss.xml">`;
        if (html.includes("</head>")) html = html.replace("</head>", tag + "\n</head>");
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  inject(publicDir);

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir> [--base-url ...] [--site-name ...]"); process.exit(1); }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const baseUrl = flagVal("--base-url");
  const siteName = flagVal("--site-name");
  const r = generateRss(projDir, { baseUrl, siteName });
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[rss] ${r.articles} articles → /rss.xml`);
  console.log(`  feed link injected: ${r.files.length} files`);
}

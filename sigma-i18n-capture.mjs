#!/usr/bin/env node
// sigma-i18n-capture.mjs — Paradigm 215 — Multi-Language Detection + Capture
//
// 자현 universal: hreflang / lang attribute 자동 detect → 각 언어 버전 mirror.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function discoverLanguages(sourceUrl) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const langs = await page.evaluate(() => {
    const results = [];
    // hreflang attributes
    document.querySelectorAll('link[hreflang]').forEach(link => {
      results.push({
        lang: link.getAttribute("hreflang"),
        url: link.getAttribute("href"),
        type: "hreflang",
      });
    });
    // Language switcher links
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      const text = a.textContent.trim().toLowerCase();
      // Common language indicators
      if (/\/(ko|en|ja|zh|fr|de|es|pt|ru|ar|hi|vi|th|id)\//.test(href)) {
        const m = href.match(/\/(ko|en|ja|zh|fr|de|es|pt|ru|ar|hi|vi|th|id)\//);
        if (m && !results.some(r => r.lang === m[1])) {
          results.push({ lang: m[1], url: href, type: "path-prefix" });
        }
      }
    });

    return {
      htmlLang: document.documentElement.lang || "unknown",
      detected: results.slice(0, 8),
    };
  }).catch(() => ({ htmlLang: "unknown", detected: [] }));

  await browser.close();
  return langs;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  if (!sourceUrl) { console.error("usage: <url>"); process.exit(1); }
  discoverLanguages(sourceUrl).then(r => {
    console.log(`[i18n] htmlLang: ${r.htmlLang}`);
    console.log(`  detected versions: ${r.detected.length}`);
    for (const d of r.detected) {
      console.log(`    ${d.lang} (${d.type}): ${d.url.slice(0, 80)}`);
    }
  });
}

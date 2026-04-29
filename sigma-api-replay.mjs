#!/usr/bin/env node
// sigma-api-replay.mjs — Paradigm 207 — Real API Replay (Service Worker based)
//
// 자현 명령: 진짜 dynamic API content 살아있음.
// Source의 모든 fetch/XHR JSON response record → service worker로 replay.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function recordApiCalls(sourceUrl, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const records = [];
  page.on("response", async (res) => {
    try {
      const req = res.request();
      const url = req.url();
      const ct = res.headers()["content-type"] || "";
      if (!/(json|text\/xml|graphql)/i.test(ct)) return;
      if (/\.(js|css|html)/.test(url)) return;
      if (url.startsWith("data:") || url.startsWith("blob:")) return;

      const body = await res.text().catch(() => "");
      if (body.length > 200000 || body.length === 0) return;

      records.push({
        url,
        method: req.method(),
        status: res.status(),
        contentType: ct.split(";")[0],
        body,
      });
    } catch {}
  });

  console.log(`[api-replay] capturing API calls from ${sourceUrl}...`);
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Trigger interactions (scroll, hover, click visible buttons)
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
  console.log(`  ${records.length} API records captured`);
  return records;
}

export function applyApiReplay(projDir, records) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  fs.writeFileSync(path.join(publicDir, "sigma-api-records.json"), JSON.stringify(records));

  // Inject API replay into existing service worker
  const swPath = path.join(publicDir, "sw.js");
  let swContent = fs.existsSync(swPath) ? fs.readFileSync(swPath, "utf-8") : "";

  const replayBlock = `
// sigma-api-replay (Paradigm 207)
const SIGMA_API_RECORDS = ${JSON.stringify(records)};
const SIGMA_API_MAP = new Map();
SIGMA_API_RECORDS.forEach(r => SIGMA_API_MAP.set(r.method + ':' + r.url, r));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const key = req.method + ':' + req.url;
  const match = SIGMA_API_MAP.get(key);
  if (match) {
    event.respondWith(new Response(match.body, {
      status: match.status,
      headers: { 'Content-Type': match.contentType, 'Access-Control-Allow-Origin': '*' },
    }));
  }
});
`;

  // If sw.js doesn't exist yet, create minimal
  if (!swContent) {
    swContent = `
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
${replayBlock}
`;
  } else {
    swContent = swContent + "\n" + replayBlock;
  }

  fs.writeFileSync(swPath, swContent);
  return { records: records.length };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir) {
    console.error("usage: node sigma-api-replay.mjs <source-url> <projDir>");
    process.exit(1);
  }
  recordApiCalls(sourceUrl).then((records) => {
    const r = applyApiReplay(projDir, records);
    console.log(`[api-replay] ${r.records} records applied to sw.js`);
  });
}

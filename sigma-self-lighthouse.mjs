#!/usr/bin/env node
// sigma-self-lighthouse.mjs — Paradigm 237 — Self Performance Audit
//
// Mirror 자체 measurement (FCP, LCP, CLS, TBT). Lighthouse 외부 의존 없이.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function selfAudit(url, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Throttling for realistic measurement
  await page.emulateNetworkConditions({
    offline: false,
    downloadThroughput: 1.5 * 1024 * 1024 / 8,  // 1.5 Mbps
    uploadThroughput: 0.75 * 1024 * 1024 / 8,
    latency: 40,
  }).catch(() => {});

  // Performance observer setup
  await page.evaluateOnNewDocument(() => {
    window.__sigma_perf__ = { lcp: 0, cls: 0, fcp: 0, ttfb: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          window.__sigma_perf__.lcp = entry.startTime;
        } else if (entry.entryType === "layout-shift" && !entry.hadRecentInput) {
          window.__sigma_perf__.cls += entry.value;
        } else if (entry.entryType === "paint" && entry.name === "first-contentful-paint") {
          window.__sigma_perf__.fcp = entry.startTime;
        } else if (entry.entryType === "navigation") {
          window.__sigma_perf__.ttfb = entry.responseStart;
        }
      }
    }).observe({ entryTypes: ["largest-contentful-paint", "layout-shift", "paint", "navigation"] });
  });

  console.log(`[lighthouse] auditing: ${url}`);
  const start = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));  // settle

  const metrics = await page.evaluate(() => {
    const p = window.__sigma_perf__ || {};
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      fcp: Math.round(p.fcp || 0),
      lcp: Math.round(p.lcp || 0),
      cls: +(p.cls || 0).toFixed(3),
      ttfb: Math.round(p.ttfb || nav?.responseStart || 0),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
      load: Math.round(nav?.loadEventEnd || 0),
      transferSize: nav?.transferSize || 0,
      resourceCount: performance.getEntriesByType("resource").length,
    };
  });

  const totalTime = Date.now() - start;
  await browser.close();

  // Score calculation (Lighthouse-inspired thresholds)
  const score = {
    fcp: metrics.fcp < 1800 ? 100 : metrics.fcp < 3000 ? 75 : metrics.fcp < 4200 ? 50 : 25,
    lcp: metrics.lcp < 2500 ? 100 : metrics.lcp < 4000 ? 75 : 50,
    cls: metrics.cls < 0.1 ? 100 : metrics.cls < 0.25 ? 75 : 50,
    ttfb: metrics.ttfb < 800 ? 100 : metrics.ttfb < 1800 ? 75 : 50,
  };
  const overall = Math.round((score.fcp + score.lcp + score.cls + score.ttfb) / 4);

  return {
    url,
    metrics,
    score,
    overall,
    totalTime,
    interpretation:
      overall >= 90 ? "EXCELLENT" :
      overall >= 75 ? "GOOD" :
      overall >= 50 ? "NEEDS_IMPROVEMENT" :
      "POOR",
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const url = process.argv[2];
  if (!url) { console.error("usage: <url>"); process.exit(1); }
  selfAudit(url).then(r => {
    console.log(`\n[lighthouse] ${r.interpretation} — overall ${r.overall}%`);
    console.log(`  FCP:  ${r.metrics.fcp}ms (score ${r.score.fcp})`);
    console.log(`  LCP:  ${r.metrics.lcp}ms (score ${r.score.lcp})`);
    console.log(`  CLS:  ${r.metrics.cls} (score ${r.score.cls})`);
    console.log(`  TTFB: ${r.metrics.ttfb}ms (score ${r.score.ttfb})`);
    console.log(`  DCL:  ${r.metrics.domContentLoaded}ms`);
    console.log(`  Load: ${r.metrics.load}ms`);
    console.log(`  Resources: ${r.metrics.resourceCount}, ${(r.metrics.transferSize / 1024).toFixed(1)}KB`);
  });
}

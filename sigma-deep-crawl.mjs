#!/usr/bin/env node
// sigma-deep-crawl.mjs — v103-1 Sitemap-based Deep Crawl
//
// 자현 ultrathink: 현재 v98 multi-page는 internal links 3개만 따라감.
// static-multi-page 사이트(회사 홈, 포트폴리오, 블로그)의 100% 클론은
// 모든 routes 캡처 필요. v103은 sitemap.xml 자동 발견 + robots.txt
// 준수 + 30+ routes 까지 캡처. 사이트 카테고리 ceiling 100% 도달의 핵심.
//
// Strategy:
//   1. Fetch /robots.txt — User-agent: * 의 Disallow 패턴 수집
//   2. Try sitemap candidates — /sitemap.xml, /sitemap_index.xml,
//      robots.txt의 Sitemap: 디렉티브
//   3. <sitemapindex> 인 경우 재귀로 nested sitemap 가져오기
//   4. <urlset>의 <loc> URL 추출 + same-origin + robots Disallow 필터
//   5. 각 route 방문 (waitUntil networkidle2) + scroll lazy-load + 캡처
//   6. base URL로 복귀
//
// Output: extracted.deepCrawl = {
//   origin, robotsTxt: { allowedRoutes, disallowedPatterns },
//   sitemap: { found, totalUrls, nestedSitemaps },
//   routes: { '/about': { title, h1, headings, paragraphs, sections, ... } },
//   crawledCount, skippedDisallowed, errored
// }

export async function deepCrawl(page, cdp, extracted, baseUrl, opts = {}) {
  const t0 = Date.now();
  const MAX_ROUTES = opts.maxRoutes ?? 30;
  const TIMEOUT = opts.timeout ?? 30000;
  const RESPECT_ROBOTS = opts.respectRobots ?? true;

  console.log(`[v103-1] DEEP CRAWL`);

  const origin = new URL(baseUrl).origin;
  const out = {
    origin,
    robotsTxt: { allowedRoutes: [], disallowedPatterns: [], sitemapDirectives: [] },
    sitemap: { found: false, totalUrls: 0, nestedSitemaps: [] },
    routes: {},
    crawledCount: 0,
    skippedDisallowed: 0,
    errored: 0,
  };

  // Step 1: robots.txt
  try {
    const resp = await fetch(origin + "/robots.txt", { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const txt = await resp.text();
      const lines = txt.split(/\r?\n/);
      let inAllUA = false;
      for (const l of lines) {
        const trimmed = l.trim();
        if (/^User-agent:\s*\*\s*$/i.test(trimmed)) { inAllUA = true; continue; }
        if (/^User-agent:/i.test(trimmed)) { inAllUA = false; continue; }
        const sm = trimmed.match(/^Sitemap:\s*(.+)/i);
        if (sm) out.robotsTxt.sitemapDirectives.push(sm[1].trim());
        if (!inAllUA) continue;
        const dis = trimmed.match(/^Disallow:\s*(.+)/i);
        const all = trimmed.match(/^Allow:\s*(.+)/i);
        if (dis && dis[1]) out.robotsTxt.disallowedPatterns.push(dis[1].trim());
        if (all && all[1]) out.robotsTxt.allowedRoutes.push(all[1].trim());
      }
    }
  } catch {}

  // Step 2: Sitemap candidates
  const sitemapCandidates = [
    ...out.robotsTxt.sitemapDirectives,
    origin + "/sitemap.xml",
    origin + "/sitemap_index.xml",
    origin + "/sitemap-index.xml",
  ];
  const seenSitemaps = new Set();
  const allUrls = new Set();

  async function fetchSitemap(url) {
    if (seenSitemaps.has(url)) return;
    seenSitemaps.add(url);
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) return;
      const xml = await resp.text();

      // Detect <sitemapindex> vs <urlset>
      if (/<sitemapindex/i.test(xml)) {
        const nested = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        out.sitemap.nestedSitemaps.push(...nested);
        for (const n of nested.slice(0, 8)) await fetchSitemap(n);
      } else if (/<urlset/i.test(xml)) {
        const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
        for (const u of urls) {
          if (u.startsWith(origin)) allUrls.add(u);
        }
      }
    } catch {}
  }

  for (const cand of sitemapCandidates) {
    await fetchSitemap(cand);
    if (allUrls.size >= MAX_ROUTES * 3) break;
  }
  out.sitemap.found = allUrls.size > 0;
  out.sitemap.totalUrls = allUrls.size;

  if (allUrls.size === 0) {
    // Fallback: extracted.seo.internalLinks
    const fallbacks = (extracted.seo?.internalLinks || []).filter(h => h.startsWith("/"));
    for (const h of fallbacks) allUrls.add(origin + h);
    if (allUrls.size > 0) console.log(`  no sitemap — fallback to internalLinks (${allUrls.size})`);
  } else {
    console.log(`  sitemap: ${allUrls.size} URLs (nested ${out.sitemap.nestedSitemaps.length})`);
  }

  // Step 3: Filter by robots
  const isDisallowed = (url) => {
    if (!RESPECT_ROBOTS) return false;
    const path = new URL(url).pathname;
    for (const pattern of out.robotsTxt.disallowedPatterns) {
      const cleanPattern = pattern.replace(/\*/g, "");
      if (cleanPattern && path.startsWith(cleanPattern)) return true;
    }
    return false;
  };

  const filteredUrls = [...allUrls].filter(u => {
    if (isDisallowed(u)) {
      out.skippedDisallowed++;
      return false;
    }
    // Skip non-HTML extensions
    if (/\.(png|jpg|jpeg|gif|svg|pdf|ico|css|js|woff2?|webp|mp4|mp3|zip|json|xml)(\?|$)/i.test(u)) return false;
    return true;
  }).slice(0, MAX_ROUTES);

  console.log(`  crawling ${filteredUrls.length} routes (skipped ${out.skippedDisallowed} disallowed)`);

  // Step 4: Crawl
  for (const url of filteredUrls) {
    try {
      const route = new URL(url).pathname || "/";
      if (out.routes[route]) continue;

      await page.goto(url, { waitUntil: "networkidle2", timeout: TIMEOUT });
      await new Promise(r => setTimeout(r, 800));
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
        window.scrollTo(0, 0);
      });

      const routeData = await page.evaluate(() => ({
        title: document.title || "",
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
        h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 200),
        headings: [...document.querySelectorAll("h1, h2, h3")]
          .map(h => (h.textContent || "").trim())
          .filter(t => t.length >= 2 && t.length < 200)
          .slice(0, 25),
        paragraphs: [...document.querySelectorAll("p")]
          .map(p => (p.textContent || "").trim())
          .filter(t => t.length >= 10 && t.length < 400)
          .slice(0, 20),
        images: [...document.querySelectorAll("img")].slice(0, 12).map(img => {
          const r = img.getBoundingClientRect();
          return { src: img.currentSrc || img.src, alt: img.alt || "", w: Math.round(r.width), h: Math.round(r.height) };
        }).filter(i => i.src && i.w >= 50),
        sectionCount: [...document.querySelectorAll("section, [class*='section']")]
          .filter(el => el.getBoundingClientRect().height >= 100).length,
        bodyClasses: (document.body.className || "").toString().slice(0, 200),
        docHeight: document.body.scrollHeight,
      }));

      out.routes[route] = routeData;
      out.crawledCount++;
      console.log(`    ${route}: "${routeData.h1.slice(0, 40)}" (${routeData.sectionCount} sec, ${routeData.headings.length} h, ${routeData.paragraphs.length} p)`);
    } catch (e) {
      out.errored++;
      console.log(`    ${url}: ${String(e.message || e).slice(0, 80)}`);
    }
  }

  // Step 5: Restore base URL
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: TIMEOUT });
    await new Promise(r => setTimeout(r, 600));
  } catch {}

  extracted.deepCrawl = out;
  if (!extracted.timing) extracted.timing = {};
  extracted.timing.deepCrawl = Date.now() - t0;

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  deep crawl: ${out.crawledCount} routes captured / ${out.errored} errors (${dur}s)`);
  return out;
}

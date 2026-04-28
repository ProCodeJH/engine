// nava-omega Service Worker — runtime asset fallback (v2 catch-all)
// 자현 비전: 동적 fetch도 가능한 한 mirror로 fallback. analytics는 무해화.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const FCDN_PREFIX = "/_fcdn/";
const SOURCE_ORIGIN = "https://www.dusonnuri.co.kr";
const ANALYTICS_PATTERNS = /google-analytics|googletagmanager|hotjar|mixpanel|segment|amplitude|datadog|sentry|fullstory|clarity|facebook\.com\/tr|connect\.facebook|gtag/i;

async function sha1Hex(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Same-origin: serve directly (no intercept)
  if (url.startsWith(self.location.origin)) return;

  // Analytics / tracking: 무해화 (empty 200)
  if (ANALYTICS_PATTERNS.test(url)) {
    event.respondWith(new Response("", { status: 200, headers: { "Content-Type": "text/plain" } }));
    return;
  }

  // External: try mirrored copy → fallback to network
  event.respondWith((async () => {
    try {
      const u = new URL(url);
      const ext = (u.pathname.match(/\.[a-z0-9]{2,5}$/i) || [""])[0];
      const hash = await sha1Hex(url);
      const local = self.location.origin + FCDN_PREFIX + hash + ext;
      const r = await fetch(local);
      if (r.ok) return r;
    } catch {}
    // Fallback: network (no-cors for opacity)
    try {
      return await fetch(event.request, { mode: "cors" });
    } catch {
      try { return await fetch(event.request, { mode: "no-cors" }); }
      catch { return new Response("", { status: 404 }); }
    }
  })());
});

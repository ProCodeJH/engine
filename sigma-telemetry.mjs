#!/usr/bin/env node
// sigma-telemetry.mjs — Paradigm 242 — Lightweight Telemetry Dashboard
//
// Mirror에 inject. LocalStorage-based. 자현 client용 dashboard.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TELEMETRY_JS = `
/* sigma-telemetry — Paradigm 242 */
(function telemetry() {
  const KEY = '__sigma_telemetry__';
  const data = JSON.parse(localStorage.getItem(KEY) || '{"pageviews":{},"clicks":{},"sessions":[]}');

  // Pageview
  const path = location.pathname;
  data.pageviews[path] = (data.pageviews[path] || 0) + 1;

  // Session start
  const sessionId = sessionStorage.getItem('__sigma_session__');
  if (!sessionId) {
    const sid = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('__sigma_session__', sid);
    data.sessions.push({ sid, start: Date.now(), path, ua: navigator.userAgent.slice(0, 100) });
    if (data.sessions.length > 100) data.sessions = data.sessions.slice(-100);
  }

  // Click tracking
  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button');
    if (!el) return;
    const key = (el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 40)).slice(0, 80);
    data.clicks[key] = (data.clicks[key] || 0) + 1;
    saveData();
  });

  function saveData() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }
  saveData();

  // Expose to dashboard
  window.__sigma_telemetry_data__ = data;
})();
`;

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Sigma Telemetry Dashboard</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 24px; background: #f9fafb; }
    h1 { color: #4f46e5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .card { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .card h2 { font-size: 14px; color: #6b7280; margin: 0 0 8px; }
    .card .num { font-size: 32px; font-weight: bold; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; }
    .bar { background: #4f46e5; height: 8px; border-radius: 4px; }
    .empty { text-align: center; padding: 40px; color: #9ca3af; }
    button { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>📊 Telemetry Dashboard</h1>
  <p style="color:#6b7280;">자현 client 사이트 lightweight metrics (LocalStorage-based)</p>

  <div class="grid">
    <div class="card"><h2>Total Pageviews</h2><div class="num" id="total-pv">0</div></div>
    <div class="card"><h2>Unique Pages</h2><div class="num" id="unique-pages">0</div></div>
    <div class="card"><h2>Sessions</h2><div class="num" id="sessions">0</div></div>
    <div class="card"><h2>Total Clicks</h2><div class="num" id="total-clicks">0</div></div>
  </div>

  <h3>Top Pages</h3>
  <table id="pages-table"><thead><tr><th>Path</th><th>Views</th><th></th></tr></thead><tbody></tbody></table>

  <h3 style="margin-top:32px;">Top Clicks</h3>
  <table id="clicks-table"><thead><tr><th>Element</th><th>Count</th></tr></thead><tbody></tbody></table>

  <p style="margin-top:32px;">
    <button onclick="exportJson()">📥 Export JSON</button>
    <button onclick="clearData()" style="background:#ef4444;">🗑️ Clear Data</button>
  </p>

  <script>
    function load() {
      return JSON.parse(localStorage.getItem('__sigma_telemetry__') || '{"pageviews":{},"clicks":{},"sessions":[]}');
    }
    function render() {
      const data = load();
      const pvEntries = Object.entries(data.pageviews).sort((a,b) => b[1] - a[1]);
      const clickEntries = Object.entries(data.clicks).sort((a,b) => b[1] - a[1]);
      const totalPv = pvEntries.reduce((s,[,v]) => s + v, 0);
      const totalClicks = clickEntries.reduce((s,[,v]) => s + v, 0);

      document.getElementById('total-pv').textContent = totalPv;
      document.getElementById('unique-pages').textContent = pvEntries.length;
      document.getElementById('sessions').textContent = data.sessions.length;
      document.getElementById('total-clicks').textContent = totalClicks;

      const maxPv = Math.max(...pvEntries.map(([,v]) => v), 1);
      document.querySelector('#pages-table tbody').innerHTML = pvEntries.slice(0, 20).map(([path, views]) =>
        '<tr><td>' + path + '</td><td>' + views + '</td><td><div class="bar" style="width:' + (views/maxPv*100) + 'px;"></div></td></tr>'
      ).join('') || '<tr><td colspan=3 class="empty">No data yet</td></tr>';

      document.querySelector('#clicks-table tbody').innerHTML = clickEntries.slice(0, 20).map(([key, n]) =>
        '<tr><td>' + key + '</td><td>' + n + '</td></tr>'
      ).join('') || '<tr><td colspan=2 class="empty">No clicks yet</td></tr>';
    }
    function exportJson() {
      const data = load();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sigma-telemetry-' + Date.now() + '.json';
      a.click();
    }
    function clearData() {
      if (confirm('Clear all telemetry data?')) {
        localStorage.removeItem('__sigma_telemetry__');
        render();
      }
    }
    render();
    setInterval(render, 5000);
  </script>
</body>
</html>`;

export function applyTelemetry(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  // Inject tracker into all index.html
  const result = { files: [], dashboardEmitted: false };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_telemetry__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_telemetry__">\n${TELEMETRY_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  walk(publicDir);

  // Emit dashboard
  const dashboardDir = path.join(publicDir, "telemetry");
  fs.mkdirSync(dashboardDir, { recursive: true });
  fs.writeFileSync(path.join(dashboardDir, "index.html"), DASHBOARD_HTML);
  result.dashboardEmitted = true;

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyTelemetry(projDir);
  console.log(`[telemetry] HTML: ${r.files?.length || 0}, dashboard: ${r.dashboardEmitted}`);
  console.log(`  → /telemetry/index.html (자현 dashboard)`);
}

#!/usr/bin/env node
// sigma-lead-capture.mjs — Paradigm 273 — Lead Capture Forms
//
// Form submission → LocalStorage 저장. 자현 client 비즈니스 가치 (방문자 leads).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LEAD_CAPTURE_JS = `
/* sigma-lead-capture — Paradigm 273 */
(function leadCapture() {
  const KEY = '__sigma_leads__';

  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        if (input.type === 'submit' || input.type === 'button' || !input.name) return;
        if (input.type === 'password') return;  // skip passwords
        data[input.name] = input.value;
      });

      const lead = {
        timestamp: Date.now(),
        page: location.pathname,
        formId: form.id || '(unnamed)',
        data,
      };

      const leads = JSON.parse(localStorage.getItem(KEY) || '[]');
      leads.push(lead);
      if (leads.length > 1000) leads.splice(0, leads.length - 1000);  // cap
      localStorage.setItem(KEY, JSON.stringify(leads));

      // Show success toast
      showToast('문의가 접수되었습니다. 감사합니다.', true);

      form.reset();
    });
  });

  function showToast(msg, success = true) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);' +
      'background:' + (success ? '#4ade80' : '#f87171') + ';color:white;' +
      'padding:14px 28px;border-radius:8px;z-index:99999;font-size:14px;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.15);';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
})();
`;

export const LEADS_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Lead Capture Dashboard</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 24px; background: #f9fafb; }
    h1 { color: #4f46e5; }
    .card { background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 16px; }
    .lead { border-left: 4px solid #4f46e5; padding: 12px; margin: 8px 0; background: #f9fafb; border-radius: 4px; }
    .lead-meta { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    .lead-data { font-size: 13px; }
    .lead-data dt { font-weight: 600; color: #1f2937; }
    .lead-data dd { margin: 0 0 4px 16px; color: #4b5563; }
    .empty { text-align: center; padding: 40px; color: #9ca3af; }
    button { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>📋 Lead Capture Dashboard</h1>
  <p style="color:#6b7280;">사이트 방문자가 form 작성한 leads (LocalStorage-based, P273)</p>

  <div class="card">
    <strong>Total leads: <span id="total">0</span></strong>
    <p style="margin-top:12px;">
      <button onclick="exportCsv()">📥 Export CSV</button>
      <button onclick="exportJson()">📥 Export JSON</button>
      <button onclick="clearLeads()" style="background:#ef4444;">🗑️ Clear All</button>
    </p>
  </div>

  <div id="leads"></div>

  <script>
    function load() { return JSON.parse(localStorage.getItem('__sigma_leads__') || '[]'); }
    function render() {
      const leads = load();
      document.getElementById('total').textContent = leads.length;
      const container = document.getElementById('leads');
      if (leads.length === 0) {
        container.innerHTML = '<div class="empty">No leads yet — 사이트 방문자가 form 작성하면 여기 표시</div>';
        return;
      }
      container.innerHTML = leads.slice().reverse().map(l => {
        const dt = new Date(l.timestamp).toLocaleString('ko-KR');
        const data = Object.entries(l.data).map(([k,v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('');
        return '<div class="lead"><div class="lead-meta">' + dt + ' • ' + l.page + ' • Form: ' + l.formId + '</div><dl class="lead-data">' + data + '</dl></div>';
      }).join('');
    }
    function exportJson() {
      const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leads-' + Date.now() + '.json';
      a.click();
    }
    function exportCsv() {
      const leads = load();
      if (leads.length === 0) return;
      const headers = ['timestamp', 'page', 'formId', ...new Set(leads.flatMap(l => Object.keys(l.data)))];
      const rows = [headers.join(',')];
      for (const l of leads) {
        const row = [
          new Date(l.timestamp).toISOString(),
          l.page,
          l.formId,
          ...headers.slice(3).map(h => '"' + (l.data[h] || '').replace(/"/g, '""') + '"'),
        ];
        rows.push(row.join(','));
      }
      const blob = new Blob([rows.join('\\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leads-' + Date.now() + '.csv';
      a.click();
    }
    function clearLeads() {
      if (confirm('Delete all leads?')) {
        localStorage.removeItem('__sigma_leads__');
        render();
      }
    }
    render();
    setInterval(render, 5000);
  </script>
</body>
</html>`;

export function applyLeadCapture(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

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
        html = html.replace(/<script[^>]*id="__sigma_lead_capture__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_lead_capture__">\n${LEAD_CAPTURE_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  walk(publicDir);

  const dashboardDir = path.join(publicDir, "leads");
  fs.mkdirSync(dashboardDir, { recursive: true });
  fs.writeFileSync(path.join(dashboardDir, "index.html"), LEADS_DASHBOARD_HTML);
  result.dashboardEmitted = true;

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyLeadCapture(projDir);
  console.log(`[lead-capture] HTML: ${r.files?.length || 0}`);
  console.log(`  → /leads/index.html (자현 dashboard, CSV/JSON export)`);
}

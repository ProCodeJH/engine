#!/usr/bin/env node
// sigma-websocket-mock.mjs — Paradigm 221 — WebSocket Mock + SSE
//
// 자현 명령: chat/dashboard/real-time 사이트도 살아있음 (no crash on connect).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WEBSOCKET_MOCK_JS = `
/* sigma-websocket-mock — Paradigm 221 */
(function wsMock() {
  if (window.__sigma_ws_mocked__) return;
  window.__sigma_ws_mocked__ = true;

  const origWS = window.WebSocket;
  const origEventSource = window.EventSource;

  // Mock WebSocket
  function MockWebSocket(url, protocols) {
    console.log('[sigma-mock] WebSocket:', url);
    const listeners = { open: [], message: [], close: [], error: [] };
    const target = {
      url, protocols, readyState: 0,
      send: function(data) { console.log('[sigma-mock] ws.send:', String(data).slice(0, 100)); },
      close: function() { this.readyState = 3; fire('close', { code: 1000 }); },
      addEventListener: function(t, fn) { listeners[t]?.push(fn); },
      removeEventListener: function(t, fn) {
        if (listeners[t]) listeners[t] = listeners[t].filter(f => f !== fn);
      },
      dispatchEvent: function(e) { return true; },
      onopen: null, onmessage: null, onclose: null, onerror: null,
    };
    function fire(type, data) {
      const handler = target['on' + type];
      if (handler) handler(data);
      listeners[type]?.forEach(fn => fn(data));
    }
    setTimeout(() => {
      target.readyState = 1;
      fire('open', { type: 'open' });
    }, 100);
    // Periodic mock messages (heartbeat-like)
    setInterval(() => {
      if (target.readyState === 1) {
        fire('message', { data: JSON.stringify({ type: 'heartbeat', ts: Date.now() }) });
      }
    }, 30000);
    return target;
  }
  MockWebSocket.CONNECTING = 0; MockWebSocket.OPEN = 1; MockWebSocket.CLOSING = 2; MockWebSocket.CLOSED = 3;
  window.WebSocket = MockWebSocket;

  // Mock EventSource (SSE)
  function MockEventSource(url) {
    console.log('[sigma-mock] EventSource:', url);
    const listeners = { open: [], message: [], error: [] };
    const target = {
      url, readyState: 0,
      close: function() { this.readyState = 2; },
      addEventListener: function(t, fn) {
        if (!listeners[t]) listeners[t] = [];
        listeners[t].push(fn);
      },
      removeEventListener: function(t, fn) {
        if (listeners[t]) listeners[t] = listeners[t].filter(f => f !== fn);
      },
      onopen: null, onmessage: null, onerror: null,
    };
    setTimeout(() => {
      target.readyState = 1;
      target.onopen?.({ type: 'open' });
      listeners.open?.forEach(fn => fn({ type: 'open' }));
    }, 100);
    return target;
  }
  MockEventSource.CONNECTING = 0; MockEventSource.OPEN = 1; MockEventSource.CLOSED = 2;
  window.EventSource = MockEventSource;
})();
`;

export function applyWebSocketMock(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_ws_mock__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_ws_mock__">\n${WEBSOCKET_MOCK_JS}\n</script>`;
        // Inject at top of head (before any source script tries to use)
        if (html.includes("<head>")) html = html.replace("<head>", "<head>\n" + inject);
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
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
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyWebSocketMock(projDir);
  console.log(`[ws-mock] HTML files: ${r.files?.length || 0}`);
  console.log(`  ✅ WebSocket + EventSource mocked (no crash on connect)`);
}

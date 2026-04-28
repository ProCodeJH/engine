#!/usr/bin/env node
// sigma-imweb-runtime-stub.mjs — Paradigm 182 — Imweb Backend Runtime Stub
//
// 자현 진단: "글이 안 보임" — imweb backend runtime 변수 missing.
// LOCALIZE, MOBILE_CAROUSEL_MENU, ALARM_BADGE 등 imweb backend office에서 inject되는데,
// pure static mirror에는 그 runtime이 없어서 ReferenceError로 init script 깨짐.
//
// P182 Solution: imweb runtime stub inject. 모든 missing 변수 define.
// init script 안 깨지고 layout 정상 작동.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const IMWEB_RUNTIME_STUB_JS = `
/* sigma-imweb-runtime-stub — Paradigm 182 */
/* imweb backend office runtime 변수 stub (missing 으로 init 깨지는 거 fix) */
(function imwebStub() {
  // Localization
  window.LOCALIZE = window.LOCALIZE || function(key, ...args) { return key; };
  window.LOCALIZE_NUMBER = window.LOCALIZE_NUMBER || function(n) { return String(n); };
  window.LOCALIZE_PRICE = window.LOCALIZE_PRICE || function(p) { return p + '원'; };
  window.LOCALIZE_DATE = window.LOCALIZE_DATE || function(d) { return new Date(d).toLocaleString('ko-KR'); };

  // Menu classes (imweb는 class constructor 사용)
  function MenuStub() { this.items = []; this.render = () => {}; this.update = () => {}; this.destroy = () => {}; }
  MenuStub.prototype.init = function() {}; MenuStub.prototype.show = function() {}; MenuStub.prototype.hide = function() {};
  window.MOBILE_CAROUSEL_MENU = window.MOBILE_CAROUSEL_MENU || MenuStub;
  window.MOBILE_MENU = window.MOBILE_MENU || MenuStub;
  window.PC_MENU = window.PC_MENU || MenuStub;
  window.SUB_MENU = window.SUB_MENU || MenuStub;
  window.HEADER_MENU = window.HEADER_MENU || MenuStub;
  window.HEADER_MORE_MENU = window.HEADER_MORE_MENU || MenuStub;
  window.FOOTER_MENU = window.FOOTER_MENU || MenuStub;
  window.SIDE_MENU = window.SIDE_MENU || MenuStub;
  window.QUICK_MENU = window.QUICK_MENU || MenuStub;
  window.MAIN_MENU = window.MAIN_MENU || MenuStub;
  window.SUB_HEADER_MENU = window.SUB_HEADER_MENU || MenuStub;
  window.MEMBER_MENU = window.MEMBER_MENU || MenuStub;
  window.SHOP_MENU = window.SHOP_MENU || MenuStub;
  window.BOARD_MENU = window.BOARD_MENU || MenuStub;

  // Alarm / Notification (object with full method set)
  function AlarmStub() {}
  AlarmStub.prototype.addBadgeArea = function() {};
  AlarmStub.prototype.removeBadgeArea = function() {};
  AlarmStub.prototype.update = function() {};
  AlarmStub.prototype.show = function() {};
  AlarmStub.prototype.hide = function() {};
  const alarmInstance = Object.assign(new AlarmStub(), { count: 0, items: [] });
  window.ALARM_BADGE = window.ALARM_BADGE || alarmInstance;
  window.ALARM_MENU = window.ALARM_MENU || alarmInstance;
  window.ALARM_LIST = window.ALARM_LIST || [];

  // Imweb runtime
  window.IMWEB_VAR = window.IMWEB_VAR || {};
  window.IMWEB_USER = window.IMWEB_USER || { id: null, name: null, isLogged: false };
  window.IMWEB_SITE = window.IMWEB_SITE || {};
  window.IMWEB_PAGE = window.IMWEB_PAGE || {};
  window.IMWEB_LANG = window.IMWEB_LANG || 'ko';
  window.IMWEB_CURRENCY = window.IMWEB_CURRENCY || 'KRW';

  // Common namespaces
  window.IW = window.IW || {};
  window.IW.utils = window.IW.utils || {};
  window.IW.event = window.IW.event || { on: () => {}, off: () => {}, emit: () => {} };
  window.IW.api = window.IW.api || { get: () => Promise.resolve({}), post: () => Promise.resolve({}) };
  window.IW.shop = window.IW.shop || { cart: [], wishlist: [], compare: [] };

  // Site config
  window.SITE_CONFIG = window.SITE_CONFIG || {};
  window.MEMBER_CONFIG = window.MEMBER_CONFIG || {};
  window.ANALYTICS_CONFIG = window.ANALYTICS_CONFIG || {};

  // Datadog / monitoring (404로 missing)
  window.DD_RUM = window.DD_RUM || { init: () => {}, addAction: () => {}, addError: () => {} };

  // Brand scope (CORS blocked)
  window.brandScope = window.brandScope || { init: () => {}, get: () => null };
})();
`;

export function injectImwebStub(html) {
  // Replace existing stub with fresh content (idempotent + updateable)
  html = html.replace(/<script[^>]*id="__sigma_imweb_runtime_stub__"[\s\S]*?<\/script>\s*/gi, "");
  const stub = `<script id="__sigma_imweb_runtime_stub__">\n${IMWEB_RUNTIME_STUB_JS}\n</script>`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${stub}`);
  }
  return stub + html;
}

export function applyImwebStub(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], standalone: false };

  // Standalone file
  fs.writeFileSync(path.join(publicDir, "sigma-imweb-stub.js"), IMWEB_RUNTIME_STUB_JS);
  result.standalone = true;

  function walk(dir, depth = 0) {
    if (depth > 5) return;
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = injectImwebStub(html);
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
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-imweb-runtime-stub.mjs <projDir>");
    console.error("  imweb backend runtime 변수 stub (LOCALIZE, ALARM_*, MOBILE_*, IW.*, etc.)");
    console.error("  init script 깨짐 fix");
    process.exit(1);
  }
  const r = applyImwebStub(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[imweb-stub] HTML inject: ${r.files.length} files`);
  console.log(`  Standalone: public/sigma-imweb-stub.js`);
  console.log(`  Stubs: LOCALIZE, ALARM_*, MOBILE_*, IMWEB_*, IW.*, DD_RUM, brandScope`);
}

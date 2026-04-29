#!/usr/bin/env node
// sigma-csp.mjs — Paradigm 291 — Content Security Policy Auto
//
// CSP meta tag 자동 generate. Production security.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractExternalOrigins(html) {
  const origins = new Set();
  const matches = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)];
  for (const m of matches) {
    if (m[1].startsWith("data:") || m[1].startsWith("blob:")) continue;
    try {
      const u = new URL(m[1]);
      origins.add(u.origin);
    } catch {}
  }
  return [...origins];
}

export function applyCsp(projDir, opts = {}) {
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

        const origins = extractExternalOrigins(html);
        const externalOrigins = origins.filter(o => !o.startsWith("http://localhost"));

        // Build CSP directives
        const directives = {
          "default-src": "'self'",
          "script-src": "'self' 'unsafe-inline' 'unsafe-eval' " + externalOrigins.join(" "),
          "style-src": "'self' 'unsafe-inline' " + externalOrigins.join(" "),
          "img-src": "'self' data: blob: " + externalOrigins.join(" "),
          "font-src": "'self' data: " + externalOrigins.join(" "),
          "connect-src": "'self' " + externalOrigins.join(" "),
          "frame-src": "'self' " + externalOrigins.join(" "),
          "media-src": "'self' " + externalOrigins.join(" "),
          "object-src": "'none'",
          "base-uri": "'self'",
          "form-action": "'self'",
          "frame-ancestors": "'self'",
        };

        const cspContent = Object.entries(directives)
          .map(([k, v]) => `${k} ${v.trim()}`)
          .join("; ");

        // Remove existing CSP
        html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>\s*/gi, "");

        // Inject + other security headers as meta
        const securityMeta = `
<!-- sigma-csp (P291) -->
<meta http-equiv="Content-Security-Policy" content="${cspContent}">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
`;

        if (html.includes("<head>")) html = html.replace("<head>", "<head>\n" + securityMeta);

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
  const r = applyCsp(projDir);
  console.log(`[csp] HTML: ${r.files?.length || 0}`);
}

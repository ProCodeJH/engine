#!/usr/bin/env node
// sigma-font-host.mjs — Paradigm 305 — Web Font Self-Host
//
// 외부 CDN font URL → local self-host. FOUT 0%.

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(url, {
      headers: { "User-Agent": "NAVA-Sigma/1.0" },
      timeout: 15000,
    }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return downloadFile(loc, targetPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try {
          fs.writeFileSync(targetPath, Buffer.concat(chunks));
          resolve(Buffer.concat(chunks).length);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

export async function applyFontSelfHost(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const fontsDir = path.join(publicDir, "fonts-self-hosted");
  fs.mkdirSync(fontsDir, { recursive: true });

  const downloaded = [];
  const replacedUrls = new Map();

  // Walk CSS files for @font-face url()
  async function processCss(filePath) {
    let css = fs.readFileSync(filePath, "utf-8");
    const matches = [...css.matchAll(/url\(\s*['"]?(https?:\/\/[^'")\s]+\.(woff2?|ttf|otf|eot))['"]?\s*\)/gi)];
    for (const m of matches) {
      const url = m[1];
      if (replacedUrls.has(url)) continue;
      try {
        const ext = path.extname(url).split("?")[0];
        const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 8);
        const localName = `font-${hash}${ext}`;
        const localPath = path.join(fontsDir, localName);
        if (!fs.existsSync(localPath)) {
          await downloadFile(url, localPath);
        }
        replacedUrls.set(url, `/fonts-self-hosted/${localName}`);
        downloaded.push({ url, local: localName, size: fs.statSync(localPath).size });
      } catch (e) {
        // skip on download fail
      }
    }
    // Replace in CSS
    let replaced = css;
    for (const [url, local] of replacedUrls) {
      replaced = replaced.split(url).join(local);
    }
    if (replaced !== css) fs.writeFileSync(filePath, replaced);
  }

  async function walkCss(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walkCss(full, depth + 1);
      else if (entry.name.endsWith(".css")) {
        await processCss(full);
      }
    }
  }
  await walkCss(publicDir);

  // Also rewrite in HTML inline <style> blocks
  function walkHtml(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkHtml(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        for (const [url, local] of replacedUrls) {
          html = html.split(url).join(local);
        }
        if (html !== original) fs.writeFileSync(full, html);
      }
    }
  }
  walkHtml(publicDir);

  return { downloaded: downloaded.length, replaced: replacedUrls.size };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  applyFontSelfHost(projDir).then(r => {
    if (r.error) { console.error(r.error); process.exit(1); }
    console.log(`[font-host] downloaded ${r.downloaded} fonts, replaced ${r.replaced} urls`);
  });
}

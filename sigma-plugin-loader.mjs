#!/usr/bin/env node
// sigma-plugin-loader.mjs — Paradigm 241 — Plugin System
//
// 자현 사용자가 자체 paradigm 추가. plugins/ 디렉토리 자동 detect+load.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

export async function loadPlugins(pluginsDir = "plugins") {
  const dir = path.resolve(pluginsDir);
  if (!fs.existsSync(dir)) return [];

  const plugins = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!/\.(js|mjs)$/i.test(entry)) continue;
    const full = path.join(dir, entry);
    try {
      const mod = await import(pathToFileURL(full).href);
      if (typeof mod.apply === "function") {
        plugins.push({
          name: entry.replace(/\.(js|mjs)$/i, ""),
          apply: mod.apply,
          description: mod.description || "(no description)",
          order: mod.order || 100,
          file: full,
        });
      }
    } catch (e) {
      console.warn(`[plugin] failed to load ${entry}: ${e.message.slice(0, 60)}`);
    }
  }

  return plugins.sort((a, b) => a.order - b.order);
}

export async function applyPlugins(projDir, pluginsDir = "plugins") {
  const plugins = await loadPlugins(pluginsDir);
  const results = [];

  for (const plugin of plugins) {
    console.log(`[plugin] applying: ${plugin.name} (${plugin.description})`);
    try {
      const r = await plugin.apply(projDir);
      results.push({ name: plugin.name, ok: true, result: r });
    } catch (e) {
      results.push({ name: plugin.name, ok: false, error: e.message });
      console.warn(`  ❌ ${e.message.slice(0, 80)}`);
    }
  }

  return { count: plugins.length, results };
}

// ─── Generate sample plugin ───────────────────────────────────
export function generateSamplePlugin(targetDir = "plugins") {
  fs.mkdirSync(targetDir, { recursive: true });
  const samplePath = path.join(targetDir, "sample-plugin.mjs");
  if (fs.existsSync(samplePath)) return;

  fs.writeFileSync(samplePath, `// sample-plugin.mjs — 자현 자체 paradigm 예제
//
// Plugin export 규약:
//   export const description = '...'
//   export const order = 100  (lower = earlier)
//   export async function apply(projDir) { ... }

import fs from 'node:fs';
import path from 'node:path';

export const description = 'Sample plugin — adds custom <meta> tag';
export const order = 100;

export async function apply(projDir) {
  const publicDir = path.join(projDir, 'public');
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) return { error: 'index.html not found' };

  let html = fs.readFileSync(indexPath, 'utf-8');
  if (html.includes('<meta name="sigma-custom"')) return { skipped: true };

  const tag = '<meta name="sigma-custom" content="자현-deliverable">';
  html = html.replace('</head>', tag + '\\n</head>');
  fs.writeFileSync(indexPath, html);

  return { applied: true };
}
`);
  return samplePath;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "init") {
    const targetDir = path.resolve(process.argv[3] || "plugins");
    const sample = generateSamplePlugin(targetDir);
    console.log(`[plugin-system] initialized at ${targetDir}`);
    console.log(`  Sample: ${sample}`);
  } else if (cmd === "list") {
    loadPlugins(process.argv[3] || "plugins").then(plugins => {
      console.log(`[plugin-system] ${plugins.length} plugins`);
      for (const p of plugins) {
        console.log(`  ${p.name} (order=${p.order}): ${p.description}`);
      }
    });
  } else if (cmd === "apply") {
    const projDir = path.resolve(process.argv[3] || "");
    if (!projDir) { console.error("usage: apply <projDir> [pluginsDir]"); process.exit(1); }
    const pluginsDir = process.argv[4] || "plugins";
    applyPlugins(projDir, pluginsDir).then(r => {
      console.log(`[plugin-system] ${r.count} plugins applied`);
    });
  } else {
    console.error("usage:");
    console.error("  node sigma-plugin-loader.mjs init [plugins-dir]");
    console.error("  node sigma-plugin-loader.mjs list [plugins-dir]");
    console.error("  node sigma-plugin-loader.mjs apply <projDir> [plugins-dir]");
  }
}

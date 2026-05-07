#!/usr/bin/env node
/**
 * nava-cli.mjs — 통일 CLI (5 commands cover 90% use cases)
 *
 * 191 sigma 도구 → 5개로 simplify:
 *   nava capture <url>   — frozen mirror archive (sigma-batch-mirror, single URL)
 *   nava batch <urls>    — multi URL frozen mirror (sigma-batch-mirror)
 *   nava rebuild <url>   — production React rebuild (nava-sigma 단일 mode)
 *   nava fusion <url>    — 86-paradigm fusion archive (sigma-fusion)
 *   nava deploy <url>    — end-to-end pipeline (sigma-engine)
 *   nava extract <dir>   — design tokens 추출 → JSON
 *
 * 환경 변수:
 *   NAVA_ENGINE_ROOT (default: 이 file 위치)
 *   NAVA_OUTPUT_DIR  (default: cwd)
 *
 * 사용 (어디서든):
 *   node /path/to/engine/nava-cli.mjs capture https://example.com
 *   nava capture https://example.com  (npm install -g 후)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ENGINE_ROOT = process.env.NAVA_ENGINE_ROOT || path.dirname(__filename);
const OUTPUT_DIR = process.env.NAVA_OUTPUT_DIR || process.cwd();

const COMMANDS = {
  capture: {
    desc: 'Single-URL frozen mirror archive (script 제거, computed style inline). 운영 X, archive only.',
    tool: 'nava-omega.mjs',
    usage: 'nava capture <url> [--output dir]',
    runner: capturRunner,
  },
  batch: {
    desc: 'Multi-URL frozen mirror archive. urls.txt 또는 --urls "a,b,c".',
    tool: 'sigma-batch-mirror.mjs',
    usage: 'nava batch <urls.txt> [--concurrency 3] [--output dir]',
    runner: batchRunner,
  },
  rebuild: {
    desc: 'Production-ready React rebuild (Next.js + Tailwind + Framer Motion 코드 emit). 운영 OK.',
    tool: 'nava-sigma.mjs',
    usage: 'nava rebuild <url> [--output dir] [--skip-build]',
    runner: rebuildRunner,
  },
  fusion: {
    desc: '86-paradigm fusion archive (89-98% perceptual). frozen 강화. 운영 X.',
    tool: 'sigma-fusion.mjs',
    usage: 'nava fusion <url>',
    runner: fusionRunner,
  },
  deploy: {
    desc: 'End-to-end pipeline (omega + audit + brand-swap + converge + deploy). archive 기반.',
    tool: 'sigma-engine.mjs',
    usage: 'nava deploy <url> [--brand-kit dir] [--target 88] [--auto]',
    runner: deployRunner,
  },
  extract: {
    desc: 'Capture/rebuild/fusion 결과 디렉토리에서 design tokens (색/폰트/레이아웃) JSON 추출.',
    tool: 'internal',
    usage: 'nava extract <projectDir>',
    runner: extractRunner,
  },
};

function help() {
  console.log(`NAVA Sigma Engine — Unified CLI`);
  console.log(`사용: nava <command> <args>`);
  console.log(``);
  console.log(`Commands:`);
  for (const [name, c] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(10)} ${c.desc}`);
    console.log(`             ${c.usage}`);
    console.log(``);
  }
  console.log(`환경 변수:`);
  console.log(`  NAVA_ENGINE_ROOT=${ENGINE_ROOT}`);
  console.log(`  NAVA_OUTPUT_DIR=${OUTPUT_DIR}`);
  console.log(``);
  console.log(`자세한 설명: README-AGENT.md, decision-tree.md, AGENT_INSTRUCTIONS.md`);
}

function spawnTool(toolFile, args) {
  return new Promise((resolve) => {
    const toolPath = path.join(ENGINE_ROOT, toolFile);
    const proc = spawn(process.execPath, [toolPath, ...args], {
      stdio: 'inherit',
      cwd: OUTPUT_DIR, // run in user's cwd, but engine resolves from ENGINE_ROOT
    });
    proc.on('close', (code) => resolve(code));
    proc.on('error', (e) => {
      console.error(`[nava-cli] tool error: ${e.message}`);
      resolve(1);
    });
  });
}

async function capturRunner(args) {
  if (!args[0] || args[0].startsWith('--')) {
    console.error('usage: nava capture <url> [--output dir]');
    process.exit(2);
  }
  return spawnTool('nava-omega.mjs', args);
}

async function batchRunner(args) {
  if (!args[0]) {
    console.error('usage: nava batch <urls.txt> [--concurrency 3]');
    process.exit(2);
  }
  return spawnTool('sigma-batch-mirror.mjs', args);
}

async function rebuildRunner(args) {
  if (!args[0] || args[0].startsWith('--')) {
    console.error('usage: nava rebuild <url> [--output dir] [--skip-build]');
    process.exit(2);
  }
  return spawnTool('nava-sigma.mjs', args);
}

async function fusionRunner(args) {
  if (!args[0]) {
    console.error('usage: nava fusion <url>');
    process.exit(2);
  }
  return spawnTool('sigma-fusion.mjs', args);
}

async function deployRunner(args) {
  if (!args[0]) {
    console.error('usage: nava deploy <url> [--brand-kit dir] [--target 88] [--auto]');
    process.exit(2);
  }
  return spawnTool('sigma-engine.mjs', args);
}

async function extractRunner(args) {
  const dir = args[0];
  if (!dir) {
    console.error('usage: nava extract <projectDir>');
    process.exit(2);
  }
  // Try .sigma/scan.json first (rebuild output)
  const candidates = [
    path.join(dir, '.sigma', 'scan.json'),
    path.join(dir, 'meta.json'),
    path.join(dir, 'CERT-FUSION.md'),
  ];
  const tokens = { source: dir, mode: 'unknown', colors: [], fonts: [], errors: [] };

  for (const c of candidates) {
    try {
      const stat = await fs.stat(c);
      if (stat.isFile()) {
        const content = await fs.readFile(c, 'utf-8');
        if (c.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            tokens.mode = c.includes('.sigma') ? 'rebuild' : 'meta';
            if (parsed.colors) tokens.colors = parsed.colors;
            if (parsed.fonts) tokens.fonts = parsed.fonts;
            if (parsed.palette) tokens.palette = parsed.palette;
            tokens.raw = parsed;
            break;
          } catch (e) {
            tokens.errors.push(`parse ${c}: ${e.message}`);
          }
        } else {
          // markdown — extract via regex
          tokens.mode = 'fusion';
          const colorMatches = content.match(/#[0-9a-fA-F]{3,6}/g) || [];
          tokens.colors = [...new Set(colorMatches)].slice(0, 10);
          break;
        }
      }
    } catch {
      // continue
    }
  }

  console.log(JSON.stringify(tokens, null, 2));
  return 0;
}

async function main() {
  const [, , cmd, ...args] = process.argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    help();
    process.exit(0);
  }
  const command = COMMANDS[cmd];
  if (!command) {
    console.error(`Unknown command: ${cmd}`);
    help();
    process.exit(2);
  }
  const code = await command.runner(args);
  process.exit(code || 0);
}

main();

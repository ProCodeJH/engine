#!/usr/bin/env node
// sigma-emit-network.mjs — v102-2 Mock API routes from network patterns
//
// extracted.networkPatterns → /app/api/[mock route]/route.ts + lib/mock.ts.
// fetch 패턴 별 mock data generator (Next.js App Router 형식).
// 무한 스크롤·검색·필터가 클론에서도 작동하게.
//
// mockHints (email/url/name/title/datetime/id) → 응답 자동 생성.

import fs from "node:fs";
import path from "node:path";

export function emitNetworkRoutes(extracted, projDir) {
  const patterns = extracted.networkPatterns || [];
  const usable = patterns.filter(p => p.responseShape && p.mockHints);
  if (usable.length === 0) return { emitted: 0 };

  // 1. lib/mock.ts — generic mock generator from mockHints
  const libDir = path.join(projDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });
  fs.writeFileSync(path.join(libDir, "mock.ts"), MOCK_LIB);

  // 2. Each pattern → /app/api/.../route.ts
  const apiBase = path.join(projDir, "src", "app", "api", "sigma-mock");
  fs.mkdirSync(apiBase, { recursive: true });

  let emitted = 0;
  const manifest = [];
  for (let i = 0; i < usable.length; i++) {
    const p = usable[i];
    // Use a flat name (sigma-mock-{i}) to avoid Next.js dynamic route conflicts
    const routeName = `${i}`;
    const routeDir = path.join(apiBase, routeName);
    fs.mkdirSync(routeDir, { recursive: true });

    const routeFile = `// v102-2 Mock API route — pattern: ${p.pattern.slice(0, 100)}
// Method: ${p.method}, calls observed: ${p.callCount}, paging: ${p.paging?.type || "none"}

import { NextRequest, NextResponse } from "next/server";
import { generateFromHints } from "@/lib/mock";

const MOCK_HINTS = ${JSON.stringify(p.mockHints, null, 2)};
const PAGING = ${JSON.stringify(p.paging, null, 2)};

export async function ${p.method.toLowerCase()}(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("page") || searchParams.get("offset") || searchParams.get("cursor") || "0";
  const data = generateFromHints(MOCK_HINTS, { seed: String(seed) });
  return NextResponse.json(data);
}
`;
    fs.writeFileSync(path.join(routeDir, "route.ts"), routeFile);
    // sampleUrl 제외 — CERT-CLEAN compliance (source hostname leak 방지)
    manifest.push({
      idx: i,
      pattern: p.pattern,
      method: p.method,
      mockEndpoint: `/api/sigma-mock/${routeName}`,
    });
    emitted++;
  }

  // 3. Manifest for self-documentation
  fs.writeFileSync(path.join(apiBase, "_manifest.json"), JSON.stringify(manifest, null, 2));

  return { emitted, dir: apiBase, manifest };
}

const MOCK_LIB = `// v102-2 generic mock data generator from sigma-network-replay mockHints
// Deterministic per seed for hydration safety.

type Hint =
  | { kind: "string"; sampleLen?: number }
  | { kind: "email" | "url" | "name" | "title" | "paragraph" | "datetime" | "id" | "numericString" | "boolean" | "float" }
  | { kind: "integer"; sampleRange?: [number, number] }
  | { kind: "null" }
  | { kind: "array"; length: number; generateLength: number; itemHint: Hint }
  | { kind: "object"; fields: Record<string, Hint> };

let __seedState = 1;
function rand() {
  __seedState = (__seedState * 9301 + 49297) % 233280;
  return __seedState / 233280;
}
function setSeed(s: string) {
  __seedState = 1;
  for (let i = 0; i < s.length; i++) __seedState = (__seedState * 31 + s.charCodeAt(i)) >>> 0;
  if (__seedState === 0) __seedState = 1;
}

const FIRST_NAMES = ["Alex", "Jamie", "Sam", "Jordan", "Riley", "Casey", "Morgan", "Quinn", "Avery", "Drew"];
const LAST_NAMES = ["Park", "Kim", "Lee", "Choi", "Yoon", "Han", "Cho", "Im", "Seo", "Hong"];
const TITLES = ["Brand vision", "Strategic clarity", "Design system", "Editorial layout", "Product launch", "User research", "Market positioning", "Visual identity"];

export function generateFromHints(hint: Hint, opts: { seed?: string } = {}): any {
  if (opts.seed !== undefined) setSeed(opts.seed);
  return gen(hint);
}

function gen(hint: any): any {
  if (!hint) return null;
  switch (hint.kind) {
    case "null": return null;
    case "boolean": return rand() > 0.5;
    case "integer": {
      const [min, max] = hint.sampleRange || [0, 100];
      return Math.floor(min + rand() * (max - min));
    }
    case "float": return +(rand() * 100).toFixed(2);
    case "numericString": return String(Math.floor(rand() * 100000));
    case "id": return "id-" + Math.floor(rand() * 1e9).toString(16);
    case "email": {
      const f = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)].toLowerCase();
      return \`\${f}@example.com\`;
    }
    case "url": return \`https://placehold.co/\${300 + Math.floor(rand() * 400)}x\${300 + Math.floor(rand() * 400)}\`;
    case "name": {
      const f = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const l = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      return \`\${f} \${l}\`;
    }
    case "title": return TITLES[Math.floor(rand() * TITLES.length)];
    case "paragraph": return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.";
    case "datetime": return new Date(Date.now() - Math.floor(rand() * 30) * 86400000).toISOString();
    case "string": {
      const len = hint.sampleLen || 20;
      return "sample-" + Math.floor(rand() * 1e6).toString(36).slice(0, Math.max(4, Math.min(len, 40)));
    }
    case "array": {
      const len = hint.generateLength || 5;
      return Array.from({ length: len }, () => gen(hint.itemHint));
    }
    case "object": {
      const out: any = {};
      for (const [k, h] of Object.entries(hint.fields || {})) out[k] = gen(h);
      return out;
    }
    default: return null;
  }
}
`;

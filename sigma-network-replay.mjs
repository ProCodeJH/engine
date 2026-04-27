#!/usr/bin/env node
// sigma-network-replay.mjs — v102-1 Network Fetch Pattern → Mock Data
//
// 자현 ultrathink: 무한 스크롤 / 가상 리스트 / 동적 콘텐츠가 있는 사이트는
// fetch/XHR 호출로 데이터 가져옴. v98은 apiCaptures (URL + body) 캡처하지만
// emit엔 wired 안 됨 → 클론은 정적 빈 페이지. v102는 호출 패턴 추출해
// 응답 shape JSON Schema 생성 → emit 시 mock data 자동 생성으로 무한
// 스크롤·필터·검색이 클론에서도 작동.
//
// Mechanism:
//   1. extracted.apiCaptures (이미 v67 monkey-patch로 잡힘) 로부터 시작
//   2. URL 패턴화 (/users/123 → /users/:id, /posts/abc-def → /posts/:slug)
//   3. 응답 body를 JSON.parse 시도 → 성공 시 shape 분석 (depth 4)
//   4. shape에 mock generator hint 부여 (string → "Lorem ipsum",
//      number → randInt, array → repeat 5~10)
//   5. 각 패턴 별 통계 (호출 빈도, paging 추정) 보존
//
// Output: extracted.networkPatterns = [
//   { pattern, method, callCount, responseShape, mockHints, paging }
// ]

export async function captureNetworkReplay(page, cdp, extracted, opts = {}) {
  const t0 = Date.now();
  const MAX_PATTERNS = opts.maxPatterns ?? 60;

  console.log(`[v102-1] NETWORK REPLAY CAPTURE`);

  const apis = extracted.apiCaptures || [];
  if (apis.length === 0) {
    extracted.networkPatterns = [];
    console.log(`  no apiCaptures — nothing to pattern`);
    return [];
  }

  // Step 1: Group by URL pattern
  const groups = new Map();
  for (const cap of apis) {
    if (!cap.url) continue;
    const pattern = patternize(cap.url);
    if (!groups.has(pattern)) {
      groups.set(pattern, {
        pattern,
        method: cap.method || "GET",
        sampleUrls: [],
        bodies: [],
        callCount: 0,
      });
    }
    const g = groups.get(pattern);
    g.callCount++;
    if (g.sampleUrls.length < 3) g.sampleUrls.push(cap.url);
    if (cap.body && g.bodies.length < 3) g.bodies.push(cap.body);
  }

  // Step 2: Analyze each pattern's response shape
  const out = [];
  for (const g of [...groups.values()].slice(0, MAX_PATTERNS)) {
    let responseShape = null;
    let mockHints = null;
    let paging = null;

    for (const body of g.bodies) {
      try {
        const parsed = JSON.parse(body);
        responseShape = describeShape(parsed);
        mockHints = generateMockHints(parsed);
        paging = detectPaging(parsed, g.sampleUrls[0] || "");
        break;
      } catch {}
    }

    out.push({
      pattern: g.pattern,
      method: g.method,
      callCount: g.callCount,
      sampleUrl: g.sampleUrls[0] || null,
      responseShape,
      mockHints,
      paging,
    });
  }

  extracted.networkPatterns = out;
  if (!extracted.timing) extracted.timing = {};
  extracted.timing.networkReplay = Date.now() - t0;

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  const withShape = out.filter(o => o.responseShape).length;
  const withPaging = out.filter(o => o.paging).length;
  console.log(`  ${out.length} unique patterns from ${apis.length} captures, ${withShape} with parsed shape, ${withPaging} paginated (${dur}s)`);
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function patternize(url) {
  try {
    const u = new URL(url);
    let path = u.pathname
      .replace(/\/\d+(?=\/|$)/g, "/:id")
      .replace(/\/[a-f0-9]{8,}(?=\/|$)/gi, "/:hash")
      .replace(/\/[a-z0-9-]{20,}(?=\/|$)/gi, "/:slug");
    return `${u.host}${path}`;
  } catch {
    return url.split("?")[0].slice(0, 200);
  }
}

function describeShape(v, depth = 0) {
  if (depth > 4) return "...";
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (v.length === 0) return [];
    return [describeShape(v[0], depth + 1), `len=${v.length}`];
  }
  if (typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).slice(0, 25)) {
      out[k] = describeShape(v[k], depth + 1);
    }
    return out;
  }
  return typeof v;
}

function generateMockHints(v, key = "", depth = 0) {
  if (depth > 4) return "...";
  if (v === null) return { kind: "null" };
  if (Array.isArray(v)) {
    return {
      kind: "array",
      length: v.length,
      generateLength: Math.max(5, Math.min(20, v.length)),
      itemHint: v.length > 0 ? generateMockHints(v[0], key, depth + 1) : null,
    };
  }
  if (typeof v === "object") {
    const out = { kind: "object", fields: {} };
    for (const k of Object.keys(v).slice(0, 25)) {
      out.fields[k] = generateMockHints(v[k], k, depth + 1);
    }
    return out;
  }
  if (typeof v === "string") {
    // Smart string mock hint based on content + key
    const lower = key.toLowerCase();
    if (/email/.test(lower)) return { kind: "email" };
    if (/url|link|href|src/.test(lower)) return { kind: "url" };
    if (/name/.test(lower)) return { kind: "name" };
    if (/title|heading/.test(lower)) return { kind: "title" };
    if (/desc|content|body|text/.test(lower)) return { kind: "paragraph" };
    if (/date|time|created|updated/.test(lower)) return { kind: "datetime" };
    if (/id|uuid|hash/.test(lower)) return { kind: "id", sample: String(v).slice(0, 16) };
    if (/^\d+$/.test(v)) return { kind: "numericString" };
    return { kind: "string", sampleLen: Math.min(v.length, 200) };
  }
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { kind: "integer", sampleRange: [Math.floor(v / 10), Math.ceil(v * 10)] }
      : { kind: "float" };
  }
  if (typeof v === "boolean") return { kind: "boolean" };
  return { kind: typeof v };
}

function detectPaging(parsed, sampleUrl) {
  // Common pagination shapes
  if (typeof parsed !== "object" || parsed === null) return null;

  const paginationKeys = [
    ["page", "totalPages"], ["page", "total"], ["page", "pageCount"],
    ["offset", "limit"], ["offset", "total"],
    ["cursor", "next"], ["next", "previous"], ["nextCursor"],
    ["pageInfo"], ["meta", "pagination"],
  ];

  for (const ks of paginationKeys) {
    const allPresent = ks.every(k => k in parsed);
    if (allPresent) {
      return {
        type: ks[0] === "cursor" || ks[0] === "next" || ks[0] === "nextCursor" ? "cursor" :
              ks[0] === "offset" ? "offset" : "page",
        keys: ks,
        sampleValues: Object.fromEntries(ks.map(k => [k, parsed[k]])),
      };
    }
  }

  // URL-based detection
  try {
    const u = new URL(sampleUrl);
    if (u.searchParams.has("page") || u.searchParams.has("offset") ||
        u.searchParams.has("cursor") || u.searchParams.has("after")) {
      return {
        type: "url-param",
        param: u.searchParams.has("page") ? "page" :
               u.searchParams.has("offset") ? "offset" :
               u.searchParams.has("cursor") ? "cursor" : "after",
      };
    }
  } catch {}

  return null;
}

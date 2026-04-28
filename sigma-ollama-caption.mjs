#!/usr/bin/env node
// sigma-ollama-caption.mjs — Paradigm 155 — Local Ollama Vision Captioning
//
// 자현 비전 "0원": Local Ollama로 image caption local. 자현 PC 자원만, 외부 0%.
// LLaVA / BakLLaVA 같은 vision model로 source image의 의미 추출 → Wikimedia
// 정확 매칭 keyword 생성.
//
// 자현 환경: Ollama 가능 (CLAUDE.md "Local LLM"). 없으면 graceful fallback.
//
// Pipeline:
//   1. Ollama localhost:11434 detect
//   2. 모델 list 확인 (llava, llava:13b, bakllava 등)
//   3. Source image → captionImage() → "elderly women caring nursing home"
//   4. Caption → Wikimedia search keyword
//   5. 정확 매칭 자산 download → brand-kit
//
// Ollama 없으면: P156 generic keyword fallback.

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "localhost";
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || "11434", 10);

// ─── Detect Ollama running ──────────────────────────────────────
export async function detectOllama() {
  return new Promise((resolve) => {
    const req = http.get(`http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/tags`, {
      timeout: 2000,
    }, res => {
      let chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
          resolve({
            running: true,
            models: (data.models || []).map(m => m.name),
            visionModels: (data.models || [])
              .map(m => m.name)
              .filter(n => /llava|bakllava|moondream/i.test(n)),
          });
        } catch (e) { resolve({ running: false, error: e.message }); }
      });
    });
    req.on("error", () => resolve({ running: false }));
    req.on("timeout", () => { req.destroy(); resolve({ running: false }); });
  });
}

// ─── Caption image via Ollama vision model ─────────────────────
export async function captionImage(imagePath, opts = {}) {
  const model = opts.model || "llava";
  const prompt = opts.prompt
    || "Describe this image in 5 keywords suitable for image search (e.g., 'elderly woman portrait nursing care'). Output ONLY keywords separated by space, no explanation.";

  if (!fs.existsSync(imagePath)) return { error: "image not found" };
  const buf = fs.readFileSync(imagePath);
  const b64 = buf.toString("base64");

  const body = JSON.stringify({
    model,
    prompt,
    images: [b64],
    stream: false,
    options: { temperature: 0.3 }, // deterministic
  });

  return new Promise((resolve) => {
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: "/api/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 45000,
    }, res => {
      let chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
          const caption = data.response?.trim() || "";
          resolve({
            caption,
            keywords: caption.split(/\s+/).filter(w => w.length > 2).slice(0, 5),
            model,
          });
        } catch (e) { resolve({ error: e.message }); }
      });
    });
    req.on("error", e => resolve({ error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
    req.write(body);
    req.end();
  });
}

// ─── Caption + Wikimedia search combo ──────────────────────────
export async function smartImageMatch(sourceImagePath, opts = {}) {
  const ollama = await detectOllama();

  if (!ollama.running || ollama.visionModels.length === 0) {
    return {
      method: "fallback",
      reason: ollama.running ? "no vision model" : "ollama not running",
      keywords: opts.fallbackKeywords || ["nature photography"],
    };
  }

  const model = opts.model || ollama.visionModels[0];
  const r = await captionImage(sourceImagePath, { model });

  if (r.error) {
    return {
      method: "fallback",
      reason: `ollama error: ${r.error}`,
      keywords: opts.fallbackKeywords || ["nature photography"],
    };
  }

  return {
    method: "ollama",
    model,
    caption: r.caption,
    keywords: r.keywords,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "detect") {
    detectOllama().then(r => {
      console.log(`[ollama] running: ${r.running}`);
      if (r.running) {
        console.log(`  models: ${r.models.length}`);
        for (const m of r.models) console.log(`    - ${m}`);
        console.log(`  vision-capable: ${r.visionModels.join(", ") || "(none — install llava)"}`);
      } else if (r.error) {
        console.log(`  error: ${r.error}`);
      }
    });
  } else if (cmd === "caption") {
    const img = process.argv[3];
    if (!img) { console.error("usage: caption <image-path>"); process.exit(1); }
    smartImageMatch(path.resolve(img)).then(r => {
      console.log(`[caption] method: ${r.method}`);
      if (r.caption) console.log(`  caption: ${r.caption}`);
      console.log(`  keywords: ${r.keywords.join(", ")}`);
      if (r.reason) console.log(`  reason: ${r.reason}`);
    });
  } else {
    console.error("usage:");
    console.error("  node sigma-ollama-caption.mjs detect              # Ollama 상태 확인");
    console.error("  node sigma-ollama-caption.mjs caption <image>     # 이미지 caption");
    console.error("\n자현 환경: Ollama localhost:11434, vision model (llava 등) 필요");
    console.error("0원, 외부 API 0%");
    process.exit(1);
  }
}

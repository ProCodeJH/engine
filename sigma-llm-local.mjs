#!/usr/bin/env node
// sigma-llm-local.mjs — Paradigm 16 — Local LLM Vision Bridge
//
// 자현 ANTHROPIC_API_KEY 미사용 정책 + 자동화 진짜 답:
// 자현 PC의 Local LLM (Ollama / LM Studio / llamafile) 자동 detect → vision-
// prompt + screenshot 자동 send → 응답 자동 받아 vision-output.md 저장.
//
// 자현이 paste 안 해도 sigma-vision 풀 자동화. API 비용 0, 시간 ~30초/사이트.
//
// 지원 endpoint (자동 detect 순서):
//   1. Ollama         http://localhost:11434/api/generate         (llava 권장)
//   2. LM Studio      http://localhost:1234/v1/chat/completions   (OpenAI 호환)
//   3. llamafile      http://localhost:8080/completion             (single-binary)
//   4. Claude API     http://localhost:7777                        (자현 local proxy)
//
// 자동 fallback — endpoint 없으면 manual paste 안내.
//
// Vision 모델 권장:
//   - llava:13b (Ollama) — 속도/품질 균형
//   - llava:34b — 품질 우선
//   - bakllava — 빠름
//   - qwen-vl:7b — 한국어 강함

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINTS = [
  {
    name: "Ollama",
    url: "http://localhost:11434/api/generate",
    detect: "http://localhost:11434/api/tags",
    format: "ollama",
    defaultModel: "llava:latest",
  },
  {
    name: "LM Studio",
    url: "http://localhost:1234/v1/chat/completions",
    detect: "http://localhost:1234/v1/models",
    format: "openai",
    defaultModel: null,  // server's loaded model
  },
  {
    name: "llamafile",
    url: "http://localhost:8080/completion",
    detect: "http://localhost:8080/health",
    format: "llamafile",
    defaultModel: null,
  },
  {
    name: "Claude local proxy",
    url: "http://localhost:7777/v1/chat/completions",
    detect: "http://localhost:7777/v1/models",
    format: "openai",
    defaultModel: "claude-3-5-sonnet",
  },
];

async function detectEndpoint() {
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep.detect, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok || r.status === 405) {
        let modelInfo = ep.defaultModel;
        if (ep.format === "ollama") {
          try {
            const tags = await r.json();
            const visionModels = (tags.models || []).filter(m =>
              /llava|bakllava|qwen-vl|moondream|llama.*vision/i.test(m.name)
            );
            if (visionModels.length > 0) modelInfo = visionModels[0].name;
          } catch {}
        }
        return { ...ep, model: modelInfo };
      }
    } catch {}
  }
  return null;
}

async function callLLM(endpoint, prompt, screenshotBase64) {
  if (endpoint.format === "ollama") {
    const body = {
      model: endpoint.model,
      prompt,
      images: [screenshotBase64],
      stream: false,
      options: { temperature: 0.3, num_predict: 4000 },
    };
    const r = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),  // 3min vision inference
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text().catch(() => "")}`);
    const j = await r.json();
    return j.response || "";
  }
  if (endpoint.format === "openai") {
    const body = {
      model: endpoint.model || "auto",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` } },
        ],
      }],
      max_tokens: 4000,
      temperature: 0.3,
    };
    const r = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
    if (!r.ok) throw new Error(`${endpoint.name} ${r.status}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content || "";
  }
  if (endpoint.format === "llamafile") {
    const body = { prompt: prompt + "\n[Image attached]", n_predict: 4000, temperature: 0.3 };
    const r = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
    if (!r.ok) throw new Error(`llamafile ${r.status}`);
    const j = await r.json();
    return j.content || "";
  }
  return "";
}

export async function runVisionLocal(projDir, opts = {}) {
  const visionDir = path.join(projDir, ".vision");
  if (!fs.existsSync(visionDir)) {
    return { error: ".vision/ not found — run sigma-vision-prompt.mjs first" };
  }

  const promptPath = path.join(visionDir, "vision-prompt.md");
  if (!fs.existsSync(promptPath)) {
    return { error: "vision-prompt.md not found" };
  }
  const prompt = fs.readFileSync(promptPath, "utf-8");

  // Use desktop-fold for vision (smaller, above-fold context)
  const screenshotPath = path.join(visionDir, "desktop-fold.jpg");
  if (!fs.existsSync(screenshotPath)) {
    return { error: "desktop-fold.jpg not found" };
  }
  const screenshotBase64 = fs.readFileSync(screenshotPath).toString("base64");

  console.log(`[llm-local] detecting endpoint...`);
  const endpoint = opts.endpoint || await detectEndpoint();
  if (!endpoint) {
    return {
      error: "no local LLM endpoint detected",
      hint: [
        "Install one of:",
        "  Ollama:    https://ollama.com    +  ollama pull llava",
        "  LM Studio: https://lmstudio.ai   +  load vision model",
        "  llamafile: https://github.com/Mozilla-Ocho/llamafile",
      ].join("\n"),
    };
  }
  console.log(`[llm-local] using ${endpoint.name} (${endpoint.model || "auto"})`);

  console.log(`[llm-local] sending prompt + screenshot (${(screenshotBase64.length / 1024).toFixed(0)}KB base64)...`);
  const t0 = Date.now();
  let output;
  try {
    output = await callLLM(endpoint, prompt, screenshotBase64);
  } catch (e) {
    return { error: `LLM call failed: ${e.message}` };
  }
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[llm-local] response ${output.length} bytes (${dur}s)`);

  if (output.length < 200) {
    return { error: "LLM response too short — check model has vision capability" };
  }

  const outputPath = path.join(visionDir, "vision-output.md");
  fs.writeFileSync(outputPath, output);

  return {
    endpoint: endpoint.name,
    model: endpoint.model || "auto",
    duration: dur,
    outputSize: output.length,
    outputPath,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-llm-local.mjs <projectDir>");
    process.exit(1);
  }
  runVisionLocal(projDir).then(r => {
    if (r.error) {
      console.error(`[llm-local] ${r.error}`);
      if (r.hint) console.error(r.hint);
      console.error("");
      console.error("Fallback: 자현이 manual paste — vision-prompt.md → AI → vision-output.md");
      process.exit(1);
    }
    console.log(`✓ vision-output.md ready → node sigma-vision-integrate.mjs ${path.basename(projDir)}`);
  });
}

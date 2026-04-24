// Σ.4 EMIT — Next.js 15 app-router scaffold generation
// Produces: package.json, next.config.mjs, tsconfig.json, tailwind.config.ts,
// postcss.config.mjs, src/app/{layout,page,globals.css}.tsx,
// src/components/BlockN.tsx per section. Uses extracted.palette + typeScale
// for CSS variables, fontFaces for @font-face rules.

import fs from "node:fs";
import path from "node:path";

const ctx = globalThis.__sigma;
const { extracted, projDir, url, USE_ORIGINAL_IMAGES, USE_ORIGINAL_TEXT } = ctx;

const emit_t0 = Date.now();
console.log(`[Σ.4] EMIT 0.0s`);

const slug = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
const siteSlug = slug(new URL(url).hostname.replace(/\./g, "-"));

// ─── package.json ────────────────────────────────────────────────────
const pkg = {
  name: siteSlug || "sigma-site",
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "next lint",
  },
  dependencies: {
    "next": "^15.0.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.11.9",
  },
  devDependencies: {
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
  },
};
fs.writeFileSync(path.join(projDir, "package.json"), JSON.stringify(pkg, null, 2));

// ─── next.config.mjs ─────────────────────────────────────────────────
fs.writeFileSync(path.join(projDir, "next.config.mjs"), `const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
};
export default nextConfig;
`);

// ─── tsconfig.json ───────────────────────────────────────────────────
fs.writeFileSync(path.join(projDir, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./src/*"] },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}, null, 2));

// ─── tailwind.config.ts ──────────────────────────────────────────────
const palette = extracted.palette || { primary: "#111", accent: "#4f46e5", text: "#fff", surface1: "#222", surface2: "#333" };
fs.writeFileSync(path.join(projDir, "tailwind.config.ts"), `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "${palette.primary}",
        accent: "${palette.accent}",
        surface1: "${palette.surface1}",
        surface2: "${palette.surface2}",
        muted1: "${palette.muted1 || palette.surface1}",
        muted2: "${palette.muted2 || palette.surface2}",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
`);

// ─── postcss.config.mjs ──────────────────────────────────────────────
fs.writeFileSync(path.join(projDir, "postcss.config.mjs"), `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`);

// ─── next-env.d.ts ───────────────────────────────────────────────────
fs.writeFileSync(path.join(projDir, "next-env.d.ts"), `/// <reference types="next" />
/// <reference types="next/image-types/global" />
// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`);

// ─── src/app/globals.css ─────────────────────────────────────────────
const fontFaces = extracted.fontFaces || [];
const fontLocalMap = extracted.fontLocalMap || {};
const fontFaceCSS = fontFaces.map(ff => {
  try {
    const abs = new URL(ff.url, url).toString();
    const local = fontLocalMap[abs];
    if (!local) return "";
    const fmt = local.endsWith(".woff2") ? "woff2" : local.endsWith(".woff") ? "woff" : local.endsWith(".ttf") ? "truetype" : "opentype";
    return `@font-face {
  font-family: "${ff.family}";
  font-weight: ${ff.weight};
  font-style: ${ff.style};
  font-display: swap;
  src: url("${local}") format("${fmt}");
}`;
  } catch { return ""; }
}).filter(Boolean).join("\n\n");

const typeScale = extracted.typeScale || { display: 72, h1: 56, h2: 40, h3: 28, body: 16, caption: 12 };
const appDir = path.join(projDir, "src", "app");
fs.mkdirSync(appDir, { recursive: true });

fs.writeFileSync(path.join(appDir, "globals.css"), `@tailwind base;
@tailwind components;
@tailwind utilities;

${fontFaceCSS}

:root {
  --color-primary: ${palette.primary};
  --color-text: ${palette.text};
  --color-accent: ${palette.accent};
  --color-surface1: ${palette.surface1};
  --color-surface2: ${palette.surface2};
  --font-heading: "${extracted.fonts?.[0]?.[0] || "Inter"}";
  --font-body: "${extracted.fonts?.[1]?.[0] || extracted.fonts?.[0]?.[0] || "Inter"}";
  --fs-display: ${typeScale.display}px;
  --fs-h1: ${typeScale.h1}px;
  --fs-h2: ${typeScale.h2}px;
  --fs-h3: ${typeScale.h3}px;
  --fs-body: ${typeScale.body}px;
  --fs-caption: ${typeScale.caption}px;
}

html, body {
  background: var(--color-primary);
  color: var(--color-text);
  font-family: var(--font-body), system-ui, sans-serif;
  font-size: var(--fs-body);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading), system-ui, sans-serif;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
`);

// ─── src/app/layout.tsx ──────────────────────────────────────────────
const seo = extracted.seo || {};
const safeTitle = (seo.title || "Site").replace(/"/g, '\\"');
const safeDesc = (seo.description || seo.ogDescription || "").replace(/"/g, '\\"').slice(0, 300);
const brand = extracted.brandAssets || {};
fs.writeFileSync(path.join(appDir, "layout.tsx"), `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${safeTitle}",
  description: "${safeDesc}",${brand.favicon ? `
  icons: { icon: "${brand.favicon}"${brand["apple-touch-icon"] ? `, apple: "${brand["apple-touch-icon"]}"` : ""} },` : ""}${brand["og-image"] ? `
  openGraph: { images: ["${brand["og-image"]}"] },` : ""}
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="${seo.lang || "ko"}">
      <body>{children}</body>
    </html>
  );
}
`);

// ─── Per-section components ──────────────────────────────────────────
const componentsDir = path.join(projDir, "src", "components");
fs.mkdirSync(componentsDir, { recursive: true });

const sections = extracted.sections || [];
const escapeJSX = (s) => (s || "")
  .replace(/[{}<>]/g, m => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" }[m]))
  .replace(/\s+/g, " ")
  .slice(0, 500);

for (let i = 0; i < sections.length; i++) {
  const s = sections[i];
  const compName = `Block${i}`;
  const shot = s.screenshotPath || "";
  const shotsByVP = s.screenshotPathsByViewport || {};

  // Simplified content — heading + intro paragraph + CTA when USE_ORIGINAL_TEXT;
  // otherwise token placeholders.
  const roleLabel = s.role || `section-${i}`;
  const tokenH = USE_ORIGINAL_TEXT ? escapeJSX(s.textPreview?.slice(0, 80) || roleLabel) : `{{${roleLabel.toUpperCase()}_H}}`;
  const tokenP = USE_ORIGINAL_TEXT ? escapeJSX(s.textPreview?.slice(80, 360) || "") : `{{${roleLabel.toUpperCase()}_P}}`;

  const bgStyle = USE_ORIGINAL_IMAGES && shot
    ? `{ backgroundImage: \`url(\${"${shot}"})\`, backgroundSize: "cover", backgroundPosition: "center", minHeight: "${Math.min(s.h, 900)}px" }`
    : `{ minHeight: "${Math.min(Math.max(s.h, 400), 900)}px", background: "${s.bg && s.bg !== "rgba(0, 0, 0, 0)" ? s.bg : palette.primary}" }`;

  const tsx = `"use client";
import { motion } from "framer-motion";

export default function ${compName}() {
  return (
    <section
      data-section="${roleLabel}"
      data-section-index="${i}"
      className="relative w-full flex items-center justify-center py-24"
      style={${bgStyle}}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-6xl mx-auto px-6 text-center relative z-10"
      >
        <h2 className="font-heading" style={{ fontSize: "var(--fs-h2)" }}>
          {"${tokenH}"}
        </h2>
        <p className="mt-6 opacity-80 max-w-3xl mx-auto">
          {"${tokenP}"}
        </p>
      </motion.div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(componentsDir, `${compName}.tsx`), tsx);
}

// ─── src/app/page.tsx ────────────────────────────────────────────────
const imports = sections.map((_, i) => `import Block${i} from "@/components/Block${i}";`).join("\n");
const renders = sections.map((_, i) => `      <Block${i} />`).join("\n");
fs.writeFileSync(path.join(appDir, "page.tsx"), `${imports}

export default function Home() {
  return (
    <main>
${renders}
    </main>
  );
}
`);

console.log(`  emitted: ${sections.length} section components + layout + page`);
console.log(`  wrote: package.json, next.config, tsconfig, tailwind, postcss, globals.css`);

extracted.timing.emit = Date.now() - emit_t0;

// Final persisted scan data for audit / debugging.
fs.writeFileSync(path.join(projDir, ".sigma", "scan.json"), JSON.stringify(extracted, null, 2));
console.log(`[Σ.5] AUDIT`);
// Minimal audit — verify all referenced files exist.
const missing = [];
for (let i = 0; i < sections.length; i++) {
  const p = path.join(componentsDir, `Block${i}.tsx`);
  if (!fs.existsSync(p)) missing.push(p);
}
if (!fs.existsSync(path.join(appDir, "page.tsx"))) missing.push("page.tsx");
if (!fs.existsSync(path.join(appDir, "layout.tsx"))) missing.push("layout.tsx");
console.log(`  audit: ${missing.length === 0 ? "all files present" : `MISSING ${missing.length} files`}`);

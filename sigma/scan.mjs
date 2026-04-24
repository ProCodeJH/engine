// Σ.1 SEMANTIC SCAN + Σ.2 DESIGN TOKENS
// Extracts: DOM sections (role-inferred), SEO metadata, internal link map,
// color palette, font families/sizes, typography scale, per-section
// computed styles, initial viewport screenshots (if --use-original-images).

import fs from "node:fs";
import path from "node:path";

const ctx = globalThis.__sigma;
const { page, cdp, extracted, projDir, dataDir, url, USE_ORIGINAL_IMAGES } = ctx;

const scan_t0 = Date.now();
console.log("[Σ.1] SEMANTIC SCAN 0.0s");

// ─── DOM sections ─────────────────────────────────────────────────────
// Strategy: find top-level containers with meaningful height (>= 100px)
// that represent visual "sections" (hero, features, CTAs, footer). We
// try several selector patterns to cover Framer/Webflow/custom markup.
const sections = await page.evaluate(() => {
  const docH = document.body.scrollHeight;
  const selectors = [
    "body > section",
    "body > main > section",
    "body > div > section",
    "body > div > main > section",
    "body > div > div > section",
    "body > div > div > div",  // Framer/Wix fallback
    "body > main > div > section",
  ];
  let candidates = [];
  for (const sel of selectors) {
    candidates = [...document.querySelectorAll(sel)]
      .filter(el => el.getBoundingClientRect().height >= 100);
    if (candidates.length >= 3) break;
  }
  // Fallback: direct children of body with min height.
  if (candidates.length < 3) {
    candidates = [...document.body.querySelectorAll(":scope > div > *")]
      .filter(el => el.getBoundingClientRect().height >= 200);
  }

  // Infer semantic role from content.
  const inferRole = (el, idx, total) => {
    const text = (el.textContent || "").slice(0, 500).toLowerCase();
    const tag = el.tagName.toLowerCase();
    if (tag === "header" || idx === 0) return "hero";
    if (tag === "footer" || idx === total - 1) return "footer";
    if (/contact|문의|전화|이메일|찾아오|address/i.test(text)) return "contact";
    if (/service|제공|서비스|솔루션|product/i.test(text)) return "services";
    if (/about|소개|회사|인사말|대표|ceo/i.test(text)) return "about";
    if (/cta|시작|문의하기|신청|지금/i.test(text)) return "cta";
    if (/review|후기|testimonial|고객/i.test(text)) return "testimonials";
    if (/feature|특징|장점|why|왜/i.test(text)) return "features";
    if (/pricing|가격|요금|plan/i.test(text)) return "pricing";
    if (/team|팀|구성원|member/i.test(text)) return "team";
    if (/faq|자주|질문/i.test(text)) return "faq";
    return `section-${idx}`;
  };

  const out = [];
  for (let i = 0; i < candidates.length && i < 30; i++) {
    const el = candidates[i];
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      idx: i,
      role: inferRole(el, i, candidates.length),
      top: Math.round(r.top + window.scrollY),
      h: Math.round(r.height),
      bg: cs.backgroundColor,
      color: cs.color,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      padding: cs.padding,
      childCount: el.children.length,
      textPreview: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200),
    });
  }
  return { sections: out, docHeight: docH };
});

extracted.sections = sections.sections;
extracted.docHeight = sections.docHeight;
console.log(`  sections detected: ${sections.sections.map(s => s.role).join(" · ")}`);

// ─── SEO + metadata ───────────────────────────────────────────────────
const seo = await page.evaluate(() => {
  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
  const og = (name) => document.querySelector(`meta[property="og:${name}"]`)?.getAttribute("content") || "";
  const twitter = (name) => document.querySelector(`meta[name="twitter:${name}"]`)?.getAttribute("content") || "";
  const internalLinks = [...document.querySelectorAll("a[href]")]
    .map(a => a.getAttribute("href") || "")
    .filter(h => h && !h.startsWith("http") && !h.startsWith("#") && !h.startsWith("mailto:") && !h.startsWith("tel:"))
    .slice(0, 50);
  const externalLinks = [...document.querySelectorAll("a[href]")]
    .map(a => a.getAttribute("href") || "")
    .filter(h => h.startsWith("http") && !h.startsWith(location.origin))
    .slice(0, 30);
  return {
    title: document.title || "",
    description: meta("description"),
    keywords: meta("keywords"),
    ogTitle: og("title"),
    ogDescription: og("description"),
    ogImage: og("image"),
    twitterTitle: twitter("title"),
    twitterDescription: twitter("description"),
    twitterImage: twitter("image"),
    lang: document.documentElement.lang || "ko",
    favicon: document.querySelector('link[rel="icon"]')?.getAttribute("href") ||
             document.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") || "",
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
  };
});
extracted.seo = seo;
console.log(`  SEO: "${seo.title.slice(0, 40)}..." (${seo.internalLinks.length} internal, ${seo.externalLinks.length} external)`);

// ─── Σ.2 DESIGN TOKENS ────────────────────────────────────────────────
console.log(`[Σ.2] DESIGN TOKENS ${((Date.now() - scan_t0) / 1000).toFixed(1)}s`);

// Palette: walk all visible elements, tally background-color and color
// values. Returns sorted list [rgb, count].
const tokens = await page.evaluate(() => {
  const colors = new Map();
  const fonts = new Map();
  const fontSizes = new Map();
  const fontWeights = new Map();
  const parse = (cssColor) => {
    if (!cssColor || cssColor === "rgba(0, 0, 0, 0)" || cssColor === "transparent") return null;
    const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return `${m[1]},${m[2]},${m[3]}`;
    return null;
  };
  const all = [...document.querySelectorAll("*")];
  for (const el of all) {
    if (all.length > 4000 && Math.random() > 0.6) continue;  // sample for huge pages
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const bg = parse(cs.backgroundColor);
    const fg = parse(cs.color);
    if (bg) colors.set(bg, (colors.get(bg) || 0) + Math.round(r.width * r.height));
    if (fg && el.textContent && el.textContent.trim().length > 1) {
      colors.set(fg, (colors.get(fg) || 0) + el.textContent.length);
    }
    if (cs.fontFamily) {
      const fam = cs.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
      if (fam) fonts.set(fam, (fonts.get(fam) || 0) + 1);
    }
    if (cs.fontSize) {
      const px = parseFloat(cs.fontSize);
      if (px >= 8 && px <= 200) {
        const key = String(Math.round(px));
        fontSizes.set(key, (fontSizes.get(key) || 0) + 1);
      }
    }
    const fw = cs.fontWeight;
    if (fw) fontWeights.set(fw, (fontWeights.get(fw) || 0) + 1);
  }
  const asPairs = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  return {
    colors: asPairs(colors),
    fonts: asPairs(fonts),
    fontSizes: asPairs(fontSizes),
    fontWeights: asPairs(fontWeights),
  };
});
extracted.colors = tokens.colors;
extracted.fonts = tokens.fonts;
extracted.fontSizes = tokens.fontSizes;
extracted.fontWeights = tokens.fontWeights;

// Palette role assignment (primary/text/accent/surface1/surface2).
const rgbToHex = (rgb) => {
  const [r, g, b] = rgb.split(",").map(Number);
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
};
const palette = tokens.colors.map(([rgb, count]) => {
  const [r, g, b] = rgb.split(",").map(Number);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return {
    rgb, hex: rgbToHex(rgb), count,
    lum: (0.299 * r + 0.587 * g + 0.114 * b) / 255,
    sat: max === 0 ? 0 : (max - min) / max,
  };
});
const primary = palette.sort((a, b) => b.count - a.count)[0] || { hex: "#111111", lum: 0 };
const text = palette.filter(p => Math.abs(p.lum - primary.lum) > 0.3).sort((a, b) => b.lum - a.lum)[0]
          || { hex: "#ffffff" };
const accent = palette.filter(p => p.lum > 0.1 && p.lum < 0.9).sort((a, b) => b.sat - a.sat)[0]
            || { hex: "#4f46e5" };
const surfaces = palette.filter(p => p !== primary && p !== text && p !== accent).slice(0, 4);
const roles = {
  primary: primary.hex,
  text: text.hex,
  accent: accent.hex,
  surface1: surfaces[0]?.hex || primary.hex,
  surface2: surfaces[1]?.hex || primary.hex,
  muted1: surfaces[2]?.hex || accent.hex,
  muted2: surfaces[3]?.hex || accent.hex,
  full: palette.slice(0, 10).map(p => p.hex),
};
extracted.palette = roles;
console.log(`  palette roles: primary=${roles.primary} text=${roles.text} accent=${roles.accent} surface1=${roles.surface1}`);
console.log(`  fonts: ${tokens.fonts.slice(0, 3).map(f => f[0]).join(", ")}`);

// Typography scale — pick 4 well-separated heading sizes.
const fontSizesSorted = [...tokens.fontSizes].map(([px, c]) => ({ px: +px, c })).sort((a, b) => b.px - a.px);
const bodyPx = (() => {
  const mid = fontSizesSorted.filter(s => s.px >= 13 && s.px <= 20).sort((a, b) => b.c - a.c)[0];
  return mid?.px || 16;
})();
const typeScale = {
  display: fontSizesSorted[0]?.px || 72,
  h1: fontSizesSorted.find(s => s.px > bodyPx * 3)?.px || 56,
  h2: fontSizesSorted.find(s => s.px > bodyPx * 2 && s.px <= bodyPx * 3)?.px || 40,
  h3: fontSizesSorted.find(s => s.px > bodyPx * 1.4 && s.px <= bodyPx * 2)?.px || 28,
  body: bodyPx,
  caption: fontSizesSorted.filter(s => s.px < bodyPx && s.px >= 10)[0]?.px || 12,
};
extracted.typeScale = typeScale;
console.log(`  type scale: display=${typeScale.display}px h1=${typeScale.h1} h2=${typeScale.h2} h3=${typeScale.h3} body=${typeScale.body}`);

// ─── Section screenshots (3 viewports × N sections) ───────────────────
if (USE_ORIGINAL_IMAGES && extracted.sections.length > 0) {
  const shotsDir = path.join(projDir, "public", "sections");
  fs.mkdirSync(shotsDir, { recursive: true });
  const viewports = [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1920, height: 1080 },
  ];
  const shotsByIdx = {};
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 800));
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 400));
    // Re-measure section rects at this viewport.
    const vpRects = await page.evaluate((count) => {
      const roots = [...document.body.querySelectorAll("body > div > section, body > div > div > section, body > main > section, body > div > div > div")]
        .filter(el => el.getBoundingClientRect().height >= 100);
      return roots.slice(0, count).map(el => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
      });
    }, extracted.sections.length);
    let captured = 0;
    for (let i = 0; i < extracted.sections.length; i++) {
      const rect = vpRects[i] || { top: extracted.sections[i].top, h: extracted.sections[i].h };
      if (rect.h < 50) continue;
      try {
        await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 60)), rect.top);
        await new Promise(r => setTimeout(r, 200));
        const clipH = Math.min(rect.h, 8000);
        const fname = `s${i}-${vp.name}.jpg`;
        await page.screenshot({
          path: path.join(shotsDir, fname),
          type: "jpeg",
          quality: vp.name === "desktop" ? 78 : 82,
          clip: { x: 0, y: rect.top, width: vp.width, height: clipH },
        });
        if (!shotsByIdx[i]) shotsByIdx[i] = {};
        shotsByIdx[i][vp.name] = `/sections/${fname}`;
        captured++;
      } catch {}
    }
    console.log(`  screenshots ${vp.name} (${vp.width}px): ${captured}/${extracted.sections.length}`);
  }
  await page.setViewport({ width: 1920, height: 1080 });
  for (let i = 0; i < extracted.sections.length; i++) {
    const p = shotsByIdx[i];
    if (p) {
      extracted.sections[i].screenshotPath = p.desktop || p.tablet || p.mobile;
      extracted.sections[i].screenshotPathsByViewport = p;
    }
  }
}

// ─── @font-face discovery + download ──────────────────────────────────
// Extract declared font URLs from stylesheets, download woff2 to
// public/fonts, rewrite @font-face src to local paths.
const fontFaces = await page.evaluate(() => {
  const found = [];
  for (const sh of document.styleSheets) {
    try {
      for (const rule of sh.cssRules || []) {
        if (rule.constructor.name === "CSSFontFaceRule") {
          const fam = (rule.style.getPropertyValue("font-family") || "").replace(/['"]/g, "").trim();
          const src = rule.style.getPropertyValue("src") || "";
          const urls = [...src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1]);
          const weight = rule.style.getPropertyValue("font-weight") || "400";
          const style = rule.style.getPropertyValue("font-style") || "normal";
          for (const u of urls) {
            if (!/\.(woff2?|ttf|otf)([?#]|$)/i.test(u)) continue;
            found.push({ family: fam, weight, style, url: u });
          }
        }
      }
    } catch {}
  }
  return found.slice(0, 60);  // cap
});
const fontsDir = path.join(projDir, "public", "fonts");
fs.mkdirSync(fontsDir, { recursive: true });
let fontDownloads = 0;
let fontTotalBytes = 0;
const fontLocalMap = {};
for (const ff of fontFaces) {
  try {
    const absUrl = new URL(ff.url, url).toString();
    const ext = absUrl.match(/\.(woff2?|ttf|otf)/i)?.[0] || ".woff2";
    const safeName = `${ff.family.replace(/[^\w]/g, "_")}-${ff.weight}-${ff.style}${ext}`;
    const dest = path.join(fontsDir, safeName);
    if (!fs.existsSync(dest)) {
      const resp = await fetch(absUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(dest, buf);
        fontTotalBytes += buf.length;
      }
    } else {
      fontTotalBytes += fs.statSync(dest).size;
    }
    fontLocalMap[absUrl] = `/fonts/${safeName}`;
    fontDownloads++;
  } catch {}
}
extracted.fontFaces = fontFaces;
extracted.fontLocalMap = fontLocalMap;
console.log(`  font faces: ${fontFaces.length} discovered`);
console.log(`  fonts downloaded: ${fontDownloads}/${fontFaces.length} (${Math.round(fontTotalBytes / 1024)}KB)`);

// ─── Brand assets (favicon / og / twitter / apple) ────────────────────
const brandAssets = [
  { name: "favicon", sel: 'link[rel="icon"], link[rel="shortcut icon"]', attr: "href" },
  { name: "apple-touch-icon", sel: 'link[rel="apple-touch-icon"]', attr: "href" },
  { name: "og-image", sel: 'meta[property="og:image"]', attr: "content" },
  { name: "twitter-image", sel: 'meta[name="twitter:image"]', attr: "content" },
];
const brandMap = {};
let brandDownloads = 0;
for (const asset of brandAssets) {
  try {
    const val = await page.evaluate((sel, attr) => document.querySelector(sel)?.getAttribute(attr) || "", asset.sel, asset.attr);
    if (!val) continue;
    const absUrl = new URL(val, url).toString();
    const ext = absUrl.match(/\.(png|jpg|jpeg|ico|webp|svg)(?=[?#]|$)/i)?.[0] || ".png";
    const safeName = asset.name + ext;
    const dest = path.join(projDir, "public", safeName);
    if (!fs.existsSync(dest)) {
      const resp = await fetch(absUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(dest, buf);
      }
    }
    brandMap[asset.name] = `/${safeName}`;
    brandDownloads++;
  } catch {}
}
extracted.brandAssets = brandMap;
console.log(`  brand assets: ${brandDownloads}/${brandAssets.length} downloaded`);

// Persist intermediate scan results.
fs.writeFileSync(path.join(dataDir, "scan.json"), JSON.stringify(extracted, null, 2));

extracted.timing.scan = Date.now() - scan_t0;

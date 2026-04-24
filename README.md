# NAVA Sigma Engine

Clean-room universal website clone engine — URL → copyright-safe React/Next.js source code.

## Usage

```bash
node nava-sigma.mjs <url> [options]

options:
  --output <dir>            Output directory (default: sigma-out)
  --use-original-images     Use source screenshots as section backgrounds
  --use-original-text       Use original text content instead of tokens
  --use-dom-mirror          Full DOM tree mirroring instead of role-based templates
  --skip-build              Skip final `next build` step
```

## Pipeline

- **Σ.0 RECON** — platform detection (Framer / Webflow / Wix / Squarespace / custom)
- **Σ.1 SEMANTIC SCAN** — DOM sections, SEO, internal links, CSS text
- **Σ.2 DESIGN TOKENS** — palette, typography, screenshots, scroll trajectory, fonts download
- **Σ.3 CONTENT** — motion assignment to sections, platform-specific extraction
- **Σ.4 EMIT** — Next.js 15 app-router code generation (layout/page/sections)
- **Σ.5 AUDIT** — post-emit verification (imports, paths, build config)
- **Σ.6 BUILD** — `next build` (skippable with --skip-build)

## Copyright-safe extraction

All captured data is factual measurement (Baker v. Selden): colors, sizes, counts,
CSS grammar, accessibility tree, performance metrics. Original text is stored as
tokens by default; `--use-original-text` is a dev-mode opt-in only.

## GitHub

Repo: https://github.com/ProCodeJH/engine

## Critical lesson

File was once lost to ENOSPC mid-Edit. From now on: every meaningful change
commits and pushes immediately. Disk space check before any Edit on files > 500KB.

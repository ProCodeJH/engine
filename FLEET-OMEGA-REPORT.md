# FLEET-OMEGA — 7-Site 실측 Report

**Generated**: 2026-04-28
**Engine**: nava-omega.mjs @ commit `b9b2196`
**Total duration**: 265s (4.4 분)
**Total mirrored**: 2,651 assets / 720 MB / 9,066 URL rewrites

## Per-site

| Site | Duration | Assets | Mirrored | Size | Rewrites | Notes |
|---|---|---|---|---|---|---|
| teamevople.kr | 21.3s | 497 | 494 | 69.3 MB | 1,684 | Framer |
| framer.com | 61.9s | 969 | 931 | 397.3 MB | 3,907 | 거대 production assets |
| webflow.com | 56.7s | 416 | 387 | 80.3 MB | 971 | Webflow |
| lusion.co | 18.6s | 128 | 125 | 18.5 MB | 18 | WebGL/Astro |
| awwwards.com | 63.2s | 248 | 246 | 62.5 MB | 447 | Generic |
| **designkits.com** | 6.8s | **10** | **8** | **0.8 MB** | 0 | ⚠ Pure CSR SPA |
| wix.com | 36.5s | 472 | 460 | 93.3 MB | 2,039 | Wix |

## 카테고리별 분석

### Static / SSR (시각 1:1 도달 — 권장)
- teamevople.kr (Framer SSR)
- framer.com (Framer landing — production)
- webflow.com (Webflow CMS)
- awwwards.com (Custom build)
- wix.com (Wix renderer)

→ Omega의 진짜 강점. fetch raw HTML이 이미 콘텐츠 다 들어있음.

### Hybrid (WebGL/Canvas)
- lusion.co — fetch 58KB → puppeteer 107KB (WebGL canvas dynamic)

→ 자산 다 잡힘 (셰이더 포함). 단 sirv 띄워서 시각 검증 필요.

### Pure CSR SPA (Omega 한계)
- designkits.com — 114 bytes raw HTML, hydrated 362 bytes만

→ JavaScript 실행 후 client에서 DOM 생성하는 사이트. fetch+puppeteer
  networkidle2 후에도 page 거의 비어있음. **별도 모드 필요**:
  - `--csr-wait <ms>` (10-20초 추가 wait)
  - MutationObserver stability detection
  - 또는 sigma DOM Mirror 모드 (이미 capture 작동)

## Failure rate
- failed: 18~38 per site (avg 5%) — CORS / 404 / private CDN

## 자현 비즈니스 적합도

| 카테고리 | Omega 적합 | 워크플로우 |
|---|---|---|
| Static SSR (Framer/Webflow/Wix) | ✅ 시각 99% | omega → 편집 → sigma deploy |
| Hybrid (WebGL) | ⚠ 시각 95% | omega + 수동 검증 |
| Pure CSR SPA | ❌ Omega 한계 | sigma DOM Mirror 권장 |

## 다음 작업

- **Omega CSR-wait 모드** — designkits.com 같은 사이트도 잡게 (`--csr-wait 15`)
- **각 사이트 sirv 시각 검증** — 시각 1:1 실증 (자현 명령 시 진행)
- **fleet sirv parallel** — 7개 동시 다른 port로 띄워 자현 한 번에 비교

## 사용

각 사이트 시각 검증:
```bash
cd omega-<site-slug>
npm install
npm start  # → http://localhost:3100
```

Fleet 한번에 (다른 port):
```bash
for d in omega-*; do
  port=$((3100 + RANDOM % 100))
  (cd "$d" && npm start -- --port $port &)
done
```

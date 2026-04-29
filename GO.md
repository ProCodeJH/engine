# NAVA Sigma Engine — Single Command

자현 한 명령으로 끝:

```bash
node sigma-go.mjs https://www.dusonnuri.co.kr/
```

자동 실행 (4 step):
1. **P184 Frozen Mirror** — render → snapshot → strip JS → static (시각 100% baked)
2. **P185 Hybrid Motion** — sigma runtime + 16 keyframes + auto-reveal + parallax (모션 살아있음)
3. **P138 A11y Enrich** — WCAG landmarks + skip-link
4. **P165 SEO Restoration** — sitemap.xml + robots.txt + JSON-LD

결과: `frozen-{slug}/` 디렉토리 (production-ready static site)

## 자현 deliverable workflow

```bash
# 1. 한 명령으로 mirror
node sigma-go.mjs https://www.dusonnuri.co.kr/

# 2. 시각 검증
cd frozen-www-dusonnuri-co-kr
npm install && npm start
# → http://localhost:3100 → 두손누리 시각 그대로 + 모션 살아있음

# 3. 자현 작업 (이미지/텍스트 swap)
# - public/_/...jpg → 자현 자산
# - HTML 텍스트 → client info

# 4. Deploy
# - Vercel / Cloudflare / 자체 서버
# - License 100% PASS (자산 swap 후)
```

## 진짜 valuable 5 paradigm

이전 42 paradigm 중 실제 valuable:

| Paradigm | 가치 |
|---|---|
| **P184 Frozen Mirror** | 진짜 paradigm break — script strip으로 init 깨짐 0 |
| **P185 Hybrid Motion** | 모션 살리기 (sigma runtime + keyframes + reveal + parallax) |
| **P138 A11y Enrich** | WCAG landmarks (자현 client 가치) |
| **P165 SEO Restoration** | sitemap + JSON-LD (자현 client 가치) |
| **P186 Unified Entry** | 한 명령에 모든 거 (이 파일) |

나머지 ~37 paradigm: legacy / wrong direction / marginal value.

## 진짜 자현 비즈니스 path

```
Source URL → sigma-go.mjs → frozen-{slug}/ → 자현 swap → Deploy
```

엔진은 1단계 (복제) + 4단계 (a11y/SEO) 자동.
자현은 2-3단계 (편집/업로드) manual.
License는 자현 자산 swap 시 자동 PASS.

## 진짜 한계 (정직)

- imweb 같은 dynamic-runtime 사이트: ✅ Frozen mirror가 init 깨짐 0%로 처리
- Vanilla static 사이트: ✅ 더 잘 됨
- 폰트 404: ⚠ CSS @font-face url() 일부 캐치 안 됨 (system font fallback)
- WebSocket / 실시간 데이터: ❌ static mirror 본질 한계
- DRM 콘텐츠: ❌ 본질 불가능

## 명령

```bash
# 단일 명령 (recommended)
node sigma-go.mjs <source-url>

# 개별 stage (디버그용)
node sigma-frozen-mirror.mjs <source-url> <output-dir>
node sigma-hybrid-frozen.mjs <output-dir>
node sigma-a11y-enrich.mjs <output-dir>
node sigma-omega-enhance.mjs <output-dir>
```

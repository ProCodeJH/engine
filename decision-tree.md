# Decision Tree — Intent → Tool

191 도구 중 사용자 intent에 맞는 도구 선택. **AI agent + 사용자**용 빠른 lookup.

---

## 🌳 핵심 5 도구 (90% use case)

```
사용자가 원하는 것?
├── "시각 archive (script 없는 frozen)"
│   └── nava capture <url>
│       (= nava-omega.mjs)
│
├── "여러 페이지 한 번에 archive"
│   └── nava batch <urls.txt>
│       (= sigma-batch-mirror.mjs)
│
├── "운영 가능한 React 코드" ⭐
│   └── nava rebuild <url>
│       (= nava-sigma.mjs 단일 mode)
│       → output/src/components/, app/, next.config.ts
│
├── "최고 quality archive (86 paradigm 융합)"
│   └── nava fusion <url>
│       (= sigma-fusion.mjs)
│       → 89-98% perceptual, 11-phase
│
└── "end-to-end (deploy까지)"
    └── nava deploy <url> --auto
        (= sigma-engine.mjs)
```

---

## 🧬 추가 use case (10% nuance)

### "원본 사이트 디자인 reference만 (운영 X)"
- `nava capture` → frozen HTML
- `nava extract` → 디자인 token JSON

### "라이센스 cert가 가장 중요 (clean room 인증)"
- `nava rebuild` → cleanroom React
- `node sigma-clean-pipeline.mjs <projDir>` → 5종 cert

### "이미지 자산만 깨끗하게 (license clean)"
- `node sigma-asset-audit.mjs <dir>` → license truth
- `node sigma-asset-swap.mjs <dir>` → 자체 자산 교체

### "여러 사이트 DNA 합성 (영감)"
- `node sigma-dna-fusion.mjs <url1> <url2> ... --output dir`

### "sub-routes 자동 추적 (sitemap)"
- `nava capture <url>` → 기본 max-routes 10
- `--max-routes 100` (더 많이)

### "특정 페이지 viewport별 capture (desktop/tablet/mobile)"
- `node sigma-multistate-frozen.mjs <url>` → 6 states

---

## 🎯 의도 키워드 → 도구

| 사용자 발화 | 도구 |
|---|---|
| "복제해" / "클론" / "이거 그대로" | `capture` (단순) 또는 `rebuild` (운영, 물어보기) |
| "운영 가능" / "배포" / "직접 편집" | `rebuild` ⭐ |
| "두손누리처럼 + 우리 콘텐츠" | `rebuild` + 콘텐츠 inject |
| "최고 quality" / "다 적용" / "엔진 다 써" | `fusion` (단 archive 의도 명시) |
| "자동으로" / "한 명령에" | `deploy --auto` |
| "여러 페이지" / "전체 사이트" | `batch <urls.txt>` |
| "디자인만 추출" / "색 뽑아" | `capture` + `extract` |
| "라이센스 cert" / "법적 클린" | `rebuild` + `sigma-clean-pipeline.mjs` |

---

## 🚨 흔한 혼동 (AI agent 주의)

### 혼동 1: capture vs rebuild
- `capture` = frozen HTML (운영 X)
- `rebuild` = React 코드 (운영 O)

→ 사용자가 "운영" 키워드 → `rebuild`. 아니면 `capture`.

### 혼동 2: fusion vs rebuild
- `fusion` = 86 paradigm archive (frozen 강화)
- `rebuild` = React 코드 emit

→ "최고 quality archive" → `fusion`. "운영 사이트" → `rebuild`.

### 혼동 3: deploy vs rebuild
- `deploy` = end-to-end (omega 기반 archive deploy)
- `rebuild` = 운영 React 코드

→ deploy의 결과는 archive deploy. 운영 사이트 → rebuild + 직접 deploy.

### 혼동 4: 단일 vs batch
- `capture` / `rebuild` / `fusion` = 단일 URL
- `batch` = 다중 URL (frozen mirror only)
- 다중 URL rebuild는 `nava rebuild` 여러 번 (사이 60s sleep, ban 회피)

---

## 🦋 구체 시나리오

### 시나리오 A: "두손누리 사이트처럼 daejeon-care 사이트 만들어"

```bash
# 1. rebuild로 React 코드 emit
node nava-cli.mjs rebuild https://www.dusonnuri.co.kr/

# 2. design tokens 추출
node nava-cli.mjs extract ./output/dusonnuri > tokens.json

# 3. 새 Next.js 프로젝트
npx create-next-app@latest daejeon-care-web

# 4. tokens → tailwind.config.ts 적용
# 5. components reference + content/*.ts 정의
# 6. dev + 운영 deploy
```

### 시나리오 B: "이 사이트 디자인 보여주기 (시각만)"

```bash
node nava-cli.mjs capture https://example.com
# → ./output/public/index.html (frozen, 시각 100%)
# → 직접 정적 server로 보여주기 (Next.js wrap X)
```

### 시나리오 C: "법무팀에 라이센스 cert 제출"

```bash
node nava-cli.mjs rebuild https://example.com
node sigma-clean-pipeline.mjs ./output/example
# → CERT-DEPLOY-READY.md (5종 cert 통합)
```

### 시나리오 D: "전체 사이트 백업 (다중 페이지)"

```bash
# urls.txt 만들기
curl -s https://example.com/sitemap.xml | grep -oP '<loc>\K[^<]+' > urls.txt

# batch capture
node nava-cli.mjs batch urls.txt --concurrency 1
# → omega-{host}/public/{slug1}/, {slug2}/, ...
```

---

## 🔧 환경 변수 (절대 하드코드 금지)

```bash
NAVA_ENGINE_ROOT  = engine repo 위치
NAVA_OUTPUT_DIR   = 결과 위치 (기본 cwd)
NAVA_BRAND_KIT    = 자체 자산 (logo / photos)
```

AI agent는 항상 이 변수 읽기. 절대 `C:/Users/...` 같은 하드코드 X.

# NAVA Sigma Engine — AI Agent Guide

**대상**: AI agent (Claude / Codex / GPT 등) 또는 다른 환경 사용자.
**목적**: 191개 sigma 도구 중 **올바른 도구**를 **올바른 의도**에 매핑 + portable 사용.

---

## 🎯 Decision Tree (intent → tool)

자현/사용자가 원하는 것 → 사용할 도구:

| 사용자 의도 | 사용할 도구 | 결과물 | 운영 가능? |
|---|---|---|---|
| **"이 사이트 시각만 그대로 archive"** | `nava capture <url>` (= sigma-batch-mirror) | `output/public/index.html` (frozen DOM, script 제거) | ❌ archive only |
| **"이 사이트처럼 만들고 직접 편집/운영"** | `nava rebuild <url>` (= nava-sigma 단일 mode) | `output/src/components/` + `app/` + Next.js 프로젝트 | ✅ **production** |
| **"end-to-end 자동: 미러 + 인증서 + deploy"** | `nava deploy <url> --auto` (= sigma-engine.mjs) | omega mirror + cert + Vercel deploy | ⚠️ archive 기반 |
| **"86 paradigm 다 융합한 archive"** | `nava fusion <url>` (= sigma-fusion.mjs) | 89-98% perceptual frozen + multi-state + audit | ❌ archive only |
| **"여러 페이지 한 번에 archive"** | `nava batch <urls.txt>` (= sigma-batch-mirror) | omega-{host}/public/{slug}/index.html × N | ❌ archive only |
| **"디자인 token만 추출 (색/폰트)"** | `nava extract <dir>` | meta.json (design tokens) | ✅ Tailwind config 직접 |

## 🚨 가장 흔한 실수

> **frozen mirror를 운영 사이트로 쓰려고 함**

frozen mirror (`sigma-batch-mirror`, `sigma-fusion`):
- `<script>` 다 제거 (legal clean)
- `computed style inline` 박힘 (1920px 고정)
- = **시각 archive + 라이센스 cert 의도**, 운영 X

운영 사이트 = `nava-sigma <url>` 단일 mode (rebuild) → React 코드 emit → 그 위에 직접 작업.

## 📋 운영 사이트 만드는 표준 워크플로우 (Codex / 다른 AI용)

```bash
# 1. 영감 사이트 rebuild → React 코드 emit
node nava-sigma.mjs https://example.com --output ./inspiration

# 2. design tokens 추출
cat ./inspiration/.sigma/scan.json | jq '.colors, .fonts, .layout' > tokens.json

# 3. 새 Next.js 프로젝트 생성
npx create-next-app@latest my-site --typescript --tailwind --app

# 4. tokens → tailwind.config.ts 적용
# (color/font/spacing 자동 변환)

# 5. ./inspiration/src/components 참고 (직접 copy 또는 reference)
# 6. content/*.ts에 자체 콘텐츠 정의
# 7. 직접 편집 + 운영 deploy
```

## 🔧 환경 변수 (portable)

```bash
NAVA_ENGINE_ROOT=/path/to/engine        # engine 위치 (기본 = 이 repo)
NAVA_OUTPUT_DIR=./nava-output            # 결과 위치 (기본 = cwd)
NAVA_BRAND_KIT=/path/to/brand-kit        # 자체 자산 (logo/photos)
```

## 🌐 다른 환경 / AI agent에서 사용

### 1. **다른 PC** (Windows / Mac / Linux)
```bash
git clone https://github.com/ProCodeJH/engine.git
cd engine
npm install
node nava-cli.mjs <command> <args>
```

### 2. **Codex / GPT / 다른 AI agent**
- 본 README + `AGENT_INSTRUCTIONS.md` 읽기
- `nava-cli.mjs` 통일 wrapper만 사용 (191 도구 직접 X)
- 결과 디렉토리의 `meta.json` 으로 mode/quality 검증

### 3. **CI/CD (GitHub Action)**
```yaml
- run: npx nava-sigma-engine capture ${{ inputs.url }}
- run: npx nava-sigma-engine extract ./output > tokens.json
```

### 4. **Docker** (예정)
```bash
docker run --rm -v $(pwd):/work nava-sigma:latest capture <url>
```

## 🦋 핵심 룰 5가지

1. **archive vs production 명확 구분** — frozen mirror는 archive only.
2. **운영 사이트 = rebuild (`nava rebuild`)** + 그 위에 직접 작업.
3. **design tokens 추출 (`nava extract`)** = inspiration 차용 + 자체 React 코드.
4. **`<projDir>/meta.json` 검증** — engine 모드/quality/cert 확인.
5. **CloudFront ban 회피** — UA disguise patch 적용됨 (nava-omega + nava-sigma).

## 📚 참고

- `ENGINE-INDEX.md` — 전체 도구 목록 (191개)
- `AGENT_INSTRUCTIONS.md` — 다른 AI agent용 step-by-step
- `decision-tree.md` — intent → tool 상세 매핑
- `examples/` — 실 사례 (archive / production / deploy)

# AGENT_INSTRUCTIONS — Codex / Claude / GPT / 다른 AI agent용 표준 워크플로우

**읽는 사람**: 이 engine을 사용하라고 지시받은 AI agent (Codex / Claude Code / Cursor / Gemini CLI 등).
**목적**: 191개 도구 헷갈리지 말고 **5 명령으로 90% use case** 처리.

---

## ⚡ Quick Reference (한 페이지)

사용자가 다음을 원하면:

### 🎯 "**X 사이트처럼 만들어**" / "**복제해**" / "**클론해**"

→ **꼭 물어보기**: archive (시각만) 인지 production (운영 가능) 인지.

| 사용자 답 | 실행 |
|---|---|
| "**시각 그대로**" / "**한 번 보여주기**" / "**라이센스 cert만**" | `node nava-cli.mjs capture <url>` |
| "**직접 편집 + 운영**" / "**daejeon-care처럼 우리 콘텐츠로**" / "**직접 deploy**" | **`node nava-cli.mjs rebuild <url>`** ⭐ |
| "**모든 paradigm 다 적용**" | `node nava-cli.mjs fusion <url>` |
| "**자동으로 deploy까지**" | `node nava-cli.mjs deploy <url> --auto` |
| "**여러 페이지 한 번에**" | `node nava-cli.mjs batch <urls.txt>` |

### 🚨 절대 하지 말 것

1. ❌ **frozen mirror를 운영 사이트로 사용** — `<script>` 제거됨, interactive X.
2. ❌ **191 도구 직접 호출** — `nava-cli.mjs` wrapper 통해.
3. ❌ **하드코드된 path** — 환경 변수 `NAVA_ENGINE_ROOT` / `NAVA_OUTPUT_DIR` 사용.
4. ❌ **fusion 결과 그대로 deploy** — archive 의도, 운영 X.

---

## 📋 표준 워크플로우 (운영 사이트 만들기)

사용자가 "X 사이트 디자인 + 우리 콘텐츠 + 운영 가능"을 원할 때:

### Step 1: rebuild
```bash
node /path/to/engine/nava-cli.mjs rebuild https://example.com
# → ./output/{slug}/ 안에 React + Next.js + Tailwind 코드 emit
```

### Step 2: design tokens 추출
```bash
node /path/to/engine/nava-cli.mjs extract ./output/{slug} > tokens.json
# → 색/폰트/spacing JSON
```

### Step 3: 새 Next.js 프로젝트
```bash
npx create-next-app@latest my-site --typescript --tailwind --app --no-eslint
cd my-site
```

### Step 4: tokens → tailwind.config.ts
```typescript
import tokens from '../tokens.json';
export default {
  theme: {
    extend: {
      colors: tokens.palette,
      fontFamily: tokens.fonts,
    },
  },
};
```

### Step 5: components reference + 콘텐츠 inject
- `./output/{slug}/src/components/` 안의 컴포넌트 참고
- 사용자 콘텐츠 (`content/*.ts`) 정의
- 운영 가능한 React 코드 작성

### Step 6: 운영
```bash
npm run dev          # 개발
npm run build && npm run start  # 운영
```

---

## 🔧 환경 변수 (portable)

```bash
export NAVA_ENGINE_ROOT=/path/to/engine     # engine repo 위치
export NAVA_OUTPUT_DIR=$(pwd)/nava-output   # 결과 디렉토리
```

또는 .env 파일.

---

## 🚨 CloudFront / 사이트 ban 발생 시

엔진의 `nava-omega.mjs` + `nava-sigma.mjs`에 **UA disguise patch** 적용됨 (HeadlessChrome → Chrome 130). CloudFront 1차 ban 회피.

여전히 ban 발동 시:
1. 5-30분 wait (자동 unban)
2. 다른 IP (VPN / 모바일 hotspot)
3. 단일 페이지씩 + 사이 60-90s sleep (`nava rebuild`를 1 URL씩 sequential)

---

## 🦋 결과 검증 (모든 명령 후)

각 명령 결과 디렉토리에 다음 파일이 있어야:

| 파일 | 의미 |
|---|---|
| `meta.json` | engine version, mode, paradigm 적용 목록 |
| `CERT-*.md` | 각 단계 인증서 (FUSION / CLEAN / DEPLOY-READY) |
| `public/index.html` | mirror 결과 (mirror/fusion mode) |
| `src/components/` | React components (rebuild mode) |
| `package.json` | Next.js 프로젝트 (rebuild mode) |

검증:
```bash
node /path/to/engine/nava-cli.mjs extract ./output/{slug}
# → JSON 결과 검증
```

---

## 📚 더 자세히

- `README-AGENT.md` — Decision tree + intent matrix
- `decision-tree.md` — 191 도구별 의도 매핑
- `ENGINE-INDEX.md` — 전체 도구 목록
- `examples/archive/` — frozen mirror 결과 예시
- `examples/production/` — rebuild 결과 + 통합 예시

---

## 🦋 자주 묻는 질문 (AI agent용)

**Q: 사용자가 "엔진 다 써"라고 함. 어떤 도구?**
A: `fusion` (86 paradigm 융합). 단 archive 의도임을 명시. 운영은 `rebuild` 별도.

**Q: frozen mirror 결과의 viewport가 깨짐. 왜?**
A: frozen DOM은 `width:1920` 고정 inline style. 운영 사이트로 사용 X. 시각 archive만.

**Q: 사용자가 "X 페이지가 비어있어" 라고 함.**
A: CloudFront ban 발동했을 가능성. `meta.json`의 `routes` 필드 확인 + ban 회피 워크플로우.

**Q: rebuild 결과를 그대로 deploy?**
A: rebuild는 React 코드 reference. 사용자 콘텐츠 inject + 디자인 polish 후 deploy.

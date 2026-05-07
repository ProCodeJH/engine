# Examples — 실 사용 사례

각 예시는 **명령 + 결과 + 사용 방법**을 명시.

---

## 1. archive — frozen mirror (운영 X, 시각만)

```bash
node /path/to/engine/nava-cli.mjs capture https://www.dusonnuri.co.kr/
# → ./omega-www-dusonnuri-co-kr/public/index.html (frozen, 시각 100%)
```

**결과**: `<script>` 제거, computed style inline 박힌 정적 HTML. 라이센스 cert 발급.
**용도**: archive / portfolio / legal proof / visual reference.
**운영 X**: interactive 안 됨, 1920px 고정.

---

## 2. production — React rebuild (운영 OK)

```bash
node /path/to/engine/nava-cli.mjs rebuild https://www.dusonnuri.co.kr/
# → ./output/dusonnuri/{src/components/, app/, next.config.ts, package.json}
```

**결과**: Next.js + Tailwind + Framer Motion 프로젝트.
**다음 단계**:
1. `cd ./output/dusonnuri && npm install`
2. `src/components/`를 새 프로젝트에 통합 (또는 reference)
3. 자체 콘텐츠 (`content/*.ts`) 정의
4. `npm run dev` → 운영 사이트

---

## 3. end-to-end — sigma-engine (auto pipeline)

```bash
mkdir -p brand-kit/images/{hero,photos,logos,icons}
# brand-kit/images/ 안에 자체 자산 넣기

node /path/to/engine/nava-cli.mjs deploy https://www.dusonnuri.co.kr/ \
  --brand-kit ./brand-kit \
  --target 88 \
  --auto
# → omega + audit + brand-swap + converge + (deploy)
```

**결과**: archive 기반 deploy. 88%+ score 시도 (단 architectural ceiling 52% 흔함).
**용도**: 한 명령에 모든 paradigm. 단 archive 의도.

---

## 4. multi-page batch — 여러 URL archive

```bash
# urls.txt 만들기
cat > urls.txt <<'EOF'
https://example.com/page1
https://example.com/page2
https://example.com/page3
EOF

node /path/to/engine/nava-cli.mjs batch urls.txt --concurrency 1
# → omega-{host}/public/{slug1}/, {slug2}/, ...
```

**중요**: `concurrency 1` + 사이 sleep으로 ban 회피.

---

## 5. design tokens 추출 (Tailwind config 자동 생성)

```bash
node /path/to/engine/nava-cli.mjs rebuild https://example.com
node /path/to/engine/nava-cli.mjs extract ./output/example > tokens.json

# tokens.json → tailwind.config.ts에 적용
```

---

## 🚨 흔한 실수

### ❌ frozen mirror를 운영 사이트로 deploy
```bash
# 잘못
nava capture <url> && deploy ./omega-{host}/public  # 1920 고정, interactive X
```

→ 대신:
```bash
nava rebuild <url>  # production React
```

### ❌ 191 도구 직접 호출
```bash
# 잘못 (도구 너무 많아 헷갈림)
node sigma-batch-mirror.mjs ...
node sigma-fusion.mjs ...
```

→ 대신:
```bash
nava capture / rebuild / fusion / deploy / batch / extract
```

### ❌ 하드코드 path
```javascript
// 잘못
const ENGINE = 'C:/Users/me/engine';
```

→ 대신:
```javascript
// 옳음
const ENGINE = process.env.NAVA_ENGINE_ROOT || './engine';
```

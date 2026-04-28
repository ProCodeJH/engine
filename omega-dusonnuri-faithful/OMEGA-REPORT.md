# Omega Mirror Report

Generated: 2026-04-28T09:06:48.207Z
Source: https://www.dusonnuri.co.kr/
Output: C:\Users\dg020\Desktop\작업\projects\engine\omega-dusonnuri-faithful
Duration: 198.2s

## Stats
- Asset URLs discovered: 1188
- Mirrored: 722 (88.01 MB)
- Failed: 466
- HTML rewrites: 5935
- JS rewrites: 22
- CSS rewrites: 14

## Verify
- skipped (--skip-verify or sirv didn't start)

## 다음 단계
```bash
cd omega-dusonnuri-faithful
npm install
npm start
# → http://localhost:3100
```

자현 워크플로우:
1. 시각 1:1 검증 (이 미러)
2. 클라이언트 콘텐츠 수동 swap
3. `nava-sigma.mjs --strict-clean` 으로 클린 인증 + production deploy

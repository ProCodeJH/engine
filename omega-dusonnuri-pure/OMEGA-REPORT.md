# Omega Mirror Report

Generated: 2026-04-28T11:20:06.274Z
Source: https://www.dusonnuri.co.kr/
Output: C:\Users\dg020\Desktop\작업\projects\engine\omega-dusonnuri-pure
Duration: 184.4s

## Stats
- Asset URLs discovered: 1199
- Mirrored: 733 (87.90 MB)
- Failed: 466
- HTML rewrites: 5935
- JS rewrites: 22
- CSS rewrites: 14

## Verify
- skipped (--skip-verify or sirv didn't start)

## 다음 단계
```bash
cd omega-dusonnuri-pure
npm install
npm start
# → http://localhost:3100
```

자현 워크플로우:
1. 시각 1:1 검증 (이 미러)
2. 클라이언트 콘텐츠 수동 swap
3. `nava-sigma.mjs --strict-clean` 으로 클린 인증 + production deploy

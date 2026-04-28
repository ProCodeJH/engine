# Fusion Report — Omega + Sigma 통합

Generated: 2026-04-28T11:19:57.058Z
Source: https://www.dusonnuri.co.kr/
Project: C:\Users\dg020\Desktop\작업\projects\engine\omega-dusonnuri-pure

## Asset slots 자동 추출

- Tokens (text): 15
- Images: 33
- External links: 5

## 자현 다음 단계

1. `assets.template.json` 열어서 채움 (client 자산):
   - 토큰 자리에 client 카피 입력
   - 이미지 자리에 client 이미지 URL
   - 링크 자리에 client 자체 SNS/외부 URL
2. `node sigma-asset-inject.mjs <projDir> assets.json`
3. (옵션) `node sigma-trade-shift.mjs <projDir>` — 색조 미세 회피
4. `npm install && npm start` — http://localhost:3100 검증
5. CERT-CLEAN-OMEGA.md를 client/법무에 첨부

## License audit

- Mirror ratio: 0%
- Identifiers remaining: framer=4, webflow=0, wix=0
- Hotlinked external: 5
- Determination: **REVIEW — 식별자 또는 mirror 미달**
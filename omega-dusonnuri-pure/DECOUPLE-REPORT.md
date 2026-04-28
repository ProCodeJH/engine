# Sigma Decouple Report

Generated: 2026-04-28T11:19:56.400Z
Project: C:\Users\dg020\Desktop\작업\projects\engine\omega-dusonnuri-pure
Platforms targeted: framer, webflow, wix, squarespace

## Detection

- (no platform fingerprints detected)

## Stats

- Files scanned: 241
- Files modified: 12
- Data attrs removed: 0
- Classes anonymized: 37
- Meta tags removed: 0
- Custom elements replaced: 0
- Identifier text removed: 0

## 의도

Omega 미러된 사이트는 원본 그대로 → F12 열면 "framer", "data-wf-*",
"wow-image" 같은 platform 식별자 노출. 자현 비즈니스 "복제→편집→판매"
위해 식별자 0이어야 함. 이 도구가 자동 제거.

Decouple 후 framer-motion 런타임은 그대로 작동 (식별자만 제거).
스크롤 애니메이션은 별도 영역 — clone-engine-v21-findings 메모리 참조.
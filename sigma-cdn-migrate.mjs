#!/usr/bin/env node
// sigma-cdn-migrate.mjs — Paradigm 41 — Self-Hosting Asset Pipeline
//
// 자현 비즈니스 deploy 진짜 가치. Omega 미러된 _fcdn/ assets를 자체 CDN
// (Cloudflare R2 / AWS S3 / GitHub Pages / IPFS / 자현 자체 서버)로 자동
// migration. URL rewrite + CDN config + deploy 스크립트.
//
// 자현 비즈니스: 100 client 사이트 = 100 자체 CDN URL. client 자산 100%
// control + private CDN hotlink 차단 회피 + 빠른 edge serving.
//
// Targets:
//   1. Cloudflare R2 (S3 호환, 무료 10GB) — 권장
//   2. AWS S3
//   3. GitHub Pages (정적 자산용 + LFS)
//   4. Vercel Blob
//   5. IPFS (Web3 영구)
//   6. 자현 자체 서버 (rsync + nginx)
//
// 출력:
//   - .cdn-migrate/<target>/ (deploy 스크립트)
//   - manifest.json (자산 → CDN URL 매핑)
//   - HTML/JS/CSS auto rewrite (_fcdn → CDN URL)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const TARGETS = {
  "r2": {
    name: "Cloudflare R2",
    description: "S3-compatible, free 10GB egress, edge serving",
    deployScript: (config) => `#!/bin/bash
# Cloudflare R2 deploy — wrangler 사용
# Setup: npm install -g wrangler && wrangler login
# Bucket: wrangler r2 bucket create ${config.bucketName}

BUCKET="${config.bucketName}"
SRC="public/_fcdn"

for f in "$SRC"/*; do
  name=\$(basename "$f")
  echo "Uploading $name..."
  wrangler r2 object put "$BUCKET/$name" --file="$f"
done

echo ""
echo "Done. CDN URL pattern: https://${config.publicHost}/<filename>"
echo "또는 r2.dev custom domain 설정"
`,
    urlPattern: (config) => `https://${config.publicHost}/_fcdn`,
  },
  "s3": {
    name: "AWS S3 + CloudFront",
    description: "Standard cloud, scale-out unlimited",
    deployScript: (config) => `#!/bin/bash
# AWS S3 + CloudFront deploy
# Setup: aws configure (access key + region)

BUCKET="${config.bucketName}"
SRC="public/_fcdn"
REGION="${config.region || "us-east-1"}"

aws s3 sync "$SRC" "s3://$BUCKET/_fcdn/" \\
  --acl public-read \\
  --cache-control "public, max-age=31536000, immutable"

echo "Done. CDN URL: https://${config.publicHost}/_fcdn/<filename>"
`,
    urlPattern: (config) => `https://${config.publicHost}/_fcdn`,
  },
  "github-pages": {
    name: "GitHub Pages",
    description: "Free static hosting + 1GB LFS",
    deployScript: (config) => `#!/bin/bash
# GitHub Pages deploy — _fcdn을 별도 repo의 docs/_fcdn 으로 push
# Setup: gh auth login + 새 repo "${config.repoName}" 생성

REPO="${config.repoName}"
SRC="public/_fcdn"

mkdir -p ".gh-pages/docs/_fcdn"
cp -r "$SRC"/* ".gh-pages/docs/_fcdn/"

cd .gh-pages
git init
git remote add origin "https://github.com/${config.githubUser}/$REPO.git"
git checkout -b main
git add .
git commit -m "deploy assets"
git push -fu origin main

echo "Done. Set GitHub Pages source: docs/ branch main"
echo "URL: https://${config.githubUser}.github.io/$REPO/_fcdn/<filename>"
`,
    urlPattern: (config) => `https://${config.githubUser}.github.io/${config.repoName}/_fcdn`,
  },
  "vercel-blob": {
    name: "Vercel Blob",
    description: "Vercel-native blob storage",
    deployScript: (config) => `#!/bin/bash
# Vercel Blob deploy
# Setup: vercel link + vercel env add BLOB_READ_WRITE_TOKEN

SRC="public/_fcdn"

for f in "$SRC"/*; do
  name=\$(basename "$f")
  echo "Uploading $name..."
  curl -X PUT "\\$VERCEL_BLOB_API/$name" \\
    -H "Authorization: Bearer \\$BLOB_READ_WRITE_TOKEN" \\
    --data-binary "@$f"
done
`,
    urlPattern: (config) => `https://${config.publicHost}.public.blob.vercel-storage.com/_fcdn`,
  },
  "ipfs": {
    name: "IPFS / Pinata",
    description: "Decentralized, Web3-ready, content-addressed",
    deployScript: (config) => `#!/bin/bash
# IPFS deploy via Pinata API
# Setup: PINATA_JWT 환경변수 설정

SRC="public/_fcdn"

curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \\
  -H "Authorization: Bearer \\$PINATA_JWT" \\
  -F "file=@$SRC" \\
  -F 'pinataMetadata={"name":"sigma-fcdn"}'

# Output: { "IpfsHash": "Qm..." }
echo "URL: https://ipfs.io/ipfs/<IpfsHash>/_fcdn/<filename>"
`,
    urlPattern: (config) => `https://gateway.pinata.cloud/ipfs/${config.cid || "<CID>"}/_fcdn`,
  },
  "self-host": {
    name: "Self-Host (rsync + nginx)",
    description: "자현 자체 서버 — 100% control",
    deployScript: (config) => `#!/bin/bash
# Self-host deploy via rsync
# Setup: SSH 키 + nginx 설정

HOST="${config.host}"
USER="${config.sshUser || "ubuntu"}"
REMOTE_PATH="${config.remotePath || "/var/www/cdn/_fcdn"}"
SRC="public/_fcdn"

rsync -avz --delete "$SRC/" "\\$USER@\\$HOST:\\$REMOTE_PATH/"

echo "Done. URL: https://${config.publicHost}/_fcdn/<filename>"
echo ""
echo "nginx config 예:"
echo "  location /_fcdn { root /var/www/cdn; expires 1y; }"
`,
    urlPattern: (config) => `https://${config.publicHost}/_fcdn`,
  },
};

export function generateMigrationPlan(projDir, target, config = {}) {
  const fcdnDir = path.join(projDir, "public", "_fcdn");
  if (!fs.existsSync(fcdnDir)) {
    return { error: "public/_fcdn/ not found — Omega 미러 먼저" };
  }

  const targetDef = TARGETS[target];
  if (!targetDef) {
    return { error: `unknown target: ${target}. valid: ${Object.keys(TARGETS).join(", ")}` };
  }

  const files = fs.readdirSync(fcdnDir);
  const totalSize = files.reduce((s, f) => {
    try { return s + fs.statSync(path.join(fcdnDir, f)).size; } catch { return s; }
  }, 0);

  const cdnDir = path.join(projDir, ".cdn-migrate", target);
  fs.mkdirSync(cdnDir, { recursive: true });

  // Generate deploy script
  const script = targetDef.deployScript(config);
  fs.writeFileSync(path.join(cdnDir, `deploy-${target}.sh`), script);
  try { fs.chmodSync(path.join(cdnDir, `deploy-${target}.sh`), 0o755); } catch {}

  // Generate manifest (asset → CDN URL)
  const cdnUrlBase = targetDef.urlPattern(config);
  const manifest = {};
  for (const f of files) {
    manifest[`/_fcdn/${f}`] = `${cdnUrlBase}/${f}`;
  }
  fs.writeFileSync(path.join(cdnDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Generate URL rewrite script (HTML/JS/CSS _fcdn → CDN URL)
  const rewriteScript = `#!/bin/bash
# URL rewrite — _fcdn/ → CDN base
# 자현이 deploy 후 실행 (또는 sigma-cdn-migrate.mjs --apply 사용)

CDN_BASE="${cdnUrlBase}"
PUBLIC_DIR="public"

# HTML rewrite
find "\\$PUBLIC_DIR" -name "*.html" -exec sed -i.bak \\
  "s|\\\\\"/_fcdn|\\"\\$CDN_BASE|g; s|'/_fcdn|'\\$CDN_BASE|g" {} \\;

# JS rewrite
find "\\$PUBLIC_DIR/_fcdn" -name "*.js" -exec sed -i.bak \\
  "s|\\\\\"/_fcdn|\\"\\$CDN_BASE|g" {} \\;

# CSS rewrite
find "\\$PUBLIC_DIR/_fcdn" -name "*.css" -exec sed -i.bak \\
  "s|/_fcdn/|\\$CDN_BASE/|g" {} \\;

echo "Done. _fcdn → \\$CDN_BASE rewrite applied."
`;
  fs.writeFileSync(path.join(cdnDir, `rewrite-urls.sh`), rewriteScript);
  try { fs.chmodSync(path.join(cdnDir, `rewrite-urls.sh`), 0o755); } catch {}

  // CERT-CDN-MIGRATE.md
  const cert = [
    `# CERT-CDN-MIGRATE — Paradigm 41 Asset Pipeline`,
    "",
    `**Issued**: ${new Date().toISOString()}`,
    `**Project**: \`${projDir}\``,
    `**Target**: ${targetDef.name} (\`${target}\`)`,
    "",
    `## Stats`,
    `- Asset files: ${files.length}`,
    `- Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    `- CDN URL base: \`${cdnUrlBase}\``,
    "",
    `## Deploy steps`,
    "",
    `1. config 검토 (\`${cdnDir}/manifest.json\`)`,
    `2. ${targetDef.description}`,
    `3. \`bash ${cdnDir}/deploy-${target}.sh\``,
    `4. \`bash ${cdnDir}/rewrite-urls.sh\` (HTML/JS/CSS _fcdn → CDN URL 변경)`,
    `5. 자현 사이트 deploy (Vercel/Cloudflare Pages/etc)`,
    "",
    "## Target 설정",
    "",
    "```json",
    JSON.stringify(config, null, 2),
    "```",
    "",
    "## 자현 비즈니스 효과",
    "",
    "- **자체 CDN URL** — client 자산 100% control",
    "- **Hotlink 회피** — 원본 사이트 private CDN 의존 0",
    "- **Edge serving** — 빠른 로딩 (Cloudflare/Vercel)",
    "- **Cost 0~minimal** — Cloudflare R2 무료 10GB / GitHub Pages 무료",
    "- **Scale** — 100 사이트 = 100 CDN bucket (또는 1 bucket prefix)",
    "",
    "## Legal",
    "",
    "- 자체 CDN으로 migrate한 assets는 client *책임*",
    "- 원본 라이선스 (OSS fonts / GFonts / picsum)는 자체 CDN serving 시 라이선스 명시 필요",
    "- 사용자 자산 (client 이미지) — 자현이 client 라이선스 받음",
  ];
  fs.writeFileSync(path.join(projDir, "CERT-CDN-MIGRATE.md"), cert.join("\n"));

  return {
    target: targetDef.name,
    fileCount: files.length,
    totalSize: totalSize,
    deployScript: path.join(cdnDir, `deploy-${target}.sh`),
    rewriteScript: path.join(cdnDir, `rewrite-urls.sh`),
    manifest: path.join(cdnDir, "manifest.json"),
    cdnUrlBase,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  const target = process.argv[3] || "r2";
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-cdn-migrate.mjs <projectDir> <target> [--bucket NAME] [--host HOST]");
    console.error("");
    console.error("targets:");
    for (const [k, v] of Object.entries(TARGETS)) {
      console.error(`  ${k.padEnd(15)} — ${v.description}`);
    }
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };

  const config = {
    bucketName: flagVal("--bucket") || "sigma-cdn",
    publicHost: flagVal("--host") || "cdn.example.com",
    region: flagVal("--region") || "auto",
    githubUser: flagVal("--gh-user") || "ProCodeJH",
    repoName: flagVal("--repo") || `sigma-cdn-${path.basename(projDir)}`,
    sshUser: flagVal("--ssh-user"),
    remotePath: flagVal("--remote-path"),
    cid: flagVal("--cid"),
  };

  const r = generateMigrationPlan(projDir, target, config);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[cdn-migrate] ${r.target} — ${r.fileCount} files / ${(r.totalSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  CDN base: ${r.cdnUrlBase}`);
  console.log(`  → ${path.relative(projDir, r.deployScript)}`);
  console.log(`  → ${path.relative(projDir, r.rewriteScript)}`);
  console.log(`  → CERT-CDN-MIGRATE.md`);
}

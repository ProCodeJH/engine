#!/usr/bin/env node
// sigma-github-actions.mjs — Paradigm 228 — GitHub Actions CI/CD Generator
//
// .github/workflows/sigma-deploy.yml 자동 생성. Source URL → mirror → deploy 자동.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERCEL_WORKFLOW = `name: Sigma Mirror + Deploy (Vercel)

on:
  schedule:
    - cron: '0 3 * * *'  # daily at 3am UTC
  workflow_dispatch:
    inputs:
      source_url:
        description: 'Source URL to mirror'
        required: false
  push:
    branches: [main]
    paths:
      - 'brand-kit/**'
      - '.github/workflows/sigma-deploy.yml'

jobs:
  mirror-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Sigma Mirror
        run: |
          SOURCE_URL="\${{ github.event.inputs.source_url || vars.SOURCE_URL }}"
          node sigma-go.mjs "$SOURCE_URL" \\
            --all \\
            --brand-kit ./brand-kit \\
            --base-url "\${{ vars.PUBLIC_BASE_URL }}" \\
            --output ./deliver

      - name: Self-Lighthouse
        run: node sigma-self-lighthouse.mjs http://localhost:3100/ || true
        continue-on-error: true

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          cd deliver
          vercel deploy --prod --token=$VERCEL_TOKEN --yes
`;

export const CLOUDFLARE_WORKFLOW = `name: Sigma Mirror + Deploy (Cloudflare Pages)

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:
    inputs:
      source_url:
        description: 'Source URL to mirror'
        required: false

jobs:
  mirror-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Wrangler
        run: npm install -g wrangler@latest

      - name: Sigma Mirror
        run: |
          SOURCE_URL="\${{ github.event.inputs.source_url || vars.SOURCE_URL }}"
          node sigma-go.mjs "$SOURCE_URL" --all --brand-kit ./brand-kit \\
            --base-url "\${{ vars.PUBLIC_BASE_URL }}" --output ./deliver

      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          wrangler pages deploy ./deliver/public \\
            --project-name=\${{ vars.CF_PROJECT_NAME }}
`;

export function generateWorkflows(targetDir = ".github/workflows") {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "sigma-deploy-vercel.yml"), VERCEL_WORKFLOW);
  fs.writeFileSync(path.join(targetDir, "sigma-deploy-cloudflare.yml"), CLOUDFLARE_WORKFLOW);
  return {
    files: [
      path.join(targetDir, "sigma-deploy-vercel.yml"),
      path.join(targetDir, "sigma-deploy-cloudflare.yml"),
    ],
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const targetDir = process.argv[2] || ".github/workflows";
  const r = generateWorkflows(targetDir);
  console.log(`[gh-actions] generated ${r.files.length} workflows`);
  for (const f of r.files) console.log(`  ${f}`);
  console.log(`\n  Required secrets / vars:`);
  console.log(`  - vars.SOURCE_URL: source URL to mirror`);
  console.log(`  - vars.PUBLIC_BASE_URL: 자현 deploy domain`);
  console.log(`  - secrets.VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID`);
  console.log(`  - secrets.CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID`);
  console.log(`  - vars.CF_PROJECT_NAME`);
}

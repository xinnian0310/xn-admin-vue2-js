# xn-admin-vue2-js

[English](README.en.md) | [简体中文](README.md)

XinNian Admin frontend: Vue 3 + **JavaScript** + Vite + Element Plus (**Options API**: `data` / `methods` / `computed` / `watch`).

The folder name `vue2-js` means “the second JavaScript style”, **not Vue 2**. Runtime is Vue 3. `package.json` name is `xn-admin-vue3-options-js`; public `APP_CLIENT_ID` is `xn-admin-vue2-js`. Feature-aligned with **xn-admin-vue3-ts**, sharing backend **xn-admin-cloud**. Apache License 2.0 — **free for personal and commercial use**.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Free-success.svg)](./LICENSE)
[![Commercial](https://img.shields.io/badge/Commercial-Allowed-brightgreen.svg)](./LICENSE)
[![Personal](https://img.shields.io/badge/Personal-Allowed-brightgreen.svg)](./LICENSE)

Version: `1.0.0` · License: [Apache-2.0](./LICENSE) · Copyright 2026 XinNian

**Live demo:** https://vue2.xinniankeji.vip · Website: https://xinniankeji.vip

## Related repositories

| Repository | Gitee | GitHub | Notes |
|------|-------|--------|------|
| `xn-admin-cloud` | [Gitee](https://gitee.com/jenning/xn-admin-cloud) | [GitHub](https://github.com/xinnian0310/xn-admin-cloud) | Backend (required) |
| `xn-admin-vue3-ts` | [Gitee](https://gitee.com/jenning/xn-admin-vue3-ts) | [GitHub](https://github.com/xinnian0310/xn-admin-vue3-ts) | Feature baseline (TypeScript) |
| `xn-admin-vue3-js` | [Gitee](https://gitee.com/jenning/xn-admin-vue3-js) | [GitHub](https://github.com/xinnian0310/xn-admin-vue3-js) | Vue 3 + JavaScript (Composition) |
| `xn-admin-vue2-js` | [Gitee](https://gitee.com/jenning/xn-admin-vue2-js) | [GitHub](https://github.com/xinnian0310/xn-admin-vue2-js) | This repo |
| `xn-admin-react-ts` | [Gitee](https://gitee.com/jenning/xn-admin-react-ts) | [GitHub](https://github.com/xinnian0310/xn-admin-react-ts) | React + TypeScript |

## Prerequisites

1. Node.js 20+ (see `.nvmrc`)
2. Backend **xn-admin-cloud** running, gateway at http://127.0.0.1:8088  
   (three-step start in that repo: `docker compose up -d` then `scripts/run-dev`)
3. Middleware can come from the backend Docker Compose (or your own MySQL / Redis / Nacos / MinIO)

## Default accounts

| Username | Initial password | Notes |
|----------|------------------|------|
| `SuperAdmin` | `SuperAdmin` | Super admin |
| `admin` | `admin` | Admin |

Local development only. Change passwords after login. See [SECURITY.md](./SECURITY.md).

## Quick start

```bash
npm install
npm run dev
```

Dev URL: http://localhost:1801

Vite proxies `/api`, `/uploads`, `/ws`, `/swagger-ui`, `/v3/api-docs` to `http://localhost:8088`.

```bash
npm run build
npm run preview
npm run lint
npm run test
npm run ci            # lint + format:check + test + build
```

## Differences from vue3-js / baseline

- Language: TypeScript → JavaScript (same as vue3-js)
- Components: Composition `<script setup>` → **Options API** (`export default { name, components, props, data, computed, watch, methods, … }`)
- `APP_CLIENT_ID`: `xn-admin-vue2-js`
- Dev port: `1801`
- `api` / `utils` can follow vue3-js; page and component scripts are rewritten in Options style
- No `vue-tsc` / `typecheck`

## Stack

Vue 3.5, JavaScript, **Options API** (no `<script setup>`), Vite 8, Element Plus, Pinia 4, Vue Router 5, Axios, ECharts, wangEditor, ExcelJS, ESLint, Prettier, Vitest, Husky.

## Screenshots

Same module filenames as the baseline, in [`docs/images/`](./docs/images/).

| Page | Screenshot |
|------|------------|
| Login | ![Login](./docs/images/login.png) |
| Dashboard | ![Dashboard](./docs/images/dashboard.png) |
| Users | ![Users](./docs/images/users.png) |
| Roles | ![Roles](./docs/images/roles.png) |
| Files | ![Files](./docs/images/files.png) |
| Jobs | ![Jobs](./docs/images/jobs.png) |

More screenshots use the same names under `docs/images/`.

## Production (summary)

- `npm run build`, then Nginx
- Reverse-proxy `/api`, `/uploads`, `/ws` to gateway `127.0.0.1:8088`
- [SECURITY.md](./SECURITY.md) · [CONTRIBUTING.md](./CONTRIBUTING.md)

## Support

If this project helps you, a coffee is welcome ☕

<p align="center">
  <img src="./docs/donation/donate.png" alt="Donate (WeChat Pay / Alipay)" width="480" />
</p>

## License

[Apache License 2.0](./LICENSE). Personal and commercial use allowed. Keep copyright, license, and NOTICE; mark modified files. Donations are not a commercial license or paid support.

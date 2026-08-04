# Phase 1 — Scaffold the new monorepo

**Status:** Done  
**Completed:** 2026-08-04

## Goal

Empty but runnable workspace with modern tooling (backend + main + admin only; no mobile).

## What shipped

- Location: `/home/jdidi/TaskFlow-AI-v3`
- npm workspaces + Turbo 2
- `apps/backend` — Express 5 + TypeScript, `GET /api/health`
- `apps/main` — Vite 8 + React 19 + TypeScript (port `5173`, `/api` proxy)
- `apps/admin` — Vite 8 + React 19 + TypeScript (port `5175`, `/api` proxy)
- Stub packages: `@taskflow/config`, `@taskflow/theme`, `@taskflow/ui`, `@taskflow/utils`
- Root scripts: `dev:web`, `dev:backend`, `dev:main`, `dev:admin`, `build`, `lint`, `type-check`, `show:ports`
- `README.md`, `.nvmrc` (22), `.gitignore`, `tsconfig.base.json`

## Exit checks

- [x] `npm install` succeeds
- [x] Backend health: `{"status":"ok","version":"3.0.0"}` on `:3001`
- [x] Main app serves on `:5173`
- [x] Admin app serves on `:5175`
- [x] No `apps/mobile` workspace entry

## How to run

```bash
cd /home/jdidi/TaskFlow-AI-v3
npm install
cp apps/backend/.env.example apps/backend/.env
npm run dev:web
```

## Next

→ [PHASE-02-shared-packages.md](./PHASE-02-shared-packages.md)

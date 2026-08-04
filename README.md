# TaskFlow AI v3

Clean rebuild of TaskFlow AI (web only). Mobile is out of scope.

**v2 reference (read-only):** `/home/jdidi/TaskFlow-AI-Smart-Team-TaskManager`

## Stack

| App | Stack | Port |
| --- | --- | --- |
| Backend | Express 5 + TypeScript | `3001` |
| Main | Vite 8 + React 19 + TypeScript | `5173` |
| Admin | Vite 8 + React 19 + TypeScript | `5175` |

Shared packages: `@taskflow/theme`, `@taskflow/ui`, `@taskflow/utils`, `@taskflow/config` (Phase 2 done).

## Requirements

- Node.js `>= 22`
- npm `>= 10`

## Setup

```bash
cd /home/jdidi/TaskFlow-AI-v3
npm install
cp apps/backend/.env.example apps/backend/.env
```

## Scripts

```bash
npm run dev:web       # backend + main + admin
npm run dev:backend   # API only
npm run dev:main      # main app only
npm run dev:admin     # admin app only
npm run build
npm run lint
npm run type-check
npm run show:ports
```

## Health check

```bash
curl http://localhost:3001/api/health
```

## Phases

Each phase has its own markdown file. Update that file when the phase finishes.

→ [docs/phases/README.md](./docs/phases/README.md)

| Phase | Status |
| --- | --- |
| [01 — Scaffold](./docs/phases/PHASE-01-scaffold.md) | **Done** |
| [02 — Shared packages](./docs/phases/PHASE-02-shared-packages.md) | **Done** |
| [03 — Backend foundation](./docs/phases/PHASE-03-backend-foundation.md) | Pending (next) |

Full plan overview: v2 `REBUILD.md`.

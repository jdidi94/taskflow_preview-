# Phase 3 — Backend foundation (TypeScript)

**Status:** Done  
**Completed:** 2026-08-04

## Goal

Solid API skeleton: Express 5 + TypeScript + Mongo connection + health + JWT middleware + Socket.io bootstrap.

## What shipped

- Typed `config/env.ts` (Zod) + `config/db.ts` (Mongoose, 5s selection timeout)
- `AppError`, `asyncHandler`, central `errorHandler` / `notFoundHandler`
- Models (essential fields): User, Admin, Workspace, Space, Board, Column, Task
- JWT utils + `authenticate` / `requireAdmin`
- `GET /api/health` → `{ status, version, mongo }`
- `GET /api/me` (Bearer JWT required)
- Socket.io on same HTTP server with JWT handshake (`auth.token`) + `system:ready`
- Dev scripts: `npm run token -w @taskflow/backend`, `npm run smoke:socket -w @taskflow/backend`

## Exit checks

- [x] `tsc --noEmit` / build pass
- [x] Server starts on `3001` (Mongo optional in dev; health reports `mongo: down` if offline)
- [x] Health check OK (degraded without Mongo)
- [x] `/api/me` → 401 without token; 200 with JWT
- [x] Socket connects with valid token (`system:ready`)

## Smoke

```bash
npm run dev:backend
curl http://localhost:3001/api/health
TOKEN=$(npm run token -w @taskflow/backend --silent)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/me
npm run smoke:socket -w @taskflow/backend -- "$TOKEN"
```

Start Mongo locally (or set Atlas `DATABASE_URL`) for `mongo: "up"`.

## Next

→ [PHASE-04-backend-apis.md](./PHASE-04-backend-apis.md)

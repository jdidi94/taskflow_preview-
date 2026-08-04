# Phase 3 — Backend foundation (TypeScript)

**Status:** Pending

## Goal

Solid API skeleton: Express 5 + TypeScript + Mongo connection + health + JWT middleware shell.

## Steps

1. Folder layout: `config`, `models`, `routes`, `controllers`, `services`, `middlewares`, `sockets`, `utils`
2. dotenv, cors, helmet, JSON body, error handler
3. Mongoose connection
4. JWT auth middleware + role guards (stubs OK)
5. Keep `GET /api/health`
6. First models: User, Admin, Workspace, Space, Board, Column, Task
7. Socket.io bootstrap with auth handshake
8. Expand `.env.example`

## Exit checks

- [ ] Server starts on `3001`
- [ ] Mongo connects
- [ ] Health check OK
- [ ] JWT-protected sample route works
- [ ] `tsc --noEmit` passes

## Completion notes

*(Fill when this phase finishes.)*

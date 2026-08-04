# Phase 0 — Inventory & freeze the reference

**Status:** Pending

## Goal

Know exactly what to rebuild before writing new code.

## Steps

1. Keep v2 repo read-only as reference: `/home/jdidi/TaskFlow-AI-Smart-Team-TaskManager`
2. Document env vars (DB, JWT, OAuth, Stripe, AI, SMTP, push, CORS)
3. Inventory domain models, API routes, socket namespaces
4. List admin vs main features
5. Agree MVP vs later cuts

## Recommended MVP

1. Auth (email/password + JWT + session basics)
2. Workspace / space / board / column / task CRUD
3. Realtime board updates
4. Notifications basics
5. Admin login + user management
6. Shared theme + UI kit (minimal)

## Exit checks

- [ ] Written inventory of models, routes, sockets, env vars
- [ ] MVP vs later list agreed
- [x] New project directory exists (`TaskFlow-AI-v3`)

## Completion notes

*(Fill when this phase finishes.)*

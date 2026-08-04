# Phase 4 — Backend domain APIs

**Status:** In progress (Auth vertical done; prefs/sessions/OAuth/2FA done; Workspace→Task hierarchy done; Analytics basic chart-data done)

## Goal

Rebuild APIs feature-by-feature (model → service → controller → route → test → sockets).

## Order

1. Auth + 2FA + sessions  
2. User profile / preferences  
3. Workspace + invitation  
4. Space  
5. Board + columns  
6. Task + checklist + tags + comments  
7. Files / uploads  
8. Notifications + reminders  
9. Chat  
10. Templates  
11. Admin management  
12. Analytics (basic)  
13. Integrations / GitHub  
14. AI / AI tokens  
15. Stripe / quotas  
16. Power BI  

## Exit checks

- [ ] MVP modules (1–8 + 11) covered by tests
- [ ] API suite green for MVP
- [ ] Socket smoke test for board/task/notification

## Completion notes
### Auth slice (4.1–4.2) — completed

- Implemented:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `PATCH /api/auth/profile`
  - `POST /api/auth/change-password`
- Added Zod request validation + `validateBody()` middleware.
- `GET /api/me` is now DB-backed and aliases to the same `getMe` logic.
- Smoke-tested against Mongo:
  - register → login → `/api/auth/me` → profile update → change password.

### User preferences + sessions (Phase 4.3) — completed

- Implemented:
  - `PUT /api/auth/preferences`
  - `GET /api/auth/sessions`
  - `DELETE /api/auth/sessions/:sessionId`
  - `GET /api/auth/me` now includes `preferences` and `activeSessionsCount`
- Added Zod request validation + middleware:
  - `validateParams()` for `:sessionId`
  - `updatePreferencesSchema`, `sessionIdSchema`
- Added backend persistence:
  - `UserPreferences` model + `updateSection()` method
  - `UserSessions` model + `endSession()` method
- Smoke-tested against Mongo (curl):
  - register → login → update preferences → verify `/api/auth/me`
  - verify `/api/auth/sessions` is empty initially
  - insert an active session in Mongo → verify DELETE succeeds

### Profile / preferences deepening — completed

- Implemented nested preference updates:
  - `PUT /api/auth/preferences` now supports `{ section, subsection, updates }`
  - Example: `notifications.email.taskAssigned`
- Implemented v2-like user/session security wiring:
  - `GET /api/auth/me` now includes `security` (activeSessions, emailVerified, twoFactorEnabled, lastLogin, hasOAuthProviders)
  - `GET /api/auth/sessions` returns active sessions with `isCurrent` computed from `x-device-id`
  - `POST /api/auth/register` + `POST /api/auth/login` create an active session (using optional `deviceId/deviceInfo`)
- Smoke-tested against Mongo (curl):
  - nested preference update persisted
  - `/api/auth/me.security.activeSessions` present
  - `/api/auth/sessions[0].isCurrent=true`
  - `DELETE /api/auth/sessions/:sessionId` ends the session (sessions count becomes `0`)

### OAuth + 2FA + password reset — completed

- Implemented OAuth routes:
  - `GET /api/auth/google`
  - `GET /api/auth/google/callback`
  - `GET /api/auth/github`
  - `GET /api/auth/github/callback`
- Added full 2FA lifecycle under `/api/2fa`:
  - `POST /enable`
  - `POST /verify-setup`
  - `POST /verify`
  - `POST /disable`
  - `POST /backup-codes`
  - `GET /status`
  - `POST /recovery-token`
- Added login gating + completion:
  - `POST /api/auth/login` now returns `requires2FA` when enabled
  - `POST /api/auth/login/2fa-complete` issues JWT after TOTP/backup-code verification
- Added password reset token flow:
  - `POST /api/auth/password-reset/request`
  - `PUT /api/auth/password-reset/confirm`
- Added supporting backend infrastructure:
  - passport bootstrap/config for Google + GitHub
  - SMTP email sender service
  - `User` 2FA + reset token fields
  - `UserSessions.activateSession()` helper
- Smoke-tested:
  - OAuth routes return redirects
  - 2FA enable → verify-setup → gated login → complete login
  - password reset request + confirm succeeds
  - old password rejects, new password login returns `requires2FA`

### Workspace → Invitation → Space → Board → Task — completed

- Membership middleware: `requireWorkspaceMember/Admin`, `requireSpaceMember/Admin`, `requireBoardMember`
- Models deepened with archive fields; added `Invitation` model; Task comments/watchers/dependencies
- Mounted:
  - `/api/workspaces` — CRUD, archive/restore/permanent, members, invite, invite-link, accept-invitation
  - `/api/invitations` — create, list, pending, token/id accept/decline/cancel, bulk-invite, stats
  - `/api/spaces` — list by workspace, CRUD, members, archive/permanent
  - `/api/boards` — list by space, CRUD/archive, default columns (To Do / In Progress / Done), column CRUD + reorder
  - `/api/tasks` — list/create/update/move/delete/bulk, duplicate, comments, watchers, dependencies
- Smoke-tested (curl):
  - register/login → workspace → invite/accept → bulk-invite (2 pending) → space → board (3 default columns) → task → move → archive/restore → permanent delete
  - `tsc --noEmit` for `@taskflow/backend` passes

### Analytics (basic) — completed

- Mounted `/api/analytics` (no Power BI embedding)
- Endpoints:
  - `GET /api/analytics/space/:spaceId`
  - `GET /api/analytics/workspace/:workspaceId`
  - `GET /api/analytics/space/:spaceId/team-performance`
  - `POST /api/analytics/space/:spaceId/generate`
  - `GET /api/analytics/space/:spaceId/export?format=json|csv`
  - `GET /api/analytics/user`
- Chart-ready datasets:
  - `timeInsights.peakHours`, `timeInsights.dailyActivity`, `timeInsights.weeklyTrends`
  - `taskMetrics.priorityDistribution` (`critical` mapped to `urgent`)

### Files / uploads — completed

- Mounted `/api/files`:
  - `POST /api/files/upload/avatar`
  - `POST /api/files/upload/task-attachments`
  - `POST /api/files/upload/comment-attachment`
  - `POST /api/files/upload/logo`
  - `POST /api/files/upload/board-background`
  - `POST /api/files/upload/general`
  - `GET /api/files`
  - `GET /api/files/:id`
  - `GET /api/files/:id/download`
  - `DELETE /api/files/:id`
- Uploads support optional attachment linking to `Task.attachments` and `Task.comments[].attachments` when `taskId` / `commentId` are provided.

### Notifications + reminders — completed

- Mounted `/api/notifications`:
  - `GET /api/notifications`
  - `GET /api/notifications/stats`
  - `PATCH /api/notifications/:id/read`
  - `POST /api/notifications/mark-all-read`
  - `PATCH /api/notifications/bulk-read`
  - `POST /api/notifications/clear-read`
  - `DELETE /api/notifications/clear-all`
  - `DELETE /api/notifications/clear-workspace`
  - `DELETE /api/notifications/:id`
- Mounted `/api/reminders`:
  - `GET /api/reminders`
  - `GET /api/reminders/:id`
  - `POST /api/reminders`
  - `PUT /api/reminders/:id`
  - `DELETE /api/reminders/:id`
  - `PATCH /api/reminders/:id/snooze`
  - `GET /api/reminders/stats`
  - `POST /api/reminders/process-due`

### Templates — completed

- Mounted `/api/templates`:
  - `GET /api/templates`
  - `GET /api/templates/:id`
  - `POST /api/templates`
  - `PATCH /api/templates/:id`
  - `PUT /api/templates/:id`
  - `DELETE /api/templates/:id`
  - `POST /api/templates/:id/views`
  - `POST /api/templates/:id/like`
- Like/unlike creates Notifications to the template owner.

### Chat — completed

- Mounted `/api/chat`:
  - `POST /api/chat/widget/start`
  - `POST /api/chat/widget/:chatId/messages`
  - `GET /api/chat/widget/:chatId/history`
  - `GET /api/chat/admin/active`
  - `GET /api/chat/admin/stats`
  - `GET /api/chat/admin/search`
  - `GET /api/chat/admin/:chatId`
  - `POST /api/chat/admin/:chatId/accept`
  - `POST /api/chat/admin/:chatId/messages`
  - `PATCH /api/chat/admin/:chatId/status`
  - `POST /api/chat/admin/:chatId/close`
  - `POST /api/chat/admin/:chatId/read`
- Added Socket.IO `/chat` namespace parity for room join/leave, typing, read receipts, participant lookup, and status updates.
- Widget flow supports hybrid identity: authenticated users when a JWT is present, otherwise anonymous temporary participants.
- Added Socket.IO `/board` namespace for board join/leave, column CRUD/reorder, task create/update/move/delete, comments, bulk updates, typing, and presence.
- Added Socket.IO `/notifications` namespace for unread counts, recent fetch, type subscribe/unsubscribe, delivery acks, and server-side `sendNotification` helpers.
- Added Socket.IO `/workspace` namespace for join/leave (underscore + colon event names), member/role updates, settings broadcast, limits checks, and `notifyWorkspace` / `notifyWorkspaceAdmins` helpers.
- Added Socket.IO `/system` namespace for health/metrics, config updates, maintenance mode, backup/restart jobs, monitoring subscribe, and `broadcastSystemStatus` / `setMaintenanceMode` helpers.
- Added Socket.IO `/ai` namespace for board generation, auto-complete, smart suggestions, templates, additional tasks, improvements, content moderation, board rooms, and notify helpers (with deterministic fallbacks).
- Added permission socket helpers across `/notifications`, `/board`, `/workspace`, and `/chat` for access-checked `join-workspace` / `join-space` / `join-board` rooms plus `emitToWorkspace` / `emitToSpace` / `emitToBoard` / `emitToUser`.

### Admin management — completed

- Mounted `/api/admin-management`:
  - `POST /api/admin-management/create`
  - `GET /api/admin-management`
  - `GET /api/admin-management/stats`
  - `GET /api/admin-management/:adminId`
  - `PUT /api/admin-management/:adminId`
  - `DELETE /api/admin-management/:adminId`
  - `POST /api/admin-management/:adminId/change-password`
  - `PATCH /api/admin-management/:adminId/status`
- Mounted `/api/admin` user-management parity endpoints:
  - `GET /api/admin/users`
  - `GET /api/admin/users/app-users`
  - `GET /api/admin/users/roles`
  - `POST /api/admin/users`
  - `POST /api/admin/users/add-user-with-email`
  - `POST /api/admin/users/add-admin-user`
  - `GET /api/admin/users/:userId`
  - `PUT /api/admin/users/:userId`
  - `PATCH /api/admin/users/:userId/activate`
  - `PATCH /api/admin/users/:userId/deactivate`
  - `PATCH /api/admin/users/:userId/reset-password`
  - `PATCH /api/admin/users/:userId/change-role`
- User system roles are now stored directly on the `User` model and propagated through JWTs.

### Integrations / GitHub — completed

- Mounted `/api/github`:
  - `POST /api/github/link`
  - `GET /api/github/status`
  - `POST /api/github/sync`
  - `DELETE /api/github/unlink`
  - `POST /api/github/force-reauth`
  - `GET /api/github/orgs`
  - `GET /api/github/orgs/:org/repos`
  - `GET /api/github/orgs/:org/members`
  - `GET /api/github/orgs/:org/members/emails`
  - `GET /api/github/repos/:org/:repo/branches`
- Mounted `/api/integrations`:
  - `GET /api/integrations`
  - `GET /api/integrations/stats`
  - `GET /api/integrations/:id`
  - `POST /api/integrations`
  - `PUT /api/integrations/:id`
  - `DELETE /api/integrations/:id`
  - `POST /api/integrations/:id/test`
  - `POST /api/integrations/:id/sync`
  - `GET /api/integrations/:id/health`
  - `PATCH /api/integrations/:id/toggle`
- GitHub link state now persists on `User`, while admin-managed generic integrations live in the `Integration` model.

### AI / AI tokens — completed

- Mounted `/api/ai`:
  - `POST /api/ai/suggestions`
  - `GET /api/ai/risks/space/:spaceId`
  - `GET /api/ai/risks/board/:boardId`
  - `POST /api/ai/parse`
  - `POST /api/ai/timeline/:spaceId`
  - `GET /api/ai/recommendations/:spaceId`
  - `GET /api/ai/performance/:spaceId`
  - `POST /api/ai/description`
- Mounted `/api/admin/ai-tokens` on top of AI-shaped `Integration` records (list/active/create/update/activate/archive/delete/test/stats).
- Multi-provider runtime: OpenAI, Google, Anthropic, Azure with env fallback and deterministic degraded-mode responses.

### Stripe / quotas — completed

- Mounted `/api/checkout`:
  - `POST /api/checkout/create-checkout-session`
  - `POST /api/checkout/send-payment-notification`
- Mounted `POST /api/users/update-plan`
- `User.subscription` subdocument persists plan/status/billingCycle/session metadata.
- Mounted `/api/admin/quotas`:
  - `GET /api/admin/quotas`
  - `GET /api/admin/quotas/stats`
  - `GET /api/admin/quotas/:id`
  - `POST /api/admin/quotas`
  - `PUT /api/admin/quotas/:id`
  - `POST /api/admin/quotas/:id/override`
  - `DELETE /api/admin/quotas/:id/override`
  - `POST /api/admin/quotas/:id/reset`
  - `DELETE /api/admin/quotas/:id`
- Plan activation seeds default monthly quotas for the user.

### Admin auth / analytics / health / templates — completed

- Public admin auth:
  - `POST /api/admin/auth/login`
  - `POST /api/admin/auth/login/2fa-complete`
  - `POST /api/admin/auth/setup-first-admin`
- Protected admin auth/profile:
  - `POST /api/admin/auth/logout`
  - `GET /api/admin/auth/me`
  - `POST /api/admin/auth/change-password`
  - `PUT /api/admin/auth/profile`
  - `POST /api/admin/auth/avatar`
- Admin 2FA under `/api/admin/2fa/*`
- `GET /api/admin/analytics`, `GET /api/admin/analytics/export`
- `GET /api/admin/system/health`
- Admin templates under `/api/admin/templates/*`

### Remaining for Phase 4

1. Power BI

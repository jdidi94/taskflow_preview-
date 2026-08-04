# Phase 5 — Main app rebuild

**Status:** Complete for main product surfaces (GitHub deep sync still deferred)

**Feature catalog + design enhancements:** [PHASE-05-ADDED-FEATURES.md](./PHASE-05-ADDED-FEATURES.md)

## Goal

User product on Vite + React 19 + Tailwind 4 + React Router 7 — functional verticals **plus** v2-parity page UI and motion (local `components/{domain}/` + en/fr/ar).

## Steps

1. Tailwind 4 + theme tokens — **done**
2. Router, store, theme provider, auth gate — **done**
3. Screens: landing/auth → dashboard → workspace → space → board → notifications → chat → settings → invites → AI → billing — **done** (scaffold)
4. RTK + RTK Query for server data — **done**
5. Typed socket hooks — **done**
6. **UI polish / v2 port** — **done**
7. **Deferred product surfaces** — **done** (except GitHub deep sync):
   1. Sidebars (`AppSidebar` + mobile toggle in `AppLayout`) — **done**
   2. Templates (`/templates` + `templatesApi`) — **done**
   3. Analytics (`/analytics` + `analyticsApi` user range) — **done**
   4. List / timeline board views (`BoardViewSwitcher`, `ListView`, `TimelineView`) — **done**
   5. Chat FAB (`ChatFab` on authenticated shell) — **done**
   6. OAuth Google/GitHub (`OAuthButtons` + `/auth/callback`) — **done**
   7. Workspace rules (backend GET/PUT + `WorkspaceRulesPanel`) — **done**
8. Still deferred: GitHub deep sync (`/api/github` product linking)

## Architecture (locked — avoid refactor)

- No dedicated stabilize-core refactor. Auth, notifications, and i18n stay frozen; fat board/dashboard pages extract **only when that screen gains a feature**.
- `AppLayout`: header + **section sidebar** + breadcrumbs; board stays content-first.
- URL model: `/workspaces/:id`, `/spaces/:id`, `/boards/:id` (not v2 Redux-current*).
- Data: RTKQ + typed socket hooks (not v2 thunk megastore).
- Every new vertical / polish slice: local `components/{domain}/` + en/fr/ar `t()` + RTKQ (+ socket if needed) + exit smoke before next slice.
- Port from v2 (`TaskFlow-AI-Smart-Team-TaskManager/apps/main`) into local components; compose `@taskflow/ui` / `@taskflow/theme` inside those wrappers. Prefer logical CSS for RTL.

## Frozen slices (do not re-refactor)

- Auth: `components/auth/`, `RequireAuth`, `authApi`, `authSlice` (additive OAuth/reset only)
- Notifications: `components/notifications/`, `notificationsApi`, `useNotificationSocket`
- i18n: provider + LanguageSwitcher (only **add** message keys)

## Vertical order (roadmap)

1. Chat — **done**
2. Settings — **done**
3. Invites — **done**
4. AI — **done**
5. Billing — **done**
6. UI polish — **done**
7. Deferred surfaces — **done** (GitHub deep sync remains)

## Exit checks

### Functional (shipped)

- [x] Login → dashboard → board works
- [x] Create/update/move task persists + sockets
- [x] Notifications list / mark-read / delete + unread badge / socket count
- [x] Chat: start thread → send → history (+ `/chat` socket join)
- [x] Settings: profile update persists
- [x] Invites: pending list API + workspace invite form + `/invite/:token` landing
- [x] AI: `generate_board` socket → preview → create board path
- [x] Billing: checkout session URL returned (Stripe) + success/cancel pages
- [x] Production `vite build` succeeds
- [x] No mobile API references

### UI polish

- [x] Route enter/exit animation on authenticated pages
- [x] Dashboard / workspace / space / board local components
- [x] Landing + forgot/reset auth polish
- [x] Sidebars, templates, analytics, list/timeline, chat FAB, OAuth, workspace rules

## Completion notes

### Foundation / core / notifications — completed

(See prior notes: Tailwind, auth gate, workspace→board, notifications RTKQ+socket, i18n scaffold, auth local components.)

### Chat — completed

- `components/chat/` (`ChatPanel`, `ChatMessageItem`, `ChatFab`), `/chat` route.
- `chatApi` + `useChatSocket`. i18n `chat.*`.

### Settings / Invites / AI / Billing — completed

(See prior notes.)

### UI polish — completed

- Steps 6.1–6.6: page transitions, dashboard/workspace/space/board chrome, landing/auth polish.

### Deferred surfaces — completed

- Sidebar: `components/common/AppSidebar` in `AppLayout` (desktop + mobile).
- Templates: `templatesApi` + `TemplatesPanel` + `/templates`.
- Analytics: `analyticsApi` + `AnalyticsPanel` + `/analytics` (`GET /api/analytics/user`).
- Board views: kanban / list / timeline switcher.
- Chat FAB: floating widget reusing chat RTKQ + socket.
- OAuth: login/register buttons → `/api/auth/{google|github}`; `/auth/callback` stores token + `me`.
- Workspace rules: `Workspace.rules` + `GET|PUT /api/workspaces/:id/rules` + `WorkspaceRulesPanel`.

# Phase 5 — Added features (full catalog)

Companion to [PHASE-05-main-app.md](./PHASE-05-main-app.md).  
This document is the **product feature map** for `apps/main`: what shipped, where it lives, what is still thin, **design enhancements** (§4), and the **post–Phase-5 backlog** (§7).

**App:** Vite + React 19 + Tailwind 4 + React Router 7 + RTK Query  
**Locales:** en / fr / ar (RTL via `I18nProvider`)  
**UI:** local `components/{domain}/` composing `@taskflow/ui` + `@taskflow/theme`

---

## 1. Feature map (shipped)

### 1.1 Public / marketing & auth

| Feature | Route / entry | Components / APIs | Notes |
| --- | --- | --- | --- |
| Landing hero + features + footer | `/` | `LandingHero`, `LandingBoardMock`, `LandingFeatures`, `LandingFooter` | Full-bleed board mock plane; brand-first hero; Framer motion; RTL-aware scrim |
| Features | `/features` | `FeaturesContent`, `MarketingShell` | Public marketing |
| Pricing | `/pricing` | `PricingContent` | Monthly / yearly toggle; CTA → register |
| About | `/about` | `AboutContent` | Story + values |
| Contact | `/contact` | `ContactContent` | Client-side sent simulation (no mail API) |
| Login | `/login` | `LoginForm`, `AuthShell`, `authApi.login` / `completeLogin2FA` | Full 2FA challenge step after `requires2FA`; **lg+ split** brand panel + form |
| Register | `/register` | `RegisterForm` | |
| Forgot password | `/forgot-password` | `ForgotPasswordForm` | Email request |
| Reset password | `/reset-password` | `ResetPasswordForm` | Token + new password |
| OAuth Google / GitHub | Login & Register | `OAuthButtons` → `/api/auth/{google\|github}` | Press scale + primary focus ring |
| OAuth callback | `/auth/callback` | `OAuthCallbackPage` | Stores token → `me` → credentials |
| Invite accept / decline | `/invite/:token` | `InviteLandingPanel`, `invitationsApi` | Public token landing |
| Theme + language on auth | Auth chrome | `ThemeToggle`, `LanguageSwitcher` | |

### 1.2 App shell

| Feature | Where | Notes |
| --- | --- | --- |
| Auth gate | `RequireAuth` | Redirects unauthenticated users |
| Sticky header | `AppLayout` | Brand, mobile menu, **command palette** (⌘K), notifications bell, user, language, theme, logout; **soft hairline** (`border-border/40`, denser `h-14`) |
| Section sidebar | `AppSidebar` | Desktop sticky + mobile drawer; Home, Templates, Analytics, AI, Chat, Settings; context workspace/space links from URL; **active rail**; **desktop collapse** (`w-14` icon rail, `localStorage`) |
| Command palette | `CommandPalette` | ⌘K / Ctrl+K; nav + workspaces/spaces/boards via RTKQ |
| Breadcrumbs | `PageBreadcrumbs` | Used on feature pages |
| Page transitions | `AnimatedOutlet` / `PageTransition` | Framer enter/exit on authenticated routes |
| Chat FAB | `ChatFab` | Floating mini-chat on authenticated shell |
| Notification socket | `useNotificationSocket` | Live unread → header badge |

**Sidebar destinations:** `/dashboard`, `/templates`, `/analytics`, `/ai`, `/chat`, `/settings` (+ contextual `/workspaces/:id`, `/spaces/:id`).

### 1.3 Dashboard

| Feature | Components | API |
| --- | --- | --- |
| Welcome header | `WelcomeHeader` / `PageHero` | Title + one sentence + primary “New workspace” CTA |
| Stats strip | `DashboardStats` | Derived from workspaces list |
| Upcoming deadlines | `UpcomingDeadlinesWidget` | `GET /tasks/assigned` |
| Recent activity | `RecentActivityWidget` | `notificationsApi.listNotifications` |
| Workspace list + create | `WorkspacesSection`, `CreateWorkspaceModal` | `workspacesApi` (+ archive) |
| Archived section | `ArchivedWorkspacesWidget` | `workspacesApi.restoreWorkspace` |

### 1.4 Workspace

| Feature | Components | API |
| --- | --- | --- |
| Header + create space | `WorkspaceHeader` / `PageHero`, `CreateSpaceModal` | Title + sentence + New space CTA |
| Spaces list | `SpacesSection` | `spacesApi.listByWorkspace` |
| Members list | `MembersSection` | `workspacesApi.listWorkspaceMembers` |
| Owner hint | `OwnerHintBanner` | Soft UX when single owner |
| Invite by email | `WorkspaceInviteForm` | `invitationsApi` |
| Pending invites | `PendingInvitesList` | `invitationsApi` |
| Workspace rules | `WorkspaceRulesPanel` | `GET\|PUT /api/workspaces/:id/rules` |
| GitHub sync | `WorkspaceGitHubPanel` | `/api/github` link/status/sync/orgs/repos + `githubOrg` on workspace |

### 1.5 Space

| Feature | Components | API |
| --- | --- | --- |
| Header | `SpaceHeader` / `PageHero` | Title + sentence + New board CTA |
| Stats | `SpaceStats` | Board counts |
| Boards list + create | `BoardsSection`, `CreateBoardModal` | `boardsApi` |

### 1.6 Board (core product)

| Feature | Components | API / realtime |
| --- | --- | --- |
| Board header | `BoardHeader` | Title, column actions |
| View switcher | `BoardViewSwitcher` | `kanban` \| `list` \| `calendar` \| `timeline` |
| View transition | `ViewTransition` | CSS remount fade |
| Kanban + DnD | `KanbanBoard`, `KanbanColumn`, `TaskCard` | `@dnd-kit`; `tasksApi.moveTask` |
| List view | `ListView` | Flat per-column |
| Calendar view | `CalendarView` | Month grid by `dueDate`; create-on-day; undated section |
| Timeline view | `TimelineView` | Groups by `dueDate` (read-only dates today) |
| Task create / edit / delete | `TaskDetailModal` | Title, description, priority only |
| Column create / edit / delete | `AddColumnModal`, `DeleteColumnModal` | `boardsApi` columns |
| Live board sync | `useBoardSocket` | Join room + cache invalidate |

### 1.7 Notifications

| Feature | Components | API / realtime |
| --- | --- | --- |
| Full page | `/notifications` | Filters, mark-read, delete, empty states |
| Header bell | `NotificationNavLink` | Unread badge |
| Live updates | `useNotificationSocket` | |

### 1.8 Chat

| Feature | Components | API / realtime |
| --- | --- | --- |
| Full chat page | `/chat` → `ChatPanel` | `chatApi` + `useChatSocket` |
| Message bubbles | `ChatMessageItem` | Self vs other |
| Floating FAB | `ChatFab` | Same APIs, overlay UX |

### 1.9 Settings & billing

| Feature | Components | API |
| --- | --- | --- |
| Profile name | `SettingsPanel` | `authApi.updateProfile` |
| Notification preferences | `SettingsPanel` | `authApi.updatePreferences` |
| Two-factor auth | `TwoFactorSettings` | `authApi` → `/api/2fa` status / enable / verify-setup / disable |
| Active sessions | `SessionsSettings` | `authApi.getSessions` / `endSession` |
| Change password | `ChangePasswordSettings` | `authApi.changePassword` |
| Upgrade CTA | `/settings/upgrade` | `BillingUpgradePanel` → Stripe session |
| Checkout result | `/success`, `/cancel` | `BillingResultCard` |

### 1.10 AI

| Feature | Components | Transport |
| --- | --- | --- |
| Assistant chat | `/ai` → `AiAssistantChat` | Socket `assistant_chat` → reply + intents (templates / suggestions / board gen) |
| Board generator | `/ai` → `AiBoardGenerator` | AI socket `generate_board` → preview → create board/columns/tasks |
| Mode tabs | `AiModeTabs` | Assistant (default) \| Board generator |

### 1.11 Templates & analytics

| Feature | Route | Components / API | Depth today |
| --- | --- | --- | --- |
| Templates browse + apply + like | `/templates` | `TemplatesPanel`, `ApplyTemplateModal`, `templatesApi` | Like toggle; board/space instantiate via create APIs + columns |
| User analytics | `/analytics` | `AnalyticsPanel`, `analyticsApi` | `GET /api/analytics/user` |
| Workspace analytics + export | Workspace page | `WorkspaceAnalyticsPanel` | `GET /analytics/workspace/:id` + client CSV/JSON |
| Space analytics + export | Space page | `SpaceAnalyticsPanel` | `GET /analytics/space/:id` (+ team-performance); CSV via `/export` |

### 1.12 i18n coverage

Namespaces: `common`, `auth`, `landing`, `marketing`, `nav`, `command`, `dashboard`, `workspace`, `space`, `board`, `notifications`, `chat`, `settings`, `invites`, `ai`, `billing`, `templates`, `analytics`, `oauth`, `github`, `rules`.

All user-facing copy goes through `useI18n().t()` (en / fr / ar). Prefer logical CSS (`ps`/`pe`/`ms`/`me`/`start`/`end`) for RTL.

---

## 2. Technical inventory

### Routes (`AppRoutes.tsx`)

```
Public:  /  /login  /register  /forgot-password  /reset-password  /auth/callback  /invite/:token
App:     /dashboard  /templates  /analytics
         /workspaces/:workspaceId  /spaces/:spaceId  /boards/:boardId
         /notifications  /chat  /settings  /settings/upgrade  /ai  /success  /cancel
```

### Services (`src/services/`)

| Service | Responsibility |
| --- | --- |
| `apiBase` | Shared RTKQ baseQuery + auth header |
| `authApi` | Register, login, logout, me, profile, prefs, password reset |
| `workspacesApi` | List/get/create, members, rules |
| `spacesApi` | List by workspace, get, create |
| `boardsApi` | List by space, get, create, column CRUD |
| `tasksApi` | List by board, create, update, move, delete |
| `notificationsApi` | List, stats, mark-read, delete, clear |
| `chatApi` | Start, history, send (+ local chat id helpers) |
| `invitationsApi` | Pending, token, create, accept/decline |
| `checkoutApi` | Stripe checkout session |
| `templatesApi` | List / get / like; apply via boards/spaces create |
| `analyticsApi` | User + workspace/space analytics, team performance |
| `githubApi` | Account link/status/sync/orgs/repos |

### Realtime hooks

| Hook | Domain |
| --- | --- |
| `useBoardSocket` | Board room sync |
| `useChatSocket` | Live messages |
| `useNotificationSocket` | Unread + push list |

### Component domains

`ai/`, `analytics/`, `auth/`, `billing/`, `board/`, `chat/`, `common/`, `dashboard/`, `invites/`, `notifications/`, `settings/`, `space/`, `templates/`, `workspace/`

---

## 3. Remaining product gaps (parity backlog)

These are **not** Phase 6/7; they are main-app depth still missing vs v2 / backend.

### P0 — task & collaboration depth

- [x] Rich task detail: assignees, due date(s), tags, checklist, task color (`TaskDetailDrawer`)
- [x] Comments thread (CRUD) on tasks
- [x] File attachments (`filesApi` + `/api/files/upload/task-attachments`)
- [x] Due-date editors so timeline is useful end-to-end
- [x] Task cards show priority rail, due chip, tags, assignee avatars, checklist progress

### P1 — hierarchy admin

- [x] Archive / restore workspace, space, board (actions + archived sections; space/board restore APIs added)
- [x] Member role change + remove (workspace MembersSection; owner protected)
- [x] Workspace settings suite (general, permissions/invite link + rules, danger zone)
- [x] Space settings (edit meta, members add/remove, danger zone)
- [x] Board update / archive UI; column reorder API wiring

### P2 — trust & account

- [x] 2FA complete login + enable/disable in settings
- [x] Sessions list / revoke
- [x] Change password UI

### P3 — insights & content

- [x] Workspace / space analytics + export (beyond user summary)
- [x] Templates: apply / instantiate / like
- [x] Dashboard widgets: upcoming deadlines, recent activity, archived section

### Explicitly deferred

- [x] GitHub product sync (`/api/github`) — workspace settings connect / sync / org link / repos
- [ ] Power BI (PHASE-04)
- [x] Marketing static pages (`/features`, `/pricing`, `/about`, `/contact`)
- [x] Full AI assistant chat (beyond board generator)
- [x] Calendar board view
- [ ] Admin app → Phase 6

---

## 4. Design enhancement suggestions

Keep the existing kit (`@taskflow/ui` / `@taskflow/theme`). Enhance **composition, hierarchy, and motion** — do not invent a parallel design system.

### 4.1 Global shell

| Idea | Why | How (lightweight) |
| --- | --- | --- |
| **Sidebar active rail** | Nav feels flat | Accent bar + stronger `bg-muted` on active item; icons `text-primary` — **shipped** in `AppSidebar` |
| **Collapse sidebar on desktop** | Board needs canvas | Icon-only rail (`w-14`) with tooltips; persist preference — **shipped** in `AppSidebar` |
| **Command palette** (`⌘K`) | Power users jump workspaces/boards | Overlay search over existing RTKQ lists — **shipped** (`CommandPalette`) |
| **Softer header separation** | Blur header + sidebar compete | One hairline + density tokens; reduce competing borders — **shipped** (`AppLayout` + `AppSidebar`) |
| **Empty states with illustration plane** | Lists look unfinished | One gradient wash + single CTA (reuse landing motion language) — **shipped** (`EmptyState`) |

### 4.2 Landing & auth

| Idea | Why |
| --- | --- |
| Product screenshot / board mock as **full-bleed** hero plane | Brand test: first viewport must feel like TaskFlow, not a generic SaaS form — **shipped** (`LandingBoardMock` + brand-first `LandingHero`) |
| Auth split layout on `lg+` (brand panel + form) | Reduces “centered card on void” feel without new components — **shipped** in `AuthShell` |
| Micro-motion on OAuth buttons (press / focus ring) | Makes OAuth feel first-class next to email — **shipped** in `OAuthButtons` |

### 4.3 Dashboard → workspace → space

| Idea | Why |
| --- | --- |
| **One hero per page** (title + one sentence + primary CTA) | Avoid dashboard clutter; match “one job per section” — **shipped** (`PageHero` on dashboard / workspace / space) |
| Workspace/space cards as **interaction surfaces**, not heavy chrome | Drop unnecessary card borders when the row itself is clickable |
| Archive as muted row + swipe/menu actions | Badges alone don’t communicate affordance — **shipped** (`ArchivedEntityRow` + `EntityActionMenu`) |
| Members as avatar stack + overflow `+N` | Dense, scannable; role chip on hover/focus — **shipped** (`AvatarStack` on workspace/space members + task assignees) |

### 4.4 Board (highest visual ROI)

| Idea | Why |
| --- | --- |
| **Task detail as side drawer** (desktop) / full sheet (mobile) | Modal blocks kanban context; drawer keeps board visible — **shipped** (`TaskDetailDrawer`: end slide on `md+`, bottom full sheet + handle on mobile) |
| Priority as **color rail** on cards (not only text) | Faster scan; theme tokens (`PriorityRail` + tinted badge on kanban / list / timeline) — **shipped** |
| Assignee avatars + due chip on `TaskCard` | Cards currently under-communicate state — **shipped** (`AvatarStack` + semantic `DueChip`: overdue / today / tomorrow) |
| Column WIP meter (thin progress) | Backend already has WIP concepts — **shipped** (`ColumnWipMeter` on `KanbanColumn`; near/over theme colors) |
| List/timeline polish: sticky column headers, denser rows | Views feel like prototypes vs kanban — **shipped** (`BoardDenseTaskRow`; sticky `top-14` headers + compact rows) |
| Timeline → true swim/date axis later | Current “sorted list” is fine MVP; label it clearly — **shipped** (column swim lanes + horizontal due-date axis; undated list below) |
| View switcher as segmented control with spring | Matches existing Framer language — **shipped** (`BoardViewSwitcher` layoutId spring pill; RTL arrow keys) |

### 4.5 Chat & FAB

| Idea | Why |
| --- | --- |
| FAB unread pulse (subtle scale, not glow spam) | Draws attention without neon — **shipped** (`ChatFab` scale 1→1.06 loop + count badge; socket while closed) |
| Panel: composer sticky, message list virtualized later | Long threads — **shipped** sticky composer (`ChatComposer` + scrollable `ChatMessageList` on page/FAB); virtualization deferred |
| Presence dots when socket supports it | Social proof of live collab — **shipped** (`board:presence` roster + `BoardPresenceDots` on board header) |

### 4.6 Analytics & templates

| Idea | Why |
| --- | --- |
| Heatmap as real calendar grid (CSS grid + theme tokens) | Current list of numbers under-sells the API — **shipped** (`ActivityHeatmapGrid` on user + scope analytics) |
| Completion rate as radial or bar using theme primary | One clear focal chart — **shipped** (`CompletionRateChart`: primary ring + bar on user/scope analytics) |
| Template cards: cover gradient from category + “Use template” CTA | Browse-only feels dead-end — **shipped** (`TemplateCard` category cover + primary apply CTA) |

### 4.7 Motion principles (already started — extend)

Ship intentional motion, not decoration:

1. Route enter/exit — **keep** (`PageTransition` + `prefers-reduced-motion`)
2. Landing hero/features — **keep**
3. Board view switch, sidebar open/close, task drawer enter, FAB panel — **shipped** (`lib/motion` springs; sidebar width + active rail; mobile nav; FAB panel; board `ViewTransition`)
4. Avoid: glow stacks, purple-default SaaS look, emoji ornament, card-in-card

Shared tokens: `apps/main/src/lib/motion.ts` (`softSpring`, `snappySpring`, panel/fade variants).

### 4.8 Accessibility & RTL — **shipped**

- Focus rings on interactive nav/FAB/drawer controls (`focusRing` + `.tf-btn` / `.tf-input` `:focus-visible`)
- `aria-current="page"` on sidebar active route (React Router `NavLink`)
- Logical CSS / RTL: drawer slides from `end`, avatar tooltips use `start-1/2`, board DnD keyboard sensor
- `prefers-reduced-motion` for Framer variants (`EmptyState`, `PageHero`, drawer, shell motion tokens)
- Task detail drawer: initial focus on close + restore on dismiss

### 4.9 Design sprint order — **complete**

Phase-5 visual enhancements in §4.1–4.8 are largely shipped. Next product work lives in **§7**.

Historical order (done): task cards/drawer → sidebar → analytics/templates → dashboard hero → auth split.

---

## 5. Architecture reminders (do not regress)

- Local components under `apps/main/src/components/{domain}/` — pages stay thin
- Port from v2 when a screen already existed; compose `@taskflow/ui` inside wrappers
- Every new string: `t()` in en / fr / ar
- Frozen slices: auth gate core, notifications stack, i18n provider (additive only)
- URL model stays `/workspaces/:id`, `/spaces/:id`, `/boards/:id`

---

## 6. Quick “where is X?”

| Looking for… | Go to |
| --- | --- |
| Routes | `apps/main/src/routes/AppRoutes.tsx` |
| Shell | `apps/main/src/layouts/AppLayout.tsx` |
| Sidebar | `apps/main/src/components/common/AppSidebar.tsx` |
| Empty state | `apps/main/src/components/common/EmptyState.tsx` |
| Page hero | `apps/main/src/components/common/PageHero.tsx` |
| Page subnav | `apps/main/src/components/common/PageSubnav.tsx` + `hooks/usePageTab.ts` |
| Entity overview card | `apps/main/src/components/common/EntityOverviewCard.tsx` |
| Pagination bar | `apps/main/src/components/common/PaginationBar.tsx` + `hooks/useClientPagination.ts` |
| Board views | `apps/main/src/components/board/` |
| Chat FAB | `apps/main/src/components/chat/ChatFab.tsx` |
| Drive / multi-source files | `DriveAttachModal`, `filesApi`, backend `file.controller` + `googleDrive.service` |
| Place-aware AI agent | `AiPlaceAgentPanel`, board “Ask agent”, socket `assistant_chat` + `agent_confirm_tools`, `aiContext` / `aiAgentTools` services |
| Socket.IO namespaces | Backend `apps/backend/src/sockets/` (`/board` `/notifications` `/chat` `/ai` …); client `lib/socket.ts`; REST→`emitBoardEvent` via `emitHelpers.ts` |
| Socket logs (dev) | `/dev/sockets` · `SocketLogsPanel` · Settings / ⌘K (DEV only) |
| Role-aware notifications | `notification.service` — invites, accept/decline, role change, task assign / due date / move / watcher |
| Notification preview panel | Bell dropdown (`NotificationNavLink`) → card navigates via `notificationHref`; **See all** → `/notifications` |
| Workspace realtime | REST→`notifyWorkspace` for workspace/space/board lifecycle; client `useWorkspaceSocket` |
| OAuth | `apps/main/src/components/auth/OAuthButtons.tsx` |
| Rules | `apps/main/src/components/workspace/WorkspaceRulesPanel.tsx` |
| Store registration | `apps/main/src/store/index.ts` |
| Phase checklist | [PHASE-05-main-app.md](./PHASE-05-main-app.md) |
| Post–Phase-5 backlog | §7 below |

---

## 7. Next product features (post Phase-5 design)

Product backlog beyond the §4 design enhancements. Prefer shipping in the order in §7.6.

### 7.1 Horizontal page subnav + overview cards — **shipped**

- Pattern: sticky segmented control under `PageHero` (`PageSubnav`, same language as `BoardViewSwitcher`)
- **Home / dashboard:** Overview · Stats · Workspaces · Deadlines · Invitations · Activity (`?tab=`)
- **Workspace:** Overview · Spaces · Members · Invites · Rules · Integrations
- **Space:** Overview · Boards · Members · Settings
- Deep-link via `usePageTab` / `?tab=`; RTL arrow keys; `aria-current` on active segment
- **Overview cards:** `EntityOverviewCard` cover strip + meta + archive menu on workspace / space / board lists
- Components: `apps/main/src/components/common/PageSubnav.tsx`, `EntityOverviewCard.tsx`, `hooks/usePageTab.ts`

### 7.2 Modern pagination & list loading — **shipped**

- Shared `ListPagination` + `normalizeListPagination` / `paginateSlice` (`types/pagination.ts`)
- UI: `PaginationBar` (page numbers, prev/next, page-size, RTL icons, summary)
- **Server:** Notifications page uses `page`/`limit` + backend `pagination` meta; RTKQ list tags fixed
- **Client:** `useClientPagination` on workspaces, spaces, boards, members, pending invites, templates
- Feeds/widgets stay limit-capped (activity preview, deadlines); chat cursor deferred
- Backend page/limit for workspace/space/board directories still additive follow-up when lists grow large

### 7.3 Surface textures & richer entity cards

- Schema: `appearance` / `surfaceTheme` on workspace | space | board | column
  - `preset`: `glass` | `tile` | `paper` | `solid` | `photo` (extensible catalog)
  - optional `backgroundFileId` / image URL; **contrast scrim required** for readable text
- UI: texture picker in entity settings; column covers; reuse `File` category `board_background` where possible
- **Overview cards** for workspace / space / board: cover strip + avatar stack + counts + next due + one primary CTA
- Theme tokens only (`@taskflow/theme`); no parallel card kit

### 7.4 Multi-source files (Drive first) — **shipped**

- `File` model: `source: local | google_drive | url`, `externalId`, `externalUrl`, `providerMeta`
- Local uploads unchanged; external files store a **reference** (`path: external`)
- Backend: Drive OAuth link / status / list / attach + generic `POST /files/link` (URL)
- Download of external files redirects to `externalUrl`
- Frontend: task attachments — Upload + **From Drive / URL** (`DriveAttachModal`); `/auth/drive-link-callback`
- User field: `googleDrive` (encrypted access/refresh tokens, same pattern as GitHub)
- **Keys / config:**
  | Provider | Env / console |
  | --- | --- |
  | Google Drive | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` (default `http://localhost:5173/auth/drive-link-callback`); enable **Google Drive API**; add redirect URI on the OAuth client; scope `drive.readonly` |
  | Dropbox (later) | `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET` |
  | OneDrive (later) | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |

### 7.5 Place-aware AI agents & automations — **shipped (A+B)**

- **Context packer:** board / space / workspace snapshot into AI requests (token-capped) — `aiContext.service`
- **Tools** (permission-checked; **user confirm** for writes): create / move / update task, comment, summarize — `aiAgentTools.service` + `agent_confirm_tools`
- Surfaces: AI panel titled by place (e.g. “Board · Marketing Q3”) — `AiPlaceAgentPanel`; board “Ask agent”; runs logged as `ai_agent` notifications (activity trail)
- Providers: existing Gemini / OpenAI / Anthropic / Azure (`DEFAULT_AI_PROVIDER` + AI token quotas) — no new vendor required for v1
- Rollout:
  - **A** — read-only summarize + draft copy — **shipped**
  - **B** — confirmed tool writes (boards) — **shipped**
  - **C** — trigger automations (workspace rules 2.0) — **deferred** (rules text is included in context; structured automations later)
- Own touch: place-aware chrome + visible automation audit trail (trust)

### 7.6 Suggested sprint order

1. Horizontal subnav + overview cards — **shipped**  
2. Shared pagination (API + UI) — **shipped**  
3. Surface textures (curated presets first; photo covers next)  
4. Google Drive file source (schema + picker + attach) — **shipped**  
5. Board agent — read-only, then confirm-write tools — **shipped (A+B)**  
6. Task / workspace automations (rules 2.0 / §7.5 C)  

---

*Last updated: §7.1–7.2 + §7.4–7.5 A+B shipped; board REST→socket emit + Socket Logs page.*

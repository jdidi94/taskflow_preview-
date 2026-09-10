# TaskFlow AI

**Preview repository** for recruiters and collaborators. This is a demonstration snapshot of TaskFlow AI — an AI-assisted team task manager with workspaces, boards, realtime collaboration, and an admin console.

> Contact: [jdididdaoud1994@gmail.com](mailto:jdididdaoud1994@gmail.com)

---

## Vision

TaskFlow AI helps product and engineering teams plan work, collaborate in real time, and use AI where it actually helps: drafting boards, summarizing context, and assisting inside spaces — without replacing human judgment.

The product ships as:

- **Main app** — workspaces, spaces, kanban/list/calendar/timeline boards, chat, notifications, templates, billing hooks, GitHub-aware workspace views
- **Admin panel** — users/staff, templates, AI quotas, analytics, system health, audit activity
- **Backend API** — Express + MongoDB + Socket.IO, AI provider integrations, auth for users and admins

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Apps | React 19, Vite, React Router 7, Redux Toolkit / RTK Query, Tailwind 4 |
| UI | Shared `@taskflow/ui` + `@taskflow/theme` (en / fr / ar, RTL) |
| API | Node.js 22+, Express, Mongoose, Socket.IO |
| AI | Provider-resolved clients (e.g. Google / Groq) with quotas |
| Tooling | npm workspaces, Turbo, TypeScript, Vitest |

---

## Quick start (local preview)

**Requirements:** Node.js `>= 22`, npm `>= 10`, MongoDB `>= 6` (local or Atlas).

```bash
git clone https://github.com/jdidi94/taskflow_preview-.git
cd taskflow_preview-
npm install

cp apps/backend/.env.example apps/backend/.env
cp apps/main/.env.example apps/main/.env
cp apps/admin/.env.example apps/admin/.env
```

Edit `apps/backend/.env` and set at least:

- `DATABASE_URL` — MongoDB connection string
- `JWT_SECRET` / `ENCRYPTION_KEY` — long random strings (not the placeholders)

Seed demo data (refuses to run when `NODE_ENV=production`):

```bash
npm run seed:reset
```

Start the API + main app + admin together:

```bash
npm run dev:web
```

| Surface | URL |
| --- | --- |
| Main app | http://localhost:5173 |
| Admin panel | http://localhost:5175 |
| API health | http://localhost:3001/api/health |

### Demo logins

All seeded accounts use **`Password123!`**

| App | Email |
| --- | --- |
| Main | `jondoe@gmail.com` |
| Main | `janemaria@gmail.com` |
| Admin (super_admin) | `admin@taskflow.demo` |
| Admin | `jondoe@gmail.com` |

Templates in the seed are ready to apply (sprint, marketing, hiring, support, sales, ops, and a multi-board launch space).

---

## Preview notice

This repository is a **preview** for portfolio / recruiting conversations. Expect demo data resets, incomplete production hardening, and evolving APIs. For opportunities or questions about the build, email **jdididdaoud1994@gmail.com**.

---

## License / status

Private preview snapshot. Not an official production release.

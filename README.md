# TaskFlow AI

<p align="center">
  <img src="apps/main/public/logo-full.svg" alt="TaskFlow AI" width="140" height="140" />
</p>

<p align="center">
  <strong>AI-assisted team task management</strong><br />
  Workspaces · boards · realtime collaboration · admin console
</p>

<p align="center">
  <img src="apps/main/public/logo.svg" alt="TaskFlow mark" height="44" />
  &nbsp;&nbsp;&nbsp;
  <img src="apps/admin/public/logo-admin.svg" alt="TaskFlow Admin" height="44" />
</p>

<p align="center">
  <em>Portfolio / presentation preview</em><br />
  Contact: <a href="mailto:jdididdaoud1994@gmail.com">jdididdaoud1994@gmail.com</a>
</p>

---

## Vision

TaskFlow AI helps product and engineering teams plan work, collaborate in real time, and use AI where it helps most: drafting boards, summarizing context, and assisting inside spaces — without replacing human judgment.

---

## What you can explore

| Surface | Focus |
| --- | --- |
| **Main app** | Workspaces, spaces, kanban / list / calendar / timeline boards, chat, notifications, templates, GitHub-aware workspace views |
| **Admin panel** | Users & staff, templates, AI quotas, analytics, system health, audit activity |
| **API** | Auth, boards & tasks, Socket.IO realtime, file uploads, AI providers |

Ready-to-apply **templates** ship with the seed (sprint, marketing, hiring, support, sales, ops, and a multi-board launch space).

When the API or database is unavailable, both apps show a calm maintenance screen instead of a broken UI.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Apps | React 19, Vite, React Router 7, Redux Toolkit / RTK Query, Tailwind 4 |
| UI | Shared `@taskflow/ui` + `@taskflow/theme` · **en / fr / ar** with RTL |
| API | Node.js 22+, Express, Mongoose, Socket.IO |
| AI | Provider-resolved clients with quotas |
| Tooling | npm workspaces, Turbo, TypeScript |

---

## Local preview

**Requirements:** Node.js `>= 22`, npm `>= 10`, MongoDB `>= 6`.

```bash
git clone https://github.com/jdidi94/taskflow_preview-.git
cd taskflow_preview-
npm install

cp apps/backend/.env.example apps/backend/.env
cp apps/main/.env.example apps/main/.env
cp apps/admin/.env.example apps/admin/.env
```

Configure `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY` in the backend env, then:

```bash
npm run seed:reset   # demo data (blocked when NODE_ENV=production)
npm run dev:web      # API + main + admin
```

| Surface | URL |
| --- | --- |
| Main app | http://localhost:5173 |
| Admin panel | http://localhost:5175 |
| API health | http://localhost:3001/api/health |

---

## Preview note

This repository is a **portfolio presentation** — not a production deployment. Features and data may reset as the product evolves.

Interested in the project or hiring conversations? Reach out at **[jdididdaoud1994@gmail.com](mailto:jdididdaoud1994@gmail.com)**.

---

## Status

Presentation preview snapshot. Not an official production release.

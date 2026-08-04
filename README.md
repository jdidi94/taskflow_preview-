# TaskFlow AI v3

Clean rebuild of TaskFlow AI (**web only** — main + admin + backend). Mobile is out of scope.

- **Repo:** https://github.com/jdidi94/TaskFlow
- **v2 reference (read-only):** `/home/jdidi/TaskFlow-AI-Smart-Team-TaskManager`

## Sites & ports

| Site | URL | App |
| --- | --- | --- |
| API / health | http://localhost:3001 | `apps/backend` |
| Health check | http://localhost:3001/api/health | backend |
| Main (user app) | http://localhost:5173 | `apps/main` |
| Admin panel | http://localhost:5175 | `apps/admin` |

Shared packages: `@taskflow/theme`, `@taskflow/ui`, `@taskflow/utils`, `@taskflow/config`.

---

## Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | `>= 22` | See `.nvmrc` |
| npm | `>= 10` | Workspaces |
| MongoDB | `>= 6` (local or Atlas) | Needed from **Phase 3** onward |

---

## Get the websites running (local)

### 1. Clone and install

```bash
git clone https://github.com/jdidi94/TaskFlow.git
cd TaskFlow
npm install
```

### 2. Prepare environment files

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/main/.env.example apps/main/.env
cp apps/admin/.env.example apps/admin/.env
```

Edit `apps/backend/.env` at least for:

- `JWT_SECRET` / `ENCRYPTION_KEY` — use long random strings (not the placeholders)
- `DATABASE_URL` — when you start Phase 3 (Mongo)

Right now (Phases 1–2), **only `PORT=3001` is required** for the API health check; frontends work with the defaults in `.env.example`.

### 3. Start everything

```bash
npm run dev:web
```

Or separately:

```bash
npm run dev:backend   # http://localhost:3001
npm run dev:main      # http://localhost:5173
npm run dev:admin     # http://localhost:5175
```

### 4. Verify

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","version":"3.0.0"}
```

Open in the browser:

- Main: http://localhost:5173  
- Admin: http://localhost:5175  

### 5. Production-style build (optional)

```bash
npm run build
npm run start:backend   # if configured; or: npm run start -w @taskflow/backend
# serve Vite apps: npm run preview -w @taskflow/main | admin
```

---

## How to get keys (GitHub, SMTP, AI, Power BI)

Use this when you forget where each key comes from. Fill only what you need for the current phase.

### GitHub OAuth (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`)

1. Open [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) (or org: Settings → Developer settings).
2. **New OAuth App**.
3. Set:
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:3001/api/auth/github/callback`
4. Create app → copy **Client ID**.
5. **Generate a new client secret** → copy once into `GITHUB_CLIENT_SECRET`.
6. Put the same **Client ID** in main as `VITE_GITHUB_CLIENT_ID` (public). Never put the secret in Vite env.

For production later, add a second OAuth app (or update URLs) with your real domain.

### SMTP email (invites / password reset)

**Easiest free path — Gmail App Password**

1. Use a Google account with [2-Step Verification](https://myaccount.google.com/security) enabled.
2. Create an [App Password](https://myaccount.google.com/apppasswords) (app: Mail).
3. In `apps/backend/.env`:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=the-16-char-app-password
```

**Other free/cheap options**

| Provider | Signup | Notes |
| --- | --- | --- |
| [Resend](https://resend.com/) | API / SMTP | Generous free tier for transactional mail |
| [Brevo](https://www.brevo.com/) (Sendinblue) | SMTP | Free daily send limit |
| [Mailtrap](https://mailtrap.io/) | SMTP | Best for **dev** (catch emails, don’t send to real users) |

Leave `SMTP_ENABLED=false` until you need email.

### AI — free / free-tier model sources

v2 already uses **OpenAI** + **Gemini**. For local/dev you can stay on free tiers:

| Provider | Get key | Env var (today) | Cost |
| --- | --- | --- | --- |
| **Google Gemini** (recommended free) | [AI Studio → API key](https://aistudio.google.com/apikey) | `GOOGLE_API_GEMINI_API_KEY` | Free tier, no card |
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` | Paid (sometimes trial credit) |
| **Groq** (fast Llama, free tier) | [console.groq.com/keys](https://console.groq.com/keys) | add later as `GROQ_API_KEY` | Free tier, rate-limited |
| **OpenRouter** (many `:free` models) | [openrouter.ai/keys](https://openrouter.ai/keys) | add later as `OPENROUTER_API_KEY` | Free models available |
| **Hugging Face** | [hf.co/settings/tokens](https://huggingface.co/settings/tokens) | add later | Small free inference credits |

**Practical recommendation for TaskFlow v3**

1. Start with **Gemini** → set `GOOGLE_API_GEMINI_API_KEY` (already in `.env.example`).
2. Optionally add **Groq** later for speed / backup (wire in Phase 4 AI module).
3. Skip paid OpenAI until you need it.

### Power BI (`POWERBI_*`)

Power BI **embedded analytics is not a free open API** like Gemini. You need a Microsoft / Azure setup:

1. [Azure Portal](https://portal.azure.com/) → App registrations → New registration.  
   Copy **Application (client) ID** → `POWERBI_CLIENT_ID`, **Directory (tenant) ID** → `POWERBI_TENANT_ID`.
2. Certificates & secrets → New client secret → `POWERBI_CLIENT_SECRET`.
3. [Power BI](https://app.powerbi.com/) workspace with reports (Microsoft 365 / Power BI Pro or Fabric capacity for embedding).
4. Admin app: set `VITE_POWERBI_CLIENT_ID`, `VITE_POWERBI_TENANT_ID`, `VITE_POWERBI_WORKSPACE_ID`.

**Free-ish alternatives for charts (if you don’t need real Power BI):**

- Use app charts (Chart.js already in v2 main) + Mongo analytics — no Power BI keys.
- Defer Power BI until after MVP (Phase 4 order already puts it last).

---

## Environment variables

### Backend — `apps/backend/.env`

Full template: [`apps/backend/.env.example`](./apps/backend/.env.example)

| Variable | When needed | Source / how to get it |
| --- | --- | --- |
| `NODE_ENV` | Always | `development` locally |
| `PORT` | Always | Default `3001` |
| `BASE_URL` | Always | `http://localhost:3001` |
| `FRONTEND_URL` | Auth / emails / redirects | Main site URL (`5173`) |
| `ADMIN_URL` | Admin redirects | Admin site URL (`5175`) |
| `CORS_ORIGIN` | Browser API calls | Comma list: `http://localhost:5173,http://localhost:5175` |
| `DATABASE_URL` | Phase 3+ | Local Mongo: `mongodb://localhost:27017/taskflow` · or [MongoDB Atlas](https://www.mongodb.com/atlas) connection string |
| `JWT_SECRET` | Phase 3+ auth | Generate yourself: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Phase 3+ auth | e.g. `7d` |
| `ENCRYPTION_KEY` | Tokens / GitHub secrets | Generate: `openssl rand -hex 32` |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` | Emails | Gmail App Password, SendGrid, Mailgun, etc. |
| `SMTP_ENABLED` | Emails | `true` / `false` |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client |
| `GOOGLE_CALLBACK_URL` | Google OAuth | Must match console: `http://localhost:3001/api/auth/google/callback` |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub OAuth | [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps |
| `GITHUB_CALLBACK_URL` | GitHub OAuth | `http://localhost:3001/api/auth/github/callback` |
| `OPENAI_API_KEY` | AI features | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `GOOGLE_API_GEMINI_API_KEY` | Gemini AI | [Google AI Studio](https://aistudio.google.com/apikey) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Billing | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `POWERBI_*` | Analytics embeds | Azure AD app + Power BI workspace |
| `UPLOAD_DIR` / `MAX_FILE_SIZE` | File uploads | Local folder name; size in bytes (default 10MB) |
| `LOG_LEVEL` | Logging | `info`, `debug`, … |

### Main — `apps/main/.env`

Template: [`apps/main/.env.example`](./apps/main/.env.example)

| Variable | When needed | Source |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API calls | Usually `http://localhost:3001/api` (or rely on Vite `/api` proxy) |
| `VITE_SOCKET_URL` | Realtime | `http://localhost:3001` |
| `VITE_BASE_URL` | Absolute links | `http://localhost:5173` |
| `VITE_GOOGLE_CLIENT_ID` | Google login UI | Same Google OAuth client ID as backend (public) |
| `VITE_GITHUB_CLIENT_ID` | GitHub login UI | Same GitHub OAuth client ID (public) |
| `VITE_PERSIST_SECRET` | Encrypted redux persist | Local secret string |

**Do not put** `CLIENT_SECRET` values in Vite env — they would ship to the browser.

### Admin — `apps/admin/.env`

Template: [`apps/admin/.env.example`](./apps/admin/.env.example)

| Variable | When needed | Source |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Admin API | `http://localhost:3001/api` |
| `VITE_SOCKET_URL` | Realtime | `http://localhost:3001` |
| `VITE_POWERBI_*` | Power BI views | Azure / Power BI (later) |

---

## Scripts

```bash
npm run dev:web       # backend + main + admin
npm run dev:backend
npm run dev:main
npm run dev:admin
npm run build
npm run lint
npm run type-check
npm run show:ports
```

---

## Phases

→ [docs/phases/README.md](./docs/phases/README.md)

| Phase | Status |
| --- | --- |
| [01 — Scaffold](./docs/phases/PHASE-01-scaffold.md) | **Done** |
| [02 — Shared packages](./docs/phases/PHASE-02-shared-packages.md) | **Done** |
| [03 — Backend foundation](./docs/phases/PHASE-03-backend-foundation.md) | **Done** |
| [04 — Backend domain APIs](./docs/phases/PHASE-04-backend-apis.md) | Pending (next) |

Full plan overview: v2 `REBUILD.md`.

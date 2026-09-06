# GentleMsg

Real-time messaging app built as a full-stack portfolio project: **1:1 chat**, **groups**, **friends**, **search**, and **WebRTC voice/video calls**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

**Live demo:** [gentlemsg.online](https://www.gentlemsg.online) · **Repo:** [github.com/sankalp-singh-07/gentlemsg](https://github.com/sankalp-singh-07/gentlemsg)

---

## Features

| Area | Capabilities |
|------|----------------|
| **Auth** | Google OAuth, JWT access token + httpOnly refresh cookie, silent refresh |
| **1:1 chat** | Realtime messages, media, typing, reply/edit/delete, reactions, read receipts, drafts, pin chats |
| **Groups** | Create groups, roles (owner/admin/member), members, leave/delete, group WS |
| **Friends** | Search, requests (accept/reject/cancel), unfriend, block |
| **Search** | Global (⌘K) users/chats/groups; in-chat message search with prev/next |
| **Calls** | 1:1 WebRTC voice & video (signaling over presence WebSocket) |
| **UX** | Dark mode, mobile layout, connection banner, media lightbox, empty/skeleton states |
| **Privacy** | GDPR export/delete account; no third-party emails in search/friend APIs |

### Security model (honest)

- Transport: **HTTPS / WSS** in production  
- Auth: **JWT** (short-lived access) + **httpOnly refresh**  
- Authorization: chat/group **participant checks** on every API  
- Messages are stored as **plaintext on the server** (standard for most messengers without true E2EE)  
- Legacy client-side AES (key derived from user IDs) is **not real E2EE**; new messages are plain text over TLS. Old ciphertext still decrypts in the UI when possible.

---

## Tech stack

### Frontend (`frontend/`)
- React 18 + TypeScript (incremental; many UI files still JSX)
- Vite 5, Tailwind CSS 3, Lucide icons
- Redux Toolkit (session / friends / chats)
- Axios API client with token refresh
- Native WebSocket clients + WebRTC

### Backend (`backend/`)
- FastAPI + Uvicorn
- SQLAlchemy 2 async, Alembic migrations
- SQLite (local) or **Neon Postgres** (`asyncpg`)
- Google OAuth, python-jose JWT
- SlowAPI rate limits
- In-memory WebSocket manager (single process; fine for portfolio)

---

## Project layout

```
gentlemsg/
├── backend/
│   ├── main.py                 # App entry, routers, lifespan
│   ├── api/routes/             # REST (auth, chats, friends, groups, calls, search)
│   ├── services/               # Business logic
│   ├── models/                 # SQLAlchemy models
│   ├── schemas/                # Pydantic
│   ├── websocket/              # chat, group, presence (+ call signaling)
│   ├── alembic/versions/       # Migrations
│   └── .env.example
├── frontend/
│   ├── src/app/                # App shell, providers
│   ├── src/features/           # calls, groups, barrels
│   ├── src/shared/             # api, ws, ui, hooks, types
│   ├── src/components/         # Screens (chat, friends, sidebar, …)
│   └── .env.example
├── DEMO.md                     # Portfolio walkthrough checklist
└── ARCHITECTURE.md             # System design notes
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- Google Cloud OAuth client (Web application)
- Optional: [Neon](https://neon.tech) Postgres for production-like DB

---

## Quick start (local)

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

With default settings, SQLite is used and tables are created on startup (`AUTO_CREATE_TABLES=true`).

For Alembic (recommended when using Neon):

```bash
# .env
# DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST/DB?sslmode=require
# AUTO_CREATE_TABLES=false
alembic upgrade head
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000
npm run dev
```

App: http://localhost:5173  

### 3. Google OAuth

In Google Cloud Console:

1. Create OAuth **Web** client  
2. Authorized redirect URI:  
   `http://localhost:8000/api/v1/auth/google/callback`  
3. Put client ID/secret in `backend/.env`  
4. Set `FRONTEND_URL=http://localhost:5173` and matching `CORS_ORIGINS`

---

## Frontend scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + production build |
| `npm run build:vite` | Vite build only |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run preview` | Preview production build |

Import alias: `@/*` → `src/*` (see `vite.config.ts` / `tsconfig.json`).

---

## API overview

Prefix: `/api/v1`

| Area | Examples |
|------|----------|
| Auth | `GET /auth/google/login`, `POST /auth/refresh`, `GET /auth/me` |
| Chats | `GET/POST /chats/`, messages, media, pin, reactions |
| Friends | requests, accept/reject/cancel, block |
| Groups | CRUD, members, roles, messages |
| Search | `GET /search/?q=`, `GET /users/search` |
| Calls | `GET /calls/` (history; signaling is WS) |

WebSockets:

| Path | Role |
|------|------|
| `/ws/chat/{chatId}?token=` | 1:1 realtime events |
| `/ws/group/{groupId}?token=` | Group events |
| `/ws/presence/{userId}?token=` | Online status + **call signaling** |

---

## Deploy (free)

**Frontend → [Vercel](https://vercel.com)** (Hobby). Root directory: `frontend`. Env: `VITE_API_URL=https://<your-api>.onrender.com` (no trailing slash).

**Backend → [Render](https://render.com)** (free web service). Railway has no lasting free tier (trial credit only). Render is the one that stays $0; the instance **sleeps after ~15 minutes idle** and takes ~30–60s to wake (WebSockets drop while asleep).

1. Create a [Neon](https://neon.tech) free Postgres database (Render’s free disk is ephemeral — SQLite and `uploads/` will vanish on restart).
2. New Web Service from this repo, **root directory `backend`**, or use `render.yaml`.
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set env vars (see `backend/.env.example`):

| Variable | Production value |
|----------|------------------|
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Neon URL (`postgresql://…` is auto-normalized to asyncpg) |
| `AUTO_CREATE_TABLES` | `false` |
| `JWT_SECRET` | long random string |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | same OAuth client |
| `GOOGLE_REDIRECT_URI` | `https://<api>.onrender.com/api/v1/auth/google/callback` |
| `FRONTEND_URL` | `https://<app>.vercel.app` |
| `API_BASE_URL` | `https://<api>.onrender.com` |
| `CORS_ORIGINS` | `["https://<app>.vercel.app"]` |

4. After first deploy: Render shell → `alembic upgrade head`
5. Google Cloud OAuth **Web** client:
   - Authorized JavaScript origins: Vercel URL
   - Authorized redirect URI: the `GOOGLE_REDIRECT_URI` above

Uploads on Render free are **ephemeral**. For a portfolio demo that is acceptable; persistent files need object storage later.

---

## Production notes

- Set `ENVIRONMENT=production`  
- Strong `JWT_SECRET` (required in production)  
- Prefer Neon `DATABASE_URL` + `AUTO_CREATE_TABLES=false` + `alembic upgrade head`  
- Restrict `CORS_ORIGINS` to your frontend origin  
- Consider `SERVE_UPLOADS_PUBLIC=false` and auth-gated file URLs  
- WebRTC may need a **TURN** server behind strict NAT  
- Multi-instance deploy needs Redis/pubsub for WebSocket fan-out (not included)
- Render free: cold start + no persistent disk

---

## License

Personal portfolio project. Use and adapt freely with attribution appreciated.

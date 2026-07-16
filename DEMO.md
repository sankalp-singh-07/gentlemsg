# GentleMsg — Portfolio demo checklist

Use this when recording a walkthrough or presenting to interviewers.

## Setup (2 minutes)

- [ ] Backend running on `:8000` (`uvicorn main:app --reload`)
- [ ] Frontend running on `:5173` (`npm run dev`)
- [ ] Two Google accounts (two browsers or normal + incognito)
- [ ] Mic/camera permissions allowed (for call demo)

## Golden path (must work)

1. **Login** — Sign in with Google → land on dashboard  
2. **Profile** — Set a unique username  
3. **Search / friend** — ⌘K or **+** → find other user → send request  
4. **Accept** — Other user accepts → chat appears  
5. **Message** — Send text; confirm both sides update live  
6. **Refresh** — Hard refresh; session and history persist  
7. **Logout / login** — Clean session lifecycle  

## Chat polish

- [ ] Typing indicator  
- [ ] Reply / edit / delete own message  
- [ ] Reaction (right-click or long-press menu)  
- [ ] Image upload + lightbox  
- [ ] Pin chat in sidebar  
- [ ] Draft: type text, switch chat, return — draft restored  
- [ ] In-chat search (🔍) with Prev/Next  

## Groups

- [ ] Groups tab → **New group** → add friend  
- [ ] Send group messages  
- [ ] Info panel: members, rename (admin), leave  

## Calls (optional if network allows)

- [ ] Voice call from chat header  
- [ ] Accept on second client  
- [ ] Mute / end call  
- [ ] Video call with camera toggle  

## Trust signals to mention

- JWT + refresh cookies; participant checks on APIs  
- Soft-deleted messages filtered from history  
- Honest security model (TLS + auth, not fake E2EE)  
- Rate limits on message send / search  
- Single-process WS limitation; Neon-ready schema  

## If something fails

| Symptom | Check |
|---------|--------|
| OAuth fails | `GOOGLE_*` env, redirect URI exact match |
| CORS errors | `CORS_ORIGINS` includes `http://localhost:5173` |
| No realtime | Backend up; token valid; WS not blocked |
| Call no media | HTTPS/localhost only; permissions; firewall/NAT (needs TURN) |
| Empty after deploy | Migrations / `DATABASE_URL` |

## Talking points (30 seconds)

> “GentleMsg is a production-style messenger: FastAPI + React, Google OAuth, WebSockets for realtime, and WebRTC for 1:1 calls. I focused on clean layering, honest security, and polish—reactions, drafts, pins, groups—without over-engineering. The schema runs on SQLite locally or Neon Postgres in production.”

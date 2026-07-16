# GentleMsg — Architecture

## High-level

```
┌─────────────┐     REST /api/v1/*      ┌──────────────┐
│   React SPA │ ──────────────────────► │   FastAPI    │
│  (Vite/TS)  │ ◄──── JWT + cookies ─── │   services   │
└──────┬──────┘                         └──────┬───────┘
       │                                        │
       │  WS: chat / group / presence           │ SQLAlchemy async
       └────────────────────────────────────────┤
                                                ▼
                                         SQLite / Neon PG
```

## Realtime contract

1. **Writes go through REST** (create message, edit, delete, react, etc.).
2. **WebSocket delivers server-validated events** only (`new_message`, `typing`, `reaction_updated`, …).
3. Chat/group sockets reject arbitrary client-broadcast message payloads (anti-spoofing).
4. **Call signaling** uses the presence socket (`call_*`, `webrtc_*`) so ringing works outside an open chat room.
5. **WebRTC media is P2P**; server never sees media streams.

## Backend layers

| Layer | Responsibility |
|-------|----------------|
| `api/routes/*` | HTTP, auth deps, rate limits, WS broadcast triggers |
| `services/*` | Business rules, validation, queries |
| `models/*` | SQLAlchemy tables |
| `schemas/*` | Pydantic request bodies |
| `websocket/*` | Connection manager + endpoints |
| `core/*` | Config, JWT, exceptions, limiter |

## Frontend layers

| Layer | Responsibility |
|-------|----------------|
| `app/` | Bootstrap, providers, auth init |
| `shared/api` | Typed Axios + domain clients |
| `shared/ws` | Chat/group/presence hub |
| `shared/ui` | Button, Avatar, Modal, Skeleton, … |
| `features/calls` | CallProvider + WebRTC |
| `components/` | Screens (still mixed JSX; migrate gradually) |
| `store/` | Redux: user, friends, chats |

## Auth flow

1. User hits Google login → backend OAuth code exchange.  
2. Redirect: `FRONTEND_URL/auth/callback?token=<access_jwt>`.  
3. Refresh token stored in **httpOnly** cookie.  
4. Axios interceptor: on 401 → `POST /auth/refresh` (credentials) → retry once.

## Scalability (portfolio scope)

| Concern | Current | Future |
|---------|---------|--------|
| WS fan-out | In-memory (1 process) | Redis pub/sub |
| DB | SQLite or Neon | Neon + connection pooling |
| Media | Local disk / public `/uploads` | S3 + signed URLs |
| WebRTC | STUN only | TURN (coturn) |
| Search | `ILIKE` / prefix | `pg_trgm` GIN on Neon |

## Group calling (extension path)

Reuse presence signaling envelopes with `roomId` / `groupId` and a mesh or SFU later. Current call state machine is 1:1 only.

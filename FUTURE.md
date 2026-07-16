# Future recommendations

Out of portfolio scope but natural next steps:

| Item | Why |
|------|-----|
| **TURN server** | Reliable WebRTC behind symmetric NAT / corporate firewalls |
| **Redis pub/sub for WebSockets** | Horizontal scale of realtime beyond one process |
| **Object storage (S3/R2)** | Durable media; signed URLs instead of public disk |
| **True E2EE** | Device keys, Signal-style protocols (large project) |
| **Push notifications** | Mobile web / PWA when tab is backgrounded |
| **Group video (SFU)** | Mediasoup / LiveKit / etc. |
| **pg_trgm search** | Fuzzy user/message search on Neon |
| **Playwright E2E** | Guard golden path in CI |
| **Full TypeScript migration** | Convert remaining JSX components |
| **Refresh token rotation** | Server-side session store / revoke list |

These are intentionally deferred to keep the app simple and demoable.

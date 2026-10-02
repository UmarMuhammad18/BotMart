# BotMart Roadmap

Goal: flagship **agentic commerce** portfolio project.

---

## ✅ Done

### Core + P0 + P1
- [x] Agents, listings, negotiations, orders
- [x] Grok brain + rule fallback
- [x] Reputation, memory, decision log
- [x] Autonomous buyer runner + UI
- [x] Magic-link auth + ownership + claim

### P2 — Autonomy
- [x] Vercel cron (`/api/cron/run-agents`, `/api/cron/seller-adjust`)
- [x] Seller autonomy (relist sold-out, discount stale listings)
- [x] Multi-buyer auctions (`POST /api/auctions`)
- [x] Reputation + memory-aware ranking

### P3 — Production
- [x] Realtime helper (`RealtimeRefresh` + `useRealtimeTable`)
- [x] Stripe webhook (`/api/webhooks/stripe`)
- [x] `.env.local.example` + `DEPLOY.md` + `AUTH.md`
- [x] Ranking unit tests (install jest to run)
- [x] `NEXT_PUBLIC_DEMO_MODE` documented

---

## Optional next

- Wire `RealtimeRefresh` into Dashboard `useEffect` (import + `<RealtimeRefresh onChange={() => load(true)} />`)
- Jest setup + CI
- Public read-only spectator mode UI
- Seller-initiated outbound offers

---

## Quick API map

| Endpoint | Purpose |
|----------|---------|
| `POST /api/agents/run` | Buyer shops now |
| `POST /api/auctions` | Multi-buyer race on one listing |
| `GET /api/cron/run-agents` | Hourly buyers |
| `GET /api/cron/seller-adjust` | Hourly sellers |
| `POST /api/agents/claim` | Own seed agents |
| `POST /api/webhooks/stripe` | Order paid/cancelled |

# BotMart Roadmap

Goal: make this one of your strongest portfolio projects — a real **agentic commerce** system, not a demo toy.

---

## ✅ Done (post-hackathon upgrades)

- [x] Core marketplace (agents, listings, negotiations, orders)
- [x] Grok AI negotiation brain + rule-based fallback
- [x] Settlement (budget deduct, stock, Stripe test hooks)
- [x] Dashboard + kill switch
- [x] Seed + one-click demo
- [x] Intent matching / ranking
- [x] **Schema expansion**: goal, memory, trades_completed/failed, agent_decisions log
- [x] **Reputation system**: updates on accept / reject / escalate
- [x] **Agent memory notes** after closed deals
- [x] **Decision logging** for every agent action
- [x] **Autonomous buyer runner** (`POST /api/agents/run`)
- [x] Auth helper scaffolding (`src/lib/auth.ts`)

---

## 🔄 In progress / next (priority order)

### P0 — Product foundations
1. **Run schema migration** in Supabase (paste `supabase/schema.sql`)
2. **Wire "Run agent" button** on Agents + Dashboard UI
3. **Show reputation + trade counts** on agent cards
4. **Decision log panel** on Dashboard (fetch `/api/decisions`)

### P1 — Ownership & trust
5. Enable Supabase Auth (email magic link)
6. Login / logout UI
7. Scope agent create + control to `owner_id = user.id`
8. Claim unowned seed agents or re-seed per user

### P2 — True autonomy
9. Scheduled / cron-style runner (Vercel cron or Supabase scheduled function)
10. Seller agents that auto-relist and adjust prices
11. Multi-buyer auctions on a single listing
12. Cross-negotiation memory (prefer counterparties with high reputation)

### P3 — Production polish
13. Supabase Realtime on negotiations + orders (drop polling)
14. Stable Vercel deploy + env docs
15. End-to-end Stripe test mode + webhook
16. Public demo mode (read-only spectators)
17. Tests for ranking, reputation math, negotiation state machine

---

## How to use the new autonomous runner

```bash
# Run one agent (auto-matches listings + negotiates to completion)
curl -X POST http://localhost:3000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"YOUR_AGENT_UUID","max_negotiations":2,"auto_complete":true}'

# Run all active buyers once
curl -X POST http://localhost:3000/api/agents/run \
  -H "Content-Type: application/json" \
  -d '{"all":true,"max_negotiations":1}'
```

---

## Architecture after these upgrades

```
Human sets goal + budget + policy
        ↓
POST /api/agents/run
        ↓
rankListings() → top matches
        ↓
startNegotiation() → runNextTurn() loop
        ↓
brain.ts (Grok) / negotiate.ts (rules)
        ↓
order + reputation + memory + decision log
```

---

## Portfolio framing

When you write this up:

> BotMart is an agentic marketplace where autonomous AI agents discover products, negotiate prices, and settle trades under human-defined budgets and policies. Humans set goals and constraints; agents execute.

Key technical talking points:
- Dual brain (LLM + deterministic fallback)
- Observable decisions (`agent_decisions`)
- Reputation that changes outcomes over time
- Autonomous match → negotiate → settle loop

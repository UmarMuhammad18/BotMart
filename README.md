# BotMart 🤖

> **An autonomous marketplace where AI agents discover listings, negotiate prices, and close deals — without human involvement.**

Built for a hackathon with Next.js 16, Supabase, and Grok AI.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Autonomous Agents** | Agents with budgets, negotiation policies and distinct personalities |
| **Live Negotiation** | Buyer & seller bots haggle in real-time powered by Grok AI (falls back to rule-engine) |
| **Settlement Engine** | Accepted deals auto-create orders, deduct budgets, and decrement stock |
| **Stripe Integration** | Optional test-mode PaymentIntents on every completed deal |
| **Human Kill-Switch** | Pause or block any agent instantly from the dashboard |
| **One-click Demo** | Instantly seeds data and starts a full BargainBot ↔ GadgetSeller negotiation |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-handle/botmart
cd botmart
npm install          # or: pnpm install
```

### 2. Environment variables

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Required for Grok AI negotiation (falls back to rule engine if missing)
XAI_API_KEY=xai-...
GROK_MODEL=grok-3          # or grok-2, grok-3-mini

# Optional – Stripe test-mode payments
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run:

```sql
-- paste the contents of supabase/schema.sql here
```

Or just paste [`supabase/schema.sql`](./supabase/schema.sql) directly.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎬 Demo Flow (for judges)

1. **Open** `http://localhost:3000`
2. Click **"Seed demo data"** — creates 4 agents and 8 listings
3. Click **"One-click demo"** — BargainBot immediately starts negotiating with GadgetSeller for Premium Wireless Headphones
4. Watch the negotiation auto-run with live chat bubbles
5. When the deal closes, visit **Dashboard** to see the order and mark it as fulfilled
6. Try **Agents** to pause/kill an agent mid-negotiation (escalates the deal)

---

## 🗺️ App Pages

| Page | URL | Purpose |
|---|---|---|
| Home | `/` | Launch pad — seed, demo, navigate |
| Agents | `/agents` | Create & view all agents with budgets |
| Marketplace | `/listings` | Browse listings, AI-powered intent matching |
| Negotiate | `/negotiate` | Start & watch live negotiations |
| Dashboard | `/dashboard` | Human oversight — kill switch, orders, fulfil |

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx                 # Home / hero
│   ├── agents/page.tsx          # Agent management
│   ├── listings/page.tsx        # Marketplace
│   ├── negotiate/page.tsx       # Live negotiation UI
│   ├── dashboard/page.tsx       # Human oversight
│   └── api/
│       ├── agents/              # CRUD + PATCH status
│       ├── listings/            # CRUD + search/filter
│       ├── negotiations/        # start | next_turn
│       ├── orders/              # list + fulfill
│       ├── match/               # buyer intent → ranked listings
│       ├── demo/                # one-click demo
│       └── seed/                # idempotent seed
├── lib/
│   ├── agents/
│   │   ├── brain.ts             # Grok AI → NegotiationMessage
│   │   ├── negotiate.ts         # Rule-based fallback engine
│   │   └── session.ts           # startNegotiation + runNextTurn
│   ├── marketplace/match.ts     # Listing scorer
│   ├── grok.ts                  # xAI API wrapper
│   ├── stripe.ts                # Stripe PaymentIntent helper
│   ├── seed.ts                  # Idempotent seed function
│   ├── seed-data.ts             # Agent + listing definitions
│   └── types.ts                 # All TypeScript types
└── components/
    └── AppHeader.tsx            # Sticky navigation
```

### Negotiation state machine

```
open → countered → accepted   (order created, budget deducted)
              ↘ rejected
              ↘ escalated     (agent paused/blocked mid-negotiation)
```

Each turn: `session.ts` → `brain.ts` (Grok) → falls back to `negotiate.ts` (rules)

---

## 🔑 Key Design Decisions

- **No auth required** — agents are identified by UUID, no login friction for hackathon
- **Grok with rule-based fallback** — the app is fully functional without an API key
- **Idempotent seeding** — safe to call `/api/seed` or the demo button multiple times
- **JSONB messages** — entire negotiation history stored in a single Postgres column for simplicity
- **4-second dashboard polling** — simple alternative to WebSockets for the demo

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: Supabase (Postgres + PostgREST)
- **AI**: Grok via xAI API (`grok-3` / `grok-2`)
- **Payments**: Stripe (test mode)
- **Styling**: Tailwind CSS v4 + custom CSS design system
- **Icons**: Lucide React

---

## 📋 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server only) |
| `XAI_API_KEY` | ⚡ Recommended | xAI Grok API key for AI negotiations |
| `GROK_MODEL` | Optional | Model name (default: `grok-3`) |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key (test mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe public key |

---

## 🌱 What's next

- WebSocket real-time updates (replace polling)
- Auth with Supabase Auth — link agents to real users
- Reputation system — update agent reputation post-trade
- Multi-agent auctions — multiple buyers competing for one listing
- Agent memory — Grok maintains context across negotiations

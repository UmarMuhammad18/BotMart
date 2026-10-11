# BotMart

Autonomous **agent-to-agent marketplace** — buyers and sellers (Grok / rule-based) discover listings, negotiate, settle deals. Optional **3D live floor** (`/world`) and **secret jury court** (`/court`).

**Live:** [bot-mart.vercel.app](https://bot-mart.vercel.app)

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing + gamified hero portal into the 3D world |
| `/agents` | Create agents (with **roles**) |
| `/listings` | Marketplace |
| `/negotiate` | Live negotiation + court panel |
| `/world` | 3D floor that stages every negotiation live (walk-up, speech bubbles, deal bursts) with replay of recent deals |
| `/court` | Multi-agent jury |
| `/dashboard` | Control plane |

## Local

```bash
pnpm install
cp .env.local.example .env.local   # fill Supabase + optional XAI_API_KEY
pnpm dev
```

## Deploy (Vercel)

1. Project must track **`UmarMuhammad18/BotMart`** branch **`main`**
2. After each push, open **Deployments** → latest commit SHA must match GitHub `main`
3. If the site looks “old”, the last **Production** deploy is still an older SHA — do **not** only “Redeploy” an old row; use **Deploy** on the newest commit, or fix a **failed build** in the logs
4. Env vars: see `DEPLOY.md` / `.env.local.example`
5. Run `supabase/schema.sql` in Supabase SQL Editor

Deploy marker: see `DEPLOY_VERSION.txt`

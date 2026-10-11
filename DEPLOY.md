# Deploy BotMart to Vercel

## 1. Push repo & import

1. Ensure `main` has the latest code
2. [vercel.com/new](https://vercel.com/new) → import `UmarMuhammad18/BotMart`
3. Framework: **Next.js** · Root: `.` · Branch: **main**

## 2. Environment variables

Copy from `.env.local.example` into Vercel → Settings → Environment Variables:

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `XAI_API_KEY` | Recommended |
| `CRON_SECRET` | ✅ for cron — cron routes return 401 in production without it |
| `STRIPE_SECRET_KEY` | Optional |
| `STRIPE_WEBHOOK_SECRET` | Required if Stripe is on — unsigned webhooks are refused in production |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |

## 3. Supabase checklist

- [ ] Run `supabase/schema.sql` in SQL Editor (re-run after pulling — it creates `settle_negotiation()`, the atomic deal settlement; without it deals fall back to a non-atomic path)
- [ ] Auth → Email magic link enabled
- [ ] Auth → Redirect URLs include `https://YOUR_APP.vercel.app/auth/callback`
- [ ] Database → Replication: enable `negotiations`, `orders`, `agents` for Realtime

## 4. Cron jobs

`vercel.json` already schedules:

- `/api/cron/run-agents` — daily 09:00 UTC (buyers shop)
- `/api/cron/seller-adjust` — daily 09:30 UTC (sellers reprice/relist)

Vercel **Hobby** only allows cron jobs that run at most once a day — an
hourly schedule makes every deployment fail before the build starts. On
Pro you can go back to hourly (`0 * * * *` / `30 * * * *`).

Set `CRON_SECRET` in Vercel; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.

## 5. Stripe webhook (optional)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Production: Dashboard → Webhooks → `https://YOUR_APP.vercel.app/api/webhooks/stripe`  
Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## 6. Smoke test

1. Open production URL
2. Seed demo data
3. Run one agent
4. Sign in with magic link
5. Claim agents / create owned agent

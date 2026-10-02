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
| `CRON_SECRET` | Recommended for cron |
| `STRIPE_SECRET_KEY` | Optional |
| `STRIPE_WEBHOOK_SECRET` | Optional |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |

## 3. Supabase checklist

- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Auth → Email magic link enabled
- [ ] Auth → Redirect URLs include `https://YOUR_APP.vercel.app/auth/callback`
- [ ] Database → Replication: enable `negotiations`, `orders`, `agents` for Realtime

## 4. Cron jobs

`vercel.json` already schedules:

- `/api/cron/run-agents` — hourly (buyers shop)
- `/api/cron/seller-adjust` — :30 past hour (sellers reprice/relist)

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

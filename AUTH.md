# BotMart Auth setup (P1)

## Enable Magic Link in Supabase

1. Open your Supabase project → **Authentication** → **Providers** → **Email**
2. Enable **Email** and **Magic Link** (passwordless)
3. **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3000` (or your production URL)
   - Redirect URLs (add both):
     - `http://localhost:3000/auth/callback`
     - `https://YOUR_VERCEL_DOMAIN/auth/callback`

## Env vars (already used)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

No extra env vars required for auth.

## How it works

| State | Behaviour |
|-------|-----------|
| **Not signed in** | Demo mode — full access, agents get `owner_id = hackathon-user` |
| **Signed in** | New agents owned by you; PATCH/run only on your agents (or unclaimed) |
| **Claim** | `POST /api/agents/claim` with `{ all: true }` takes over seed agents |

## Flow

1. User opens `/login`
2. Enters email → Supabase sends magic link
3. Link hits `/auth/callback` → session cookie set → redirect to `/agents`
4. Header shows email + Sign out

## Routes added

- `GET /login` — magic link form
- `GET /auth/callback` — exchange code for session
- `GET /api/auth/me` — current user for the client
- `POST /api/agents/claim` — claim unowned agents
- `src/middleware.ts` — refresh session on each request

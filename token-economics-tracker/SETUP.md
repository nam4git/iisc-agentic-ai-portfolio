# Nanotokens — Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account for deployment

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users
3. Save the database password

## 2. Run the database migration

In your Supabase dashboard → SQL Editor, run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates the four tables (`profiles`, `platforms`, `models`, `usage_logs`),
the auto-profile trigger, and all Row-Level Security policies.

## 3. Configure Google OAuth

1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
   - Authorised redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
3. Paste the Client ID and Secret back into Supabase

## 4. Local development

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# from Supabase dashboard → Settings → API

npm install
npm run dev
# → http://localhost:3000
```

## 5. Deploy to Vercel

```bash
npx vercel
```

In the Vercel dashboard, add these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Settings → API |
| `NEXT_PUBLIC_APP_URL` | `https://nanotoken.vercel.app` |

Then update the Supabase Auth allowed redirect URLs:

- Authentication → URL Configuration → Site URL: `https://nanotoken.vercel.app`
- Redirect URLs: `https://nanotoken.vercel.app/api/auth/callback`

## 6. Architecture overview

```
src/
  app/
    (auth)/        — Login and signup pages
    (dashboard)/   — Protected app pages with sidebar
      dashboard/   — Spend summary + charts
      platforms/   — Manage tracked AI platforms
      usage/       — Log usage sessions
      analytics/   — Cache, CPST, and compression analytics
      settings/    — Account and subscription
    api/           — REST handlers (platforms, usage, analytics)
  lib/
    supabase/      — Browser + server Supabase clients
    pricing-catalogue.ts  — Static model pricing for all supported platforms
    utils.ts       — Cost calculation, formatters
  middleware.ts    — Session refresh + route protection
supabase/
  migrations/001_initial.sql   — Full DB schema with RLS
```

## Research basis

The analytics layer is grounded in:

- **Weinberger & Hozez (2026)** — "Token Reduction Is Not Cost Reduction" (arXiv 2607.12161).
  Key finding: Pearson r = 0.15 between token savings and cost savings.
- **Jiang et al. (2023)** — "LLMLingua" (EMNLP 2023). 20× prompt compression — trajectory cost must be monitored.
- **Wan et al. (2023)** — "Efficient Large Language Models: A Survey" (arXiv 2312.03863).
- **Anthropic Prompt Caching docs** — Cache reads at ~10% of input price; 90% hit rate → ~80% cost reduction on stable contexts.

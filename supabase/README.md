# FlowBoard — Supabase Setup (Team Mode)

This folder contains everything needed to turn FlowBoard into a multi-user,
realtime team app. It takes about 5 minutes.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is plenty).
2. Pick a name, a strong database password, and a region close to your team.
3. Wait ~2 minutes for it to provision.

## 2. Run the schema

1. In your project, open **SQL Editor → New query**.
2. Copy the entire contents of [`migrations/0001_init.sql`](migrations/0001_init.sql) and paste it in.
3. Click **Run**. It creates all tables, Row-Level-Security policies, triggers,
   and enables realtime. It's safe to re-run.

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project, run `supabase db push`.

## 3. Configure auth providers

1. **Email** is on by default. For a smoother demo you can turn **off**
   "Confirm email" under **Authentication → Providers → Email** so new accounts
   work instantly.
2. (Optional) **Google** — under **Authentication → Providers → Google**, enable
   it and paste a Google OAuth client ID/secret
   ([guide](https://supabase.com/docs/guides/auth/social-login/auth-google)).
3. Under **Authentication → URL Configuration**, add your site URL
   (e.g. `http://localhost:5174` for dev and your Vercel URL for prod) to
   **Redirect URLs**.

## 4. Point the app at Supabase

Copy your project's **URL** and **anon public key** from **Settings → API** into
the frontend env (root `.env` — copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Restart `npm run dev`. You'll now get a login screen, and your board lives in the
cloud with realtime sync across everyone on your team.

## How it maps to the app

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user (auto-created on signup) |
| `workspaces` | A team container; the creator becomes its owner |
| `workspace_members` | Who's in a workspace and their role (owner/editor/viewer) |
| `boards` | One Kanban board. `data` (JSONB) holds columns/cards/labels |
| `invites` | Pending email invites; auto-accepted when the invitee signs in |

- **Realtime**: clients subscribe to their active board's row; any write is
  pushed to everyone viewing it.
- **Security**: RLS means people only ever see boards in workspaces they belong
  to. Membership checks run through `SECURITY DEFINER` helper functions to avoid
  policy recursion.
- **Invites**: inviting an email creates a row; when that person signs in with
  the matching email they're added automatically (or via a copied invite link).

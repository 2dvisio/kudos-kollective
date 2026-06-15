# Kudos Collector

A lightweight web app for collecting structured feedback ("kudos") from your team, peers, or community. Create a request, share a private link, gather responses anonymously, and bundle multiple requests into a public report.

🔗 **Live app:** https://kudos-kollective.lovable.app

---

## ✨ Features

- **Google sign-in** — frictionless auth via Lovable Cloud
- **Three scoring types** per request:
  - 👍 Thumbs Up (simple endorsement)
  - 👍 / 👎 Thumbs Up/Down
  - 📊 NPS (0–10)
- **Shareable private links** — each request gets a unguessable `share_token`
- **Anonymous responses** — respondents don't need an account; name is optional
- **Auto-expiry** — every request expires within 7 days (configurable 1–7)
- **Public reports** — bundle multiple kudos requests into one shareable summary page
- **Mobile-first UI** built with shadcn/ui + Tailwind

---

## 🧱 Tech Stack

| Layer       | Tooling                                     |
| ----------- | ------------------------------------------- |
| Frontend    | React 18, Vite 5, TypeScript 5              |
| Styling     | Tailwind CSS v3, shadcn/ui, lucide-react    |
| Routing     | React Router                                |
| State/Data  | TanStack Query, Supabase JS client          |
| Backend     | Lovable Cloud (Supabase) — Postgres + Auth  |
| Hosting     | Lovable                                     |

---

## 🗄️ Data Model

```
profiles               kudos_requests              kudos_responses
─────────              ───────────────             ────────────────
user_id  ◄─────┐       user_id  ──────► profiles   kudos_request_id ──► kudos_requests
display_name   │       title                        score (int)
avatar_url     │       description                  respondent_name (nullable)
               │       scoring_type (enum)          created_at
               │       expires_at
               │       share_token (uuid)
               │
               └────── kudos_reports
                       user_id
                       title
                       kudos_request_ids (uuid[])
                       share_token
```

**Enums:** `scoring_type = 'thumbs_up' | 'thumbs_up_down' | 'nps'`

---

## 🔐 Security Model

The app is public-link based, so RLS is carefully scoped:

- **`kudos_requests` / `kudos_reports`** — owners (`auth.uid() = user_id`) have full CRUD. Public read access is **not** granted via RLS; instead, anonymous visitors access a single row through `SECURITY DEFINER` RPC functions that require the exact `share_token`:
  - `get_kudos_request_by_token(_share_token)`
  - `get_kudos_report_by_token(_share_token)`
  - `get_kudos_requests_by_ids(_ids)`
  - `get_kudos_responses_by_request_id(_request_id)`
- **`kudos_responses`** — anonymous `INSERT` allowed (no auth needed to submit feedback). Reads only via the RPC above.
- All public-schema tables include explicit `GRANT`s for `authenticated` / `anon` / `service_role` as appropriate.

This prevents enumeration: without a valid share token, no request, report, or response is readable.

---

## 🗺️ App Routes

| Route                    | Access     | Purpose                                |
| ------------------------ | ---------- | -------------------------------------- |
| `/`                      | Auth       | Dashboard — your kudos requests        |
| `/auth`                  | Public     | Google sign-in                         |
| `/new`                   | Auth       | Create a new kudos request             |
| `/k/:token`              | Public     | Respond to a kudos request             |
| `/report/:token`         | Public     | View an aggregated public report       |

---

## 🚀 Local Development

```bash
# Install
bun install

# Run dev server (Vite on :8080)
bun run dev
```

Environment variables (auto-managed by Lovable Cloud, in `.env`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

---

## 📁 Project Structure

```
src/
├── components/        # Header, ProtectedRoute, shadcn/ui primitives
├── hooks/             # useAuth, use-toast, use-mobile
├── integrations/
│   ├── supabase/      # Auto-generated client + types
│   └── lovable/       # Lovable OAuth wrapper
├── lib/               # public-url helper, utils
├── pages/             # Index, Auth, NewKudosRequest, RespondToKudos, PublicReport
└── App.tsx            # Router

supabase/
└── migrations/        # SQL migrations (schema, RLS, RPC functions)
```

---

## 🛠️ Editing the Project

- **Via Lovable** — open the [project in Lovable](https://lovable.dev) and prompt changes; commits are pushed to this repo automatically.
- **Via GitHub / local IDE** — clone, edit, push. Changes sync back to Lovable in real time.

---

## 📦 Deployment

Published through Lovable (`Publish` button). Custom domains can be attached from the project's Publish settings.

---

## 📄 License

Private project. All rights reserved.

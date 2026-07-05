# Supabase setup — step by step

The app already works on static data (`src/data/AppData.js`). These steps move it
to Supabase (Postgres DB + Storage for images + realtime). Nothing breaks until
you add the keys — the code falls back to static data when Supabase isn't configured.

## 1. Create the project (you)
1. Go to https://supabase.com → sign up (free) → **New project**.
2. Pick a name, a strong DB password, a region close to you. Wait ~2 min.

## 2. Create the tables (you, once)
1. In the project: **SQL Editor → New query**.
2. Paste the contents of `supabase/schema.sql` and **Run**.
   - Creates every table, foreign keys, RLS policies, realtime, and the `images`
     storage bucket + policies.

## 3. Turn on auth (you)
This is a *personal* app, so RLS requires a logged-in user.
1. **Authentication → Providers → Email**: enable it (magic link is easiest).
2. **Authentication → Users → Add user** (your email) — or sign in from the app later.
   > If you skip auth, no rows are readable/writable (RLS denies anon). Auth is the
   > simplest way to keep your finances private.

## 4. Get the keys (you)
1. **Project Settings → API**. Copy **Project URL** and the **anon public** key.
2. In the app folder, copy `.env.example` → `.env.local` and paste them:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. Restart `npm run dev` (Vite only reads env at startup).

## 5. Seed your current data (you, once)
Loads everything from `AppData.js` into the tables. Uses the **service_role** key
(bypasses RLS — local only, never in the app).
```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Settings → API>"
node supabase/seed.mjs
```
You should see row counts printed per table.

## 6. Wire the screens to Supabase (incremental — I can do this)
The data layer is ready in `src/lib/api.js`:
- `useCollection('loans', staticLoansFallback)` — live list + realtime.
- `insertRow / updateRow / deleteRow('table', …)` — the add/edit/delete you already have.
- `uploadImage(file)` — returns a hosted URL (used by the chart-pattern drop zone
  and the journal note editor instead of inline base64).

Migrate one screen at a time (e.g. Loans, then Savings, …): swap the static import
for `useCollection`, add a small loading state, and point the existing CRUD handlers
at `insertRow/updateRow/deleteRow`. Because column names are snake_case in the DB,
map them to the app's camelCase in each service (or add a mapper).

## Notes
- **Derived values stay in the app** (amortization, compounded returns, INR
  conversion). Store only raw inputs.
- **Images**: switch the paste/drop handlers to `await uploadImage(file)` and store
  the returned URL in `chart_patterns.image_url` / inside the note HTML.
- **Cost**: free tier covers a personal app comfortably (500 MB DB, 1 GB storage).

# Tracker

Training, food, weight, niggles and test metrics in one place. React + Vite, installable as a PWA.

## Deploy to Vercel

You need a GitHub account and a Vercel account (free tier is fine).

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
gh repo create tracker --private --source=. --push
# (or create the repo on github.com and push manually)
```

Then at [vercel.com/new](https://vercel.com/new), import the repo. Vercel detects Vite automatically — accept the defaults and deploy. You'll get a URL like `tracker-abc123.vercel.app`.

Runs without any configuration in local-only mode. Add Supabase (below) for Google sign-in and cross-device sync. Everything stays on free tiers.

## Install on your phone

1. Open the Vercel URL in Safari (iOS) or Chrome (Android).
2. Share → **Add to Home Screen**.
3. Launches fullscreen with its own icon. Works offline apart from food lookups.

Barcode scanning needs camera permission and HTTPS. Vercel gives you HTTPS by default; it will not work if you open the site over a plain `http://` LAN address.

## Local development

```bash
npm install
npm run dev
```

The camera scanner won't work on `http://localhost` in all browsers — Safari in particular wants HTTPS. Use a deploy preview to test scanning properly. Everything else works fine locally.

## Supabase setup (Google login + sync)

Skip this and the app still works — it just keeps data on one device.

### 1. Create the project
At [supabase.com](https://supabase.com), New project. Pick a region near you (London for the UK). Save the database password somewhere safe — you'll want it later for connecting BI tools.

### 2. Run the schema
SQL Editor → New query → paste all of `supabase/schema.sql` → Run.

This creates the storage table, the Row Level Security policies, and the analysis views. **The RLS policies are not optional** — the anon key your app ships with is public by design, and RLS is the thing that stops one user reading another's data.

### 3. Enable Google sign-in
In Google Cloud Console:
- APIs & Services → OAuth consent screen → External → fill in app name and your email
- Credentials → Create Credentials → OAuth client ID → Web application
- Authorised redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (copy the exact value from Supabase → Authentication → Providers → Google)
- Copy the Client ID and Client Secret

Back in Supabase → Authentication → Providers → Google: enable it, paste both values, Save.

Then Authentication → URL Configuration → set Site URL to your Vercel URL, and add it under Redirect URLs too.

### 4. Point the app at it
Supabase → Project Settings → API. Copy the Project URL and the **anon public** key (not the service role key — that bypasses RLS and must never go in a client app).

In Vercel → Settings → Environment Variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_ANON_KEY` | the anon public key |

Redeploy. The sign-in screen appears on next load.

Existing data on your phone is pushed up automatically the first time you sign in on that device, so nothing is lost.

### Sync behaviour
Last-write-wins per section, debounced ~1 second. Editing the same section on two devices at once means one overwrites the other. Fine for one person; worth knowing.

Offline edits save locally and upload when you're next online. The badge at the top right shows which state you're in.

## Analysis

The views in `schema.sql` flatten the stored JSON into tidy tables — one row per observation:

| View | Grain |
|---|---|
| `v_workout_sets` | one row per set, with `volume_kg` computed |
| `v_food_log` / `v_food_daily` | per item / per day |
| `v_weight_log` | per day |
| `v_niggle_log` | per body area per day (long format) |
| `v_niggle_scales` | per scale question per day |
| `v_test_metrics` | per measurement |
| `v_daily_summary` | one row per day, everything joined |

Query them in Supabase's SQL editor, or connect a BI tool via Project Settings → Database → Connection string. Note that a direct Postgres connection uses a privileged role that bypasses RLS and sees all users, so filter on `user_id` yourself.

`v_daily_summary` is the one worth starting with — it puts training volume, cardio minutes, macros, weight and soreness on the same row, which is what you need to ask whether load is driving the niggles.

CSV export is still in the Data tab if you'd rather work from files.

## Food data

[Open Food Facts](https://world.openfoodfacts.org) — free, crowd-sourced, no API key. Barcode lookup is more reliable than text search because they run on separate infrastructure. Any field can be missing on any product, so anything without calorie data is filtered out of results rather than shown as zero.

If a product you eat isn't in the database, add it via the Open Food Facts app. It'll be there for you and everyone else within a day.

Anything without a barcode — butcher meat, loose veg, a restaurant dish — goes in via Manual entry, once. After that it's in your foods list.

### Meals

The point of the app. Build a meal once from saved foods with per-item gram amounts, then log the whole thing with one tap. A meal records as a single line in Today rather than one line per ingredient.

## Structure

```
supabase/schema.sql      Tables, RLS policies, analysis views
src/lib/supabase.js      Client + Google OAuth
src/lib/DataProvider.jsx Loads all data once; writes through to cloud + local
src/lib/auth.jsx         Session hook, sign-in screen, sync badge
src/lib/storage.js       localStorage layer (offline cache + backup export)
src/lib/csv.js           Flattened CSV exports
src/lib/food.js          Open Food Facts client
src/lib/schema.js        Exercise kinds, meal slots, migrations
src/lib/Scanner.jsx      ZXing camera scanner (lazy-loaded, ~400kB)
src/lib/ui.jsx           Design tokens + shared components
src/tabs/                One file per tab
```

Tabs and the scanner are code-split, so first load is ~20 kB and the heavy bits arrive only when used.

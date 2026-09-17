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

No API keys, no accounts, no paid services. Vercel's free tier and Open Food Facts' free API cover the whole thing.

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

## Your data

Stored in `localStorage` — one browser, one device, no account, nothing uploaded.

**This is the main limitation.** Clearing site data wipes everything, and it doesn't sync between devices. Use Data → Export regularly.

When that becomes annoying, swap `src/lib/storage.js` for a Supabase client (free tier covers this easily). `loadKey`/`saveKey` are the only two functions that touch storage, so nothing else needs to change.

## Food data

[Open Food Facts](https://world.openfoodfacts.org) — free, crowd-sourced, no API key. Barcode lookup is more reliable than text search because they run on separate infrastructure. Any field can be missing on any product, so anything without calorie data is filtered out of results rather than shown as zero.

If a product you eat isn't in the database, add it via the Open Food Facts app. It'll be there for you and everyone else within a day.

Anything without a barcode — butcher meat, loose veg, a restaurant dish — goes in via Manual entry, once. After that it's in your foods list.

### Meals

The point of the app. Build a meal once from saved foods with per-item gram amounts, then log the whole thing with one tap. A meal records as a single line in Today rather than one line per ingredient.

## Structure

```
src/lib/storage.js    Swap this to change where data lives
src/lib/food.js       Open Food Facts client
src/lib/Scanner.jsx   ZXing camera scanner (lazy-loaded, ~400kB)
src/lib/ui.jsx        Design tokens + shared components
src/tabs/             One file per tab
```

Tabs and the scanner are code-split, so first load is ~20 kB and the heavy bits arrive only when used.

# Ballarat Bigbazar

A fast, responsive website for Ballarat Bigbazar — the South Asian grocery at
209 Gillies St N, Wendouree VIC 3355.

Built for two kinds of customers:

- **Shoppers who know what they want** — a browsable catalogue (`#/shop`) with
  categories, brands, sizes and search, feeding a click & collect basket.
  No online payment: the order is sent to the store and paid at pickup.
- **Newcomers to Indian cooking** — a recipes section (`#/recipes`) with
  step-by-step dishes (butter chicken, biryani, dal…). Every shoppable
  ingredient opens a brand picker straight from the shelves, so a recipe
  becomes a basket in a few taps.

Plain HTML/CSS/JS, no runtime dependencies. Product and recipe data lives in
`data.js` — edit that file to change the range or prices.

## Run locally

```bash
npm run dev
```

## Build for production

```bash
npm run build
```

The finished site is generated in `dist/`.

## Deploy

- **Netlify:** import this repository; `netlify.toml` provides the build
  settings. Click & collect orders arrive via **Netlify Forms** (form name
  `click-collect`) — enable form notifications to ballaratbigbazar@gmail.com in
  the Netlify dashboard.
- **Vercel:** import this repository; `vercel.json` provides the build
  settings. Note: Vercel has no forms backend, so customers use the built-in
  "email a copy" fallback on the order confirmation instead.
- Add the custom domain in the chosen host's dashboard after deployment.

## Details to confirm with the store

- Opening hours (currently shown as "Open 7 days from 10:30 am").
- Phone number (not publicly listed anywhere; only the email
  ballaratbigbazar@gmail.com is shown).
- Real stock list and prices in `data.js` — the range and brands are aligned
  with what comparable Indian grocers in Ballarat actually stock (Shan, MDH,
  Everest, Eastern, Pattu, Indya, Deep, Daawat, Aashirvaad, Bikano, Amul…),
  but prices are still estimates labelled on the site as a guide, confirmed
  at pickup.

## Product photos

Photos in `assets/products/` are genuine packshots sourced from
[Open Food Facts](https://world.openfoodfacts.org) (CC BY-SA — attribution is
in the site footer). Cards fall back to a styled category tile when no photo
exists (mostly house-brand importer lines like Pattu/Shudh/Indya that aren't
in Open Food Facts). To add or replace a photo, drop a `<product-id>.jpg`
into `assets/products/` — best of all, replace them over time with photos
taken in store.

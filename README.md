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

Use only product images that are either:

- photographed by Ballarat Bigbazar/the site owner;
- openly licensed with attribution recorded; or
- supplied by the product distributor/brand with permission.

Do **not** use random Google Images, Blinkit, Zepto, Coles, Woolworths or other
marketplace catalogue photos unless their licence explicitly allows reuse.

To search for exact open-licensed product packshots and save them into
`assets/products/`, run:

```bash
python3 scripts/fetch_open_product_images.py
```

The fetcher searches Open Food Facts, downloads only confident exact matches,
compresses them into catalogue-style square JPGs, and writes source records to
`assets/products/open-image-sources.json` plus `IMAGE_SOURCES.md`.

Cards fall back to a styled category tile when no exact reusable photo exists.
For private-label/importer lines like Pattu, Shudh, Indya, DT or CK, the best
long-term answer is usually to photograph the products in store.

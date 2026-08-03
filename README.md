# ShopTell — Tech Gadgets Affiliate Site

A clean, single-page site with live product data pulled from **Amazon's Creators API**
through a small Vercel serverless function. No build step, no frameworks.

```
shoptell/
├── index.html              the whole site (HTML + CSS + JS in one file)
├── api/
│   └── products.js         serverless function that talks to the Creators API
├── .env.local.example      copy to .env.local for local testing
└── .gitignore
```

## ⚠️ Two things to confirm before you rely on this

**1. Which marketplace is `shoptell-21` actually registered for?**
`-20` is always the US program, so `shoptell-20` → `amazon.com` is safe to
assume. `-21` is shared by several non-US programs (India, UK, Germany) —
`middleware.js` currently assumes it's your **India** tag since your domain
is `.in`. Check Associates Central to confirm. If it's actually your UK or
Germany tag instead, open `middleware.js` and swap the `domain` value next
to it (the tag string itself doesn't need to change).

**2. Your Creators API credential can't fetch India product data.**
Your CSV shows **Version 3.2**, which Amazon groups as the **EU region**
(`amazon.co.uk`, `.de`, `.fr`, `.it`, `.es` only) — it cannot query
`www.amazon.in`. This only affects the *live product data* fetch (title,
image, price via `api/products.js`) — it does **not** affect the redirect
links in `middleware.js`, which work with any tag regardless of this
credential.

So: `middleware.js` can safely send India traffic to `amazon.in` with the
`shoptell-21` tag right now. But `api/products.js` needs a marketplace value
that matches your 3.2 credential (one of the five EU stores above) — set
`CREATORS_API_MARKETPLACE` accordingly, or apply for a separate,
India-capable credential in Associates Central (shown there as Version 3.3)
if you want live data specifically for Indian listings.

## How the live data works

- Each product card in `index.html` has a `data-asin="B0..."` attribute.
- On page load, a small script collects those ASINs and calls `/api/products?ids=...`.
- `api/products.js` runs on Vercel's server, exchanges your Creators API credentials
  for an access token (cached in memory for ~55 minutes), calls Amazon's
  `getItems` endpoint, and returns simplified JSON: title, image, price, and your
  affiliate link.
- The page swaps that into each card. **If the API isn't set up yet, or a card's
  ASIN is still a placeholder (`B0REPLACE01` etc.), the card just keeps its
  static fallback text — nothing breaks.**

Your Client ID and Client Secret only ever live on the server (as Vercel
environment variables). They are never sent to the browser, never written into
`index.html`, and never committed to git (see `.gitignore`) — that's the whole
reason the fetch happens through `/api/products.js` instead of directly from
the page.

## Setup

### 1. Add your real ASINs

In `index.html`, replace each `data-asin="B0REPLACE01"` (through `B0REPLACE12`)
with the real Amazon ASIN for that product (find it in the product's Amazon URL
or under "Product information" on the listing).

### 2. Set your environment variables

Locally: copy `.env.local.example` to `.env.local` and fill in your real values.

On Vercel: **Project → Settings → Environment Variables**, add:

| Variable | Where it comes from |
|---|---|
| `CREATORS_API_CLIENT_ID` | CSV column **"Credential Id"** |
| `CREATORS_API_CLIENT_SECRET` | CSV column **"Secret"** |
| `CREATORS_API_VERSION` | CSV column **"Version"** — yours is `3.2` |
| `CREATORS_API_MARKETPLACE` | One of the EU stores listed above (must match the `3.2` region) |
| `AMAZON_PARTNER_TAG` | Your Associates tracking ID from **Manage Tracking IDs** in Associates Central — this is *not* the same as the CSV's "Application Id" column |

The CSV's "Application" and "Application Id" columns aren't used by the code —
they're just Amazon's internal labels for the credential set.

After adding env vars on Vercel, redeploy so the function picks them up.

### 3. Deploy

**CLI:**
```bash
npm install -g vercel
cd shoptell
vercel
```

**Or GitHub + dashboard:** push this folder to a repo, then in Vercel click
New Project → Import → Deploy. No build settings needed — `index.html` is
served as-is and `api/products.js` is auto-detected as a serverless function.

### 4. Connect your domain

**Settings → Domains → Add** → `shoptell.in` → follow Vercel's DNS instructions
at your registrar.

## Geotargeted affiliate links (redirect by country)

Amazon Associates accounts are country-specific — a `.com` link shown to a
UK visitor won't earn you anything even if they buy. To fix that, every
"View on Amazon" button now points to `/go/<asin>` instead of a fixed URL.

`middleware.js` at the project root intercepts those requests, reads the
visitor's country from Vercel's built-in `x-vercel-ip-country` header (no
external geolocation API, no extra cost), and 302-redirects to the matching
Amazon storefront with your tag for that country:

```js
const STORES = {
  US: { domain: 'www.amazon.com', tag: 'shoptell-20' },
  IN: { domain: 'www.amazon.in', tag: 'shoptell-21' },
  // add more as you register in more marketplaces
};
```

**To set this up:** confirm in Associates Central that `shoptell-21` really
is your India tag (see the conflict note above) — if it's actually UK or
Germany, change the `domain` value for that entry, not the tag. Add more
countries to `STORES` as you register in more Amazon marketplaces.

**Important:** only list a country here once you have a real, approved
tag for that specific Amazon marketplace — Associates tags aren't
interchangeable between countries. Sending someone to a store you have no
tag for isn't harmful, it just won't earn a commission there.

**Testing:** the country header is only populated on a real Vercel
deployment (preview or production) — it's empty when running `vercel dev`
locally, so redirects will fall back to `DEFAULT_COUNTRY` on your machine.
Test the actual behavior after deploying, e.g. with a VPN set to a
different country.

## Search bar

The hero section has a search box (`action="/search"`) that also goes
through `middleware.js` — it geotargets and tags the search just like the
product buttons, sending visitors to `https://<their-store>/s?k=<query>&tag=<your tag>`.
No extra setup needed; it uses the same `STORES` config.

## Categories

The site now covers 19 categories, 57 products total (all still using
placeholder `data-asin="B0REPLACE01"`–`"B0REPLACE57"` values — replace every
one with a real ASIN before launch, same process as before). Categories:
Audio, Smart Home, Everyday Carry, Desk & Work, Mobile Accessories, Personal
Computers, Smart Watches, TV/Appliances & Electronics, Men's Fashion,
Women's Fashion, Shoes/Luggage & Bags/Watches, Beauty/Health & Grocery,
Home/Kitchen & Pets, Sports/Fitness & Outdoors, Toys/Baby/Kids' Fashion,
Car/Motorbike & Industrial, Books, Movies/Music & Video Games, and Digital
Devices.

Worth knowing: spreading across this many categories moves the site from a
focused "tech gadgets" niche to a general marketplace — that's a real
trade-off for SEO and audience-building, since niche sites usually rank and
convert better than broad ones. Nothing to fix here, just something to keep
in mind as you decide what to actually promote.

## Seasonal picks (auto-updates by month)

Right below the hero, a "Trending This Season" section shows a different
set of products depending on the current month — no cron job, no manual
refresh. It's just JavaScript reading the visitor's current date on every
page load and showing the matching block:

| Season | Months (default) | Categories featured |
|---|---|---|
| Winter | Dec, Jan, Feb | Blankets, heaters, thermals, hot water bottles |
| Back-to-School | Mar | Backpacks, stationery, lunch boxes, water bottles |
| Summer | Apr, May, Jun | Fans, air coolers, sunscreen, travel bags |
| Monsoon | Jul, Aug, Sep | Raincoats, umbrellas, shoe covers, mosquito repellents |
| Festive | Oct, Nov | Lighting, gifts, ethnic wear, home decor |

All five sets of products are in `index.html` at all times (good for SEO —
search engines still see them); a small script just shows/hides them based
on `new Date().getMonth()`.

**To adjust the calendar:** edit the `MONTH_TO_SEASON` object near the
bottom of `index.html`. The current mapping is a general India-wide
assumption — festive season timing shifts a bit year to year (Diwali isn't
a fixed date), and back-to-school timing varies by state/board, so treat
this as a starting point rather than exact.

**To add or edit seasonal products:** each season's products are inside a
`<div class="seasonal-block" data-season="...">` block in `index.html` —
same card structure as the rest of the site, so they get the same live-data
fetch and `/go/<asin>` redirect once you swap in real ASINs.



- Amazon's `getItems` endpoint accepts up to 10 ASINs per call — with 57
  products, the front-end automatically splits them into batches of 10.
- Creators API access requires your Associates account to keep at least 10
  qualifying sales in a trailing 30-day window; if that lapses, `/api/products`
  will start returning errors and every card will quietly fall back to its
  static text until access is restored.
- Responses are cached at the edge for an hour (`Cache-Control` header in
  `products.js`) so you're not hitting the token/API limits on every visitor.
- The affiliate disclosure in the header and footer is required by Amazon
  Associates' operating agreement — keep it visible.

// /middleware.js
// Vercel Routing Middleware — runs at the edge, before any page loads.
// Handles requests to /go/<ASIN> by redirecting the visitor to the Amazon
// storefront (and tracking tag) that matches their country, so every click
// is tracked by the correct Associates account.
//
// Country is read from the `x-vercel-ip-country` header, which Vercel adds
// automatically on every deployed request (production/preview) — no external
// geolocation API needed. It's empty when testing with `vercel dev` locally;
// see the README for how to test this.

// Edit this list to match the marketplaces you're actually registered as an
// Associate in. Only add a country here once you have a real tag for it —
// sending traffic to a store where you have no tag just won't earn commission,
// it won't break anything, but there's no point routing there specifically.
//
// ASSUMPTION (verify in Associates Central and fix if wrong): "-20" is
// always the US program, so shoptell-20 -> amazon.com. "-21" is shared by
// several non-US programs (India, UK, Germany); since your domain is .in,
// this defaults to India. If shoptell-21 is actually your UK or Germany
// tag, just change the `domain` value below to match — the tag itself
// doesn't need to change.
const STORES = {
  IN: { domain: 'www.amazon.in', tag: 'shoptell-21' },
  US: { domain: 'www.amazon.com', tag: 'shoptell-20' },
  // GB: { domain: 'www.amazon.co.uk', tag: 'shoptell-21' },  // uncomment + remove IN above if -21 is actually your UK tag
  // DE: { domain: 'www.amazon.de', tag: 'shoptell-21' },     // uncomment + remove IN above if -21 is actually your Germany tag
};

// Used for any visitor whose country isn't in the list above (India is the
// primary market for this site, so everyone outside US/IN also lands on
// amazon.in rather than getting no link at all).
const DEFAULT_COUNTRY = 'IN';

export const config = {
  matcher: ['/go/:asin', '/search'],
};

export default function middleware(request) {
  const country = request.headers.get('x-vercel-ip-country') || DEFAULT_COUNTRY;
  const store = STORES[country] || STORES[DEFAULT_COUNTRY];
  const url = new URL(request.url);

  if (!store) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  if (url.pathname === '/search') {
    const query = url.searchParams.get('q');
    if (!query) {
      return Response.redirect(new URL('/', request.url), 302);
    }
    const target = `https://${store.domain}/s?k=${encodeURIComponent(query)}&tag=${store.tag}`;
    return Response.redirect(target, 302);
  }

  const asin = url.pathname.split('/').pop();
  if (!asin) {
    return Response.redirect(new URL('/', request.url), 302);
  }

  const target = `https://${store.domain}/dp/${asin}?tag=${store.tag}`;
  return Response.redirect(target, 302);
}

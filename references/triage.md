# Triage: decide what kind of site this is

Run `scripts/survey.sh <domain>` first. It needs no credentials — WordPress
exposes most of this publicly — so you can assess a prospect before quoting.

## What the post types tell you

`/wp-json/wp/v2/types` lists every post type. The ones beyond `post`, `page`
and WordPress's internal `wp_*` types are the site's real shape.

**Brochure / blog** — `post`, `page`, `elementor_library`, `e-floating-buttons`.
Pages, posts, category archives, a contact form. This is the straightforward
case. Days, not weeks.

**Directory / listings** — custom types like `properties`, `taxplanners`,
`listings`, usually with `jet-engine` present and custom taxonomies. Each entry
is a page, each taxonomy term is an archive, and there is usually faceted
filtering on top. Migratable, and `references/dynamic.md` is about exactly
this. The work is in the archives and the facets, not the entries.

**Transactional** — any of `orders`, `product`, `shop_order`, `subscription`,
`memberpress_*`, or pages at `/cart/`, `/checkout/`, `/my-account/`. Stop and
have the conversation.

## Why transactional sites are different

A cart holds state across requests. A checkout talks to a payment provider and
must not lose a payment halfway. `/my-account/` means accounts, sessions,
password resets and stored personal data. Orders are records a business is
legally required to keep.

A prerendered build plus a small Worker replaces none of that. You can rebuild
it — commerce on Cloudflare is a real thing — but that is a product build with
payment integration, auth and data migration, not a port of some pages. The
failure mode of pretending otherwise is a client who cannot take money.

**Three honest options**, and the client picks:

1. **Leave WordPress where it is and put Cloudflare in front of it.** Proxy the
   domain, cache full pages for anonymous visitors, bypass the cart, checkout,
   account and any logged-in cookie, serve images through Cloudflare, then
   right-size the hosting plan. This is days, not weeks; it keeps the payment
   flow working; and it addresses the two things the client actually complained
   about — slow, and the bill. Offer it first and offer it honestly, even though
   it is the smallest invoice. A client who has been told the cheap option
   exists trusts the expensive one.
2. **Split the site.** Migrate the marketing pages to the new stack; leave the
   shop on WordPress on a subdomain or path. The shop keeps working. The cost is
   two systems — and the hosting bill does not go to zero, because WordPress is
   still running. If the rising bill is the main driver, say so now.
3. **Scope a rebuild.** Commerce on the new stack is real, but it is a product
   build: payments, auth, order migration, and testing the money path. Quote it
   as that.

Write down which was chosen and why. It is the first thing anyone will question
later.

## Reading the rest of the survey

**Page count** sets the design effort; **post count** sets the content-export
effort. They are independent — a site with 9 pages and 94 posts is mostly an
export job; 40 bespoke Elementor pages and no blog is mostly a design job.

**Custom taxonomies** are archives you owe. Count the terms: 95 cities means 95
archive pages, all of them indexed, all of them in the URL list.

**Forms.** Grep the rendered HTML for `jet-form-builder`, `wpcf7`,
`gravity_form`, `wpforms`. Count the distinct forms and what each one does —
`references/forms.md` handles several forms on one site, but you need to know
how many before you quote.

**The mail setup.** `dig MX` the domain now. If mail runs on the same host as
the site, the cutover is more delicate, and the client needs to understand that
their email is in play. If it's on a separate provider, you just have to not
break it.

## The hosting bill is usually not mostly hosting

"It keeps going up" is the stated reason for most of these jobs, so ask for the
actual invoices before you build a cost comparison. A WordPress site's monthly
cost is often mostly licences — the page builder, the dynamic-content suite, the
SEO plugin's premium tier, backups, a security plugin — and those genuinely do
disappear on a static rebuild, which is a strong, true argument for the project.

But email hosting, a CRM, a booking engine and a channel manager are frequently
in the same invoice and are untouched by any of this. Build the comparison with
the new costs in it too: transactional email, the database, your retainer, and
anything the rebuild introduces. An honest, slightly less impressive number
survives contact with the client's accountant. An optimistic one doesn't.

## Worked examples

Anonymised from real jobs. Numbers are what the survey actually printed.



**A national directory of tax advisers** — one custom type (116 entries), 94 posts, 9 pages;
taxonomies `cities` (95), `states` (57), `services` (8), `certification` (10);
JetSmartFilters. Directory bucket. 116 entries is small enough to ship as a
JSON index and filter in the browser.

**A small serviced-apartment site** — `properties` (12), `orders` (8), plus `/cart/`,
`/checkout/`, `/my-account/`, `/shop/`. Transactional bucket, despite looking
like a small property site. Twelve properties would take an afternoon; the
booking and payment flow is the actual product. This is the site that proves
why you survey before quoting.

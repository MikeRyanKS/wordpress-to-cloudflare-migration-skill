---
name: wordpress-to-cloudflare
description: Migrate a dynamic WordPress website to a prerendered Astro build on Cloudflare Workers — cheaper hosting, a much faster website, SEO not affected because every indexed URL is maintained. Handles the hard cases: Crocoblock/JetEngine custom post types, a WordPress directory with faceted filtering, heavy sites of hundreds of pages, multiple forms on one site, Elementor layouts, and transactional email. Use this whenever someone wants to move a site off WordPress, off shared hosting (Hostinger, GoDaddy, Bluehost, SiteGround, WP Engine), onto Cloudflare, Astro or static hosting, or wants a WordPress site faster, cheaper or rebuilt or modernised without losing rankings — even if they name only one piece of it, like "export my WordPress posts", "migrate a JetEngine directory", "replace Contact Form 7", "will I lose my SEO", "keep the same URLs", "reduce my hosting bill", or "move the DNS to Cloudflare". Also use it to decide whether a site can be migrated at all (carts and checkouts cannot), and to maintain or document a site already migrated this way.
---

# WordPress → Astro on Cloudflare

You are replacing a running business website. Someone's enquiries, rankings and
inbox depend on it. The migration is judged almost entirely on what *doesn't*
change: the URLs, the inbound mail, the leads arriving.

That framing drives everything below. Speed is not the point; nothing silently
breaking is the point.

## Before anything else: is this migratable?

**Read `references/triage.md` and run `scripts/survey.sh <domain>` before
promising anything.** A ten-minute survey decides whether this is a weekend job
or a rebuild that shouldn't be sold as a migration.

The survey prints the site's post types. What it finds puts the site in one of
three buckets:

| What the survey shows | Bucket | What it means |
|---|---|---|
| `post`, `page`, maybe `elementor_library` | **Brochure/blog** | Straightforward. Plan in days. |
| Custom post types + taxonomies, JetEngine, faceted filters | **Directory** | Doable. The archives and facets are the work. See `references/dynamic.md`. |
| `/cart/`, `/checkout/`, `/my-account/`, `orders`, WooCommerce, memberships | **Transactional** | **Stop.** This is not a static migration. |

The third bucket is the one that matters, because it is the one people
misjudge. A site with a cart, a checkout, logged-in accounts or stored orders
has server-side state and payment flows that a prerendered build and a small
Worker do not replace. You can migrate the *marketing* pages and leave the shop
on WordPress, or you can scope a genuine rebuild — but say which, in writing,
before any work starts. Quoting a migration and delivering a broken checkout is
how this goes badly wrong.

Say what you found plainly, including when the answer is "don't".

## The spine

Each step has a reference file with the detail. Read it when you reach that
step, not before — they are long and only one is relevant at a time.

1. **Capture the URL list** — `references/url-parity.md`
2. **Export the content** — `references/content-export.md`
3. **Rebuild the design and routes** — this file, below
4. **Wire the forms** — `references/forms.md`
5. **Set up email** — `references/email.md`
6. **Cut over DNS** — `references/cutover.md`
7. **Write the handover docs** — `references/handover.md`

Steps 1 and 7 are the two people skip and the two that cause the most damage
later. Step 1 is the contract you are held to. Step 7 is why anyone can touch
the site in six months.

## Step 1 — Capture the URL list first

Do this before touching anything, while the old site is still the source of
truth. `scripts/capture-urls.sh <domain> > docs/wordpress-urls.txt` pulls every
URL from the sitemaps and expands paginated archives.

That file is the contract. Every URL in it must exist in the build or have a
deliberate 301. `scripts/urlcheck.mjs` turns it into a build gate that fails CI
— not a checklist someone remembers to run.

**The sitemap is not the whole inventory.** Ask for a 16-month Search Console
Pages export as well. Faceted-filter plugins produce indexed, ranking URLs that
SEO plugins leave out of the sitemap, and on a directory those long-tail pages
are the ones earning money. And note what a URL list built this way cannot see:
cart, checkout and account pages are `noindex`, so they carry no impressions and
appear in neither source — the gate goes green on exactly the pages whose loss
hurts a business most.

Same URL is not the same page. Titles, meta descriptions, canonicals and JSON-LD
are what rankings actually rest on, and they live in the SEO plugin's post meta
rather than in the content. `references/url-parity.md` covers carrying them
across and diffing them.

Capture it early for a reason that only bites later: once the new site is live,
you can no longer ask the old one what it used to serve.

## Step 3 — Rebuilding

**Astro, `output: 'static'`, no adapter.** A Cloudflare Worker serves `dist/`
through the `ASSETS` binding and handles the few dynamic routes. Static
hosting plus one small Worker is enough for everything except the transactional
bucket.

**Match `trailingSlash` to what WordPress served** — almost always `'always'`.
Getting this wrong changes every URL on the site, which is the one thing the
job exists to prevent.

**Keep the media paths byte-identical.** WordPress serves images from
`/wp-content/uploads/YYYY/MM/…`. Keep that exact path in the new build. It
looks odd in an Astro project and it means every image URL already indexed, hot-
linked or embedded in a post still resolves. Renaming them is a self-inflicted
wound with no upside.

**Port the design by measurement, not by eye.** Open the live site and read
`getComputedStyle` for headings, buttons, cards and spacing. Elementor's values
are specific and arbitrary; guessing produces something that is nearly right in
a way clients notice and can't name.

**Carry over only referenced media.** `scripts/prune-uploads.mjs` deletes
uploads nothing in the build references. Run it *after* the design work, not
before — matching the design pulls in assets you'd otherwise delete and
re-download.

## Step 4 — Forms

Full detail in `references/forms.md`. The shape:

- **One endpoint, many forms.** `POST /api/contact` with a hidden `form` field
  naming which form it was. Sites in these buckets routinely have three or four
  forms; one endpoint with a discriminator beats four near-identical handlers.
- **One shared leads table** across all a studio's client sites, with `source`
  naming the site. One query answers "all leads, all clients".
- **The service-role key lives only on the Worker.** The browser never talks to
  the database.
- **Turnstile plus a honeypot**, and read the Turnstile section of that file
  before you wire it — tokens are single-use and the failure mode is a form
  that silently refuses real people.

## Step 6 — Cutover

Full detail in `references/cutover.md`. The order exists because mail is the
part with no undo:

1. Add the zone to Cloudflare — changes nothing on its own.
2. **Diff the imported records against your own snapshot of the live zone.**
   Scanners miss DKIM keys; your own sweep misses hosts that `ANY` hides. Each
   side catches what the other drops.
3. Add email records.
4. Move the nameservers.
5. **Prove inbound mail still arrives** before touching the website records.
6. Point the domain at the Worker.
7. Re-run the URL list against the live domain.

## Dos and don'ts

**Do capture the URL list before you start.** It is the only moment the old
site can still tell you what it served.

**Do make parity a build gate.** A check that fails CI is a guarantee; a check
someone runs when they remember is a hope.

**Do read the error before acting on it.** A `403 authorization` from AWS means
your credentials worked. An `invalid-input-response` from Turnstile means the
token was wrong, not the secret. Reacting to the first as if it were the second
means rotating a key that was never broken.

**Do interpolate error messages into log strings.** `console.error(msg, err)`
renders as a bare stack in Cloudflare's viewer and drops the message — the part
that says what actually failed. `console.error(\`${msg}: ${err.message}\`)`
keeps it. Two separate afternoons were lost to this.

**Do check the authoritative record before theorising.** If submissions might
be failing, query the database. It knows. Reasoning from logs you half-read
produces confident wrong answers.

**Don't migrate a site with a cart, a checkout or user accounts** and call it a
migration. See triage.

**Don't let a scanner be your only DNS inventory.** Cloudflare's import cannot
find DKIM selectors — they're unguessable by design — and a missing DKIM record
means mail starts landing in spam with nothing in any dashboard to explain it.

**Don't put anything in `vars` that must survive a deploy.** `wrangler deploy`
replaces the whole `vars` block from the config file. Dashboard-added variables
are wiped; secrets are left alone. Anything set outside the repo belongs as a
secret even when it isn't secret.

**Don't rename the uploads paths**, change the trailing slash, or "tidy" slugs.
Every one of those is a URL change wearing a different hat.

**Don't leave the old host running but unreachable, and don't cancel it
early.** FTP to the old install is the only way back into the original site.
Keep it until the client confirms nothing is needed from it.

**Don't redesign and re-platform in the same release.** Ship it looking like the
old site. If traffic moves afterwards, you need to know which change did it, and
with both changed at once you are guessing in front of a client.

**Don't quote before you survey, and don't quote fixed-price on a site you
haven't looked inside.** A short paid discovery is the professional move and
clients respect it. "I found something in your admin that changes the plan" is a
trust-building conversation before the work and a climbdown during it.

**Don't promise the hosting saving without seeing the invoices.** Most of a
WordPress bill is often licences, which genuinely do disappear — but email, a
CRM or a booking engine in the same invoice do not. See `references/triage.md`.

**Don't deploy a verification control you haven't tested as a human.** You can
prove bots are blocked. Only a person can prove people aren't.

## Step 7 — The site must ship with its documentation

A migrated site that only you understand is a liability. `references/handover.md`
specifies the docs set every migration produces — what the site is, where
everything lives, how to change it, and the traps. Write it as you go, in the
repo, not afterwards from memory.

Commit messages are part of this. When something behaved surprisingly, record
why in the commit that fixes it — that is where the next person looks.

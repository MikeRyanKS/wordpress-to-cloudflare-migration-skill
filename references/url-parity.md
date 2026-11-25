# URL parity

The client's phrasing is usually "don't lose my rankings". The operational
version: every URL that exists today resolves tomorrow, at the same address.

## Capture before you build

`scripts/capture-urls.sh <domain> > docs/wordpress-urls.txt`

It reads the sitemap index, follows child sitemaps, and expands paginated
archives by walking `/page/2/`, `/page/3/` until one 404s. Pagination matters
because sitemaps leave it out while Google has it indexed.

Do this while the old site is authoritative. Afterwards the information is gone.

**The sitemap is not the whole inventory.** Add, from the client:

- **Search Console → Performance → Pages, exported over 16 months.** Any URL
  with impressions is a URL that earns something, and faceted-filter plugins
  produce indexed, ranking URLs that SEO plugins routinely exclude from the
  sitemap. On a directory this is the single most valuable file you can be
  given, because the pages that rank are the long tail and nothing else lists
  them.
- **Analytics landing pages** over the same period, as a second opinion.
- **The old host's access logs**, if you can get them — the only source that
  shows URLs nobody links to and the sitemap omits.

Deduplicate all of it into one list. Where sources disagree, keep the URL.

Header the file with what it is and the rule: nothing is removed without a 301
replacement. People delete lines to make a failing check pass.

## Make it a gate

`scripts/urlcheck.mjs` asserts every listed URL exists as
`dist/<path>/index.html` and exits non-zero otherwise. Wire it into CI between
build and deploy. A failing deploy is a guarantee; a checklist is a hope.

Add `scripts/linkcheck.mjs` too — it walks the built HTML and fails on internal
links and `#fragment`s that point nowhere.

## The parts people miss

**Pagination.** `/blog/page/2/` through `/page/N/`, and the same for every
category. Check which ones genuinely exist: WordPress 404s or redirects past
the last page, and reproducing a page that never existed is as wrong as
dropping one that did.

**Archive roots.** WordPress may serve categories at `/category/slug/` or at
`/slug/` depending on permalink settings. Check, don't assume.

**Feeds.** `/feed/` is subscribed to by real readers. Astro can't emit an XML
content type at a bare `/feed/`, so serve `/rss.xml` from the Worker at that
exact path with the content type relabelled.

**Old sitemap URLs.** Whatever SEO plugin was installed published sitemaps at
its own paths and Search Console has them on file. 301 them to the new
`/sitemap-index.xml`.

**Attachment pages.** WordPress generates a page per uploaded image unless
something disabled it — `/my-post/photo-name/`. A gallery-heavy site can have
hundreds, and they are often indexed. Check Search Console before deciding:
usually they 301 to the parent, but a bulk 301 of pages that earn traffic is a
loss you chose.

**`?p=123` shortlinks and `_wp_old_slug` redirects.** WordPress answers the
numeric shortlink for every post, and it keeps redirecting a post's previous
slugs after a rename. Both are in the wild — in old emails, in other people's
links — and both silently stop existing on a static build. Export the IDs and
the `_wp_old_slug` meta and turn them into explicit redirects.

**Author and date archives.** `/author/jane/`, `/2024/`, `/2024/03/`. Often
thin, often indexed anyway. Whatever WordPress does today, match it — generate
them or 301 them, and record which you chose.

**Non-ASCII slugs.** A slug containing a non-breaking hyphen or an accented
character is percent-encoded in links, sitemaps and canonicals. Keep the
encoded form, which is what crawlers and browsers send. Note that a build tool
may refuse the raw character in a filename — give the file an ASCII name and
carry the real slug in frontmatter, routing through it.

## Pages you are deliberately dropping

A `410 Gone` says "this is deliberately not here any more". A `301` to an
unrelated page says "this moved", which Google reads as a soft 404 and which
sends anyone with a bookmark somewhere they did not ask for.

So when a cart, checkout, account or shop page is going away: 410 it, or 301 it
to a genuinely equivalent destination — never to the homepage in bulk.

The trap here is quiet. Cart, checkout and account pages are usually `noindex`,
so they carry no impressions and a Search-Console-derived list does not contain
them. A URL gate built from a sitemap and a GSC export therefore passes green
on exactly the pages whose loss hurts a business most. The survey finds these;
your URL list may not. Decide each one explicitly rather than discovering it.

## Same URL is not the same page

A green parity gate proves addresses resolve. It says nothing about what they
serve, and rankings depend on both. Per URL, carry across:

- `<title>` and meta description, **verbatim**. These live in the SEO plugin's
  post meta, not in the content, and they are usually hand-written. Changing
  titles site-wide is the quiet way to lose rankings while congratulating
  yourself on perfect URLs.
- canonical tags — and don't self-canonical a paginated page to page 1.
- JSON-LD. The SEO plugin was probably emitting `LocalBusiness`, `Organization`,
  `BreadcrumbList`, maybe `Offer` or `AggregateRating`. Losing rich results is a
  visible traffic drop that looks exactly like a ranking drop.
- Open Graph and Twitter tags, `hreflang` if there is a second language.
- The internal link graph, nav and footer included.
- Analytics, tag manager, and any ad-conversion tracking IDs.

Diff these field by field between the old site and the new build, across every
URL, and either fix each difference or write down why it is accepted.

**Don't redesign and re-platform in the same release.** If traffic moves after
launch you will not know which change did it, and you will be guessing in front
of a client. Ship the migration looking like the old site; sell the redesign as
its own piece of work afterwards.

## After launch, log the 404s

The parity gate covers URLs you knew about. A 404 logger in the Worker covers
the ones you didn't — and there are always some. Log path and referrer for the
first few weeks and read it weekly. Every entry is either a URL you missed or a
redirect you got wrong, and both are cheap to fix in week one and expensive to
discover in month six.

## Verify twice

Once against `dist/` in CI, and again against the live domain after cutover.
They fail differently: the first catches a page you didn't build, the second
catches a routing or redirect rule that eats it.

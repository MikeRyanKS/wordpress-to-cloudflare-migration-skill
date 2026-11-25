# Exporting the content

WordPress's REST API is the export route. It needs no plugin and no login for
published content: `/wp-json/wp/v2/posts?per_page=100&page=N`, and the same for
`pages` and any custom type the survey found.

`X-WP-Total` in the response headers gives the count, so you know when you have
everything.

## HTML to Markdown, strictly

Gutenberg and Elementor emit HTML that a lazy converter silently mangles. Write
the converter to **fail loudly on any tag it does not recognise** rather than
dropping it. A migration that quietly loses every `<figure>` is worse than one
that stops and tells you.

After converting, check for suspiciously short output — a post that was 1,200
words and converted to 40 lost something.

## What REST does not give you

**SEO titles and meta descriptions.** Yoast, RankMath and SEOPress store these
in post meta that is usually not exposed. They are the single most
rankings-relevant field you are carrying across. Scrape them from the rendered
HTML: fetch each post's URL and read `<title>` and
`<meta name="description">`. Store them verbatim in frontmatter as separate
fields from the on-page heading, because they differ and the difference is
deliberate.

**Custom field values** on custom post types, often. If `meta` comes back empty
but the front end clearly shows the data, the fields aren't registered for
REST. Scrape the rendered entry page, or get database access.

**Elementor layouts.** The REST `content` for an Elementor page is a wrapper;
the layout lives in `_elementor_data`. For page-built marketing pages, rebuild
the page as components rather than trying to convert it. For posts, the body is
usually real content and converts fine.

## Frontmatter

Carry at minimum: title, the verbatim SEO title, the verbatim meta description,
excerpt, published and updated dates, categories, tags, featured image with its
real dimensions and alt text, and the original WordPress ID.

The ID is cheap and settles "is this the same post?" questions later.

Add a slug override field for cases where the filename can't match the URL.

## Dates

A bare `YYYY-MM-DD` parses as UTC midnight and renders as the previous day in
negative-offset timezones. Format with an explicit `timeZone: 'UTC'`, or the
whole archive silently shifts by one day.

## Media

Download only what the build references. Pull the full upload set first if it's
easier, then run `scripts/prune-uploads.mjs` once the design is done.

Build a manifest mapping each image to its WordPress size variants
(`-300x200`, `-768x512`, …) and emit `srcset` from it. The variants already
exist; not using them means phones download desktop images.

Watch for non-image uploads — PDFs linked from posts are easy to filter out by
accident and they 404 loudly.

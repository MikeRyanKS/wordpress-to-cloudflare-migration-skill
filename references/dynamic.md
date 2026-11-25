# Dynamic sites: custom post types, directories, facets

The directory bucket. A custom post type with a few hundred entries, several
taxonomies, and filtering on the front end. All of it can be static; the
question is where the filtering happens.

## Entries become a content collection

Each custom post type maps to an Astro content collection. The meta fields
become frontmatter — a directory entry typically carries name, address, city,
state, phone, email, website, coordinates.

Keep the URL shape WordPress used: `/listings/acme-plumbing/` stays exactly
that, including the type's slug segment.

### Getting the fields out is the part that slips

The REST API gives you published content without a login, which is the easy
path — until it doesn't. On a Crocoblock/JetEngine build, expect one of these:

- **Meta fields not registered for REST.** `meta` comes back empty while the
  page plainly shows a phone number and opening hours.
- **Fields stored outside `postmeta` entirely.** JetEngine can keep a type's
  data in its own table, and its Custom Content Types are not posts at all —
  they live in their own tables with no REST surface and no post ID.
- **Relations** between types (listing → agent, property → development) held in
  JetEngine's own relation tables, invisible to both REST and `postmeta`.

So decide the export route early, because it is the difference between an
afternoon and three days:

1. **A database dump** (`mysqldump`, or phpMyAdmin from the host). Read `posts`,
   `postmeta`, `terms`, `term_relationships` and JetEngine's content and relation
   tables, and emit JSON. Most complete, fully repeatable, no rate limits on a
   host that falls over. Push for this on any site with custom storage.
2. **Register the fields for REST** on the live site — a small change to a
   running production site, so get sign-off.
3. **Scrape the rendered pages.** Always works, slowest to write, and breaks
   wherever the template is inconsistent.

Whichever you use, carry the original WordPress ID into frontmatter. It is free
and it settles every later "is this the same entry?" question.

## Taxonomy archives are pages you owe

Every term with entries is an archive that exists today and is indexed. Four
taxonomies at 95, 57, 10 and 8 terms is 170 archive pages, plus their
pagination. They belong in the URL list and the parity gate.

Generate them from the collection with `getStaticPaths`. Match WordPress's page
size exactly — an off-by-one changes where every paginated boundary falls and
invents or drops a page.

Check whether the live site serves archives at `/taxonomy/term/` or `/term/`,
and whether empty terms render or 404.

## Filtering: pick by size

**Up to a few thousand entries** — ship a JSON index of the filterable fields
and filter in the browser. A few hundred entries is tens of kilobytes. No
server, instant, works offline, no infrastructure. This covers most directories
you will meet.

**Tens of thousands** — pre-render the common facet combinations as real pages
and let the long tail fall back to client-side filtering over a fetched index.

**Beyond that, or when the data changes constantly** — the Worker queries the
database directly. Now you have a dynamic route and caching to think about.

Start at the top. Most "we need a search backend" directories have 200 rows.

Term descriptions and hand-written archive intros are real ranking content and
are dropped more often than anything else in a migration. So are the terms' own
SEO titles and descriptions, which live in term meta. Export them with the terms.

## Keep the filtered URLs that are indexed

Find out which mode the filter plugin is in before you plan anything, because
the two cases are different projects:

- **Query-string mode** — filtering produces `?_city=leeds&_service=plumbing`
  and usually nothing is indexed. Filtering is then purely a front-end concern
  and you are free to implement it however you like. Still keep the **same
  parameter names and value format**: old links and bookmarks use them. Read the
  query string on load, apply the client-side filter, and push new state as the
  filter changes so the URLs stay shareable.
- **Permalink mode** — the plugin rewrites filters into path segments, producing
  real indexable URLs like `/plumbers/leeds/` or `/city/leeds/service/plumbing/`.
  These rank. They are parity work, and they map onto generated pages via
  `getStaticPaths`, which is strictly better than what the site has now.

If the client says they rank for long-tail "city + service" searches, there are
only three places that traffic can land, and you need to know which: the entry
pages themselves, single-taxonomy archives, or genuine two-facet pages. Only the
Search Console export answers it.

### The doorway-page trap

80 cities × 12 services is 960 combinations, and prerendering all of them is
tempting — it looks like free long-tail coverage.

Enumerate exactly the combinations that **already exist and have impressions**,
and generate those. Generating the rest invents hundreds of near-empty pages
Google never saw, which is the textbook doorway pattern and can cost you
rankings rather than win them.

If the client wants that coverage, it is a separate, measured piece of work
after the migration is stable: only combinations with a real number of entries,
each with genuine per-page content. Never bundled into a job whose promise is
"nothing changes".

## Search

A directory usually has a search box. Over a client-side index, filtering by
substring across a few fields is enough and costs nothing. Reach for a search
library when the corpus is genuinely large or needs stemming and ranking.

## What does not convert

Anything that writes. Saved searches, favourites, "claim this listing",
logged-in dashboards. Those are the transactional bucket arriving through a
side door — see `references/triage.md`.

# Dynamic WordPress → Cloudflare Migration Skill

**Migrate a dynamic WordPress website — Crocoblock/JetEngine directories,
hundreds of pages, multiple forms — to a prerendered
[Astro](https://astro.build) build on
[Cloudflare Workers](https://workers.cloudflare.com). Cheaper hosting, a much
faster website, and SEO not affected, because every indexed URL is maintained
and the build fails if one goes missing.**

A [Claude Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview).
Drop it into Claude Code, Claude Desktop, or any agent that reads skills, and it
turns a vague *"can we move this off WordPress?"* into a plan with a contract
behind it.

---

## Contents

- [What this is for](#what-this-is-for)
- [Why migrate at all](#why-migrate-at-all)
- [The core idea: URL parity is a contract](#the-core-idea-url-parity-is-a-contract)
- [Install](#install)
- [Survey any WordPress site in 40 seconds](#survey-any-wordpress-site-in-40-seconds)
- [What's in the box](#whats-in-the-box)
- [Hard-won details it encodes](#hard-won-details-it-encodes)
- [It makes the site maintainable afterwards](#it-makes-the-site-maintainable-afterwards)
- [Testing](#testing)
- [Licence](#licence)

## What this is for

Agencies and freelancers who keep migrating client sites off slow, expensive
shared hosting and keep rediscovering the same traps. It covers:

- **Brochure and blog sites** — pages, posts, category archives, contact forms
- **Dynamic WordPress sites** — custom post types, Crocoblock/JetEngine,
  dynamic listings, popups, several forms on one site
- **WordPress directories** — hundreds of listings, faceted filtering across
  several taxonomies, long-tail city/service landing pages
- **Heavy sites** — hundreds of pages and posts, where the URL inventory is far
  too large to check by hand

And it is equally clear about what it is **not** for: a site with a cart,
checkout or user accounts is not a static migration, and the skill says so
*before* you quote rather than after you've promised.

## Why migrate at all

| | WordPress on shared hosting | Prerendered Astro on Cloudflare |
|---|---|---|
| Hosting cost | Monthly, rising | Free tier covers most brochure/directory sites |
| Page delivery | PHP + database per request | Static files from the edge |
| Falls over under traffic | Regularly | No origin to fall over |
| Plugin/security updates | Forever | None |
| Attack surface | Admin, plugins, database | A static file server |

Two honest caveats the skill insists on, because overselling this is how the
job goes wrong:

- **Most of a WordPress bill is often licences, not hosting.** Page builder,
  dynamic-content suite, premium SEO plugin, backups — those genuinely do
  disappear. Email hosting, a CRM or a booking engine in the same invoice do
  not. Ask for the invoices before you build a cost comparison.
- **Sometimes the right answer is to not migrate.** Putting Cloudflare in front
  of the existing WordPress install addresses "slow" and "expensive" in days,
  keeps the checkout working, and is the smallest invoice. The skill makes you
  offer it first anyway.

A migration is only a success if nothing visible changes. That is what the rest
of this is actually about.

## The core idea: URL parity is a contract

Most of this skill exists to protect one thing — that every URL the old site
served still resolves at the same address.

It captures the complete URL inventory from the live WordPress site **before any
work starts**, writes it to a file, and turns that file into a build gate. If a
page goes missing, CI fails and the deploy never happens. Not a checklist
someone remembers to run.

That matters most on directory sites, where the URLs that rank are the long
tail — `/directory/city/springfield/`, `/listing/acme-tax-llc/`, `/blog/page/7/`
— hundreds of them, none individually memorable, all individually valuable.

Three things the skill is emphatic about here, each learned the expensive way:

- **The sitemap is not the whole inventory.** Faceted-filter plugins produce
  indexed, ranking URLs that SEO plugins exclude from the sitemap. A 16-month
  Search Console export is the only source that lists them.
- **A URL list has a blind spot exactly where it hurts.** Cart, checkout and
  account pages are `noindex`, so they appear in neither the sitemap nor Search
  Console — the gate goes green on the pages whose loss costs a business money.
- **Same URL is not the same page.** Titles, meta descriptions, canonicals and
  JSON-LD live in the SEO plugin's post meta, not in the content. Carrying the
  URLs across and silently rewriting every title is a ranking loss that looks
  like bad luck.

## Install

```bash
git clone https://github.com/MikeRyanKS/wordpress-to-cloudflare-migration-skill.git \
  ~/.claude/skills/wordpress-to-cloudflare
```

Or copy the folder anywhere your agent reads skills from. No dependencies
beyond `bash`, `curl`, `dig`, `python3` and `node`.

Then just describe the job:

> *"I've got a WordPress directory on shared hosting with about 400 listings
> and four filter taxonomies. Client wants it faster and cheaper but cannot
> lose any rankings. What's involved?"*

## Survey any WordPress site in 40 seconds

The first thing the skill does is classify the site. The survey script needs no
credentials — WordPress exposes most of this publicly — so it works on a
prospect's site before you quote:

```bash
./scripts/survey.sh example.com
```

```
════════ example.com ════════
  reachable:   HTTP 200 from 203.0.113.10
  generator:   WordPress 6.8.2;Elementor 3.30.1;

  ── post types ──
    core:   post, page
    custom: jet-engine, jet-theme-core, listings

  ── content volume ──
    posts          94
    pages           9
    listings      116  <- custom type

  ── taxonomies ──
    custom: cities, services, certification, states

  ── transactional signals (see triage.md) ──
    none found

  ── forms ──
       6 wpcf7

  ── mail ──
    MX:  10 mx2.examplehost.com. 5 mx1.examplehost.com.
```

That output decides the bucket: **brochure** (days), **directory** (the archives
and facets are the work), or **transactional** (don't).

The mail line matters more than it looks. If the MX records point at the same
host as the site, cancelling that hosting after migration takes the client's
email with it.

## What's in the box

```
SKILL.md                      the workflow and the dos and don'ts
references/
  triage.md                   classify the site; when NOT to migrate
  url-parity.md               capture the inventory, gate the build, parity beyond the URL
  content-export.md           WP REST export, SEO meta, media, dates
  forms.md                    many forms, one endpoint; Turnstile; spam
  dynamic.md                  custom post types, JetEngine storage, facets, doorway pages
  email.md                    transactional email and its traps
  cutover.md                  DNS snapshot, diff, nameservers, rollback
  handover.md                 the docs every migrated site must ship with
scripts/
  survey.sh                   classify a WordPress site, no credentials
  capture-urls.sh             sitemaps + pagination -> the URL contract
  urlcheck.mjs                build gate: every old URL still exists
  linkcheck.mjs               no broken internal links or fragments
  prune-uploads.mjs           ship only the media actually referenced
evals/                        test cases, runnable with `claude plugin eval`
```

## Hard-won details it encodes

These cost real hours, and they're written down with the reasoning so they're
understood rather than obeyed:

- **A DNS scanner cannot find your DKIM records.** Import tools miss them —
  selectors are unguessable by design — and the result is mail that silently
  starts landing in spam after cutover with nothing in any dashboard to explain
  it. Snapshot the live zone yourself and diff against the scan; each side
  catches what the other drops.
- **Load the verification script where the widget is, not where the first form
  is.** A widget with no script renders nothing, the form posts with no token,
  and the server tells the visitor to complete a check that isn't on the page.
  It fails closed and logs nothing, because a missing token looks exactly like a
  visitor who never solved one.
- **Turnstile tokens are single-use and expire in ~5 minutes.** If the form
  doesn't reset the widget, one rejected submission locks that visitor out
  permanently — and someone who takes six minutes writing a considered enquiry
  hits it having done nothing wrong.
- **A widget inside a closed `<dialog>` cannot render implicitly.** The implicit
  sweep runs once at load and skips anything `display: none`.
- **A `403 authorization` error means your credentials worked.** Reacting to it
  as though it were a bad key means rotating something that was never broken.
- **`console.error(msg, err)` drops the message** in Cloudflare's log viewer and
  shows a bare stack. Interpolate instead, or you'll debug blind.
- **`wrangler deploy` replaces the whole `vars` block** but leaves secrets
  alone. Anything set in the dashboard that must survive a deploy belongs as a
  secret even when it isn't secret.
- **Don't prerender every facet combination.** 80 cities × 12 services is 960
  pages Google never saw — a textbook doorway pattern. Generate the ones that
  already rank; sell the rest as a separate, measured piece of work.
- **Don't redesign and re-platform in the same release.** If traffic moves you
  won't know which change did it, and you'll be guessing in front of a client.
- **Check the authoritative record before theorising.** If submissions might be
  failing, query the database. It knows; your reading of the logs may not.

## It makes the site maintainable afterwards

A migrated site that only its builder understands is a liability. The skill
specifies a documentation set that ships in the repo — what the site is, where
everything lives, how to add a post or change a price, the DNS snapshot and
rollback path, and a `decisions.md` recording everything that looks wrong
without context.

The test for including a decision: *would someone competent, six months from
now, be tempted to "fix" this?* If yes, it gets written down — because the
uploads path really does look wrong, and renaming it really does break every
indexed image.

It also writes a `CLAUDE.md` so the next agent to open the repo doesn't helpfully
tidy a URL into a 404.

## Testing

```bash
claude plugin eval --path .
```

Three cases: refusing a transactional site, planning a faceted directory, and
diagnosing a form that rejects real visitors.

They are graded against a no-skill baseline, which is worth saying plainly: a
capable model already knows most of general migration practice, and 8 of 9
assertions pass without the skill at all. What the skill adds is the parts no
model can infer — the provider-specific failures above, and the insistence on
turning parity into a gate rather than an intention.

Running the suite against a real migrated repository is also how the
missing-verification-script bug in that list was found. It was live at the time.

## Licence

MIT. No warranty — you are migrating someone's business website. Verify
everything, and keep the old host alive until the client confirms they don't
need it.

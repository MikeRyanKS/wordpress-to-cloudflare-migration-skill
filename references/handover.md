# The documentation the site ships with

A migrated site is handed to someone else — a colleague, the client, an AI
agent in a fresh session with no memory of any of this. Everything that made
the migration work lives in decisions that are invisible in the code: why the
uploads path looks wrong, why one field is named oddly, why the region is what
it is.

Write these as you go, in `docs/` in the repo. Written afterwards from memory,
they lose exactly the details that matter.

## The files

### `docs/README.md` — what this is

The orientation page. Someone opening the repo cold should know within a minute
what the site is, what it runs on, and where to look next.

- What the site is and who owns it
- The stack in three lines: prerendered Astro, Cloudflare Worker serving
  `dist/` plus `POST /api/contact`, leads to Supabase, mail via the provider
- Where things live: the GitHub repo, the Cloudflare account and Worker name,
  the Supabase project ref, the DNS registrar, the mail provider and region
- How to run it locally, and how a change reaches production
- A map of the other docs
- The standing warnings: don't cancel the old host, don't change a URL

### `docs/site-map.md` — how the pages connect

The file people assume exists and never does. Someone inheriting the site needs
to see its shape before they can safely change a route.

- **A page graph.** A Mermaid diagram renders on GitHub and in most editors, so
  it is worth the few lines: entry points, the deep branches (usually the blog
  or the listings), and the pages reachable only by submitting a form.
- **A route inventory**: every URL shape, which file builds it, and how many
  pages that produces. The counts should add up to the number in the URL
  contract — if they don't, one of the two is wrong and it is worth knowing which.
- **Where the content comes from**: which collection or constants file feeds
  which route.
- **The form flow**, as a sequence diagram: visitor → endpoint → spam checks →
  database → response → email. Worth drawing because the ordering is deliberate
  and invisible in the code: the response goes out before the email is sent, so a
  mail failure cannot cost a lead.
- **What the Worker handles instead of the file server**, and the fact that
  `run_worker_first` is an allowlist whose omissions fail silently.
- Redirects that live in the provider's dashboard rather than the repo, which are
  otherwise invisible to anyone reading the code.

### `docs/wordpress-urls.txt` — the contract

Every URL the WordPress site served. Headed with what it is and the rule: no
line is removed without a 301 replacement. People delete lines to make a
failing check pass, and the header is what stops them.

### `docs/dns-cutover.md` — the zone, before and after

- The live zone as captured before anything moved, including what was absent
- What the diff caught, on both sides
- The current records and why each is proxied or not
- The order of operations and the rollback path

This is the file that saves someone when mail breaks at 11pm.

### `docs/email-setup.md` — the runbook

Step by step, with real account IDs and regions filled in, including the traps
in `references/email.md`. Written so the next client site can be done by
following it rather than rediscovering it.

### `docs/content.md` — how to change things

The part the client actually needs, in their language:

- How to add a blog post: which folder, which frontmatter fields, what happens
  on push
- How to add a directory entry, if the site has them
- How to change a price, a phone number, the address — and that these live in
  one constants file, not scattered through pages
- How images work and why the paths look like WordPress
- What *not* to edit

### `docs/decisions.md` — why things are the way they are

Short entries, each a decision that looks wrong without context:

> **Uploads keep the `/wp-content/uploads/` paths.** Every indexed image URL,
> hot-link and embed still resolves. Renaming them breaks all of that for
> tidiness.

> **The honeypot field is `website`; the real one is `website_url`.** Swapping
> them silently discards every genuine quote enquiry.

> **SES region is us-east-2 because the AWS account is pinned to it,** not by
> preference. Identities are per-region.

The test for inclusion: would someone competent, six months from now, be
tempted to "fix" this? If yes, write it down.

## The machine-readable files

Four, and all four are **generated from the content at build time**, never
hand-written. A hand-maintained list of fifty posts is a list that is wrong by
next month.

| File | For |
|---|---|
| `/sitemap-index.xml` | search engines |
| `/rss.xml` | feed readers, and the old `/feed/` path via the Worker |
| `/robots.txt` | crawlers; points at the sitemap and names the llms file |
| `/llms.txt` | AI crawlers and assistants |

**`/llms.txt`** follows the [llmstxt.org](https://llmstxt.org) convention: an H1
name, a blockquote summary of what the business does, then linked sections with a
sentence on each — the key pages, the topics with their article counts, every
article with its excerpt, and an `## Optional` section for the legal pages, feed
and sitemap. Generate it from the same collections the pages are built from, so
adding a post updates it with no action from anyone.

**If the old site had any of these, carry them over and verify them rather than
regenerating from scratch.** A WordPress `robots.txt` may carry `Disallow` rules
that exist for a reason, and an existing `llms.txt` or `ai.txt` may have been
written by hand and be more accurate than anything you would generate. Check
first: a 301 to the homepage at `/llms.txt` is a catch-all redirect, not a file,
and an empty `robots.txt` is WordPress's default rather than a decision.

If the old site had none, create them. None is part of the URL contract, so
nothing breaks if one is removed — but the crawlers reading `llms.txt` are
increasingly the ones sending people to the site.

Record in `decisions.md` that these are generated, so nobody edits the built
output and wonders why their change vanished on the next deploy.

## Commit messages are documentation

When something behaves surprisingly, record why in the commit that fixes it.
That is where the next person looks, and it is attached to the change rather
than to a document that drifts.

A good one says what was observed, what caused it, and what would otherwise be
assumed:

> **Reset Turnstile after a submission, so a retry can succeed**
>
> A token is single-use and expires after five minutes, and the form never
> reset the widget. Any rejected submission left the spent token in the form,
> every retry resubmitted it, and the visitor was told "Verification failed"
> forever with reloading the only escape.

## A `CLAUDE.md` for the agents

Agents read `CLAUDE.md` before touching a repo. Keep it short and put the
traps in it — the URL contract, the honeypot naming, the uploads paths, the
secrets-versus-vars rule, and that `scripts/urlcheck.mjs` must pass.

## What "done" looks like

Someone who has never seen the site can, from the repo alone: run it locally,
add a blog post, change a phone number, find where leads land, see how the pages
connect without reading the routing code, understand why a URL cannot change,
and recover the DNS if the cutover went wrong.

If any of those needs a conversation with you, the documentation is not
finished.

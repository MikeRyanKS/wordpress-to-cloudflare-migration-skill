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
add a blog post, change a phone number, find where leads land, understand why a
URL cannot change, and recover the DNS if the cutover went wrong.

If any of those needs a conversation with you, the documentation is not
finished.

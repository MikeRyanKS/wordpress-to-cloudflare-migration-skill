# DNS and cutover

The order below exists because mail is the half with no undo. A website that
breaks for ten minutes is embarrassing; mail that silently stops is a business
problem discovered days later.

## Snapshot the live zone yourself, first

Before adding anything to Cloudflare, record what the public resolvers answer:
apex `A`/`AAAA`, `www`, `MX`, apex `TXT` (SPF), any DKIM selectors you can find,
and whatever subdomains exist.

Record what is *absent* too — no CAA, no DMARC, only one DKIM selector. A later
gap is then recognisable as a gap rather than assumed to have always been there.

Query each type separately. `dig name ANY` answers `RFC8482` and tells you
nothing, which hides hosts that exist.

## Diff, don't trust

Cloudflare scans the zone when you add a domain. The scan and your snapshot
each miss things the other catches:

- **The scan cannot find DKIM selectors.** They are unguessable by design. A
  missing DKIM record means outbound mail loses its signature at cutover and
  starts landing in spam with nothing in any dashboard explaining it.
- **Your sweep misses hosts you didn't guess**, like an `ftp` record, which the
  scan reads straight from the zone.

Add by hand whatever the scan missed, and verify long records character by
character.

## Apex addresses may rotate

Shared hosts answer from a pool: three queries minutes apart can return three
different pairs, and the scan may capture a fourth. Check that each candidate
actually serves the site (`curl --resolve` with the right `Host`), then pin
whichever the scan captured — they are temporary anyway.

## Keep everything DNS-only until the Worker takes over

Proxying the old records puts Cloudflare in front of the old site before its
certificate is ready, for no benefit when the site is about to be replaced.
`ftp` in particular **must** stay unproxied: the proxy carries only HTTP and
HTTPS, so a proxied `ftp` record breaks FTP outright — and FTP is your way back
into the old install.

## The order

1. **Add the zone.** Changes nothing; traffic and mail still flow from the old
   host. Safe to sit here indefinitely.
2. **Diff the records.** Fix what the scan missed.
3. **Add the email records** — DKIM CNAMEs, the MAIL FROM MX and SPF. Doing it
   now means entering them once.
4. **Change the nameservers at the registrar.** Find the registrar with
   `whois`; it is frequently not the host. Propagation is usually minutes.
5. **Prove inbound mail arrives.** Send a real message. Do not proceed on DNS
   records looking right.
6. **Point the site at the Worker.**
7. **Re-run the URL list** against the live domain.

## Pointing the apex at the Worker

The deploy fails while the old A records exist:

```
Hostname 'example.com' already has externally managed DNS records
(A, CNAME, etc). Delete them first. [code: 100117]
```

So: delete the apex `A`/`AAAA` records, then deploy immediately. There is a
short window where the apex does not resolve; triggering the deploy straight
after the deletion keeps it to a minute or two.

## www needs a record *and* a rule

A redirect rule only fires for hostnames that reach Cloudflare's rules engine,
so www needs a **proxied** record — a `CNAME` to the apex is fine. Then a
Redirect Rule from the "WWW to root" template, 301.

**Turn on "Preserve query string".** The template leaves it off, which strips
`?utm_source=` from every redirected link and quietly destroys campaign
attribution.

Cloudflare may warn that www is not proxied when it is. Ignore it rather than
accepting its offer to create a second record.

Allow a few minutes before believing a test. Immediately after deploying the
rule the old host's redirect may still answer — that is propagation, not
misconfiguration. Check the `server` header to see who replied.

## Turn off workers.dev

While it is on, the whole site answers on `<worker>.<subdomain>.workers.dev` as
well as the real domain: a complete duplicate of every indexed page. Canonical
tags point home, so it would probably be fine — but "probably fine" is not the
standard for a migration whose entire purpose is that no URL moves.

## Rolling back

Before the nameserver change there is nothing to undo. After it, put the old
nameservers back at the registrar. After the site cutover, restore the old
`A`/`AAAA` records and the `www` CNAME from your snapshot — which is why the
snapshot is worth keeping in the repo.

Keep the old host alive until the client confirms nothing is needed from it.

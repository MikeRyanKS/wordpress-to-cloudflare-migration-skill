# Transactional email

The form sends two messages: an alert to the business, and a confirmation to
the person who submitted. The confirmation is why this is harder than it looks
— it must come from the client's own domain, so every client site needs its own
verified sender.

Cloudflare Email Routing forwards inbound only. It can never send. It is not an
option for this, however convenient it looks sitting in the same dashboard.

## Choosing a provider

The binding constraint is **domain count**, not volume. A studio with eight
client sites sends perhaps 700 emails a month total and needs eight verified
senders.

- **Amazon SES** — 10,000 identities per region, $0.10 per 1,000. Pennies a
  year. Costs: SigV4 signing, and the sandbox.
- **ZeptoMail** — 100 domains, ~$5/year, plain bearer token. Credits expire
  after six months whether used or not, and new accounts are capped pending
  review.
- **Resend / MailerSend** — 10 domains on normal plans. Fine for a few sites,
  expensive to extend.

Providers that put their logo on free-tier mail are unusable for client-facing
confirmations.

## SES, and the three traps

Each of these looks like a different problem than it is.

**1. A free-plan AWS account cannot send at all.** Signing up now gives the new
AWS experience: a free plan and an auto-created organisation with one project
account. SES there reports `0 emails per 24-hour period` and **no "Request
production access" button**. It reads as a permissions problem and is not —
AWS's guardrail policy explicitly allows `ses:*`. Adding a payment method is
what lifts it. Upgrade at settings.aws.com → Billing. Do **not** click
"Activate advanced features": irreversible and unrelated.

**2. A project account is pinned to one region.** Every other region answers
"Region unavailable" — but the SES dashboard in a wrong region renders normally
and shows a 0 quota with no request button, indistinguishable from trap 1.
Check the region before concluding anything. Identities are per-region, so
verifying a domain in the wrong one verifies it somewhere you cannot send from.

**3. The sandbox checks the recipient, as an IAM authorization error.** With
everything configured, the confirmation to an address under the verified domain
sends, while the alert to a mailbox elsewhere fails with:

```
403 User '...:user/x-ses-sender' is not authorized to perform 'ses:SendEmail'
on resource 'arn:aws:ses:...:identity/<the recipient>'
```

That is the sandbox requiring verified destinations, not a broken key. **A 403
authorization error means the credentials and signing worked.** A bad key gives
`InvalidClientTokenId` or `SignatureDoesNotMatch`. Production access removes
the destination check.

## Setup, in order

1. **Request production access first** — it is the long pole, roughly a day,
   and account-wide so it is never repeated.
2. Verify the domain with Easy DKIM.
3. Set a custom MAIL FROM subdomain (`mail.<domain>`). This keeps the apex SPF
   free for the inbound provider while DMARC still passes through DKIM
   alignment — two mail providers on one domain with nothing to argue over.
4. Turn off any "publish to Route 53" option if DNS is elsewhere.
5. Create a send-only IAM user scoped to that one identity's ARN. If the key
   leaks, the worst case is mail from a domain you control.
6. Set the credentials as Worker **secrets**.

AWS answers the production-access request with a six-question follow-up
(URL, mail type, volume, recipient source, bounce handling, a sample). Answer
all six specifically in one reply, **on the support case in the console** —
replying to the notification email bounces, because that address rejects
incoming mail.

Keep the bounce answer honest. "The account-level suppression list is enabled,
every SES response is logged against the submission that caused it, and a
bounce cannot repeat because each address is emailed once with no list to
re-send to" is true and sufficient. Claiming an SNS pipeline you haven't built
is not.

## The IAM policy editor

The JSON tab does not feed the form's validator. Pasted JSON displays
correctly, reports no errors, and the form still insists "No actions
specified". **Use the Visual editor** — pick the service, the action, then the
resource ARN. It produces identical JSON that the form accepts.

## Send after responding

Send the mail in `ctx.waitUntil()` after the response is returned. The lead is
already stored; a slow or failing provider must never turn a saved lead into an
error page.

Log failures with the message interpolated into the string. Passing an Error as
a second argument renders as a bare stack in Cloudflare's viewer and drops the
status and response body entirely.

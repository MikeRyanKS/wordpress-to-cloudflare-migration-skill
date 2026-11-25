# Forms

A WordPress site in these buckets usually has several: a contact form, a quote
or booking request, a newsletter box, sometimes one per landing page. Replacing
each with its own endpoint produces four near-identical handlers that drift.

## One endpoint, many forms

`POST /api/contact` handles all of them. Each form carries a hidden field
naming itself:

```html
<input type="hidden" name="form" value="estimate" />
<input type="hidden" name="page" value="/get-a-price-estimate/" />
```

The Worker stores `form` alongside the lead, so "how many quote requests this
month" is a `where` clause. `page` records which page it came from, which
answers questions the client will ask later about where enquiries originate.

Map each form name to its thank-you page **server-side**. Taking a redirect
target from the submitted form is an open redirect.

## One table across every client site

A studio running several client sites wants one query for "all leads". Use one
table with a `source` column holding the site's hostname, set from a per-site
`LEAD_SOURCE` variable. A field only one site needs becomes a nullable column.

RLS on, zero policies: the service role (each site's Worker) can write and
nothing else can. The browser never holds the key.

## Progressive enhancement

Handle both: a native form POST gets a 303 to the thank-you page; a `fetch`
with `Accept: application/json` gets JSON back and shows the reply in place.
The form keeps working with JavaScript disabled or still loading.

## The honeypot naming trap

A honeypot field named `website` is the obvious choice. It is also the obvious
name for a real "your existing website" field on a quote form. If both exist,
every genuine quote enquiry is silently discarded as spam, and nothing in any
log says so because the honeypot path returns success deliberately.

Name them distinctly — honeypot `website`, real field `website_url` — and put a
comment on the honeypot saying why it must not be renamed.

Return success from the honeypot path. Telling a bot it was caught invites a
retry with the field removed.

## Turnstile

Render the widget only when a site key is configured, and verify only when the
secret is configured, each checked independently. That way a half-finished
setup degrades to honeypot-only rather than rejecting everyone.

**Tokens are single-use and expire after about five minutes. Reset the widget
after every submission, successful or not.** Without this, any rejected
submission leaves the spent token in the form, every retry resends it, and the
visitor is told "Verification failed" forever with reloading as the only
escape. The expiry half is worse: someone who takes six minutes to write a
considered enquiry hits it having done nothing wrong.

```js
const resetTurnstile = () => {
  try {
    const widget = form.querySelector('.cf-turnstile');
    window.turnstile?.reset(widget);
  } catch {
    // reset() throws when the container exists but holds no rendered widget.
  }
};
```

**Wrap the reset, and re-enable the submit button in a `finally`.** `reset()`
throws if the container has no successfully-rendered widget in it — which is
exactly the state of a widget inside a dialog that has never been opened. A
throw between the reset and the re-enable leaves the button disabled with a
stale error frozen on screen, for the rest of that visit. The same mistake on
the success path reports a saved lead as a failure.

**Add `expired-callback` and `error-callback`** so a token that goes stale while
someone is typing refreshes itself before they press Send, rather than being
discovered at submit time.

### Load the script where the widget is

The widget needs `api.js`; if the script is missing the container renders
nothing, the form posts with no token, and the server rejects it with a message
telling the visitor to complete a check that is not on the page. There is
nothing to click and no way through.

This fails closed and silently. Nothing appears in any log, because a missing
token is indistinguishable from a visitor who simply never solved one.

So: **load `api.js` once in the layout**, not inside one form component. The
moment a second form appears somewhere else — a modal in the header, a footer
newsletter box — a script that lives in the first component is absent from every
page the second one renders on. A real instance of this ran for two hours on a
live site, breaking the enquiry form on every page except two, with the form
looking entirely normal.

**A widget inside a closed `<dialog>` or any `display: none` container cannot
render implicitly.** The implicit sweep runs once at load and skips it. Load the
script with `render=explicit` and an `onload` callback, render the visible
widgets then, and have the dialog render its own when it opens.

**`remoteip` is optional, and sending it can reject real people.** If you pass
the connecting IP to `siteverify`, it must match the address that solved the
challenge. Mobile visitors on carrier NAT, anyone handing off between Wi-Fi and
cellular, dual-stack IPv4/IPv6, and VPN users can all submit from a different
address than they solved from. The symptom is a visitor who fails persistently
with fresh tokens while you never reproduce it. If you send it, know that; if
you cannot explain a persistent per-visitor failure, drop it first.

**Log the error codes.** `invalid-input-secret` means the secret belongs to a
different widget; `timeout-or-duplicate` means a spent or stale token;
`invalid-input-response` means the token doesn't match the secret in use. Three
unrelated fixes, indistinguishable without the codes.

One widget per site, with the apex and `www` as hostnames. A separate widget
per client keeps analytics and revocation separate.

**Test it as a human before calling it done.** An automated browser is what
Turnstile exists to stop, so your own test proves nothing about real visitors.
A verification step that silently refuses everyone looks perfectly healthy from
outside.

## Privacy

Hash IPs with a salt rather than storing them: enough to spot one address
hammering the form, not a stored identifier. Changing the salt later orphans
every existing hash, so set it once.

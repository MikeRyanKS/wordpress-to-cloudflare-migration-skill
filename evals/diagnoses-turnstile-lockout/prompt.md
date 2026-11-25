---
tags: [wordpress-migration]
max_turns: 25
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Something's wrong with the contact form on a site I migrated to Cloudflare Workers last week. It's an Astro static build, the Worker handles POST /api/contact, saves to a database and I put Cloudflare Turnstile on it a few days ago.

Visitors are complaining. Two have said they filled in the form, hit send, and got "Verification failed. Please try again." — and then it kept saying that no matter how many times they tried. One of them gave up and phoned instead. When I test it myself on a fresh browser it works fine first time.

Where do I even start?

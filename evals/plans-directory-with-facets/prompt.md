---
tags: [wordpress-migration]
max_turns: 25
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I need a migration plan for a WordPress business directory. It has around 450 listing entries as a custom post type, plus 90 blog posts and about 10 normal pages. There are four custom taxonomies (city, region, service type, accreditation) with roughly 80, 40, 12 and 8 terms, and the front end has filter dropdowns that narrow the listings. It's built with Crocoblock/JetEngine and runs on cheap shared hosting that falls over whenever it gets traffic.

Target is Astro on Cloudflare. The absolute requirement from the client is that no URL changes — they rank for a lot of long tail city + service searches.

Give me the plan. Don't build anything yet.

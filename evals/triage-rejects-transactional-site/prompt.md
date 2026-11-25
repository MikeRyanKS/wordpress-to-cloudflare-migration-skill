---
tags: [wordpress-migration]
max_turns: 25
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

A client wants their WordPress site moved off shared hosting onto Cloudflare because it's slow and the hosting bill keeps going up. It's a boutique hotel site — about 15 room/property pages, a gallery, a contact form and a booking form. I had a quick look at the WordPress admin and the post types are: post, page, properties, orders, elementor_library, jet-popup, jet-form-builder, jet-engine. There are pages at /cart/, /checkout/, /my-account/ and /shop/.

I've quoted them for a 1 week migration to Astro on Cloudflare. Can you sanity check my plan before I start? I want to keep all the URLs the same so their SEO doesn't drop.

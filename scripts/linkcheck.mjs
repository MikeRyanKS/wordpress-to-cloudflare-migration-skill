/**
 * Internal link check over the built site.
 *
 * Every href that points at this site must resolve to a built page, an asset
 * on disk, or a path the Worker handles. Catches a typo in a nav item or a
 * post link that a build will happily ship.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Paths answered by the Worker, not by a file in dist/. */
const WORKER_PATHS = new Set(['/api/contact', '/feed/', '/feed']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (!existsSync(dist)) {
  console.error('dist/ does not exist. Run `npm run build` first.');
  process.exit(1);
}

const pages = [];
for await (const file of walk(dist)) if (file.endsWith('.html')) pages.push(file);

const broken = [];
const anchorsByPage = new Map();

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const page = '/' + file.slice(dist.length + 1).replace(/index\.html$/, '');
  anchorsByPage.set(
    page,
    new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  );
}

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const page = '/' + file.slice(dist.length + 1).replace(/index\.html$/, '');

  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const raw = match[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(raw)) continue;
    if (!raw.startsWith('/')) continue;

    // Strip the query before resolving: a couple of posts link to
    // "/?utm_source=gemini", which is the homepage with a tag on it.
    const [beforeHash, hash] = raw.split('#');
    const target = decodeURI(beforeHash.split('?')[0] || '/');
    if (WORKER_PATHS.has(target)) continue;

    const onDisk = extname(target)
      ? join(dist, target)
      : join(dist, target, 'index.html');

    if (!existsSync(onDisk)) {
      broken.push(`${page} -> ${raw} (no ${onDisk.slice(dist.length)})`);
      continue;
    }
    if (hash && !extname(target)) {
      const ids = anchorsByPage.get(target.endsWith('/') ? target : target + '/');
      if (ids && !ids.has(hash)) broken.push(`${page} -> ${raw} (no #${hash} on that page)`);
    }
  }
}

if (broken.length) {
  console.error(`\n${broken.length} broken internal link(s):\n`);
  for (const b of broken) console.error('  ' + b);
  console.error('');
  process.exit(1);
}
console.log(`Link check: ${pages.length} pages, no broken internal links.`);

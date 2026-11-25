/**
 * URL parity gate.
 *
 * The one thing this migration must not do is move a URL. Every address the
 * WordPress site published is listed in docs/wordpress-urls.txt, captured from
 * its sitemaps before the cutover. This asserts that the built site answers
 * every one of them, byte for byte.
 *
 * It runs in CI before deploy. If it fails, nothing ships.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('dist/ does not exist. Run `npm run build` first.');
  process.exit(1);
}

const listed = (await readFile(join(root, 'docs/wordpress-urls.txt'), 'utf8'))
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const missing = [];
for (const url of listed) {
  // trailingSlash: 'always' means every page is dist/<path>/index.html.
  const file = join(dist, url.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) missing.push(url);
}

if (missing.length) {
  console.error(`\n${missing.length} WordPress URL(s) are not in the build:\n`);
  for (const url of missing) console.error(`  ${url}`);
  console.error(
    '\nEvery one of these is indexed. Produce the page at the same address, ' +
      'or add a 301 in worker/index.ts and remove it from docs/wordpress-urls.txt ' +
      'with a note saying why.\n'
  );
  process.exit(1);
}

console.log(`URL parity: all ${listed.length} WordPress URLs are present in dist/.`);

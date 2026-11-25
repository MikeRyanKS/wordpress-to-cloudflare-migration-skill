/**
 * Delete every file in public/wp-content/uploads that the built site does not
 * reference.
 *
 * The WordPress media library held 182 items and ~700 generated size variants,
 * most of which no page ever rendered: unused library uploads, plus the
 * 1536w / 2048w / `-scaled` versions of images the site only ever showed at
 * 1024w or smaller. Carrying those into the repo and the Worker's asset bundle
 * costs size for nothing.
 *
 * Run it after `npm run build`. It reads dist/, so anything a page links —
 * including every entry in a srcset — is kept. Pass --dry to list only.
 */
import { readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const uploads = join(root, 'public/wp-content/uploads');
const dry = process.argv.includes('--dry');

if (!existsSync(dist)) {
  console.error('dist/ does not exist. Run `npm run build` first.');
  process.exit(1);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

// Every /wp-content/uploads/... path mentioned anywhere in the build.
const referenced = new Set();
const pattern = /\/wp-content\/uploads\/[^\s"'<>)\\,]+/g;
for await (const file of walk(dist)) {
  if (!/\.(html|xml|txt|js|css|json)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const match of text.match(pattern) ?? []) {
    referenced.add(decodeURI(match.replace(/&amp;/g, '&')));
  }
}

const kept = [];
const removed = [];
for await (const file of walk(uploads)) {
  const web = '/wp-content/uploads/' + relative(uploads, file).split(/[\\/]/).join('/');
  if (referenced.has(web)) kept.push(web);
  else removed.push(file);
}

for (const file of removed) if (!dry) await rm(file);

console.log(`${dry ? 'Would remove' : 'Removed'} ${removed.length} unreferenced upload(s); kept ${kept.length}.`);
const missing = [...referenced].filter((r) => !kept.includes(r));
if (missing.length) {
  console.warn(`\nWarning: ${missing.length} referenced upload(s) are not on disk:`);
  for (const m of missing.slice(0, 20)) console.warn('  ' + m);
  process.exitCode = 1;
}

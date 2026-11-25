#!/usr/bin/env bash
# Capture every URL a WordPress site serves, before migrating it.
#
#   ./capture-urls.sh example.com > docs/wordpress-urls.txt
#
# Reads the sitemap index, follows child sitemaps, then expands paginated
# archives by walking /page/N/ until one stops returning 200. Sitemaps omit
# pagination; Google has it indexed. See references/url-parity.md.
set -uo pipefail
S="${1:?usage: capture-urls.sh <domain>}"
S="${S#http://}"; S="${S#https://}"; S="${S%%/*}"
B="https://$S"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

locs() { curl -s -m 30 "$1" | grep -oE '<loc>[^<]+</loc>' | sed -E 's|</?loc>||g'; }

# Find the sitemap index, wherever the SEO plugin put it.
for c in sitemap_index.xml sitemap.xml sitemaps.xml wp-sitemap.xml; do
  if curl -s -o /dev/null -m 20 -w '%{http_code}' "$B/$c" | grep -q '^200$'; then
    IDX="$B/$c"; break
  fi
done
: "${IDX:?no sitemap found — check the SEO plugin, or list URLs by hand}"

{
  locs "$IDX" | while read -r u; do
    case "$u" in *.xml) locs "$u";; *) echo "$u";; esac
  done
} | sed 's|/*$|/|' | sort -u > "$TMP/base.txt"

# Expand pagination for anything that looks like an archive root.
: > "$TMP/pages.txt"
while read -r u; do
  depth=$(echo "${u#$B/}" | awk -F/ '{print NF-1}')
  [ "$depth" -le 1 ] || continue
  for n in $(seq 2 60); do
    code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "${u}page/$n/")
    [ "$code" = "200" ] || break
    echo "${u}page/$n/" >> "$TMP/pages.txt"
  done
done < "$TMP/base.txt"

cat <<HEADER
# Every URL $S served as a WordPress site, captured $(date +%Y-%m-%d).
#
# This file is the migration's contract. Every URL below must resolve at the
# same address after the migration, or have a deliberate 301 to a replacement.
#
# scripts/urlcheck.mjs asserts this against the build and fails CI when it
# does not hold. If that check fails, the build is wrong — do not delete lines
# from this file to make it pass.
HEADER
cat "$TMP/base.txt" "$TMP/pages.txt" | sort -u

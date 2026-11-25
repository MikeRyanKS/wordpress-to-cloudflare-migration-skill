#!/usr/bin/env bash
# Survey a WordPress site before quoting a migration.
#
#   ./survey.sh example.com
#
# Public data only — no credentials needed, so it works on a prospect's site.
# Read references/triage.md to interpret the output.
set -uo pipefail
S="${1:?usage: survey.sh <domain>}"
S="${S#http://}"; S="${S#https://}"; S="${S%%/*}"
B="https://$S"
api() { curl -s -m 25 "$B/wp-json/wp/v2/$1" 2>/dev/null; }
count() { curl -s -m 25 -D- -o /dev/null "$B/wp-json/wp/v2/$1?per_page=1" 2>/dev/null \
          | grep -i '^x-wp-total:' | tr -d '\r' | awk '{print $2}'; }

echo "════════ $S ════════"
printf '  reachable:   '
curl -s -o /dev/null -m 20 -w 'HTTP %{http_code} from %{remote_ip}\n' "$B/"

printf '  generator:   '
curl -s -m 20 "$B/" | grep -o '<meta name="generator" content="[^"]*"' \
  | sed 's/.*content="//;s/"$//' | tr '\n' '; ' ; echo

echo
echo "  ── post types ──"
api types | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("    (REST API not reachable — may be disabled)"); raise SystemExit
core={"post","page","attachment","nav_menu_item","wp_block","wp_template",
      "wp_template_part","wp_global_styles","wp_navigation","wp_font_family","wp_font_face"}
custom=[k for k in d if k not in core]
print("    core:   post, page")
print("    custom:", ", ".join(custom) if custom else "(none)")
' 2>/dev/null

echo
echo "  ── content volume ──"
for t in posts pages; do printf '    %-14s %s\n' "$t" "$(count "$t" || echo '?')"; done
for t in $(api types 2>/dev/null | python3 -c '
import json,sys
core={"post","page","attachment","nav_menu_item","wp_block","wp_template","wp_template_part",
      "wp_global_styles","wp_navigation","wp_font_family","wp_font_face","elementor_library",
      "e-floating-buttons","wp_pattern","jet-theme-core","jet-page-template","jet-engine",
      "rm_content_editor","rank_math_schema","jet-popup","jet-form-builder"}
try:
  for k in json.load(sys.stdin):
    if k not in core: print(k)
except Exception: pass' 2>/dev/null); do
  printf '    %-14s %s  <- custom type\n' "$t" "$(count "$t" || echo '?')"
done

echo
echo "  ── taxonomies ──"
api taxonomies | python3 -c '
import json,sys
core={"category","post_tag","nav_menu","wp_pattern_category","post_format",
      "rank_math_redirection_category","wp_theme","wp_template_part_area"}
try:
  d=json.load(sys.stdin)
  cust=[k for k in d if k not in core]
  print("    custom:", ", ".join(cust) if cust else "(none)")
except Exception: print("    (unavailable)")' 2>/dev/null

echo
echo "  ── transactional signals (see triage.md) ──"
hit=0
for p in cart checkout my-account shop; do
  c=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$B/$p/")
  if [ "$c" = "200" ]; then printf '    /%s/ -> 200  ** transactional **\n' "$p"; hit=1; fi
done
[ "$hit" = "0" ] && echo "    none found"

echo
echo "  ── forms ──"
curl -s -m 20 "$B/" | grep -oE 'jet-form-builder|wpcf7|gravity_form|wpforms|ninja_forms' \
  | sort | uniq -c | sed 's/^/    /' || echo "    none detected on home page"

echo
echo "  ── mail ──"
printf '    MX:  '; dig +short MX "$S" | sort | tr '\n' ' '; echo
printf '    SPF: '; dig +short TXT "$S" | grep -i spf1 | head -1; echo

echo
echo "  ── dns / registrar ──"
printf '    NS:        '; dig +short NS "$S" | sort | tr '\n' ' '; echo
printf '    registrar: '; whois "$S" 2>/dev/null | grep -i '^   Registrar:' | head -1 | sed 's/.*: //'

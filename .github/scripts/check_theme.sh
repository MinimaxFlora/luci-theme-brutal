#!/bin/sh
#
# Copyright 2026 MinimaxFlora <zj18139624826@gmail.com>
# Licensed to the public under the Apache License 2.0.
#
# Static checks that do not need an OpenWrt SDK. Run from the repository root:
#   sh .github/scripts/check_theme.sh
# $UCODE_BIN may point at a locally built ucode binary; CI provides one.

set -eu

cd "$(dirname "$0")/../.."

fail() {
	echo "::error::$*" >&2
	exit 1
}

say() {
	echo "--- $*"
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM

say "shell and JavaScript syntax"

for script in root/etc/uci-defaults/*; do
	[ -f "$script" ] || continue
	sh -n "$script" || fail "shell syntax error in $script"
done

find htdocs/luci-static/resources -type f -name '*.js' -print |
	while IFS= read -r script; do
		node --check "$script" || fail "JavaScript syntax error in $script"
	done

say "theme wiring"

grep -q 'set_opt themes.Brutal /luci-static/brutal' root/etc/uci-defaults/30_luci-theme-brutal ||
	fail "uci-defaults does not register luci.themes.Brutal"

grep -q 'uci -q delete luci.themes.Brutal' Makefile ||
	fail "Makefile postrm does not unregister luci.themes.Brutal"

grep -q "L.require('menu-brutal')" ucode/template/themes/brutal/footer.ut ||
	fail "footer.ut does not load the menu-brutal module"

grep -q 'class="login-page"' ucode/template/themes/brutal/sysauth.ut ||
	fail "sysauth.ut is not a standalone login page"

grep -q 'name="luci_password"' ucode/template/themes/brutal/sysauth.ut ||
	fail "sysauth.ut lost the password field"

grep -q 'method="post"' ucode/template/themes/brutal/sysauth.ut ||
	fail "sysauth.ut lost the login form"

for file in \
	htdocs/luci-static/brutal/cascade.css \
	htdocs/luci-static/brutal/mobile.css \
	htdocs/luci-static/brutal/logo.svg \
	htdocs/luci-static/brutal/logo_48.png \
	htdocs/luci-static/resources/menu-brutal.js
do
	[ -s "$file" ] || fail "missing or empty: $file"
done

grep -q '^# call BuildPackage - OpenWrt buildroot signature' Makefile ||
	fail "Makefile lost the literal BuildPackage marker used by OpenWrt's package scanner"

say "stylesheet contract"

python3 - <<'PY'
import pathlib
import re
import sys

css = pathlib.Path("htdocs/luci-static/brutal/cascade.css").read_text(encoding="utf-8")

errors = []

if css.count("{") != css.count("}"):
    errors.append("unbalanced braces in cascade.css")
if "\r" in css:
    errors.append("CRLF line endings in cascade.css")
if re.search(r"border-radius\s*:\s*(?!0[;}\s])", css) and any(
    value.strip() not in ("0", "0px")
    for value in re.findall(r"border-radius\s*:\s*([^;}]+)", css)
):
    errors.append("non-zero border-radius found (the theme is deliberately square)")
if re.search(r"rgba?\(|hsla?\(", css):
    errors.append("translucent colours found (the palette is fully opaque)")
if re.search(r"linear-gradient", css):
    errors.append("linear gradient found (the theme uses flat colour only)")

# The only gradients allowed are the dot-matrix backdrops (page and login).
dots = re.findall(r"radial-gradient", css)
if len(dots) > 2:
    errors.append(f"unexpected radial-gradient usage (dot backdrops only), found {len(dots)}")

# LuCI renders these classes on every page; losing one silently breaks a page.
contract = [
    ".cbi-map", ".cbi-section", ".cbi-value", ".cbi-value-field",
    ".cbi-section-table", ".cbi-button", ".cbi-page-actions",
    ".cbi-tabmenu", ".cbi-dropdown", ".cbi-dynlist", ".cbi-tooltip",
    ".alert-message", ".ifacebox", ".modal", "#modal_overlay",
    ".tabs", ".spinning", "[data-tab-title]",
]
for selector in contract:
    if selector not in css:
        errors.append(f"missing LuCI selector: {selector}")

if errors:
    for error in errors:
        print(f"::error::{error}", file=sys.stderr)
    sys.exit(1)

print(f"cascade.css: {len(css.splitlines())} lines, contract OK")
PY

say "ucode templates"

ucode_bin="${UCODE_BIN:-ucode}"

if ! command -v "$ucode_bin" >/dev/null 2>&1; then
	fail "ucode not found; set UCODE_BIN to a built ucode binary"
fi

for template in ucode/template/themes/brutal/*.ut; do
	out="$tmpdir/$(basename "$template").uc"
	"$ucode_bin" -T, -s -cno-interp,dynlink=fs,dynlink=uci,dynlink=luci.core \
		-o "$out" "$template" || fail "template compile failed: $template"
	[ -s "$out" ] || fail "template produced no output: $template"
done

say "all checks passed"

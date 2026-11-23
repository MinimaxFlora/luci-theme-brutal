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

THEME=luci-theme-brutal
APP=luci-app-brutal-config

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

for script in "$THEME"/root/etc/uci-defaults/*; do
	[ -f "$script" ] || continue
	sh -n "$script" || fail "shell syntax error in $script"
done

for script in "$THEME"/htdocs/luci-static/resources/*.js "$APP"/htdocs/luci-static/resources/view/*/*.js; do
	[ -f "$script" ] || continue
	node --check "$script" || fail "JavaScript syntax error in $script"
done

say "theme wiring"

grep -q 'set_opt themes.Brutal /luci-static/brutal' "$THEME/root/etc/uci-defaults/30_luci-theme-brutal" ||
	fail "uci-defaults does not register luci.themes.Brutal"

grep -q 'uci -q delete luci.themes.Brutal' "$THEME/Makefile" ||
	fail "theme Makefile postrm does not unregister luci.themes.Brutal"

grep -q "L.require('menu-brutal')" "$THEME/ucode/template/themes/brutal/footer.ut" ||
	fail "footer.ut does not load the menu-brutal module"

grep -q 'id="mainmenu"' "$THEME/ucode/template/themes/brutal/header.ut" ||
	fail "header.ut lost the sidebar container"

grep -q 'id="indicators"' "$THEME/ucode/template/themes/brutal/header.ut" ||
	fail "header.ut lost the indicator strip"

if grep -q 'class="statusbar' "$THEME/ucode/template/themes/brutal/header.ut"; then
	fail "header.ut still renders the removed status bar"
fi

grep -q 'class="login-page' "$THEME/ucode/template/themes/brutal/sysauth.ut" ||
	fail "sysauth.ut is not a standalone login page"

grep -q 'class="login-bg"' "$THEME/ucode/template/themes/brutal/sysauth.ut" ||
	fail "sysauth.ut does not render the wallpaper layer"

grep -q "get_first('brutal', 'login', 'background')" "$THEME/ucode/template/themes/brutal/sysauth.ut" ||
	fail "sysauth.ut does not read /etc/config/brutal"

grep -q 'name="luci_password"' "$THEME/ucode/template/themes/brutal/sysauth.ut" ||
	fail "sysauth.ut lost the password field"

grep -q 'method="post"' "$THEME/ucode/template/themes/brutal/sysauth.ut" ||
	fail "sysauth.ut lost the login form"

for file in \
	"$THEME/htdocs/luci-static/brutal/cascade.css" \
	"$THEME/htdocs/luci-static/brutal/mobile.css" \
	"$THEME/htdocs/luci-static/brutal/logo.svg" \
	"$THEME/htdocs/luci-static/brutal/logo_48.png" \
	"$THEME/htdocs/luci-static/brutal/fonts/GoogleSans-Regular.woff2" \
	"$THEME/htdocs/luci-static/brutal/fonts/TypoGraphica.woff2" \
	"$THEME/htdocs/luci-static/brutal/img/bg1.webp" \
	"$THEME/htdocs/luci-static/brutal/icons/status.svg" \
	"$THEME/htdocs/luci-static/brutal/icons/system.svg" \
	"$THEME/htdocs/luci-static/brutal/icons/network.svg" \
	"$THEME/htdocs/luci-static/brutal/icons/config.svg" \
	"$THEME/htdocs/luci-static/resources/menu-brutal.js"
do
	[ -s "$file" ] || fail "missing or empty: $file"
done

[ "$(find "$THEME/htdocs/luci-static/brutal/icons" -name '*.svg' | wc -l)" -ge 12 ] ||
	fail "expected at least 12 menu icons"

grep -q '^# call BuildPackage - OpenWrt buildroot signature' "$THEME/Makefile" ||
	fail "theme Makefile lost the literal BuildPackage marker used by OpenWrt's package scanner"

say "config app wiring"

for file in \
	"$APP/root/etc/config/brutal" \
	"$APP/root/usr/share/luci/menu.d/luci-app-brutal-config.json" \
	"$APP/root/usr/share/rpcd/acl.d/luci-app-brutal-config.json" \
	"$APP/htdocs/luci-static/resources/view/brutal/config.js" \
	"$APP/po/zh_Hans/brutal-config.po"
do
	[ -s "$file" ] || fail "missing or empty: $file"
done

grep -q "config login 'login'" "$APP/root/etc/config/brutal" ||
	fail "/etc/config/brutal lost its login section"

grep -q '"path": "brutal/config"' "$APP/root/usr/share/luci/menu.d/luci-app-brutal-config.json" ||
	fail "menu entry does not point at the brutal/config view"

grep -q '^# call BuildPackage - OpenWrt buildroot signature' "$APP/Makefile" ||
	fail "app Makefile lost the literal BuildPackage marker"

python3 - <<'PY'
import json
import pathlib
import sys

errors = []
for path in (
    "luci-app-brutal-config/root/usr/share/luci/menu.d/luci-app-brutal-config.json",
    "luci-app-brutal-config/root/usr/share/rpcd/acl.d/luci-app-brutal-config.json",
):
    try:
        json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{path}: {exc}")

if errors:
    for error in errors:
        print(f"::error::{error}", file=sys.stderr)
    sys.exit(1)
PY

say "stylesheet contract"

python3 - <<'PY'
import pathlib
import re
import sys

css = pathlib.Path("luci-theme-brutal/htdocs/luci-static/brutal/cascade.css").read_text(encoding="utf-8")

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
    ".main-left", ".sidenav-header", ".showSide", ".darkMask",
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

for template in "$THEME"/ucode/template/themes/brutal/*.ut; do
	out="$tmpdir/$(basename "$template").uc"
	"$ucode_bin" -T, -s -cno-interp,dynlink=fs,dynlink=uci,dynlink=luci.core \
		-o "$out" "$template" || fail "template compile failed: $template"
	[ -s "$out" ] || fail "template produced no output: $template"
done

say "all checks passed"

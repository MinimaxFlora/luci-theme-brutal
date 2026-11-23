#
# Copyright (C) 2026 MinimaxFlora
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

# Pin both names: luci.mk derives its Build/Prepare hook name and the installed
# package name from whether the checkout directory happens to be called
# "luci-theme-brutal". A differently named clone symlinked into a feed would
# otherwise build a package with the wrong name and skip the prepare hook.
PKG_NAME:=luci-theme-brutal
LUCI_NAME:=luci-theme-brutal

PKG_VERSION:=1.3.2
PKG_RELEASE:=2

PKG_MAINTAINER:=MinimaxFlora <zj18139624826@gmail.com>
LUCI_MAINTAINER:=MinimaxFlora <zj18139624826@gmail.com>
LUCI_URL:=https://github.com/MinimaxFlora/luci-theme-brutal
PKG_LICENSE:=Apache-2.0

LUCI_TITLE:=Brutal Theme
LUCI_DESCRIPTION:=Neo-brutalist LuCI theme: 2px ink borders, hard offset \
	shadows, zero border radius and a monospace-first interface.
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

# csstidy is far older than the CSS this sheet uses (custom properties in
# media queries, :focus-visible, mask-based icons). It silently drops
# declarations it cannot parse, which takes the layout with it, so ship the
# stylesheet verbatim. It is already written compactly.
LUCI_MINIFY_CSS:=0

# The theme registers itself as an available theme, and activates itself only
# on a fresh install. Upgrades must never steal the active theme back from an
# administrator who selected another one.
define Package/luci-theme-brutal/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -f /tmp/luci-indexcache.* 2>/dev/null
	rm -rf /tmp/luci-modulecache 2>/dev/null
	true
}
endef

# opkg runs the *old* package's postrm with "upgrade" during a version bump;
# apk does not run it at all on upgrade. Reverting the active theme on a plain
# upgrade is the classic way to bounce every user back to Bootstrap.
define Package/luci-theme-brutal/postrm
#!/bin/sh
case "$$1" in *upgrade*) exit 0 ;; esac
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Brutal
	case "$$(uci -q get luci.main.mediaurlbase)" in
		/luci-static/brutal*)
			if [ -d /www/luci-static/bootstrap ] && \
			   [ -f /usr/share/ucode/luci/template/themes/bootstrap/header.ut ]; then
				uci set luci.main.mediaurlbase=/luci-static/bootstrap
			fi
			;;
	esac
	uci commit luci
	rm -f /tmp/luci-indexcache.* 2>/dev/null
	rm -rf /tmp/luci-modulecache 2>/dev/null
	true
}
endef

# luci.mk only stages htdocs/, ucode/ and root/ into PKG_BUILD_DIR.
# The repository license lives at the feed root, not in each package.
# The hook name is keyed on LUCI_NAME, which is pinned above.
define Build/Prepare/luci-theme-brutal
	# Checkouts on Windows filesystems (DrvFs, NTFS) report every file as
	# 0777. Normalise the staged tree so the package does not install
	# world-writable stylesheets, then restore the executable bit where it
	# belongs.
	$(FIND) $(PKG_BUILD_DIR) -type d -exec chmod 0755 {} +
	$(FIND) $(PKG_BUILD_DIR) -type f -exec chmod 0644 {} +
	$(FIND) $(PKG_BUILD_DIR)/root/etc/uci-defaults -type f -exec chmod 0755 {} +
	$(FIND) $(PKG_BUILD_DIR)/root/usr/libexec/rpcd -type f -exec chmod 0755 {} +
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature

#
# Copyright (C) 2026 MinimaxFlora
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-brutal-config
LUCI_NAME:=luci-app-brutal-config
LUCI_BASENAME:=brutal-config

PKG_VERSION:=1.3.3
PKG_RELEASE:=1

PKG_MAINTAINER:=MinimaxFlora <zj18139624826@gmail.com>
LUCI_MAINTAINER:=MinimaxFlora <zj18139624826@gmail.com>
LUCI_URL:=https://github.com/MinimaxFlora/luci-theme-brutal
PKG_LICENSE:=Apache-2.0

# Translation packages have their own version. Without this, luci.mk derives
# it from git metadata, which the SDK checkout does not have, and produces
# "0" as the version of luci-i18n-brutal-config-* .
ifneq ($(CONFIG_USE_APK),)
PKG_PO_VERSION:=$(PKG_VERSION)-r$(PKG_RELEASE)
else
PKG_PO_VERSION:=v$(PKG_VERSION)
endif

LUCI_TITLE:=Brutal Theme Settings
LUCI_DESCRIPTION:=Login wallpaper and wordmark settings for the Brutal LuCI theme.
LUCI_DEPENDS:=+luci-base +luci-theme-brutal
LUCI_PKGARCH:=all

define Package/luci-app-brutal-config/conffiles
/etc/config/brutal
endef

define Build/Prepare/luci-app-brutal-config
	$(FIND) $(PKG_BUILD_DIR) -type d -exec chmod 0755 {} +
	$(FIND) $(PKG_BUILD_DIR) -type f -exec chmod 0644 {} +
	$(FIND) $(PKG_BUILD_DIR)/root/etc/uci-defaults -type f -exec chmod 0755 {} +
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature

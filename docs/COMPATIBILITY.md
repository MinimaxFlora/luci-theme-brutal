# 24.10 / 25.12 兼容性说明

这份文档记录主题依赖的 LuCI 内部契约，以及两条发布分支的差异。改主题前先看这里，避免用到只有 LuCI master 才有的变量。

## 主题是怎么被找到的

1. 系统设置里的「设计（Design）」下拉框列出 `uci show luci.themes` 的所有 section，值就是媒体目录：
   `luci.themes.Brutal=/luci-static/brutal`。
2. 用户选中后写入 `luci.main.mediaurlbase`。
3. 每次请求，`luci-base` 的 `runtime.uc` 取 `basename(mediaurlbase)` 得到主题名 `brutal`，再编译
   `/usr/share/ucode/luci/template/themes/brutal/header.ut`。
4. 页面模板里 `media` = `/luci-static/brutal`，`theme` = `brutal`，`resource` = `/luci-static/resources`。

所以下面四个名字必须完全一致，否则要么下拉框里没有主题，要么页面 500：

```
包名            luci-theme-brutal
主题注册名      Brutal          (luci.themes.Brutal)
媒体目录/主题名 brutal          (/luci-static/brutal, themes/brutal/)
菜单模块        menu-brutal     (footer.ut 里 L.require('menu-brutal'))
```

## 两条分支共用的模板变量

以下变量在 `openwrt-24.10` 与 `openwrt-25.12` 的 `luci-base` 里都存在，可以放心使用：

| 变量 | 来源 | 用途 |
|---|---|---|
| `dispatched` | `dispatcher.uc` 的 `runtime.env.dispatched` | 当前页面节点，取标题 |
| `node` | 旧模板变量，仍然可用 | `node.css` 页面附加样式 |
| `media` / `resource` / `theme` | `runtime.uc` | 资源 URL、主题名 |
| `version.*` | `dispatcher.uc` | 固件/LuCI 版本 |
| `ctx.path` / `ctx.request_path` | `dispatcher.uc` | 当前路径（first-child 路由两者可能不同） |
| `blank_page` | `sysauth.ut` 的 include 参数 | 登录页不渲染导航 |
| `fuser` / `duser` | 登录失败时的 scope | 错误提示、用户名回填 |
| `http.getenv('REQUEST_URI')` | ucode http | 登录表单 action |
| `lua_active` | 运行时 | 页脚 Lua 兼容提示 |

`header.ut` 的 `<title>` 用 `dispatched?.title`（25.12 官方 bootstrap 的写法）；24.10 的 dispatcher 同样会设置它，所以不需要按分支判断。

## 只在 LuCI master 上存在的变量

`auth_fields`、`auth_message`、`auth_html`、`auth_assets`、`auth_plugin` 是 2026 年 LuCI master 新增的认证插件接口，`openwrt-24.10` 和 `openwrt-25.12` 的 `dispatcher.uc` 里都没有。模板直接引用未定义变量会让 ucode 抛错，因此本主题**刻意不引用**它们；登录页只处理用户名/密码这一种情况。

如果以后要支持认证插件，正确做法是按分支检测变量是否存在，而不是无条件渲染：

```ucode
{% if (type(auth_fields) == 'array'): %}
  ...
{% endif %}
```

（`type()` 对未定义变量同样会报错，真正安全的是分支专用的模板文件。）

## 菜单模块的契约

`footer.ut` 里 `L.require('menu-brutal')` 会实例化 `menu-brutal.js` 返回的类。主题必须自己做三件事：

1. `#mainmenu` 填左侧导航（一级菜单 + 可展开的二级菜单，一级带图标）；
2. `#tabmenu` 填当前节点的标签页（`dispatchpath` 第 4 段起）；
3. `#modemenu` 填页脚面包屑（多 mode 时才显示）。

`#mainmenu` 是 `header.ut` 里的空 `<aside>`，`menu-brutal.js` 在菜单加载完成后填充并显示它。移动端同一个节点变成抽屉（`position: fixed` + `transform`），`#navscrim` 负责不透明遮罩。

`L.env.dispatchpath` 在 24.10 与 25.12 里结构一致，例如
`['admin', 'status', 'overview']`。菜单项的激活判断必须按**前缀**匹配，否则父级和子级只能亮一个。

## ipk 与 apk 的差异

| | 24.10（opkg） | 25.12（apk-tools 3） |
|---|---|---|
| 产物 | `luci-theme-brutal_1.0.0-r1_all.ipk` | `luci-theme-brutal-1.0.0-r1.apk` |
| 架构字段 | `Architecture: all` | `arch: noarch` |
| 升级时 postrm | 用旧包的 postrm 执行，参数 `upgrade` | 不执行 postrm |
| `PKG_UPGRADE` | 由 opkg 设置 | 由 `package-pack.mk` 的包装脚本设置 |
| 签名 | 索引 `Packages.sig`（usign） | 包本身或索引 `packages.adb` |

因此 `postrm` 必须写成：

```sh
case "$1" in *upgrade*) exit 0 ;; esac
```

并且只在真正卸载时回退 `mediaurlbase`，否则每次升级都会把用户踢回 bootstrap。

`luci.mk` 的版本推导在两条分支上行为一致：有 `.git` 时按提交时间生成 `<yy>.<年内第几天>.<秒>~<sha>`，没有 `.git` 时退回文件 mtime。本仓库在主题 Makefile 里钉死 `PKG_VERSION:=1.3.1` / `PKG_RELEASE:=2`，配置应用钉死 `1.3.1-r8`，避免不同架构的 CI job 生成不同版本号。

## 25.12 的额外差异

- `luci.mk` 新增 `LUCI_DEFAULT`（把某个主题设为默认），本主题不使用，避免安装后强行改默认主题。
- `header.ut` 官方写法新增 `<meta name="darkreader-lock">` 和 `width=device-width, initial-scale=1`；本主题已采用。
- 25.12 起 `luci.mk` 仍然原样安装 `.ut`，不做字节码预编译，因此两份分支可以共用模板源文件。

## 构建验证

| 产物 | 命令 | 结果 |
|---|---|---|
| `.apk` | 25.12.6 SDK，`make package/luci-theme-brutal/compile V=s` | 通过，`arch: noarch`，依赖 `libc, luci-base` |
| `.ipk` | 24.10.8 SDK，同上 | 通过，`Architecture: all`，依赖 `libc, luci-base` |

模板本身用 `ucode -T, -s -cno-interp,dynlink=fs,dynlink=uci,dynlink=luci.core` 逐个编译通过（CI 每次跑）。

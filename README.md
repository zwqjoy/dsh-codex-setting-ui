# dsh-codex-setting-ui

一个为 DeepSeek Harness 设置窗口整理布局的独立插件：左侧分类导航，右侧继续使用 Harness 原有设置表单。插件不读写设置值，不捆绑或自动安装其他功能插件。

## 功能

- 将设置分类分组显示，并提供分类搜索。
- 支持浅色、深色和窄窗口布局，键盘焦点清晰可见。
- 沿用 Harness 原有表单、保存行为、关闭与 Escape 操作。
- 分类动态增删时同步导航；停用插件时恢复原导航和样式。
- 搜索只匹配分类名称和分类 ID，不搜索设置内容或密钥。

## 安装

先克隆仓库：

```sh
git clone https://github.com/zwqjoy/dsh-codex-setting-ui.git
```

在 DeepSeek Harness 中打开“插件 → 添加插件 → 安装第三方插件”，把“包名或地址”设为克隆后包含 `package.json` 的 `dsh-codex-setting-ui` 目录，然后按应用提示重启。

也可以下载源码 ZIP 并解压，再选择其中包含 `package.json` 的插件目录。不要把 ZIP 文件本身填入地址；如果使用本地目录链接安装，请保留目录。

桌面版 profile 由 Harness 应用管理，请从应用的插件页面安装。此插件的发布包是本地目录插件；README 不承诺 npm 或 CLI 安装方式。

卸载或停用插件即可恢复原设置布局。设置值不会被插件迁移或删除。

## 兼容性

此插件按 DeepSeek Harness **0.2.1-rc.2** 的设置窗口结构实现，依赖 `[data-shortcut-modal="settings"][role="dialog"]` 和 `settings.section` 分类登记接口。遇到无法识别的窗口结构时，插件不会改动界面。

插件通过原有导航按钮切换分类，不替换设置表单，也不维护第二份设置状态。样式仅作用于识别到的设置窗口，不改动聊天界面或侧栏。替换整个设置窗口的主题可能与本插件不兼容；Harness 更新后也可能需要适配。

已完成与匹配宿主结构的浏览器模拟检查，但**尚未在真实 Harness 中完成安装验收**。目前不能保证所有 Harness 版本和第三方主题均兼容。

## 开发与验证

源码位于 `src/`，`scripts/build.mjs` 使用 Node 内置模块生成 `lib/client.js`。

```sh
npm run check
npm pack
```

浏览器检查页使用发布 bundle 和模拟的宿主设置表单，不会连接或修改真实设置：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:8765/test/browser.html` 并运行检查。

## 许可

MIT，详见 [LICENSE](LICENSE)。布局灵感来自 [dsh-codex-ui](https://github.com/jiangshen275-beep/DSH-Codex-ui-2-) 的设置分栏和导航分组；本仓库代码独立编写，不包含其代码或功能插件。


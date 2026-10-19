# 验证记录

- 目标宿主结构：本机 DeepSeek Harness 0.2.1-rc.2 安装代码。
- Node 检查：4/4 通过；生成 bundle 语法通过。
- 浏览器检查：发布的 lib/client.js，12/12 通过。
- 覆盖：窗口识别、实际分类、焦点移交、搜索、原导航事件、空结果、原保存事件、动态增删、停用恢复、重复启用、关闭重开。
- 视觉：450px 窄窗、1100px 桌面、浅色与深色。
- npm 安装包：6 个文件；无 dependencies / peerDependencies；只有一个插件声明；打包 bundle 与已检查文件相同。
- 未执行：真实 Harness 安装、原生快捷键、真实配置持久化，以及与所有主题的联合验收。
- 当前 Harness profile 未被此插件生成任务修改。

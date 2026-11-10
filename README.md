# Reeder AI

Reeder AI 是一款基于 Electron 的 EPUB 桌面阅读器。它将本地图书、阅读进度和 AI 阅读助手放在一起，适合阅读电子书与带插图的轻小说。

**当前发行版：[v0.01 · Windows 便携版](https://github.com/kissruanmei/Reeder-AI/releases/tag/v0.01)**

![Reeder 首页：阅读统计、最近阅读、使用指南和施工区](docs/images/home.png)

> 截图中的书籍和阅读数据均为测试内容。

## 下载与开始使用

1. 打开 [v0.01 发行页面](https://github.com/kissruanmei/Reeder-AI/releases/tag/v0.01)，下载 `reederV0.01.exe`。
2. 在 Windows 上双击运行。程序为便携版，无需安装。
3. 在首页点击 **导入书籍**，选择本地 EPUB 文件。阅读时可以通过目录和页面底部按钮切换章节。
4. 首页的 **查看指南** 提供图书管理、排版与 AI 助手的操作说明。

## 主要功能

- **首页与书架**：查看累计阅读时间、今日阅读时间、图书数量和连续阅读天数；首页展示最近阅读的图书及进度，完整书架可查看和管理全部图书。
- **按书保存进度**：新书从第一章开始，再次打开已读图书时恢复该书上次阅读的章节。进度百分比按章节计算，不代表章节内的精确滚动位置。
- **阅读排版**：提供六种主题，并支持调整字号、字体、行距和正文宽度。
- **动态阅读背景**：在阅读页的「外观与排版」中选择已安装的 Wallpaper Engine 场景或视频壁纸，并调整正文遮罩。场景壁纸需要 Wallpaper Engine 正在运行，视频壁纸以静音方式播放。
- **EPUB 插图**：显示电子书内的封面和插图；点击正文插图可放大查看。
- **AI 阅读助手**：配置兼容的模型服务后，可对选中文本进行解释、翻译、摘要或继续提问，也可在侧栏自由对话。内置 DeepSeek、OpenAI、Moonshot、Qwen 和自定义端点选项。

## 本地数据与旧版迁移

书籍、阅读进度和统计数据保存在本机浏览器存储中；新导入的 EPUB 原文件也会保存在本机，供下次打开时恢复封面和插图。数据不会自动在不同设备之间同步。

从此前使用 `http://localhost:3000` 的 Electron 开发版切换到便携版时，程序会尝试一次性迁移该版的本地书架和统计，已有的新版数据不会被覆盖。迁移时请先关闭占用 3000 端口的开发服务器，再启动便携版。旧版若没有保存原始 EPUB，封面或插图可能缺失；重新导入同一本书可恢复这些内容，并保留该书已有的章节进度。

API Key 保存在本机 `localStorage` 中，**未加密**。使用 AI 助手时，选中的文本和对话内容会发送到所配置的模型服务商或自定义端点；请自行确认所用服务的隐私政策和费用。

## 本地开发

需要 Node.js 和 npm；构建 Windows 便携版建议使用 Windows。

```bash
git clone https://github.com/kissruanmei/Reeder-AI.git
cd Reeder-AI
npm ci
```

启动浏览器开发服务器：

```bash
npm run dev
```

访问 `http://localhost:3000`。启动 Electron 桌面开发版：

```bash
npm run electron:dev
```

Windows 用户也可运行项目根目录下的 `启动 Reeder AI.bat`。构建前端或打包便携版：

```bash
npm run build
npm run dist:exe
```

打包产物位于 `release/reederV0.01.exe`。发行标签 `v0.01` 与 `package.json` 中沿用的历史内部版本号分别管理。

## 未来计划

以下功能目前处于规划阶段，尚未实现：

- 从本地图片自定义阅读背景。
- 内置音乐播放器，为阅读提供沉浸式背景音乐。

## 许可证

项目原 README 声明采用 MIT 许可证，但仓库目前未包含独立的 LICENSE 文件。

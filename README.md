# 📖 Reeder AI - 智能电子书阅读器 (Desktop App)

<p align="center">
  <b>兼具 Apple Books 级极致优雅排版设计与第三方大模型 API Key 划词/划句辅助阅读的桌面电子书客户端</b>
</p>

---

## ✨ 核心特性

- 📖 **Apple Books 级设计与 6 大预设主题**
  - 内置 **Paper (羊皮纸)**、**Classic White (羊脂白)**、**OLED Dark (暗夜黑)**、**Sepia (墨绿护眼)**、**Nordic Slate (北欧灰)** 以及 **Solarized Warm (暖阳)** 六款主题，一键无缝切换。
  - 支持 `(Aa)` 排版调节：动态控制字号 (12px - 32px)、字体风格（Serif 衬线体 / Sans-serif 无衬线 / Mono 等宽）、行间距与版心最大宽度。

- 💡 **划词 / 划句 Selection Tooltip 交互**
  - 在阅读区鼠标拖选文本，即刻唤起 Apple 风格悬浮菜单：
    - `[ 💡 解释 ]` 结合上下文分析难词/概念。
    - `[ 🌐 翻译 ]` 地道流畅翻译长句段落。
    - `[ 📝 摘要 ]` 快速提炼段落核心要点。
    - `[ 💬 问 AI ]` 唤醒 AI 侧边栏发起自由追问。
    - `[ 🖍️ 高亮 ]` 标记重点。

- 🤖 **第三方大模型 API Key 本地安全接入**
  - 支持手动接入 **DeepSeek (V3/R1)**、**OpenAI (ChatGPT)**、**Moonshot (Kimi)**、**Qwen (通义千问)** 及 **Custom Endpoint (本地 Ollama)**。
  - 内置 **【🧪 测试 API 连接】** 校验工具，实时测试 Endpoint 有效性。
  - **隐私安全保证**：所有 API Key 仅保存在用户本地设备 (`localStorage`)，不经过任何中转服务器。

- 🖼️ **轻小说 / EPUB 插图嵌入与全屏放大灯箱 (Lightbox)**
  - **Blob URL 提取**：自动解包 EPUB 内部插图与封面路径，完美解决轻小说插图裂图问题。
  - **大图灯箱**：点击正文中任意插画即可唤起高质感毛玻璃全屏灯箱，支持放大、缩小、还原、一键下载保存原图及 `ESC` 退出。

- 📚 **我的书架与阅读进度记忆**
  - **进度自动追踪**：自动记录每本书的最近阅读章节与位置，重新打开软件或切换书籍时，**自动定位恢复至上一次读到的精准位置**。
  - **阅读打卡仪表盘**：实时统计今日阅读分钟数、连续打卡天数与历史累计阅读时长，带来极具仪式感的阅读习惯陪伴。

- 🖥️ **打包为 Windows .exe 应用程序**
  - 基于 React 18 + Vite + Electron + JSZip 架构，支持一键打包为免安装的单文件 `.exe` 可执行包。

---

## 🛠️ 本地开发与运行指南

### 1. 克隆仓库与安装依赖

```bash
git clone https://github.com/your-username/Reeder-AI.git
cd Reeder-AI

# 安装项目依赖
npm install
```

### 2. 启动 Web 开发服务器

```bash
npm run dev
```

在浏览器中打开 `http://localhost:3000` 即可开始预览体验。

### 3. 启动 Electron 桌面客户端开发模式

```bash
npm run electron:dev
```

### 4. 打包为 Windows 独立 .exe 可执行软件

```bash
npm run dist:exe
```

打包完成后，即可在 `release/` 目录下找到生成的绿色免安装单文件 `Reeder AI 1.0.1.exe`。

---

## 📄 开源许可

[MIT License](LICENSE)

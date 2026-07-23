# 修复 Reeder 诸多 Bug 的实施计划

## 目标描述
为了彻底解决当前系统中存在的多个稳定性和体验性 Bug，本计划将修复以下问题：
1. **书架封面及图片丢失（核心 Bug）**：因 `blob:` URL 在应用重启后失效，导致保存到 IndexedDB 的 HTML 源码中的图片地址全部变为无效链接。我们将统一提取为 `data:` base64 URI，实现图片的永久本地持久化。
2. **同名书籍静默覆盖**：在生成书籍 ID 时拼接当前时间戳，彻底避免因重名导致的数据碰撞。
3. **阅读时间挂机漏洞**：定时器将在后台静默时暂停计时。
4. **AI 对话强制滚动体验**：仅当用户处于或接近底部时才自动滚动，避免抢夺滚动条。
5. **LLM 网络错误导致内容丢失**：保留已接收的部分文本，将错误信息追加在末尾。
6. **Lint 脚本报错**：在 `package.json` 中补齐 `eslint` 依赖。

## 待用户确认事项
- 图片改用 `data:base64` 内嵌保存后，IndexedDB 占用的存储空间会有所增加（但对现代 Electron 客户端和浏览器来说完全在安全且无感知的范围内）。

## 实施步骤

### 1. 修复书籍封面与插图重启丢失问题 (Image Persistence)
我们将修改 `EpubParser.js` 中提取图片的逻辑。
- 弃用 `blob:` URL（每次重启应用后都会失效）。
- 使用 JSZip 的 `async('base64')` 直接生成 `data:image/xxx;base64,...` 的长字符串。由于是纯字符串，它们会被完美保存在 IndexedDB 中的章节 HTML 源码里，永不丢失。

#### [MODIFY] [EpubParser.js](file:///f:/Reeder/src/services/epubParser.js)
- 修改 `buildImageBlobCache` 方法，将 `blob` 改为 `base64` 数据流，直接拼接并存储 `dataUrl`。

### 2. 修复同名书籍覆盖问题 (Book ID Collision)
#### [MODIFY] [LibraryService.js](file:///f:/Reeder/src/services/libraryService.js)
- 修改 `generateBookId` 方法，在生成的哈希后拼接 `_${Date.now()}`，确保每次导入都是唯一的。

### 3. 修复阅读时长后台防作弊 (Reading Timer Fix)
#### [MODIFY] [App.jsx](file:///f:/Reeder/src/App.jsx)
- 在 60 秒的 `setInterval` 内部增加 `document.visibilityState === 'visible'` 判断，如果处于 hidden 状态则不增加时长。

### 4. 修复 AI 强制下拉滚动 (AI Scroll Fix)
#### [MODIFY] [AiSidebar.jsx](file:///f:/Reeder/src/components/AI/AiSidebar.jsx)
- `scrollToBottom` 方法中加入判断：如果当前滚动条位置距离底部超过一定像素，说明用户正在往上翻看记录，此时停止自动拉到底。

### 5. 修复流式请求错误覆盖问题 (LLM Stream Error Fix)
#### [MODIFY] [AiSidebar.jsx](file:///f:/Reeder/src/components/AI/AiSidebar.jsx)
- 在 `onError` 回调中，从之前的完全覆盖改为：保留现有的 `fullText` 内容，并将 `[连接中断: 错误信息]` 拼接在末尾。

### 6. 修复 Lint 报错
#### [MODIFY] [package.json](file:///f:/Reeder/package.json)
- 补充 `eslint` 和相关的 `devDependencies`。

## 验证计划
1. 在本地验证重新导入一本书并关闭刷新页面，图片依然正常显示。
2. 验证多导入几次同一本书，能否分别独立存在于书架。
3. 将页面切换到后台等待超过1分钟，验证时间是否不再增加。
4. 在 AI 对话生成过程中往上滚动，验证是否不再被拉回底部。

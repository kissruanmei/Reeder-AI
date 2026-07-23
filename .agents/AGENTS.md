# Agent Behavioral Rules

## 临时文件与文档存储规范 (Temporary File & Cleanup Rules)
1. **项目内路径优先 (Workspace-Local Storage)**：所有中途产生的计划书、报告书、临时代码脚本及 Scratch 文件，必须保存在项目根目录下的 `.agents/docs/` 或 `scratch/` 目录中（例如 `f:\Reeder\.agents\docs\`），严禁占用 C 盘系统目录空间。
2. **自动清理 (Auto Cleanup)**：任务完成后，应清理无用的临时调试脚本与中间产物。

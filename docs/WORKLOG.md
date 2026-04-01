# 工作日志

## 2026-04-01 可运行基础版

目标：
- 让 `src/pages/PersonalKnowledgeSiteUIMockup.tsx` 在当前 Vite + React + TypeScript 项目中可正常运行

主要改动：
- 接入 Tailwind CSS
- 补齐基础 UI 组件与 `@ -> src` 别名
- 修复页面编译与运行问题

验证：
- `npm run build` 通过
- `npm run dev` 可启动

## 2026-04-01 信息架构与阅读体验优化

目标：
- 把页面从静态样例整理成更适合长期维护的知识站

主要改动：
- 三个模块支持筛选、排序、快速新增
- 详情弹窗重构为右侧抽屉
- 引入 Markdown 详情展示
- 数据拆分为 `data/*.json` 与 `content/<module>/<id>.md`
- 优化筛选区、列表密度、标签系统和空状态

验证：
- `npm run build` 通过

## 2026-04-01 本地持久化录入流程

目标：
- 让新增 / 编辑条目真正写入本地仓库文件

主要改动：
- 增加本地 Node API
- 写入 `data/*.json`
- 长备注写入 `content/<module>/<id>.md`
- 自动生成稳定 ID 与时间字段
- 前端提交后刷新列表、选中新条目并打开详情

验证：
- `npm run build` 通过
- 本地 API 联调通过

## 2026-04-01 管理员模式与分类管理

目标：
- 保持公开只读，同时让管理员直接在原页面中维护内容

主要改动：
- 增加管理员登录态
- 管理员模式下开放新增、编辑、删除
- 增加分类管理弹窗
- 支持分类新增、重命名、删除与替换迁移

验证：
- `npm run build` 通过

## 2026-04-01 AI 解析与设置能力

目标：
- 将 AI 解析做成表单增强能力，并允许管理员配置模型

主要改动：
- 新增管理员 AI 设置入口
- 支持配置 provider、model、API Key、Base URL
- 增加 iFlow、Blaze 等 OpenAI 兼容服务商支持
- AI 解析按模块走不同提示词模板
- `websites` 模块接入 Jina Reader 增强 URL -> 内容 -> AI 分析链路

验证：
- `npm run build` 通过
- AI 设置接口与 Reader 链路联调通过

## 2026-04-01 导入导出与 WebDAV 同步

目标：
- 增加 ZIP 导入导出、模块级导出与 WebDAV 快照同步

主要改动：
- 导出统一为 ZIP
- 支持按模块导出与按模块覆盖导入
- 增加 `manifest.json`
- 接入 WebDAV 配置、上传、远程备份列表和恢复
- 提供坚果云默认预设

验证：
- `npm run build` 通过
- 导出 ZIP 自检与导入预校验通过

## 2026-04-01 导入模板与 AI 转换指引

目标：
- 让导入功能不再只停留在“上传 ZIP + 失败报错”

主要改动：
- 增加空模板 ZIP 与示例模板 ZIP 下载
- 模板与真实导出共用 ZIP 底层结构
- 在导入弹窗中新增：
  - 下载空模板
  - 下载示例模板
  - 查看 / 复制 AI 转换指引
- Prompt 改为服务端按当前模块与分类配置动态生成，避免前端硬编码

验证：
- `npm run build` 通过

## 2026-04-01 工作说明文档自动生成

目标：
- 为每次有效改动提供一份带版本号的独立工作说明文档

主要改动：
- 新增 `scripts/generate-work-doc.mjs`
- 新增 `scripts/work-doc.config.mjs`
- 增加 `npm run docs:generate`
- 按 `x.y.z-change-log.md` 规则自动解析 docs 中的历史版本并递增 patch

验证：
- 已生成首份版本文档 `1.1.6-change-log.md`

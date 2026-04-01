# 项目工作日志

这份文件用于持续记录当前个人知识收集网站的重要改动。

记录约定：
- 每次修改项目后，在文件顶部追加一条新记录
- 记录内容尽量包含：日期、目标、主要改动、验证结果、后续备注
- 这里只记录高价值变更，不写无意义的微调噪音

## 2026-04-01

### 修正 data-sync 接口未代理导致的前端报错

目标：
- 解决管理员导出/导入/同步弹窗请求 `/api/data-sync/*` 时落回 Vite HTML 的问题

主要改动：
- 在 [`vite.config.ts`](/E:/Android/Project_/Momeak-Archive/vite.config.ts) 中补充 `/api/data-sync` 到本地 Node 服务的代理
- 避免前端把 `index.html` 当成 JSON 解析，导致 `Unexpected token '<'` 报错

验证：
- `npm run build` 通过

### 导入导出与 WebDAV 快照同步

目标：
- 为当前知识库增加 ZIP 导入导出、按模块选择导出、ZIP 覆盖恢复和 WebDAV 快照同步能力
- 优先兼容坚果云，并保持 JSON + Markdown 双层结构不变

主要改动：
- 新增服务端导入导出模块，支持生成带 manifest 的 ZIP 快照
- 导出支持按模块选择，ZIP 中仅包含被选中的 `data/<module>.json` 与 `content/<module>/**`
- ZIP 中统一带上 `manifest.json` 和 `data/taxonomy.json`
- 新增导入预校验，检查 manifest、schema、模块数据文件和重复 id
- 导入采用“只覆盖 ZIP 中实际包含且确认选择的模块”，不会清空未包含模块
- 新增 WebDAV 配置持久化、坚果云默认预设、远程备份列表、上传 ZIP 快照、下载并恢复
- 前端新增“导入 / 导出 / 同步”管理员弹窗，集中处理本地导出、本地恢复、WebDAV 配置与远程备份操作
- 新增 `jszip`、`fast-xml-parser` 作为 ZIP 与 WebDAV 辅助依赖

验证：
- `npm run build` 通过

## 2026-03-31

### 修正 Jina Reader 在本地代理环境下的读取失败

目标：
- 解决 `open.maic.chat` 这类网址在 Python 可读、Node 服务端 Reader 调用失败的问题

主要改动：
- 修正 Reader envelope 解析，兼容 `data` 为对象且正文位于 `data.content` 的返回格式
- Reader 请求头兼容补充 `X-Return-Format: markdown` 与 `X-Retain-Images: none`
- 为服务端 Reader 请求增加 `HTTP_PROXY / HTTPS_PROXY` 代理感知，避免 Node `fetch` 直连超时
- 本地用 `open.maic.chat` 实测，已能成功拿到 Reader markdown 正文和 title / description / url 摘要

验证：
- `node --input-type=module` 实测 `fetchReaderContent('open.maic.chat')` 成功
- `npm run build` 通过

### websites 模块接入 Jina Reader API

目标：
- 将“网站收集”模块的 AI 分析从简单原始文本解析升级为 URL / 域名优先走 Reader，再进入结构化分析

主要改动：
- 新增 `server/reader` 目录，封装 URL 归一化、Reader 返回结构标准化、Reader 调用逻辑
- 为 `websites` 模块新增独立分析链路，优先将 Reader 返回的 markdown 和 meta 摘要送入 AI
- Reader 成功但内容过少时，降级为结合原始输入的低置信度分析
- Reader 失败时，自动回退为仅基于原始输入分析，并通过 warnings 提示
- 完全没有网址线索时，明确提示补充 URL 或域名
- 前端 AI 辅助面板增加 websites 模块的解析状态提示
- 新增 Reader 相关环境变量配置示例

验证：
- `npm run build` 通过

### 修正侧栏占宽导致的主内容挤压问题

目标：
- 解决桌面端侧栏外层容器错误占满整行宽度，导致主内容被压缩到右侧的问题

主要改动：
- 将侧栏外层容器在 `lg` 断点下显式限制为 `var(--sidebar-width)`
- 同步收窄默认侧栏宽度与可调节上限，减少首屏横向占用
- 保持侧栏拖拽调宽能力不变，但避免再次出现整页横向滚动

验证：
- `npm run build` 通过

### 基于现有功能的 UI 布局重构

目标：
- 在不改动原有知识录入、筛选、详情、管理员能力的前提下，重做页面信息层级与布局节奏
- 让侧栏导航、模块概览、筛选区、列表总览更适合长期高频使用

主要改动：
- 基于 `ui-ux-pro-max` 的“editorial calm + data-dense clarity”方向重排页面布局
- 左侧栏升级为可调宽、可持久化、可显示各模块条目数量的导航区
- 主内容头部改为模块概览卡，整合模块标识、说明、管理员操作与统计信息
- 筛选区视觉层级收紧，标签区改为独立包裹并全部展示
- 表格总览优化为更宽松的列宽和自动换行策略，减少名称、分类、平台、标签被截断
- 为窄屏补充卡片式列表视图，避免强行压缩表格
- 统一卡片圆角、边框、阴影和留白，保持克制的 Notion 风格

验证：
- `npm run build` 通过

### 列表页可读性与布局弹性优化

目标：
- 提升左侧导航和表格总览的可读性
- 减少内容被截断、标签被隐藏、侧栏过窄造成的阅读压力

主要改动：
- 左侧边栏支持桌面端拖拽调节宽度，并将宽度持久化到本地
- 默认侧栏宽度调大，模块说明允许自然换行
- 顶部筛选标签区域改为自动换行展示，不再主要依赖横向滚动
- 表格总览列宽调整为更适合阅读的比例
- 表格单元格改为按内容自动换行，减少名称、分类、平台、标签被截断
- 列表标签改为全部展示，不再只显示前两个标签

验证：
- `npm run build` 通过

### AI 超时与商品字段校验调整

目标：
- 放宽 AI 解析默认超时，减少较慢模型被过早中断
- 将网购模块中的 `platform` 从必填改为可选

主要改动：
- 将默认 `OPENAI_TIMEOUT_MS` 从 30 秒调整为 90 秒
- 更新 [`.env.example`](/E:/Android/Project_/Momeak-Archive/.env.example)，补充超时配置示例
- 移除前端新增/编辑弹窗中对 `shopping.platform` 的必填校验
- 移除服务端写入层对 `shopping.platform` 的必填校验，保证前后端规则一致

验证：
- `npm run build` 通过

### Blaze 服务商支持

目标：
- 在现有 AI 设置体系中增加 Blaze 服务商选项
- 继续沿用当前 OpenAI 兼容调用链，不额外分叉实现

主要改动：
- 在 [`server/ai/providers.mjs`](/E:/Android/Project_/Momeak-Archive/server/ai/providers.mjs) 中新增 `Blaze` provider
- 默认 Base URL 配置为 `https://blazeai.boxu.dev/api`
- 默认模型配置为 `anthropic/claude-sonnet-4-6`
- 补充以下静态模型列表：
  - `anthropic/claude-sonnet-4-6`
  - `deepseek-ai/deepseek-v3.2`
  - `grok/grok-4.1-expert`
  - `grok/grok-4.1-mini`
  - `grok/grok-4.20-beta`
  - `minimaxai/minimax-m2.5`
  - `moonshotai/kimi-k2.5`
  - `openai/claude-sonnet-4.6`
  - `openai/gpt-5.4`
  - `openai/gpt-5.3-codex`
  - `z-ai/glm5`

验证：
- `npm run build` 通过
- Blaze 已可通过 `/api/ai/settings` 作为 provider 返回给前端设置弹窗

### 基础可运行版本整理

目标：
- 让 `src/pages/PersonalKnowledgeSiteUIMockup.tsx` 在当前 Vite + React + TypeScript 项目中正常跑起来

主要改动：
- 接入 Tailwind CSS
- 补齐基础 UI 组件
- 配置 `@ -> src` 别名
- 修正页面编译和运行问题

验证：
- `npm run build` 通过
- `npm run dev` 可启动

### 信息架构与长期维护优化

目标：
- 把页面从“静态样例”整理为更适合长期维护的知识站

主要改动：
- 三个模块支持筛选、排序、快速新增
- 详情弹窗重构为右侧抽屉
- 引入 Markdown 详情展示
- 数据拆分为 `data/*.json` 与 `content/<module>/<id>.md`
- 优化筛选区、列表密度、标签系统与空状态

验证：
- `npm run build` 通过

### 本地持久化录入流程

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

### 管理员模式与分类管理

目标：
- 保持公开只读，同时让管理员在原页面中完成维护

主要改动：
- 增加管理员登录态
- 管理员模式下开放新增、编辑、删除
- 增加分类管理弹窗
- 支持分类新增、重命名、删除与替换迁移

验证：
- `npm run build` 通过

### AI 设置入口 + iFlow 服务商支持

目标：
- 在管理员模式中增加 AI 设置入口
- 支持手动配置 API Key、服务商、模型
- 在现有 AI 解析链路中加入 iFlow 服务商选项
- 在 `docs` 中建立持续维护的工作日志

主要改动：
- 在左侧边栏底部、`当前访问模式` 卡片上方新增 `AI 设置` 入口，仅管理员可见
- 新增 AI 设置弹窗，可配置：
  - 服务商 provider
  - 模型 model
  - API Key
  - Base URL（可选）
- 新增服务端 AI 设置接口：
  - `GET /api/ai/settings`
  - `PUT /api/ai/settings`
  - `DELETE /api/ai/settings`
- 新增本地持久化文件方案：`.local/ai-settings.json`
  - 仅本地开发环境使用
  - 通过 `.gitignore` 忽略，不进入仓库
  - 手动配置优先于 `.env.local`
- 补充 iFlow provider：
  - 默认 Base URL：`https://apis.iflow.cn/v1`
  - 兼容当前 OpenAI 风格 `chat/completions` 调用链路
  - 增加一组静态模型列表，来源于 `docs/iflow.md`

验证：
- `npm run build` 通过
- AI 设置接口联调通过
- 保存手动配置、恢复默认配置都已验证
- 临时测试后已清理 `.local/ai-settings.json`

备注：
- 当前 iFlow 以 OpenAI 兼容接口方式接入
- 若后续发现某些模型对 `response_format: json_schema` 支持不一致，可再按 provider 做能力分支

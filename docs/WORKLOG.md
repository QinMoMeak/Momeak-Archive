# 工作日志

## 2026-04-01 可运行基础版本

目标：
- 让 `src/pages/PersonalKnowledgeSiteUIMockup.tsx` 在当前 Vite + React + TypeScript 项目中可正常运行。

主要改动：
- 接入 Tailwind CSS。
- 补齐基础 UI 组件与 `@ -> src` 别名。
- 修复页面编译与运行问题。

验证：
- `npm run build` 通过。

## 2026-04-01 左下角设置菜单改为向上弹出

目标：
- 让左下角语言和主题切换菜单在按钮上方展开，不压到底部区域。

主要改动：
- 调整 `InterfaceSettingsPanel` 中下拉菜单的定位样式，从向下展开改为向上弹出。
- 保留原有菜单内容、交互和按钮布局不变。

验证：
- `npm run build` 通过。

## 2026-04-01 GitHub Pages 接入

目标：
- 将项目以 GitHub Pages 项目站点方式部署到 `https://qinmomeak.github.io/Momeak-Archive/`。

主要改动：
- 为 Vite 增加项目站点 `base` 配置 `/Momeak-Archive/`。
- 新增 GitHub Actions 部署工作流，自动完成 checkout、Node 安装、`npm ci`、`npm run build`、上传 `dist` 并部署到 Pages。
- 保持本地开发命令不变，`npm run dev` 和 `npm run build` 继续可用。

验证：
- `npm run build` 通过。

## 2026-04-01 移除左下角访问模式说明卡

目标：
- 删除左下角“当前访问模式”说明卡，让侧栏底部更简洁。

主要改动：
- 移除侧栏底部的访问模式展示卡，不再额外显示“公开只读 / 编辑模式”说明。
- 保留原有管理员能力和入口，不影响登录态判断与写入权限控制。

验证：
- `npm run build` 通过。
- `npm run dev` 可启动。

## 2026-04-01 信息架构与阅读体验优化

目标：
- 将静态样例整理成更适合长期维护的知识站。

主要改动：
- 三个模块支持筛选、排序、快速新增。
- 详情弹窗重构为右侧抽屉。
- 引入 Markdown 详情展示。
- 数据拆分为 `data/*.json` 与 `content/<module>/<id>.md`。
- 优化筛选区、列表密度、标签系统和空状态。

验证：
- `npm run build` 通过。

## 2026-04-01 本地持久化录入流程

目标：
- 让新增与编辑条目真正写入本地仓库文件。

主要改动：
- 增加本地 Node API。
- 写入 `data/*.json` 与 `content/<module>/<id>.md`。
- 自动生成稳定 ID 与时间字段。
- 提交后刷新列表、选中新条目并打开详情。

验证：
- `npm run build` 通过。
- 本地 API 联调通过。

## 2026-04-01 管理员模式与分类管理

目标：
- 保持公开只读，同时允许管理员在前台直接维护内容。

主要改动：
- 增加管理员登录态。
- 管理员模式下开放新增、编辑、删除。
- 增加分类管理弹窗。
- 支持分类新增、重命名、删除与替换迁移。

验证：
- `npm run build` 通过。

## 2026-04-01 AI 解析与设置能力

目标：
- 将 AI 解析做成表单增强能力，并允许管理员配置模型。

主要改动：
- 增加 AI 设置入口。
- 支持配置 provider、model、API Key、Base URL。
- 增加 iFlow、Blaze 等 OpenAI 兼容服务商支持。
- AI 解析按模块走不同提示词模板。
- `websites` 模块接入 Jina Reader 增强 URL -> 内容 -> AI 分析链路。

验证：
- `npm run build` 通过。
- AI 设置接口与 Reader 链路联调通过。

## 2026-04-01 导入导出与 WebDAV 同步

目标：
- 增加 ZIP 导入导出、模块级导出与 WebDAV 快照同步。

主要改动：
- 导入导出统一为 ZIP。
- 支持按模块导出与按模块覆盖导入。
- 增加 `manifest.json`。
- 接入 WebDAV 配置、上传、远程备份列表和恢复。
- 提供坚果云默认预设。

验证：
- `npm run build` 通过。
- 导出 ZIP 自检与导入预校验通过。

## 2026-04-01 导入模板与 AI 转换指引

目标：
- 让导入不再停留在“上传 ZIP + 失败报错”。

主要改动：
- 增加空模板 ZIP 与示例模板 ZIP 下载。
- 模板与真实导出共用 ZIP 底层结构。
- 在导入弹窗中新增下载模板与查看 AI Prompt 的入口。
- Prompt 改为服务端按当前模块与分类配置动态生成。

验证：
- `npm run build` 通过。

## 2026-04-01 主题、语言与底部设置区整理

目标：
- 增加浅色 / 深色主题切换与中英双语能力，并整理侧栏底部设置区。

主要改动：
- 增加 ThemeProvider 与 I18nProvider。
- 增加主题 / 语言本地持久化。
- 补充核心页面、筛选区和设置弹窗的暗色层级与翻译文案。
- 将语言、主题、AI 设置、数据同步合并为四个紧凑入口。
- 隐藏主要滚动容器滚动条，并统一底部按钮尺寸与图标布局。

验证：
- `npm run build` 通过。

## 2026-04-01 工作说明版本序列切换

目标：
- 将自动生成的工作说明文档版本切换到 `0.1.x` 序列。

主要改动：
- 基线版本调整为 `0.1.15`。
- 文档脚本只跟随当前基线所在的 `major.minor` 序列递增。
- 已生成首份新序列文档 `docs/0.1.16-change-log.md`。

## 2026-04-01 待处理模块（Inbox）

目标：
- 新增一个“原始内容优先”的待处理池，用来收集暂时还不想强结构化整理的内容。

主要改动：
- 新增 `inbox` 模块，接入左侧导航、表格总览、详情抽屉和管理员编辑流。
- 新增 `data/inbox.json`，并把 `taxonomy.json`、模块定义、图标映射和多语言文案一起扩展到四模块。
- 扩展服务端存储层，支持 `rawContent / rawContentType / aiSummary / aiSuggestions / suggestedTargetModule / suggestedCategory / confidence` 等字段。
- 待处理条目保存时支持标题自动生成、默认分类与默认状态回退，保证 AI 失败也不影响原始内容落库。
- 为 `inbox` 新增独立 AI Prompt、运行时校验和表单回填逻辑，重点输出摘要、标签、建议去向和下一步动作。
- 导入导出、示例模板和 AI 导入 Prompt 已兼容 `inbox`，支持单独导出与恢复该模块。

验证：
- `npm run build` 通过。
- 服务端真实写入烟测通过，测试数据已清理。

## 2026-04-01 AI 多条解析与批量创建

目标：
- 让 AI 辅助录入支持“单条解析 / 多条解析”两种模式，并在多条场景下先确认候选结果，再批量写入仓库。

主要改动：
- AI 解析协议扩展为 `mode: "single" | "multiple"`，服务端统一返回单条 `entry` 或多条 `entries`。
- 为 `offline / shopping / websites / inbox` 四个模块补充多条解析 prompt，重点支持榜单、表格、合集、推荐清单和多项目列表。
- `websites` 模块的多条解析会结合多网址识别和 Jina Reader 结果，优先拆分成多个网站候选。
- 新增候选确认弹窗，支持预览、勾选、删除不需要的候选，并编辑关键字段后再批量创建。
- 服务端新增批量创建落库链路，支持部分成功，保证单条失败不会导致整批丢失。
- 顺手清理了这条链路中几个关键文件的旧乱码文案与错误提示。

验证：
- `npm run build` 通过。
- `node --check server/ai/parse-entry.mjs` 通过。
- `node --check server/ai/analyze-website-entry.mjs` 通过。

## 2026-04-01 待处理模块仅管理员可见

目标：
- 让 `待处理 / Inbox` 模块只在管理员模式下可见，公开访客不再看到待处理池入口。

主要改动：
- 页面模块导航改为根据管理员登录态动态过滤，访客只显示正式公开模块。
- 登录态切回访客时，如果当前停留在 `inbox`，会自动回退到 `offline`，并关闭相关详情或编辑状态。
- 管理员的数据同步模块选择仍保留 `inbox`，不影响导入导出和备份。

验证：
- `npm run build` 通过。

## 2026-04-01 线下好店接入高德地点增强

目标：
- 为 `offline` 模块增加地点增强能力，支持精确定位、逆地理编码、地址解析和 IP 兜底定位。

主要改动：
- 为 `offline` 条目补充 `locationText / formattedAddress / province / city / district / adcode / lng / lat / locationSource / locationAccuracy / locationRectangle` 字段。
- 新增服务端高德地图封装，分别处理逆地理编码、地址转坐标和 IP 粗定位，避免在前端暴露 Key。
- 新增 `/api/location/reverse-geocode`、`/api/location/geocode`、`/api/location/ip-fallback` 接口，并通过 Vite 代理接入本地开发链路。
- 在线下好店新增/编辑弹窗中加入地点区块，支持“获取当前位置”和“解析地点”，并明确区分精确位置与近似位置。
- 详情抽屉、导入模板示例和 AI 导入 Prompt 已兼容新的地点字段。

验证：
- `npm run build` 通过。
- `node --check server/location/amap-client.mjs` 通过。
- `node --check server/location/amap-location.mjs` 通过。

## 2026-04-01 新增本地环境变量模板

目标：
- 为高德地图地点增强补充本地环境变量入口，方便直接配置管理员密码和 AMap Key。

主要改动：
- 在仓库根目录新增 `.env.local` 模板。
- 预置 `KNOWLEDGE_ADMIN_PASSWORD` 与 `AMAP_WEB_SERVICE_KEY` 两个常用配置项。

验证：
- 文件已创建，可直接填写后重启本地服务生效。

## 2026-04-01 工作说明版本切换到 1.0.x

目标：
- 让后续自动生成的工作说明文档从 `1.0.0` 开始进入新序列。

主要改动：
- 将工作说明基线版本调整为 `1.0.0`。
- 生成脚本新增“新序列首次直接使用基线版本”逻辑，避免第一次生成跳成 `1.0.1`。
- 保持旧的 `0.1.x` 文档不影响新的 `1.0.x` 序列递增。

验证：
- 已生成 `docs/1.0.0-change-log.md`。

## 2026-04-01 favicon 缓存更新

目标：
- 让替换后的 `favicon.svg` 能立即生效，避免浏览器继续显示旧图标。

主要改动：
- 将 `index.html` 中的 favicon 引用改为 `BASE_URL + favicon.svg`。
- 为 favicon 增加版本查询参数，用于主动绕过浏览器缓存。

验证：
- `npm run build` 通过。

## 2026-04-01 favicon 源文件修正

目标：
- 修正 favicon 实际替换位置错误的问题，确保开发和构建都读取同一份新图标。

主要改动：
- 确认用户之前替换的是 `dist/favicon.svg`，而非真正的源文件。
- 将新的 favicon 内容同步覆盖到 `public/favicon.svg`。
- 继续递增 favicon 查询参数，进一步避免旧缓存残留。

验证：
- `npm run build` 通过。
- 构建后的 `dist/favicon.svg` 已与 `public/favicon.svg` 一致。

## 2026-04-01 站点标题更新为 Archive

目标：
- 将浏览器标签页和页面标题从 `momeak-archive` 调整为 `Archive`。

主要改动：
- 更新 `index.html` 中的 `<title>` 为 `Archive`。

验证：
- `npm run build` 通过。

## 2026-04-13 物品收集工作表 Tabs

目标：
- 将 `shopping` 模块的分类切换改成更接近飞书云文档工作表的 Tabs 体验。
- 让分类切换直接作用于当前表格视图，并支持在 Tabs 区域快速新建分类。

主要改动：
- 新增 `src/components/knowledge/ShoppingSheetTabs.tsx`，用于渲染分类 Tabs、分类计数和管理员 `+` 新建入口。
- `src/pages/PersonalKnowledgeSiteUIMockup.tsx` 接入 `shopping` 专属工作表视图：
  - Tabs 数据来自真实分类配置和现有数据，不在组件内写死。
  - 当前选中分类会限制表格数据范围，统计卡、空状态、标签池和搜索筛选都随当前工作表更新。
  - 在 `shopping` 模块新增条目时，默认归入当前激活的工作表分类。
  - 新建分类成功后立即刷新 Tabs，并自动切换到新分类。
- `src/components/knowledge/FilterBar.tsx` 增加 `showCategoryFilter`，在 `shopping` 模块下隐藏重复的分类下拉，避免和 Tabs 冲突。
- 补充中英文文案，兼容现有多语言体系。

验证：
- `npm run build` 通过。

## 2026-04-13 AI 图片解析接入

目标：
- 为新增条目的 AI 辅助解析增加图片上传与截图识别能力。
- 重点支持 `shopping` 模块的商品截图、订单图、评价图和详情页截图。
- 保持现有单条 / 多条解析协议、候选确认和批量创建流程兼容。

主要改动：
- 新增 `src/components/knowledge/AiImageUpload.tsx`，支持点击上传、拖拽上传、缩略图预览和删除已选图片。
- `src/components/knowledge/AiAssistPanel.tsx` 重写为统一的文本 + 图片解析面板，保留单条 / 多条切换和候选确认提示。
- `src/components/knowledge/QuickAddEntryDialog.tsx` 接入图片状态管理、大小与数量限制，并把图片一起提交到现有 AI 解析入口。
- 扩展前后端 AI 解析协议，新增图片输入对象，服务端支持把图片与文本一起发给兼容 OpenAI 接口的多模态模型。
- 重写 `server/ai/client.mjs`、`server/ai/schema.mjs`、`server/ai/prompts/shopping.mjs`、`server/ai/prompts/websites.mjs`，补充图片解析相关 schema 和 prompt。
- 在 `server/ai/providers.mjs` 中增加模型图片能力元数据，并补充 `qwen` / `qwen3.5-omni-plus-image`。
- 当前模型不支持图片输入时，服务端会明确报错，提示切换到支持视觉的模型。

验证：
- `npm run build` 通过。
- `node --check server/ai/client.mjs` 通过。
- `node --check server/ai/prompts/shopping.mjs` 通过。
- `node --check server/ai/prompts/websites.mjs` 通过。

## 2026-04-13 购物截图字段深化

目标：
- 继续增强购物截图解析后的信息承载能力，让数量、规格、店铺和优惠信息能进入现有表单与详情结构。

主要改动：
- 扩展 `shopping` 条目与 `QuickAddDraft` 的可选字段：`quantity`、`specification`、`storeName`、`discountInfo`。
- `src/components/knowledge/QuickAddEntryDialog.tsx` 为购物模块新增对应输入项，支持管理员手动补充或校正截图识别结果。
- `src/components/knowledge/AiCandidateReviewDialog.tsx` 为购物候选结果确认增加上述字段，便于多条截图解析后逐条修正。
- `server/knowledge-store.mjs` 接入新字段的本地保存逻辑，确保写入 JSON 后不会丢失。
- 重写 `src/lib/knowledge.ts` 和 `src/lib/knowledge-detail.ts` 的相关映射逻辑，让搜索、主次信息展示和详情抽屉可以使用这些字段。

验证：
- `npm run build` 通过。

## 2026-04-13 Blaze 补充 Qwen 图片模型
- 将 Blaze 服务商模型目录重写为干净版本，补齐 qwen 与 qwen3.5-omni-plus-image。
- 让购物截图图片解析在 Blaze 场景下也能直接选到支持视觉输入的模型。

## 2026-04-13 Qwen 图片模型端点修正
- 为需要图片专用端点的模型增加 apiStyle 元信息。
- AI 客户端按模型切换 chat/completions 与 responses 请求格式，修复 qwen3.5-omni-plus-image 的 400 报错。

## 2026-04-14 Blaze 模型 ID 修正
- 按 Blaze /api/models 的真实返回重建 provider 模型目录。
- 将 Blaze 下的 Qwen 解析模型改为真实 id，例如 qwen/qwen3.5-omni-plus。

## 2026-04-14 AI JSON 容错增强
- 重写 AI 客户端的结构化结果提取逻辑。
- 支持从代码块、包裹文本和嵌入式 JSON 中提取有效结果，降低模型输出轻微偏离时的失败率。

## 2026-04-14 定位接口网络错误提示优化
- 为线下好店定位、地址解析和 IP 兜底请求增加网络层错误提示。
- 当部署在 GitHub Pages 或本地 API 未启动时，前端不再只显示 Failed to fetch。

## 2026-04-14 线下好店地址解析兜底增强
- 地址解析改成先 geocode、后 POI 文本搜索的两段式流程。
- 允许输入店名、商圈或模糊地点时回退到 POI 搜索，减少 ENGINE_RESPONSE_DATA_ERROR 带来的失败。

# Momeak Archive

个人知识收集 / 笔记 / 知识库网站：线下好店、网购好物、网站收集、待处理（Inbox）、歌曲五个模块。

## 架构

```
React 19 + Vite 8 + TypeScript + Tailwind CSS v4 (SPA)
        │
        │  /api/* （开发时 Vite 代理到 127.0.0.1:5174）
        ▼
server/knowledge-api.mjs —— 原生 Node http 服务（无框架）
        │
        ▼
server/knowledge-store.mjs —— 存储层
        │
        ├── SQLite（data/momeak.sqlite，运行时唯一写入源，node:sqlite）
        │      entries / markdowns / taxonomy 三张表
        │
        └── 每次写操作后自动镜像回文件（保持 Pages 构建 & Git 工作流不变）
               data/*.json  +  content/<module>/<entryId>.md
```

- **本地开发**：`npm run dev` 同时启动 API 服务（`server/knowledge-api.mjs`）与 Vite，支持增删改查、AI 解析、导入导出、WebDAV 同步、高德定位。
- **生产部署**：GitHub Actions 只把 `dist/` 发布到 GitHub Pages；线上是只读站点，数据来自构建时静态导入的 `data/*.json`（见 `src/data/knowledge.ts`）。

## 数据流约定

- SQLite 是运行时**唯一写入源**；所有写操作（增删改、分类管理、导入应用）都会同步镜像回 `data/*.json` 与 `content/**/*.md`，因此 Git 里的 JSON/MD 始终是数据库的最新快照，可直接提交。
- 首次启动时若数据库为空且 `data/*.json` 存在，会自动从 JSON 种子初始化（无需手工步骤）。
- 强制从 JSON 重建数据库：`node scripts/migrate-json-to-db.mjs --force`（输出条数与抽样字段比对报告）。

## 快速开始

```bash
npm install
npm run dev          # API (5174) + Vite (5173)
```

管理员密码默认 `7`（可用环境变量 `KNOWLEDGE_ADMIN_PASSWORD` 覆盖，见 `.env.example`）。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动 API 服务和 Vite 开发服务器 |
| `npm run dev:server` | 只启动 API 服务 |
| `npm run build` | `tsc -b && vite build` 产出 `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | 本地预览生产构建 |
| `node scripts/migrate-json-to-db.mjs [--force]` | JSON → SQLite 幂等迁移 / 强制重建 |

## 环境变量

见 `.env.example`。核心项：`KNOWLEDGE_ADMIN_PASSWORD`、`KNOWLEDGE_API_PORT`、`KNOWLEDGE_REPO_ROOT`、`KNOWLEDGE_DB_FILE`，以及 AI / Jina Reader / 高德定位相关配置。

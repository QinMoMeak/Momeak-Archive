#!/usr/bin/env node
// 幂等迁移：把 data/*.json + content/**/*.md + taxonomy.json 重建进 SQLite。
// 用法：node scripts/migrate-json-to-db.mjs [--force]
//   --force  先清空数据库再导入（默认是"库空才导"的幂等语义）

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(repoRoot, "data");
const contentDir = path.join(repoRoot, "content");
const moduleIds = ["offline", "shopping", "websites", "inbox", "songs"];
const force = process.argv.includes("--force");

process.env.KNOWLEDGE_DB_FILE =
  process.env.KNOWLEDGE_DB_FILE || path.join(dataDir, "momeak.sqlite");

const { getDatabase } = await import("../server/db/database.mjs");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function listMarkdownFiles(moduleId) {
  const dir = path.join(contentDir, moduleId);

  try {
    const names = await fs.readdir(dir);
    return names.filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
}

const db = getDatabase();

if (force) {
  db.exec("DELETE FROM entries");
  db.exec("DELETE FROM markdowns");
  db.exec("DELETE FROM taxonomy");
  console.log("[migrate] --force：已清空数据库现有内容");
} else {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM entries").get();

  if (total > 0) {
    console.log(`[migrate] 数据库已有 ${total} 条数据，跳过种子导入（幂等）。`);
    console.log("[migrate] 如需强制重建，请运行：node scripts/migrate-json-to-db.mjs --force");
    process.exit(0);
  }
}

const report = [];

const insertEntry = db.prepare(`
  INSERT INTO entries (module, id, name, category, status, tags, payload, created_at, updated_at, position)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertMarkdown = db.prepare(
  "INSERT OR REPLACE INTO markdowns (module, entry_id, content) VALUES (?, ?, ?)",
);

db.exec("BEGIN");
try {
  let totalCount = 0;

  for (const moduleId of moduleIds) {
    const jsonPath = path.join(dataDir, `${moduleId}.json`);
    const entries = await readJson(jsonPath);
    const mdFiles = await listMarkdownFiles(moduleId);

    for (const [position, entry] of entries.entries()) {
      insertEntry.run(
        moduleId,
        entry.id,
        entry.name ?? "",
        entry.category ?? "",
        entry.status ?? "",
        JSON.stringify(entry.tags ?? []),
        JSON.stringify(entry),
        entry.createdAt ?? "",
        entry.updatedAt ?? "",
        position,
      );
    }

    let mdCount = 0;

    for (const fileName of mdFiles) {
      const entryId = fileName.slice(0, -".md".length);
      const content = await fs.readFile(path.join(contentDir, moduleId, fileName), "utf8");
      insertMarkdown.run(moduleId, entryId, content);
      mdCount += 1;
    }

    totalCount += entries.length;
    report.push({ moduleId, entryCount: entries.length, markdownCount: mdCount });
  }

  const taxonomy = await readJson(path.join(dataDir, "taxonomy.json"));
  db.prepare("INSERT OR REPLACE INTO taxonomy (id, payload) VALUES (1, ?)").run(
    JSON.stringify(taxonomy),
  );

  db.exec("COMMIT");

  console.log("\n[migrate] 迁移完成，比对报告：");
  console.log("模块\t\tJSON 条目数\tMarkdown 文件数\tDB 条目数\tDB MD 数");

  let allMatch = true;

  for (const { moduleId, entryCount, markdownCount } of report) {
    const dbCount = db
      .prepare("SELECT COUNT(*) AS n FROM entries WHERE module = ?")
      .get(moduleId).n;
    const dbMd = db
      .prepare("SELECT COUNT(*) AS n FROM markdowns WHERE module = ?")
      .get(moduleId).n;
    const match = dbCount === entryCount && dbMd === markdownCount;
    if (!match) allMatch = false;
    console.log(
      `${moduleId}\t${entryCount}\t\t${markdownCount}\t\t${dbCount}\t\t${dbMd}${match ? "" : "  <-- 不一致!"}`,
    );
  }

  // 抽样比对：每个模块第一条的字段逐一核对
  console.log("\n[migrate] 抽样字段比对（每模块第 1 条）：");
  let sampleOk = true;

  for (const moduleId of moduleIds) {
    const jsonEntries = await readJson(path.join(dataDir, `${moduleId}.json`));

    if (jsonEntries.length === 0) {
      console.log(`${moduleId}: （空模块，跳过）`);
      continue;
    }

    const jsonEntry = jsonEntries[0];
    const row = db
      .prepare("SELECT payload FROM entries WHERE module = ? AND id = ?")
      .get(moduleId, jsonEntry.id);
    const dbEntry = JSON.parse(row.payload);

    const jsonStr = JSON.stringify(jsonEntry);
    const dbStr = JSON.stringify(dbEntry);
    const identical = jsonStr === dbStr;
    if (!identical) sampleOk = false;
    console.log(
      `${moduleId}/${jsonEntry.id}: ${identical ? "完全一致" : "不一致!\n  JSON: " + jsonStr + "\n  DB:   " + dbStr}`,
    );
  }

  console.log(
    `\n[migrate] 总计 ${totalCount} 条。条数比对：${allMatch ? "全部一致 ✓" : "存在不一致 ✗"}；抽样比对：${sampleOk ? "全部一致 ✓" : "存在不一致 ✗"}`,
  );
  process.exit(allMatch && sampleOk ? 0 : 1);
} catch (error) {
  db.exec("ROLLBACK");
  console.error("[migrate] 迁移失败，已回滚：", error);
  process.exit(1);
}

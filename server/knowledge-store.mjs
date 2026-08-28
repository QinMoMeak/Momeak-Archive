import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDatabase } from "./db/database.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.KNOWLEDGE_REPO_ROOT
  ? path.resolve(process.env.KNOWLEDGE_REPO_ROOT)
  : path.resolve(__dirname, "..");

const dataDir = path.join(repoRoot, "data");
const contentDir = path.join(repoRoot, "content");
const taxonomyFile = path.join(dataDir, "taxonomy.json");
const minIdWidth = 3;
const moduleIds = ["offline", "shopping", "websites", "inbox", "songs"];
const dataFiles = {
  offline: path.join(dataDir, "offline.json"),
  shopping: path.join(dataDir, "shopping.json"),
  websites: path.join(dataDir, "websites.json"),
  inbox: path.join(dataDir, "inbox.json"),
  songs: path.join(dataDir, "songs.json"),
};

const inboxDefaultCategory = "未归类";
const inboxDefaultStatus = "未处理";

export const knowledgeModuleIds = [...moduleIds];
export const knowledgeRepoRoot = repoRoot;
export const knowledgeDataDir = dataDir;
export const knowledgeContentDir = contentDir;

function assertModuleId(moduleId) {
  if (!moduleIds.includes(moduleId)) {
    throw new Error("不支持的模块类型。");
  }
}

function cleanInlineText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMultilineText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function parseTagsInput(input) {
  const seen = new Set();

  return String(input ?? "")
    .split(/[\n,?]/)
    .map((tag) => cleanInlineText(tag))
    .filter((tag) => {
      if (!tag) {
        return false;
      }

      const normalized = tag.toLocaleLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function parseNumber(value) {
  const normalized = cleanInlineText(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error("请输入有效的数字字段。");
  }

  return parsed;
}

function clampConfidence(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(cleanInlineText(value));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(1, parsed));
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getMarkdownSummary(markdownContent) {
  const firstContentLine = cleanMultilineText(markdownContent)
    .split("\n")
    .map((line) => line.replace(/^[#>*+\-\d.\s`]+/, "").trim())
    .find(Boolean);

  return firstContentLine ? firstContentLine.slice(0, 120) : "";
}

function getTextSummary(value, maxLength = 120) {
  return cleanMultilineText(value)
    .replace(/\n+/g, " ")
    .slice(0, maxLength);
}

function inferInboxTitle(rawContent) {
  const cleaned = getTextSummary(rawContent, 48);

  if (!cleaned) {
    return "";
  }

  const withoutProtocol = cleaned.replace(/^https?:\/\//i, "");
  const withoutHashes = withoutProtocol.replace(/^#+\s*/, "");
  return withoutHashes.slice(0, 28);
}

function inferRawContentType(rawContent) {
  const normalized = cleanMultilineText(rawContent);

  if (!normalized) {
    return "text";
  }

  const hasUrl = /https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}/i.test(normalized);
  const hasImage = /\.(png|jpe?g|gif|webp|svg)\b/i.test(normalized);
  const hasMultipleLines = normalized.includes("\n");

  if (hasUrl && hasImage) {
    return "mixed";
  }

  if (hasImage) {
    return "image";
  }

  if (hasUrl) {
    return "url";
  }

  if (hasMultipleLines && normalized.length > 180) {
    return "note";
  }

  return "text";
}

async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

function getContentFilePath(moduleId, entryId) {
  return path.join(contentDir, moduleId, `${entryId}.md`);
}

function getPublicMarkdownPath(moduleId, entryId) {
  return `content/${moduleId}/${entryId}.md`;
}

// ===== SQLite 行 ⇄ 条目对象转换 =====

function rowToEntry(row) {
  if (!row) {
    return null;
  }

  return JSON.parse(row.payload);
}

function rowsToEntries(rows) {
  return rows.map((row) => rowToEntry(row));
}

const statements = new Map();

function stmt(key, sql) {
  if (!statements.has(key)) {
    statements.set(key, getDatabase().prepare(sql));
  }

  return statements.get(key);
}

function selectModuleRows(moduleId) {
  return stmt(
    "select-module",
    "SELECT * FROM entries WHERE module = ? ORDER BY position, rowid",
  ).all(moduleId);
}

// ===== 镜像回写：SQLite 为唯一写入源，JSON/MD 文件在每次写后同步导出 =====
// 前端静态回退（Pages 构建）在构建时 import data/*.json，因此这些文件
// 必须持续反映数据库内容，保持 Pages 部署与 Git diff 工作流不变。

async function mirrorModuleEntriesToFiles(moduleId) {
  const entries = rowsToEntries(selectModuleRows(moduleId));
  await fs.writeFile(dataFiles[moduleId], `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return entries;
}

async function mirrorMarkdownToFiles(moduleId) {
  const rows = stmt(
    "select-markdowns",
    "SELECT entry_id, content FROM markdowns WHERE module = ? ORDER BY entry_id",
  ).all(moduleId);
  const moduleDir = path.join(contentDir, moduleId);

  await fs.rm(moduleDir, { recursive: true, force: true });

  if (rows.length === 0) {
    return;
  }

  await ensureDirectory(moduleDir);

  await Promise.all(
    rows.map(({ entry_id, content }) =>
      fs.writeFile(
        getContentFilePath(moduleId, entry_id),
        content.endsWith("\n") ? content : `${content}\n`,
        "utf8",
      ),
    ),
  );
}

async function mirrorTaxonomyToFiles() {
  const row = stmt("select-taxonomy", "SELECT payload FROM taxonomy WHERE id = 1").get();

  if (row) {
    const parsed = JSON.parse(row.payload);
    await fs.writeFile(taxonomyFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
}

function upsertEntryRow(moduleId, entry, position) {
  stmt(
    "upsert-entry",
    `INSERT INTO entries (module, id, name, category, status, tags, payload, created_at, updated_at, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (module, id) DO UPDATE SET
       name = excluded.name,
       category = excluded.category,
       status = excluded.status,
       tags = excluded.tags,
       payload = excluded.payload,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       position = excluded.position`,
  ).run(
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

function updateEntryRow(moduleId, entry) {
  stmt(
    "update-entry",
    "UPDATE entries SET name = ?, category = ?, status = ?, tags = ?, payload = ?, updated_at = ? WHERE module = ? AND id = ?",
  ).run(
    entry.name ?? "",
    entry.category ?? "",
    entry.status ?? "",
    JSON.stringify(entry.tags ?? []),
    JSON.stringify(entry),
    entry.updatedAt ?? "",
    moduleId,
    entry.id,
  );
}

function getNextEntryIdFromList(moduleId, entries) {
  const pattern = new RegExp(`^${moduleId}-(\\d+)$`);
  const currentMax = entries.reduce((maxValue, entry) => {
    const match = pattern.exec(entry.id);

    if (!match) {
      return maxValue;
    }

    return Math.max(maxValue, Number(match[1]));
  }, 0);

  const nextValue = currentMax + 1;
  const nextWidth = Math.max(minIdWidth, String(nextValue).length);
  return `${moduleId}-${String(nextValue).padStart(nextWidth, "0")}`;
}

function getNextEntryId(moduleId) {
  return getNextEntryIdFromList(moduleId, rowsToEntries(selectModuleRows(moduleId)));
}

function writeMarkdownRow(moduleId, entryId, content) {
  stmt(
    "insert-markdown",
    "INSERT OR REPLACE INTO markdowns (module, entry_id, content) VALUES (?, ?, ?)",
  ).run(moduleId, entryId, content);
}

function deleteMarkdownRow(moduleId, entryId) {
  stmt("delete-markdown", "DELETE FROM markdowns WHERE module = ? AND entry_id = ?").run(
    moduleId,
    entryId,
  );
}

function withTransaction(run) {
  const db = getDatabase();
  db.exec("BEGIN");
  try {
    run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function readKnowledgeMetaSync() {
  const row = stmt("select-taxonomy", "SELECT payload FROM taxonomy WHERE id = 1").get();

  if (!row) {
    return { categories: {} };
  }

  return JSON.parse(row.payload);
}

function writeKnowledgeMetaSync(meta) {
  stmt(
    "upsert-taxonomy",
    "INSERT OR REPLACE INTO taxonomy (id, payload) VALUES (1, ?)",
  ).run(JSON.stringify(meta));
}

function ensureUniqueCategory(categories, targetName, ignoreName = "") {
  const normalizedTarget = targetName.toLocaleLowerCase();
  const normalizedIgnore = ignoreName.toLocaleLowerCase();

  if (
    categories.some((category) => {
      const normalized = category.toLocaleLowerCase();
      return normalized === normalizedTarget && normalized !== normalizedIgnore;
    })
  ) {
    throw new Error("分类名称已存在，请换一个。");
  }
}

function ensureCategoryExistsSync(moduleId, categoryName) {
  if (!categoryName) {
    return;
  }

  const meta = readKnowledgeMetaSync();
  const currentCategories = meta.categories[moduleId] ?? [];
  const normalizedCategory = categoryName.toLocaleLowerCase();

  if (
    currentCategories.some((category) => category.toLocaleLowerCase() === normalizedCategory)
  ) {
    return;
  }

  meta.categories[moduleId] = [...currentCategories, categoryName];
  writeKnowledgeMetaSync(meta);
}

function normalizeDraft(moduleId, draft) {
  assertModuleId(moduleId);

  const normalized = {
    name: cleanInlineText(draft.name),
    category: cleanInlineText(draft.category),
    status: cleanInlineText(draft.status),
    tags: parseTagsInput(draft.tags),
    note: cleanMultilineText(draft.note),
    markdownContent: cleanMultilineText(draft.markdownContent),
    source: cleanInlineText(draft.source) || "快速新增",
    location: cleanInlineText(draft.location),
    locationText: cleanInlineText(draft.locationText),
    formattedAddress: cleanInlineText(draft.formattedAddress),
    province: cleanInlineText(draft.province),
    city: cleanInlineText(draft.city),
    district: cleanInlineText(draft.district),
    adcode: cleanInlineText(draft.adcode),
    lng: parseNumber(draft.lng),
    lat: parseNumber(draft.lat),
    locationSource: cleanInlineText(draft.locationSource) || "manual",
    locationAccuracy: cleanInlineText(draft.locationAccuracy) || "exact",
    locationRectangle: cleanInlineText(draft.locationRectangle),
    rating: parseNumber(draft.rating),
    platform: cleanInlineText(draft.platform),
    price: parseNumber(draft.price),
    quantity: cleanInlineText(draft.quantity),
    specification: cleanInlineText(draft.specification),
    storeName: cleanInlineText(draft.storeName),
    discountInfo: cleanMultilineText(draft.discountInfo),
    domain: cleanInlineText(draft.domain),
    access: cleanInlineText(draft.access) || "可访问",
    content: cleanInlineText(draft.content),
    purpose: cleanInlineText(draft.purpose),
    rawContent: cleanMultilineText(draft.rawContent),
    rawContentType: cleanInlineText(draft.rawContentType),
    aiSummary: cleanMultilineText(draft.aiSummary),
    aiSuggestions: cleanMultilineText(draft.aiSuggestions),
    suggestedTargetModule: cleanInlineText(draft.suggestedTargetModule),
    suggestedCategory: cleanInlineText(draft.suggestedCategory),
    confidence: clampConfidence(draft.confidence),
    artist: cleanInlineText(draft.artist),
    album: cleanInlineText(draft.album),
    lyricsSnippet: cleanMultilineText(draft.lyricsSnippet),
    mood: cleanInlineText(draft.mood),
    language: cleanInlineText(draft.language),
  };

  if (moduleId === "inbox") {
    if (!normalized.rawContent) {
      throw new Error("待处理模块至少需要一段原始内容。");
    }

    normalized.name = normalized.name || inferInboxTitle(normalized.rawContent) || "未命名待处理条目";
    normalized.category = normalized.category || inboxDefaultCategory;
    normalized.status = normalized.status || inboxDefaultStatus;
    normalized.rawContentType = normalized.rawContentType || inferRawContentType(normalized.rawContent);
  } else {
    if (!normalized.name) {
      throw new Error("名称不能为空。");
    }

    if (!normalized.category) {
      throw new Error("请至少选择一个分类。");
    }

    if (!normalized.status) {
      throw new Error("请至少选择一个状态。");
    }
  }

  if (moduleId === "offline" && !normalized.location) {
    normalized.location =
      normalized.locationText ||
      normalized.formattedAddress ||
      [normalized.city, normalized.district, normalized.province].filter(Boolean).join(" ");
  }

  if (moduleId === "offline" && !normalized.location) {
    throw new Error("线下好店至少需要填写地点。");
  }

  if (moduleId === "websites" && !normalized.domain) {
    throw new Error("网站收集至少需要填写域名。");
  }

  return normalized;
}

function buildEntry(moduleId, draft, entryId) {
  const today = getToday();
  const note =
    draft.note ||
    draft.aiSummary ||
    getMarkdownSummary(draft.markdownContent) ||
    (moduleId === "inbox" ? getTextSummary(draft.rawContent) : draft.lyricsSnippet || "");

  const baseEntry = {
    id: entryId,
    module: moduleId,
    name: draft.name,
    category: draft.category,
    status: draft.status,
    tags: draft.tags,
    note,
    source: draft.source,
    createdAt: today,
    updatedAt: today,
  };

  if (moduleId === "offline") {
    return {
      ...baseEntry,
      module: "offline",
      location: draft.location,
      locationText: draft.locationText,
      formattedAddress: draft.formattedAddress,
      province: draft.province,
      city: draft.city,
      district: draft.district,
      adcode: draft.adcode,
      lng: draft.lng,
      lat: draft.lat,
      locationSource: draft.locationSource,
      locationAccuracy: draft.locationAccuracy,
      locationRectangle: draft.locationRectangle,
      rating: draft.rating,
    };
  }

  if (moduleId === "shopping") {
    return {
      ...baseEntry,
      module: "shopping",
      platform: draft.platform,
      price: draft.price,
      quantity: draft.quantity,
      specification: draft.specification,
      storeName: draft.storeName,
      discountInfo: draft.discountInfo,
    };
  }

  if (moduleId === "websites") {
    return {
      ...baseEntry,
      module: "websites",
      domain: draft.domain,
      access: draft.access,
      content: draft.content,
      purpose: draft.purpose,
    };
  }

  if (moduleId === "songs") {
    return {
      ...baseEntry,
      module: "songs",
      artist: draft.artist,
      album: draft.album,
      lyricsSnippet: draft.lyricsSnippet,
      mood: draft.mood,
      language: draft.language,
    };
  }

  return {
    ...baseEntry,
    module: "inbox",
    rawContent: draft.rawContent,
    rawContentType: draft.rawContentType,
    aiSummary: draft.aiSummary,
    aiSuggestions: draft.aiSuggestions,
    suggestedTargetModule: draft.suggestedTargetModule,
    suggestedCategory: draft.suggestedCategory,
    confidence: draft.confidence,
  };
}

function readModuleEntriesSync(moduleId) {
  assertModuleId(moduleId);
  return rowsToEntries(selectModuleRows(moduleId));
}

export async function readModuleEntries(moduleId) {
  return readModuleEntriesSync(moduleId);
}

export async function readKnowledgeEntry(moduleId, entryId) {
  assertModuleId(moduleId);

  const row = stmt(
    "select-one",
    "SELECT * FROM entries WHERE module = ? AND id = ?",
  ).get(moduleId, entryId);

  return rowToEntry(row);
}

export async function writeModuleEntries(moduleId, entries) {
  assertModuleId(moduleId);

  withTransaction(() => {
    stmt("delete-module-entries", "DELETE FROM entries WHERE module = ?").run(moduleId);

    for (const [position, entry] of entries.entries()) {
      upsertEntryRow(moduleId, entry, position);
    }
  });

  await mirrorModuleEntriesToFiles(moduleId);
}

export async function readKnowledgeData() {
  const results = moduleIds.map((moduleId) => [moduleId, readModuleEntriesSync(moduleId)]);

  return Object.fromEntries(results);
}

export async function readKnowledgeMeta() {
  return readKnowledgeMetaSync();
}

export async function writeKnowledgeMeta(meta) {
  writeKnowledgeMetaSync(meta);
  await mirrorTaxonomyToFiles();
}

export async function readMarkdownContent(moduleId, entryId) {
  assertModuleId(moduleId);

  const row = stmt(
    "select-markdown",
    "SELECT content FROM markdowns WHERE module = ? AND entry_id = ?",
  ).get(moduleId, entryId);

  return row ? row.content : "";
}

export async function replaceModuleMarkdownContent(moduleId, markdownByEntryId) {
  assertModuleId(moduleId);

  withTransaction(() => {
    stmt("delete-module-markdowns", "DELETE FROM markdowns WHERE module = ?").run(moduleId);

    const entriesToWrite = Object.entries(markdownByEntryId).filter(
      ([, content]) => cleanMultilineText(content).length > 0,
    );

    for (const [entryId, content] of entriesToWrite) {
      writeMarkdownRow(moduleId, entryId, `${cleanMultilineText(content)}\n`);
    }
  });

  await mirrorMarkdownToFiles(moduleId);
}

function getMaxPosition(moduleId) {
  const row = stmt(
    "select-max-position",
    "SELECT COALESCE(MAX(position), -1) AS maxPosition FROM entries WHERE module = ?",
  ).get(moduleId);
  return Number(row.maxPosition);
}

export async function createKnowledgeEntry(moduleId, draftInput) {
  assertModuleId(moduleId);

  const normalizedDraft = normalizeDraft(moduleId, draftInput);
  const entryId = getNextEntryId(moduleId);
  const entry = buildEntry(moduleId, normalizedDraft, entryId);
  const markdownContent = normalizedDraft.markdownContent;

  withTransaction(() => {
    upsertEntryRow(moduleId, entry, getMaxPosition(moduleId) + 1);
    ensureCategoryExistsSync(moduleId, entry.category);
  });

  if (markdownContent) {
    writeMarkdownRow(moduleId, entryId, `${markdownContent}\n`);
  }

  await mirrorModuleEntriesToFiles(moduleId);
  if (markdownContent) {
    await mirrorMarkdownToFiles(moduleId);
  }

  return {
    entry,
    data: await readKnowledgeData(),
    markdownPath: markdownContent ? getPublicMarkdownPath(moduleId, entryId) : null,
  };
}

export async function createKnowledgeEntriesBatch(moduleId, draftInputs) {
  assertModuleId(moduleId);

  const createdEntries = [];
  const failures = [];
  const markdownWrites = [];

  // 复用原有 ID 生成逻辑：在内存中累积模拟列表，避免批量内 ID 冲突。
  const simulatedEntries = readModuleEntriesSync(moduleId);

  for (let index = 0; index < draftInputs.length; index += 1) {
    const draftInput = draftInputs[index];

    try {
      const normalizedDraft = normalizeDraft(moduleId, draftInput);
      const entryId = getNextEntryIdFromList(moduleId, simulatedEntries);
      const entry = buildEntry(moduleId, normalizedDraft, entryId);
      simulatedEntries.push(entry);
      createdEntries.push(entry);

      if (normalizedDraft.markdownContent) {
        markdownWrites.push({ entryId, content: normalizedDraft.markdownContent });
      }
    } catch (error) {
      failures.push({
        index,
        draftName: cleanInlineText(draftInput?.name) || `第 ${index + 1} 条`,
        message: error instanceof Error ? error.message : "写入失败",
      });
    }
  }

  if (createdEntries.length > 0) {
    withTransaction(() => {
      let position = getMaxPosition(moduleId);

      for (const entry of createdEntries) {
        position += 1;
        upsertEntryRow(moduleId, entry, position);
        ensureCategoryExistsSync(moduleId, entry.category);
      }
    });

    for (const { entryId, content } of markdownWrites) {
      writeMarkdownRow(moduleId, entryId, `${content}\n`);
    }
  }

  await mirrorModuleEntriesToFiles(moduleId);
  if (markdownWrites.length > 0) {
    await mirrorMarkdownToFiles(moduleId);
  }

  return {
    data: await readKnowledgeData(),
    createdEntries,
    failures,
  };
}

export async function updateKnowledgeEntry(moduleId, entryId, draftInput) {
  assertModuleId(moduleId);

  const normalizedDraft = normalizeDraft(moduleId, draftInput);
  const currentRow = stmt(
    "select-one",
    "SELECT * FROM entries WHERE module = ? AND id = ?",
  ).get(moduleId, entryId);

  if (!currentRow) {
    throw new Error("没有找到要更新的条目。");
  }

  const currentEntry = rowToEntry(currentRow);
  const updatedEntry = {
    ...buildEntry(moduleId, normalizedDraft, entryId),
    createdAt: currentEntry.createdAt,
    updatedAt: getToday(),
  };

  withTransaction(() => {
    updateEntryRow(moduleId, updatedEntry);
    ensureCategoryExistsSync(moduleId, updatedEntry.category);
  });

  if (normalizedDraft.markdownContent) {
    writeMarkdownRow(moduleId, entryId, `${normalizedDraft.markdownContent}\n`);
  } else {
    deleteMarkdownRow(moduleId, entryId);
  }

  await mirrorModuleEntriesToFiles(moduleId);
  await mirrorMarkdownToFiles(moduleId);

  return {
    entry: updatedEntry,
    data: await readKnowledgeData(),
    markdownPath: normalizedDraft.markdownContent ? getPublicMarkdownPath(moduleId, entryId) : null,
  };
}

export async function deleteKnowledgeEntry(moduleId, entryId) {
  assertModuleId(moduleId);

  const result = stmt(
    "delete-entry",
    "DELETE FROM entries WHERE module = ? AND id = ?",
  ).run(moduleId, entryId);

  if (result.changes === 0) {
    throw new Error("没有找到要删除的条目。");
  }

  // markdowns 外键 ON DELETE CASCADE 应已清理，这里兜底再删一次。
  deleteMarkdownRow(moduleId, entryId);

  await mirrorModuleEntriesToFiles(moduleId);
  await mirrorMarkdownToFiles(moduleId);

  return {
    data: await readKnowledgeData(),
    deletedEntryId: entryId,
  };
}

function selectModuleCategoryRows(moduleId, categoryName) {
  return stmt(
    "select-module-category",
    "SELECT * FROM entries WHERE module = ? AND category = ?",
  ).all(moduleId, categoryName);
}

export async function createCategory(moduleId, nameInput) {
  assertModuleId(moduleId);
  const name = cleanInlineText(nameInput);

  if (!name) {
    throw new Error("分类名称不能为空。");
  }

  const meta = readKnowledgeMetaSync();
  const categories = meta.categories[moduleId] ?? [];
  ensureUniqueCategory(categories, name);
  meta.categories[moduleId] = [...categories, name];
  await writeKnowledgeMeta(meta);

  return { data: await readKnowledgeData(), meta };
}

export async function renameCategory(moduleId, oldNameInput, newNameInput) {
  assertModuleId(moduleId);
  const oldName = cleanInlineText(oldNameInput);
  const newName = cleanInlineText(newNameInput);

  if (!oldName || !newName) {
    throw new Error("旧分类和新分类名称都不能为空。");
  }

  const meta = readKnowledgeMetaSync();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(oldName)) {
    throw new Error("没有找到要修改的分类。");
  }

  ensureUniqueCategory(categories, newName, oldName);
  meta.categories[moduleId] = categories.map((category) => (category === oldName ? newName : category));
  await writeKnowledgeMeta(meta);

  const rows = selectModuleCategoryRows(moduleId, oldName);

  if (rows.length > 0) {
    withTransaction(() => {
      for (const row of rows) {
        const entry = rowToEntry(row);
        entry.category = newName;
        updateEntryRow(moduleId, entry);
      }
    });

    await mirrorModuleEntriesToFiles(moduleId);
  }

  return { data: await readKnowledgeData(), meta };
}

export async function deleteCategory(moduleId, nameInput, replacementNameInput = "") {
  assertModuleId(moduleId);
  const name = cleanInlineText(nameInput);
  const replacementName = cleanInlineText(replacementNameInput);

  if (!name) {
    throw new Error("请先选择要删除的分类。");
  }

  const meta = readKnowledgeMetaSync();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(name)) {
    throw new Error("没有找到要删除的分类。");
  }

  const affectedRows = selectModuleCategoryRows(moduleId, name);

  if (affectedRows.length > 0) {
    if (!replacementName) {
      throw new Error("该分类还有条目在使用，请先选择替换分类。");
    }

    if (replacementName === name) {
      throw new Error("替换分类不能与当前删除的分类相同。");
    }

    if (!categories.includes(replacementName)) {
      throw new Error("替换分类不存在。");
    }

    withTransaction(() => {
      for (const row of affectedRows) {
        const entry = rowToEntry(row);
        entry.category = replacementName;
        updateEntryRow(moduleId, entry);
      }
    });
  }

  meta.categories[moduleId] = categories.filter((category) => category !== name);
  await writeKnowledgeMeta(meta);

  await mirrorModuleEntriesToFiles(moduleId);

  return { data: await readKnowledgeData(), meta };
}

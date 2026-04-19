import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function deleteFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function getContentFilePath(moduleId, entryId) {
  return path.join(contentDir, moduleId, `${entryId}.md`);
}

function getPublicMarkdownPath(moduleId, entryId) {
  return `content/${moduleId}/${entryId}.md`;
}

async function readKnowledgeMeta() {
  return readJsonFile(taxonomyFile);
}

async function writeKnowledgeMeta(meta) {
  await writeJsonFile(taxonomyFile, meta);
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

async function ensureCategoryExists(moduleId, categoryName) {
  if (!categoryName) {
    return;
  }

  const meta = await readKnowledgeMeta();
  const currentCategories = meta.categories[moduleId] ?? [];
  const normalizedCategory = categoryName.toLocaleLowerCase();

  if (
    currentCategories.some((category) => category.toLocaleLowerCase() === normalizedCategory)
  ) {
    return;
  }

  meta.categories[moduleId] = [...currentCategories, categoryName];
  await writeKnowledgeMeta(meta);
}

function getNextEntryId(moduleId, entries) {
  const pattern = new RegExp(`^${moduleId}-(\d+)$`);
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

export async function readModuleEntries(moduleId) {
  assertModuleId(moduleId);
  return readJsonFile(dataFiles[moduleId]);
}

export async function writeModuleEntries(moduleId, entries) {
  assertModuleId(moduleId);
  await writeJsonFile(dataFiles[moduleId], entries);
}

export async function readKnowledgeData() {
  const results = await Promise.all(
    moduleIds.map(async (moduleId) => [moduleId, await readModuleEntries(moduleId)]),
  );

  return Object.fromEntries(results);
}

export { readKnowledgeMeta, writeKnowledgeMeta };

export async function readMarkdownContent(moduleId, entryId) {
  assertModuleId(moduleId);

  try {
    return await fs.readFile(getContentFilePath(moduleId, entryId), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

export async function replaceModuleMarkdownContent(moduleId, markdownByEntryId) {
  assertModuleId(moduleId);
  const moduleDir = path.join(contentDir, moduleId);

  await fs.rm(moduleDir, { recursive: true, force: true });

  const entries = Object.entries(markdownByEntryId).filter(([, content]) => cleanMultilineText(content).length > 0);

  if (entries.length === 0) {
    return;
  }

  await ensureDirectory(moduleDir);

  await Promise.all(
    entries.map(([entryId, content]) =>
      fs.writeFile(getContentFilePath(moduleId, entryId), `${cleanMultilineText(content)}\n`, "utf8"),
    ),
  );
}

export async function createKnowledgeEntry(moduleId, draftInput) {
  assertModuleId(moduleId);

  const normalizedDraft = normalizeDraft(moduleId, draftInput);
  const entries = await readModuleEntries(moduleId);
  const entryId = getNextEntryId(moduleId, entries);
  const entry = buildEntry(moduleId, normalizedDraft, entryId);
  const nextEntries = [...entries, entry];
  const markdownContent = normalizedDraft.markdownContent;

  await writeJsonFile(dataFiles[moduleId], nextEntries);
  await ensureCategoryExists(moduleId, entry.category);

  if (markdownContent) {
    const moduleContentDir = path.join(contentDir, moduleId);
    await ensureDirectory(moduleContentDir);
    await fs.writeFile(getContentFilePath(moduleId, entryId), `${markdownContent}\n`, "utf8");
  }

  return {
    entry,
    data: await readKnowledgeData(),
    markdownPath: markdownContent ? getPublicMarkdownPath(moduleId, entryId) : null,
  };
}

export async function createKnowledgeEntriesBatch(moduleId, draftInputs) {
  assertModuleId(moduleId);

  const entries = await readModuleEntries(moduleId);
  const nextEntries = [...entries];
  const createdEntries = [];
  const failures = [];
  const markdownWrites = [];

  for (let index = 0; index < draftInputs.length; index += 1) {
    const draftInput = draftInputs[index];

    try {
      const normalizedDraft = normalizeDraft(moduleId, draftInput);
      const entryId = getNextEntryId(moduleId, nextEntries);
      const entry = buildEntry(moduleId, normalizedDraft, entryId);
      nextEntries.push(entry);
      createdEntries.push(entry);
      await ensureCategoryExists(moduleId, entry.category);

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
    await writeJsonFile(dataFiles[moduleId], nextEntries);
    await ensureDirectory(path.join(contentDir, moduleId));

    await Promise.all(
      markdownWrites.map(({ entryId, content }) =>
        fs.writeFile(getContentFilePath(moduleId, entryId), `${content}\n`, "utf8"),
      ),
    );
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
  const entries = await readModuleEntries(moduleId);
  const currentIndex = entries.findIndex((entry) => entry.id === entryId);

  if (currentIndex === -1) {
    throw new Error("没有找到要更新的条目。");
  }

  const currentEntry = entries[currentIndex];
  const updatedEntry = {
    ...buildEntry(moduleId, normalizedDraft, entryId),
    createdAt: currentEntry.createdAt,
    updatedAt: getToday(),
  };

  const nextEntries = [...entries];
  nextEntries[currentIndex] = updatedEntry;

  await writeJsonFile(dataFiles[moduleId], nextEntries);
  await ensureCategoryExists(moduleId, updatedEntry.category);

  const markdownPath = getContentFilePath(moduleId, entryId);

  if (normalizedDraft.markdownContent) {
    await ensureDirectory(path.join(contentDir, moduleId));
    await fs.writeFile(markdownPath, `${normalizedDraft.markdownContent}\n`, "utf8");
  } else {
    await deleteFileIfExists(markdownPath);
  }

  return {
    entry: updatedEntry,
    data: await readKnowledgeData(),
    markdownPath: normalizedDraft.markdownContent ? getPublicMarkdownPath(moduleId, entryId) : null,
  };
}

export async function deleteKnowledgeEntry(moduleId, entryId) {
  assertModuleId(moduleId);

  const entries = await readModuleEntries(moduleId);
  const nextEntries = entries.filter((entry) => entry.id !== entryId);

  if (nextEntries.length === entries.length) {
    throw new Error("没有找到要删除的条目。");
  }

  await writeJsonFile(dataFiles[moduleId], nextEntries);
  await deleteFileIfExists(getContentFilePath(moduleId, entryId));

  return {
    data: await readKnowledgeData(),
    deletedEntryId: entryId,
  };
}

export async function createCategory(moduleId, nameInput) {
  assertModuleId(moduleId);
  const name = cleanInlineText(nameInput);

  if (!name) {
    throw new Error("分类名称不能为空。");
  }

  const meta = await readKnowledgeMeta();
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

  const meta = await readKnowledgeMeta();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(oldName)) {
    throw new Error("没有找到要修改的分类。");
  }

  ensureUniqueCategory(categories, newName, oldName);
  meta.categories[moduleId] = categories.map((category) => (category === oldName ? newName : category));
  await writeKnowledgeMeta(meta);

  const entries = await readModuleEntries(moduleId);
  const nextEntries = entries.map((entry) => (entry.category === oldName ? { ...entry, category: newName } : entry));
  await writeJsonFile(dataFiles[moduleId], nextEntries);

  return { data: await readKnowledgeData(), meta };
}

export async function deleteCategory(moduleId, nameInput, replacementNameInput = "") {
  assertModuleId(moduleId);
  const name = cleanInlineText(nameInput);
  const replacementName = cleanInlineText(replacementNameInput);

  if (!name) {
    throw new Error("请先选择要删除的分类。");
  }

  const meta = await readKnowledgeMeta();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(name)) {
    throw new Error("没有找到要删除的分类。");
  }

  const entries = await readModuleEntries(moduleId);
  const affectedEntries = entries.filter((entry) => entry.category === name);

  if (affectedEntries.length > 0) {
    if (!replacementName) {
      throw new Error("该分类还有条目在使用，请先选择替换分类。");
    }

    if (replacementName === name) {
      throw new Error("替换分类不能与当前删除的分类相同。");
    }

    if (!categories.includes(replacementName)) {
      throw new Error("替换分类不存在。");
    }

    const nextEntries = entries.map((entry) => (entry.category === name ? { ...entry, category: replacementName } : entry));
    await writeJsonFile(dataFiles[moduleId], nextEntries);
  }

  meta.categories[moduleId] = categories.filter((category) => category !== name);
  await writeKnowledgeMeta(meta);

  return { data: await readKnowledgeData(), meta };
}

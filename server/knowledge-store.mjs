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
const moduleIds = ["offline", "shopping", "websites"];
const dataFiles = {
  offline: path.join(dataDir, "offline.json"),
  shopping: path.join(dataDir, "shopping.json"),
  websites: path.join(dataDir, "websites.json"),
};

export const knowledgeModuleIds = [...moduleIds];
export const knowledgeRepoRoot = repoRoot;
export const knowledgeDataDir = dataDir;
export const knowledgeContentDir = contentDir;

function assertModuleId(moduleId) {
  if (!moduleIds.includes(moduleId)) {
    throw new Error("\u4e0d\u652f\u6301\u7684\u6a21\u5757\u7c7b\u578b\u3002");
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
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function parseTagsInput(input) {
  const seen = new Set();

  return String(input ?? "")
    .split(/[,\n\uFF0C]/)
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
    throw new Error("\u8bf7\u8f93\u5165\u6709\u6548\u7684\u6570\u5b57\u5b57\u6bb5\u3002");
  }

  return parsed;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getMarkdownSummary(markdownContent) {
  const firstContentLine = cleanMultilineText(markdownContent)
    .split("\n")
    .map((line) => line.replace(/^[#>\-*+\d.\s`]+/, "").trim())
    .find(Boolean);

  if (!firstContentLine) {
    return "";
  }

  return firstContentLine.slice(0, 120);
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
    throw new Error("\u5206\u7c7b\u540d\u79f0\u5df2\u5b58\u5728\uff0c\u8bf7\u6362\u4e00\u4e2a\u3002");
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
    currentCategories.some(
      (category) => category.toLocaleLowerCase() === normalizedCategory,
    )
  ) {
    return;
  }

  meta.categories[moduleId] = [...currentCategories, categoryName];
  await writeKnowledgeMeta(meta);
}

function getNextEntryId(moduleId, entries) {
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

function normalizeDraft(moduleId, draft) {
  assertModuleId(moduleId);

  const normalized = {
    name: cleanInlineText(draft.name),
    category: cleanInlineText(draft.category),
    status: cleanInlineText(draft.status),
    tags: parseTagsInput(draft.tags),
    note: cleanMultilineText(draft.note),
    markdownContent: cleanMultilineText(draft.markdownContent),
    source: cleanInlineText(draft.source) || "\u5feb\u901f\u65b0\u589e",
    location: cleanInlineText(draft.location),
    rating: parseNumber(draft.rating),
    platform: cleanInlineText(draft.platform),
    price: parseNumber(draft.price),
    domain: cleanInlineText(draft.domain),
    access: cleanInlineText(draft.access) || "\u53ef\u8bbf\u95ee",
    content: cleanInlineText(draft.content),
    purpose: cleanInlineText(draft.purpose),
  };

  if (!normalized.name) {
    throw new Error("\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002");
  }

  if (!normalized.category) {
    throw new Error("\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5206\u7c7b\u3002");
  }

  if (!normalized.status) {
    throw new Error("\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u72b6\u6001\u3002");
  }

  if (moduleId === "offline" && !normalized.location) {
    throw new Error("\u7ebf\u4e0b\u597d\u5e97\u81f3\u5c11\u9700\u8981\u586b\u5199\u5730\u70b9\u3002");
  }

  if (moduleId === "websites" && !normalized.domain) {
    throw new Error("\u7f51\u7ad9\u6536\u96c6\u81f3\u5c11\u9700\u8981\u586b\u5199\u57df\u540d\u3002");
  }

  return normalized;
}

function buildEntry(moduleId, draft, entryId) {
  const today = getToday();
  const note = draft.note || getMarkdownSummary(draft.markdownContent);
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
      rating: draft.rating,
    };
  }

  if (moduleId === "shopping") {
    return {
      ...baseEntry,
      module: "shopping",
      platform: draft.platform,
      price: draft.price,
    };
  }

  return {
    ...baseEntry,
    module: "websites",
    domain: draft.domain,
    access: draft.access,
    content: draft.content,
    purpose: draft.purpose,
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
  const [offline, shopping, websites] = await Promise.all([
    readModuleEntries("offline"),
    readModuleEntries("shopping"),
    readModuleEntries("websites"),
  ]);

  return {
    offline,
    shopping,
    websites,
  };
}

export { readKnowledgeMeta };
export { writeKnowledgeMeta };

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

  const entries = Object.entries(markdownByEntryId).filter(([, content]) =>
    cleanMultilineText(content).length > 0,
  );

  if (entries.length === 0) {
    return;
  }

  await ensureDirectory(moduleDir);

  await Promise.all(
    entries.map(([entryId, content]) =>
      fs.writeFile(
        getContentFilePath(moduleId, entryId),
        `${cleanMultilineText(content)}\n`,
        "utf8",
      ),
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
  const markdownPath = markdownContent
    ? getPublicMarkdownPath(moduleId, entryId)
    : null;

  await writeJsonFile(dataFiles[moduleId], nextEntries);
  await ensureCategoryExists(moduleId, entry.category);

  if (markdownContent) {
    const moduleContentDir = path.join(contentDir, moduleId);
    await ensureDirectory(moduleContentDir);
    await fs.writeFile(getContentFilePath(moduleId, entryId), `${markdownContent}\n`, "utf8");
  }

  return {
    entry,
    data: {
      ...(await readKnowledgeData()),
    },
    markdownPath,
  };
}

export async function updateKnowledgeEntry(moduleId, entryId, draftInput) {
  assertModuleId(moduleId);

  const normalizedDraft = normalizeDraft(moduleId, draftInput);
  const entries = await readModuleEntries(moduleId);
  const currentIndex = entries.findIndex((entry) => entry.id === entryId);

  if (currentIndex === -1) {
    throw new Error("\u6ca1\u6709\u627e\u5230\u8981\u66f4\u65b0\u7684\u6761\u76ee\u3002");
  }

  const currentEntry = entries[currentIndex];
  const note = normalizedDraft.note || getMarkdownSummary(normalizedDraft.markdownContent);
  const updatedAt = getToday();

  const updatedEntry = {
    ...buildEntry(moduleId, normalizedDraft, entryId),
    createdAt: currentEntry.createdAt,
    updatedAt,
    note,
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
    data: {
      ...(await readKnowledgeData()),
    },
    markdownPath: normalizedDraft.markdownContent
      ? getPublicMarkdownPath(moduleId, entryId)
      : null,
  };
}

export async function deleteKnowledgeEntry(moduleId, entryId) {
  assertModuleId(moduleId);

  const entries = await readModuleEntries(moduleId);
  const nextEntries = entries.filter((entry) => entry.id !== entryId);

  if (nextEntries.length === entries.length) {
    throw new Error("\u6ca1\u6709\u627e\u5230\u8981\u5220\u9664\u7684\u6761\u76ee\u3002");
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
    throw new Error("\u5206\u7c7b\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002");
  }

  const meta = await readKnowledgeMeta();
  const categories = meta.categories[moduleId] ?? [];
  ensureUniqueCategory(categories, name);
  meta.categories[moduleId] = [...categories, name];
  await writeKnowledgeMeta(meta);

  return {
    data: await readKnowledgeData(),
    meta,
  };
}

export async function renameCategory(moduleId, oldNameInput, newNameInput) {
  assertModuleId(moduleId);
  const oldName = cleanInlineText(oldNameInput);
  const newName = cleanInlineText(newNameInput);

  if (!oldName || !newName) {
    throw new Error("\u65e7\u5206\u7c7b\u548c\u65b0\u5206\u7c7b\u540d\u79f0\u90fd\u4e0d\u80fd\u4e3a\u7a7a\u3002");
  }

  const meta = await readKnowledgeMeta();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(oldName)) {
    throw new Error("\u6ca1\u6709\u627e\u5230\u8981\u4fee\u6539\u7684\u5206\u7c7b\u3002");
  }

  ensureUniqueCategory(categories, newName, oldName);
  meta.categories[moduleId] = categories.map((category) =>
    category === oldName ? newName : category,
  );
  await writeKnowledgeMeta(meta);

  const entries = await readModuleEntries(moduleId);
  const nextEntries = entries.map((entry) =>
    entry.category === oldName ? { ...entry, category: newName } : entry,
  );
  await writeJsonFile(dataFiles[moduleId], nextEntries);

  return {
    data: await readKnowledgeData(),
    meta,
  };
}

export async function deleteCategory(
  moduleId,
  nameInput,
  replacementNameInput = "",
) {
  assertModuleId(moduleId);
  const name = cleanInlineText(nameInput);
  const replacementName = cleanInlineText(replacementNameInput);

  if (!name) {
    throw new Error("\u8bf7\u5148\u9009\u62e9\u8981\u5220\u9664\u7684\u5206\u7c7b\u3002");
  }

  const meta = await readKnowledgeMeta();
  const categories = meta.categories[moduleId] ?? [];

  if (!categories.includes(name)) {
    throw new Error("\u6ca1\u6709\u627e\u5230\u8981\u5220\u9664\u7684\u5206\u7c7b\u3002");
  }

  const entries = await readModuleEntries(moduleId);
  const affectedEntries = entries.filter((entry) => entry.category === name);

  if (affectedEntries.length > 0) {
    if (!replacementName) {
      throw new Error(
        "\u8be5\u5206\u7c7b\u8fd8\u6709\u6761\u76ee\u5728\u4f7f\u7528\uff0c\u8bf7\u5148\u9009\u62e9\u66ff\u6362\u5206\u7c7b\u3002",
      );
    }

    if (replacementName === name) {
      throw new Error("\u66ff\u6362\u5206\u7c7b\u4e0d\u80fd\u4e0e\u5f53\u524d\u5200\u9664\u7684\u5206\u7c7b\u76f8\u540c\u3002");
    }

    if (!categories.includes(replacementName)) {
      throw new Error("\u66ff\u6362\u5206\u7c7b\u4e0d\u5b58\u5728\u3002");
    }

    const nextEntries = entries.map((entry) =>
      entry.category === name ? { ...entry, category: replacementName } : entry,
    );
    await writeJsonFile(dataFiles[moduleId], nextEntries);
  }

  meta.categories[moduleId] = categories.filter((category) => category !== name);
  await writeKnowledgeMeta(meta);

  return {
    data: await readKnowledgeData(),
    meta,
  };
}

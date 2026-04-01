import JSZip from "jszip";

import { knowledgeModuleIds } from "../knowledge-store.mjs";
import { validateManifestShape } from "./manifest.mjs";

function validateEntryIds(moduleId, entries) {
  const seen = new Set();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`模块 ${moduleId} 的数据结构无效。`);
    }

    if (entry.module !== moduleId) {
      throw new Error(`模块 ${moduleId} 中存在 module 字段不匹配的条目。`);
    }

    if (!entry.id || typeof entry.id !== "string") {
      throw new Error(`模块 ${moduleId} 中存在缺少 id 的条目。`);
    }

    if (seen.has(entry.id)) {
      throw new Error(`模块 ${moduleId} 中存在重复条目 id：${entry.id}`);
    }

    seen.add(entry.id);
  }
}

export async function readKnowledgeImport(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("导入包缺少 manifest.json。");
  }

  const manifest = JSON.parse(await manifestFile.async("string"));
  validateManifestShape(manifest);

  const exportedModules = manifest.exportedModules.filter((moduleId) =>
    knowledgeModuleIds.includes(moduleId),
  );

  if (exportedModules.length === 0) {
    throw new Error("导入包中没有可识别的模块。");
  }

  const taxonomyFile = zip.file("data/taxonomy.json");
  const taxonomy = taxonomyFile
    ? JSON.parse(await taxonomyFile.async("string"))
    : { categories: {} };
  const entriesByModule = {};
  const markdownByModule = {};
  const moduleStats = {};

  for (const moduleId of exportedModules) {
    const dataFile = zip.file(`data/${moduleId}.json`);

    if (!dataFile) {
      throw new Error(`导入包缺少 data/${moduleId}.json。`);
    }

    const entries = JSON.parse(await dataFile.async("string"));

    if (!Array.isArray(entries)) {
      throw new Error(`data/${moduleId}.json 不是有效数组。`);
    }

    validateEntryIds(moduleId, entries);
    entriesByModule[moduleId] = entries;
    markdownByModule[moduleId] = {};

    await Promise.all(
      entries.map(async (entry) => {
        const markdownFile = zip.file(`content/${moduleId}/${entry.id}.md`);

        if (markdownFile) {
          markdownByModule[moduleId][entry.id] = await markdownFile.async("string");
        }
      }),
    );

    moduleStats[moduleId] = {
      entryCount: entries.length,
      contentFileCount: Object.keys(markdownByModule[moduleId]).length,
    };
  }

  return {
    manifest,
    exportedModules,
    taxonomy,
    entriesByModule,
    markdownByModule,
    moduleStats,
  };
}

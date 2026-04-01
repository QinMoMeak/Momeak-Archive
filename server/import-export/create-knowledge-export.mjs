import JSZip from "jszip";

import {
  knowledgeModuleIds,
  readKnowledgeMeta,
  readMarkdownContent,
  readModuleEntries,
} from "../knowledge-store.mjs";
import { createExportManifest } from "./manifest.mjs";

function ensureSelectedModules(selectedModules) {
  const normalized = Array.from(new Set(selectedModules ?? [])).filter((moduleId) =>
    knowledgeModuleIds.includes(moduleId),
  );

  if (normalized.length === 0) {
    throw new Error("请至少选择一个模块后再导出。");
  }

  return normalized;
}

function buildTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export async function createKnowledgeExport(selectedModulesInput) {
  const selectedModules = ensureSelectedModules(selectedModulesInput);
  const zip = new JSZip();
  const taxonomy = await readKnowledgeMeta();
  const entriesByModule = Object.fromEntries(
    await Promise.all(
      selectedModules.map(async (moduleId) => [moduleId, await readModuleEntries(moduleId)]),
    ),
  );

  const manifest = await createExportManifest({
    exportedModules: selectedModules,
    entriesByModule,
  });

  zip.file("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  zip.file("data/taxonomy.json", `${JSON.stringify(taxonomy, null, 2)}\n`);

  for (const moduleId of selectedModules) {
    const entries = entriesByModule[moduleId] ?? [];
    zip.file(`data/${moduleId}.json`, `${JSON.stringify(entries, null, 2)}\n`);

    await Promise.all(
      entries.map(async (entry) => {
        const markdown = await readMarkdownContent(moduleId, entry.id);

        if (markdown) {
          zip.file(`content/${moduleId}/${entry.id}.md`, markdown);
        }
      }),
    );
  }

  const fileNameScope =
    selectedModules.length === knowledgeModuleIds.length
      ? "all"
      : selectedModules.join("-");

  return {
    fileName: `knowledge-export-${fileNameScope}-${buildTimestamp()}.zip`,
    buffer: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
    manifest,
  };
}

import JSZip from "jszip";

import { knowledgeModuleIds } from "../knowledge-store.mjs";
import { createExportManifest } from "./manifest.mjs";

export function ensureSelectedModules(selectedModules) {
  const normalized = Array.from(new Set(selectedModules ?? [])).filter((moduleId) =>
    knowledgeModuleIds.includes(moduleId),
  );

  if (normalized.length === 0) {
    throw new Error("请至少选择一个模块后再继续。");
  }

  return normalized;
}

export function buildTimestamp(date = new Date()) {
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

function buildScopeLabel(selectedModules) {
  return selectedModules.length === knowledgeModuleIds.length
    ? "all"
    : selectedModules.join("-");
}

export async function buildKnowledgeZipPackage({
  selectedModulesInput,
  entriesByModule,
  markdownByModule = {},
  taxonomy,
  fileNamePrefix,
  manifestExtras = {},
}) {
  const selectedModules = ensureSelectedModules(selectedModulesInput);
  const zip = new JSZip();
  const manifest = await createExportManifest({
    exportedModules: selectedModules,
    entriesByModule,
    manifestExtras,
  });

  zip.file("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  zip.file("data/taxonomy.json", `${JSON.stringify(taxonomy, null, 2)}\n`);

  for (const moduleId of selectedModules) {
    const entries = entriesByModule[moduleId] ?? [];
    const markdownMap = markdownByModule[moduleId] ?? {};

    zip.file(`data/${moduleId}.json`, `${JSON.stringify(entries, null, 2)}\n`);
    zip.folder(`content/${moduleId}`);

    for (const entry of entries) {
      const markdown = String(markdownMap[entry.id] ?? "").trim();

      if (markdown) {
        zip.file(`content/${moduleId}/${entry.id}.md`, `${markdown}\n`);
      }
    }
  }

  return {
    fileName: `${fileNamePrefix}-${buildScopeLabel(selectedModules)}-${buildTimestamp()}.zip`,
    buffer: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
    manifest,
  };
}

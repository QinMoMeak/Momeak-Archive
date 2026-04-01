import {
  readKnowledgeMeta,
  readMarkdownContent,
  readModuleEntries,
} from "../knowledge-store.mjs";
import {
  buildKnowledgeZipPackage,
  ensureSelectedModules,
} from "./build-knowledge-zip-package.mjs";

export async function createKnowledgeExport(selectedModulesInput) {
  const selectedModules = ensureSelectedModules(selectedModulesInput);
  const taxonomy = await readKnowledgeMeta();
  const entriesByModule = Object.fromEntries(
    await Promise.all(
      selectedModules.map(async (moduleId) => [moduleId, await readModuleEntries(moduleId)]),
    ),
  );
  const markdownByModule = Object.fromEntries(selectedModules.map((moduleId) => [moduleId, {}]));

  for (const moduleId of selectedModules) {
    const entries = entriesByModule[moduleId] ?? [];

    await Promise.all(
      entries.map(async (entry) => {
        const markdown = await readMarkdownContent(moduleId, entry.id);

        if (markdown) {
          markdownByModule[moduleId][entry.id] = markdown;
        }
      }),
    );
  }

  return buildKnowledgeZipPackage({
    selectedModulesInput: selectedModules,
    entriesByModule,
    markdownByModule,
    taxonomy,
    fileNamePrefix: "knowledge-export",
  });
}

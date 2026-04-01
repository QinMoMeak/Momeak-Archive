import { readKnowledgeData, readKnowledgeMeta } from "../knowledge-store.mjs";
import { readKnowledgeImport } from "./read-knowledge-import.mjs";

function normalizeSelectedModules(importedModules, selectedModulesInput) {
  const selectedModules = Array.from(new Set(selectedModulesInput ?? [])).filter((moduleId) =>
    importedModules.includes(moduleId),
  );

  return selectedModules.length > 0 ? selectedModules : importedModules;
}

export async function validateImportPackage(buffer, selectedModulesInput = []) {
  const imported = await readKnowledgeImport(buffer);
  const currentData = await readKnowledgeData();
  const currentMeta = await readKnowledgeMeta();
  const selectedModules = normalizeSelectedModules(
    imported.exportedModules,
    selectedModulesInput,
  );

  return {
    ...imported,
    selectedModules,
    preview: {
      exportedModules: imported.exportedModules,
      selectedModules,
      exportScope: imported.manifest.exportScope,
      totalEntries: imported.manifest.totalEntries,
      moduleStats: Object.fromEntries(
        selectedModules.map((moduleId) => [
          moduleId,
          {
            importEntryCount: imported.moduleStats[moduleId]?.entryCount ?? 0,
            importContentFileCount:
              imported.moduleStats[moduleId]?.contentFileCount ?? 0,
            currentEntryCount: currentData[moduleId]?.length ?? 0,
            currentCategoryCount:
              currentMeta.categories?.[moduleId]?.length ?? 0,
          },
        ]),
      ),
      overwriteModules: selectedModules,
      untouchedModules: Object.keys(currentData).filter(
        (moduleId) => !selectedModules.includes(moduleId),
      ),
    },
  };
}

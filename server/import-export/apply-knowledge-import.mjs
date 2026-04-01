import {
  readKnowledgeMeta,
  readKnowledgeData,
  replaceModuleMarkdownContent,
  writeKnowledgeMeta,
  writeModuleEntries,
} from "../knowledge-store.mjs";
import { validateImportPackage } from "./validate-import-package.mjs";

export async function applyKnowledgeImport(buffer, selectedModulesInput = []) {
  const validated = await validateImportPackage(buffer, selectedModulesInput);
  const currentMeta = await readKnowledgeMeta();
  const nextMeta = {
    ...currentMeta,
    categories: {
      ...currentMeta.categories,
    },
  };

  for (const moduleId of validated.selectedModules) {
    await writeModuleEntries(moduleId, validated.entriesByModule[moduleId] ?? []);
    await replaceModuleMarkdownContent(
      moduleId,
      validated.markdownByModule[moduleId] ?? {},
    );

    if (validated.taxonomy?.categories?.[moduleId]) {
      nextMeta.categories[moduleId] = validated.taxonomy.categories[moduleId];
    }
  }

  await writeKnowledgeMeta(nextMeta);

  return {
    data: await readKnowledgeData(),
    meta: await readKnowledgeMeta(),
    appliedModules: validated.selectedModules,
    manifest: validated.manifest,
    preview: validated.preview,
  };
}

import { buildKnowledgeZipPackage } from "./build-knowledge-zip-package.mjs";
import { createEmptyTemplatePreset } from "./template-presets.mjs";

export async function createImportTemplate(selectedModulesInput) {
  const preset = await createEmptyTemplatePreset(selectedModulesInput);

  return buildKnowledgeZipPackage({
    selectedModulesInput,
    entriesByModule: preset.entriesByModule,
    markdownByModule: preset.markdownByModule,
    taxonomy: preset.taxonomy,
    fileNamePrefix: "knowledge-template-empty",
    manifestExtras: {
      packageKind: "template",
      templateMode: "empty",
    },
  });
}

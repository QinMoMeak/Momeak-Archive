import { buildKnowledgeZipPackage } from "./build-knowledge-zip-package.mjs";
import { createExampleTemplatePreset } from "./template-presets.mjs";

export async function createExampleTemplate(selectedModulesInput) {
  const preset = await createExampleTemplatePreset(selectedModulesInput);

  return buildKnowledgeZipPackage({
    selectedModulesInput,
    entriesByModule: preset.entriesByModule,
    markdownByModule: preset.markdownByModule,
    taxonomy: preset.taxonomy,
    fileNamePrefix: "knowledge-template-example",
    manifestExtras: {
      packageKind: "template",
      templateMode: "example",
    },
  });
}

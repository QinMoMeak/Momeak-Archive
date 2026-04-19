import { knowledgeModuleIds } from "../knowledge-store.mjs";
import { ensureSelectedModules } from "./build-knowledge-zip-package.mjs";
import { getImportTemplateContext, moduleLabels } from "./template-presets.mjs";

const moduleFieldGuides = {
  offline: {
    required: ["id", "module", "name", "category", "status", "location"],
    optional: ["tags", "note", "source", "createdAt", "updatedAt", "rating", "locationText", "formattedAddress", "province", "city", "district", "adcode", "lng", "lat", "locationSource", "locationAccuracy", "locationRectangle"],
  },
  shopping: {
    required: ["id", "module", "name", "category", "status"],
    optional: ["tags", "note", "source", "createdAt", "updatedAt", "platform", "price"],
  },
  websites: {
    required: ["id", "module", "name", "category", "status", "domain"],
    optional: ["tags", "note", "source", "createdAt", "updatedAt", "access", "content", "purpose"],
  },
  inbox: {
    required: ["id", "module", "name", "category", "status", "rawContent"],
    optional: ["rawContentType", "tags", "note", "source", "aiSummary", "aiSuggestions", "suggestedTargetModule", "suggestedCategory", "confidence", "createdAt", "updatedAt"],
  },
  songs: {
    required: ["id", "module", "name", "category", "status"],
    optional: ["artist", "album", "tags", "source", "note", "lyricsSnippet", "mood", "language", "createdAt", "updatedAt"],
  },
};

function formatList(items) {
  return items.length > 0 ? items.join("\u3001") : "\u6682\u65e0";
}

function buildModuleInstructions(selectedModules, categoriesByModule, statusesByModule) {
  return selectedModules
    .map((moduleId) => {
      const guide = moduleFieldGuides[moduleId];
      const extraRule =
        moduleId === "websites"
          ? [
              "\u5982\u679c\u539f\u59cb\u6570\u636e\u4e2d\u6709\u7f51\u5740\u6216\u57df\u540d\uff0c\u5fc5\u987b\u4f18\u5148\u63d0\u53d6 domain\u3002",
              "note \u6216 Markdown \u8981\u91cd\u70b9\u6574\u7406\u7f51\u7ad9\u5185\u5bb9\u3001\u7528\u9014\u3001\u9002\u7528\u573a\u666f\u3001\u7279\u70b9\u3002",
              "\u4fe1\u606f\u4e0d\u8db3\u65f6\u4e0d\u8981\u7f16\u9020\u7f51\u7ad9\u7528\u9014\u6216\u53ef\u8bbf\u95ee\u6027\u3002",
            ].join("\n")
          : moduleId === "inbox"
            ? [
                "rawContent \u5fc5\u987b\u5c3d\u91cf\u4fdd\u7559\u7528\u6237\u539f\u59cb\u8f93\u5165\uff0c\u4e0d\u8981\u5148\u91cd\u5199\u518d\u4fdd\u5b58\u3002",
                "\u5982\u679c\u6ca1\u6709\u6807\u9898\uff0c\u53ef\u4ee5\u6839\u636e rawContent \u751f\u6210\u7b80\u77ed\u6807\u9898\u3002",
                "\u5f85\u5904\u7406\u6a21\u5757\u4f18\u5148\u5bbd\u5bb9\u5f55\u5165\uff0c\u4e0d\u8981\u5f3a\u884c\u7f16\u9020\u6210\u6210\u719f\u77e5\u8bc6\u6761\u76ee\u3002",
              ].join("\n")
            : moduleId === "songs"
              ? [
                  "\u6b4c\u66f2\u6a21\u5757\u4f18\u5148\u63d0\u53d6 song name\u3001artist\u3001lyricsSnippet\u3001mood\u3001language\u3002",
                  "\u5982\u679c\u8f93\u5165\u91cc\u662f\u4e00\u6574\u4e2a\u6b4c\u5355\u6216\u622a\u56fe\uff0c\u5141\u8bb8\u62c6\u6210\u591a\u6761 songs \u8bb0\u5f55\u3002",
                  "artist\u3001album\u3001language \u7b49\u4fe1\u606f\u4e0d\u8db3\u65f6\u4e0d\u8981\u7f16\u9020\uff0c\u7f3a\u5931\u5c31\u7559\u7a7a\u5e76\u5728\u5907\u6ce8\u91cc\u8bf4\u660e\u3002",
                ].join("\n")
              : "";

      return `\u6a21\u5757\uff1a${moduleLabels[moduleId]}\uff08${moduleId}\uff09
\u53ef\u7528\u5206\u7c7b\u53c2\u8003\uff1a${formatList(categoriesByModule[moduleId] ?? [])}
\u53ef\u7528\u72b6\u6001\u53c2\u8003\uff1a${formatList(statusesByModule[moduleId] ?? [])}
\u5fc5\u586b\u5b57\u6bb5\uff1a${guide.required.join("\u3001")}
\u53ef\u9009\u5b57\u6bb5\uff1a${guide.optional.join("\u3001")}
${extraRule}`.trim();
    })
    .join("\n\n");
}

function buildManifestExample(selectedModules) {
  const exportScope = selectedModules.length === knowledgeModuleIds.length ? "full" : "partial";

  return `manifest.json \u81f3\u5c11\u5305\u542b\u4ee5\u4e0b\u5b57\u6bb5\uff1a{
  "schemaVersion": 1,
  "exportScope": "${exportScope}",
  "exportedModules": ${JSON.stringify(selectedModules)},
  "totalEntries": <\u6570\u5b57>,
  "moduleStats": {
    ${selectedModules.map((moduleId) => `"${moduleId}": { "entryCount": <\u6570\u5b57> }`).join(",\n    ")}
  }
}`;
}

export async function generateImportAiPrompt(selectedModulesInput) {
  const selectedModules = ensureSelectedModules(selectedModulesInput);
  const { categoriesByModule, statusesByModule } = await getImportTemplateContext(selectedModules);

  const prompt = `\u8bf7\u628a\u6211\u63a5\u4e0b\u6765\u63d0\u4f9b\u7684\u539f\u59cb\u8868\u683c\u3001\u539f\u59cb\u7b14\u8bb0\u6216\u6e05\u5355\uff0c\u6574\u7406\u6210\u4e00\u4e2a\u53ef\u5bfc\u5165\u201c\u4e2a\u4eba\u77e5\u8bc6\u6536\u96c6\u7f51\u7ad9\u201d\u7684 ZIP \u5305\u5185\u5bb9\u3002\u4f60\u7684\u8f93\u51fa\u76ee\u6807\u4e0d\u662f\u89e3\u91ca\u683c\u5f0f\uff0c\u800c\u662f\u76f4\u63a5\u751f\u6210\u5bfc\u5165\u5305\u5185\u6bcf\u4e2a\u6587\u4ef6\u7684\u7ed3\u6784\u5316\u5185\u5bb9\u3002\u4e0d\u8981\u8f93\u51fa\u989d\u5916\u89e3\u91ca\uff0c\u4e0d\u8981\u7701\u7565\u5fc5\u8981\u6587\u4ef6\u3002
\u8bf7\u4e25\u683c\u9075\u5b88\u4ee5\u4e0b\u89c4\u5219\uff1a
1. \u76ee\u6807\u76ee\u5f55\u7ed3\u6784\u5fc5\u987b\u662f\uff1a
   - manifest.json
   - data/taxonomy.json
   - ${selectedModules.map((moduleId) => `data/${moduleId}.json`).join("\n   - ")}
   - \u5982\u6709\u957f\u5907\u6ce8\uff0c\u5199\u5165 content/<module>/<id>.md
2. \u6bcf\u4e2a data/*.json \u90fd\u5fc5\u987b\u662f JSON \u6570\u7ec4\uff0c\u6570\u7ec4\u5185\u6bcf\u6761\u8bb0\u5f55\u7684 module \u5fc5\u987b\u4e0e\u6587\u4ef6\u6a21\u5757\u4e00\u81f4\u3002
3. id \u547d\u540d\u5fc5\u987b\u7a33\u5b9a\uff1a
   - offline \u4f7f\u7528 offline-001 \u8fd9\u7c7b\u683c\u5f0f
   - shopping \u4f7f\u7528 shopping-001 \u8fd9\u7c7b\u683c\u5f0f
   - websites \u4f7f\u7528 websites-001 \u8fd9\u7c7b\u683c\u5f0f
   - inbox \u4f7f\u7528 inbox-001 \u8fd9\u7c7b\u683c\u5f0f
   - songs \u4f7f\u7528 songs-001 \u8fd9\u7c7b\u683c\u5f0f
4. \u957f\u5907\u6ce8\u4f18\u5148\u653e\u5230 content/<module>/<id>.md\uff1b\u5982\u679c\u6ca1\u6709\u957f\u5907\u6ce8\uff0c\u53ef\u4ee5\u53ea\u4fdd\u7559 note\u3002
5. category \u5fc5\u987b\u5c3d\u91cf\u5339\u914d\u73b0\u6709\u5206\u7c7b\uff1b\u5982\u679c\u65e0\u6cd5\u5224\u65ad\uff0c\u4e0d\u8981\u7f16\u9020\u4e0d\u5b58\u5728\u7684\u5206\u7c7b\u3002
6. status \u4e5f\u5e94\u4f18\u5148\u5339\u914d\u73b0\u6709\u914d\u7f6e\uff1b\u4fe1\u606f\u4e0d\u8db3\u65f6\u4e0d\u8981\u5f3a\u884c\u731c\u6d4b\u3002
7. tags \u5fc5\u987b\u662f\u5b57\u7b26\u4e32\u6570\u7ec4\uff0c\u6807\u7b7e\u8981\u53bb\u91cd\u3001\u7b80\u6d01\u3001\u89c4\u8303\u3002
8. createdAt \u548c updatedAt \u4f7f\u7528 YYYY-MM-DD\u3002
9. \u5982\u679c\u6ca1\u6709\u67d0\u4e2a\u53ef\u9009\u5b57\u6bb5\uff0c\u8bf7\u8fd4\u56de\u7a7a\u5b57\u7b26\u4e32\u3001null \u6216\u7701\u7565\uff0c\u4f46\u4e0d\u8981\u7f16\u9020\u3002
10. websites \u6a21\u5757\u5982\u6709\u7f51\u5740\u6216\u57df\u540d\uff0c\u5fc5\u987b\u4f18\u5148\u63d0\u53d6 domain\uff1b\u5982\u679c\u6ca1\u6709\u8db3\u591f\u4fe1\u606f\uff0c\u4e0d\u8981\u7f16\u9020\u7f51\u7ad9\u7528\u9014\u3002
11. inbox \u6a21\u5757\u5fc5\u987b\u5b8c\u6574\u4fdd\u7559 rawContent\uff1b\u5c31\u7b97\u4fe1\u606f\u6742\u4e71\uff0c\u4e5f\u4e0d\u8981\u63d0\u524d\u8fc7\u5ea6\u7ed3\u6784\u5316\u3002
12. songs \u6a21\u5757\u5e94\u4f18\u5148\u63d0\u53d6\u6b4c\u66f2\u540d\u3001\u6b4c\u624b\u3001\u6b4c\u8bcd\u7247\u6bb5\u3001\u60c5\u7eea / \u573a\u666f\u3001\u8bed\u8a00\uff1b\u5982\u679c\u539f\u59cb\u6570\u636e\u5305\u542b\u591a\u9996\u6b4c\uff0c\u53ef\u62c6\u6210\u591a\u6761\u3002
${buildManifestExample(selectedModules)}

\u6a21\u5757\u5b57\u6bb5\u8981\u6c42\uff1a
${buildModuleInstructions(selectedModules, categoriesByModule, statusesByModule)}

\u8f93\u51fa\u683c\u5f0f\u8981\u6c42\uff1a
1. \u76f4\u63a5\u6309\u201c\u6587\u4ef6\u8def\u5f84 + \u6587\u4ef6\u5185\u5bb9\u201d\u7684\u65b9\u5f0f\u8f93\u51fa\u3002
2. \u6bcf\u4e2a\u6587\u4ef6\u90fd\u8f93\u51fa\u5b8c\u6574\u5185\u5bb9\u3002
3. \u4e0d\u8981\u8f93\u51fa\u89e3\u91ca\uff0c\u4e0d\u8981\u52a0\u201c\u4ee5\u4e0b\u662f\u7ed3\u679c\u201d\u7b49\u524d\u8a00\u3002
4. \u6587\u4ef6\u8def\u5f84\u5fc5\u987b\u4e0e id \u548c\u6a21\u5757\u76ee\u5f55\u4e00\u81f4\u3002
\u6211\u63a5\u4e0b\u6765\u4f1a\u63d0\u4f9b\u539f\u59cb\u6570\u636e\uff0c\u8bf7\u6839\u636e\u539f\u59cb\u6570\u636e\u751f\u6210\u5b8c\u6574\u7684\u5bfc\u5165\u5305\u5185\u5bb9\u3002`;

  return {
    prompt,
    selectedModules,
    categoriesByModule,
    statusesByModule,
  };
}

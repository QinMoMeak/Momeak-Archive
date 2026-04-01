import { knowledgeModuleIds } from "../knowledge-store.mjs";
import { ensureSelectedModules } from "./build-knowledge-zip-package.mjs";
import { getImportTemplateContext, moduleLabels } from "./template-presets.mjs";

const moduleFieldGuides = {
  offline: {
    required: ["id", "module", "name", "category", "status", "location"],
    optional: [
      "tags",
      "note",
      "source",
      "createdAt",
      "updatedAt",
      "rating",
      "locationText",
      "formattedAddress",
      "province",
      "city",
      "district",
      "adcode",
      "lng",
      "lat",
      "locationSource",
      "locationAccuracy",
      "locationRectangle",
    ],
  },
  shopping: {
    required: ["id", "module", "name", "category", "status"],
    optional: ["tags", "note", "source", "createdAt", "updatedAt", "platform", "price"],
  },
  websites: {
    required: ["id", "module", "name", "category", "status", "domain"],
    optional: [
      "tags",
      "note",
      "source",
      "createdAt",
      "updatedAt",
      "access",
      "content",
      "purpose",
    ],
  },
  inbox: {
    required: ["id", "module", "name", "category", "status", "rawContent"],
    optional: [
      "rawContentType",
      "tags",
      "note",
      "source",
      "aiSummary",
      "aiSuggestions",
      "suggestedTargetModule",
      "suggestedCategory",
      "confidence",
      "createdAt",
      "updatedAt",
    ],
  },
};

function formatList(items) {
  return items.length > 0 ? items.join("、") : "暂无";
}

function buildModuleInstructions(selectedModules, categoriesByModule, statusesByModule) {
  return selectedModules
    .map((moduleId) => {
      const guide = moduleFieldGuides[moduleId];
      const extraRule =
        moduleId === "websites"
          ? [
              "如果原始数据中有网址或域名，必须优先提取到 domain。",
              "note 或 Markdown 要重点整理网站内容、用途、适用场景、特点。",
              "信息不足时不要编造网站用途或可访问性。",
            ].join("\n")
          : moduleId === "inbox"
            ? [
                "rawContent 必须尽量保留用户原始输入，不要先重写再保存。",
                "如果没有标题，可以根据 rawContent 生成简短标题。",
                "待处理模块优先宽容录入，不要强行编造成熟知识条目。",
              ].join("\n")
            : "";

      return `模块：${moduleLabels[moduleId]}（${moduleId}）
可用分类参考：${formatList(categoriesByModule[moduleId] ?? [])}
可用状态参考：${formatList(statusesByModule[moduleId] ?? [])}
必填字段：${guide.required.join("、")}
可选字段：${guide.optional.join("、")}
${extraRule}`.trim();
    })
    .join("\n\n");
}

function buildManifestExample(selectedModules) {
  const exportScope =
    selectedModules.length === knowledgeModuleIds.length ? "full" : "partial";

  return `manifest.json 至少包含以下字段：{
  "schemaVersion": 1,
  "exportScope": "${exportScope}",
  "exportedModules": ${JSON.stringify(selectedModules)},
  "totalEntries": <数字>,
  "moduleStats": {
    ${selectedModules
      .map((moduleId) => `"${moduleId}": { "entryCount": <数字> }`)
      .join(",\n    ")}
  }
}`;
}

export async function generateImportAiPrompt(selectedModulesInput) {
  const selectedModules = ensureSelectedModules(selectedModulesInput);
  const { categoriesByModule, statusesByModule } =
    await getImportTemplateContext(selectedModules);

  const prompt = `请把我接下来提供的原始表格、原始笔记或清单，整理成一个可导入“个人知识收集网站”的 ZIP 包内容。
你的输出目标不是解释格式，而是直接生成导入包内每个文件的结构化内容。
不要输出额外解释，不要省略必要文件。

请严格遵守以下规则：
1. 目标目录结构必须是：
   - manifest.json
   - data/taxonomy.json
   - ${selectedModules.map((moduleId) => `data/${moduleId}.json`).join("\n   - ")}
   - 如有长备注，写入 content/<module>/<id>.md
2. 每个 data/*.json 都必须是 JSON 数组，数组内每条记录的 module 必须与文件模块一致。
3. id 命名必须稳定：
   - offline 使用 offline-001 这类格式
   - shopping 使用 shopping-001 这类格式
   - websites 使用 websites-001 这类格式
   - inbox 使用 inbox-001 这类格式
4. 长备注优先放到 content/<module>/<id>.md；如果没有长备注，可以只保留 note。
5. category 必须尽量匹配现有分类；如果无法判断，不要编造不存在的分类。
6. status 也应优先匹配现有配置；信息不足时不要强行猜测。
7. tags 必须是字符串数组，标签要去重、简洁、规范。
8. createdAt 和 updatedAt 使用 YYYY-MM-DD。
9. 如果没有某个可选字段，请返回空字符串、null 或省略，但不要编造。
10. websites 模块如有网址或域名，必须优先提取 domain；如果没有足够信息，不要编造网站用途。
11. inbox 模块必须完整保留 rawContent；就算信息杂乱，也不要提前过度结构化。

${buildManifestExample(selectedModules)}

模块字段要求：
${buildModuleInstructions(selectedModules, categoriesByModule, statusesByModule)}

输出格式要求：
1. 直接按“文件路径 + 文件内容”的方式输出。
2. 每个文件都输出完整内容。
3. 不要输出解释，不要加“以下是结果”等前言。
4. 文件路径必须与 id 和模块目录一致。

我接下来会提供原始数据，请根据原始数据生成完整的导入包内容。`;

  return {
    prompt,
    selectedModules,
    categoriesByModule,
    statusesByModule,
  };
}

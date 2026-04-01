import {
  knowledgeModuleIds,
  readKnowledgeData,
  readKnowledgeMeta,
} from "../knowledge-store.mjs";

export const moduleLabels = {
  offline: "线下好店",
  shopping: "网购好物",
  websites: "网站收集",
  inbox: "待处理",
};

const moduleFallbackCategories = {
  offline: "饭店",
  shopping: "日用百货",
  websites: "文件工具",
  inbox: "未归类",
};

const moduleFallbackStatuses = {
  offline: "想去",
  shopping: "推荐",
  websites: "常用",
  inbox: "未处理",
};

const moduleExampleEntries = {
  offline: {
    id: "offline-001",
    module: "offline",
    name: "示例线下地点",
    category: moduleFallbackCategories.offline,
    status: moduleFallbackStatuses.offline,
    tags: ["示例", "周末"],
    note: "适合第一次导入时核对字段结构。",
    source: "示例模板",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-01",
    location: "杭州 西湖附近",
    rating: 4.5,
  },
  shopping: {
    id: "shopping-001",
    module: "shopping",
    name: "示例网购商品",
    category: moduleFallbackCategories.shopping,
    status: moduleFallbackStatuses.shopping,
    tags: ["示例", "回购"],
    note: "可以用来理解价格、平台和标签格式。",
    source: "示例模板",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-01",
    platform: "京东",
    price: 59,
  },
  websites: {
    id: "websites-001",
    module: "websites",
    name: "示例网站",
    category: moduleFallbackCategories.websites,
    status: "收藏",
    tags: ["示例", "收藏"],
    note: "如果有长说明，建议写入 content/websites/websites-001.md。",
    source: "示例模板",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-01",
    domain: "example.com",
    access: "可访问",
    content: "示例站点的主要内容概览",
    purpose: "演示导入格式与字段映射",
  },
  inbox: {
    id: "inbox-001",
    module: "inbox",
    name: "示例待处理条目",
    category: moduleFallbackCategories.inbox,
    status: moduleFallbackStatuses.inbox,
    tags: ["示例", "原始内容"],
    note: "待处理模块优先保留原始内容，结构化整理可以后置。",
    source: "示例模板",
    createdAt: "2026-04-01",
    updatedAt: "2026-04-01",
    rawContent:
      "这里可以是一段博客摘录、商品评价、聊天记录、截图说明或以后再整理的临时想法。",
    rawContentType: "text",
    aiSummary: "一条示例待处理内容，用来展示原始内容和 AI 补充字段的格式。",
    aiSuggestions: "建议在补充来源后判断是否转入其他正式模块。",
    suggestedTargetModule: "inbox",
    suggestedCategory: "待整理",
    confidence: 0.74,
  },
};

const moduleExampleMarkdown = {
  offline: `# 推荐理由

- 这里填写更完整的体验记录、交通方式、适合人群等信息。
- 如果没有长内容，也可以只保留 data/offline.json 里的 note 字段。`,
  shopping: `# 使用说明

- 这里可以写优点、缺点、适合场景和规格信息。
- 如果你从表格导入，建议把长描述整理成 Markdown 正文。`,
  websites: `# 网站内容

这是一个示例网站条目的长说明。

## 网站用途
- 说明网站主要解决什么问题
- 适合什么使用场景
- 有哪些值得长期记录的特点

> 如果原始资料里没有足够信息，不要编造网站用途。`,
  inbox: `# 原始内容补充

这里可以继续整理这条待处理内容的上下文、AI 分析结果和后续动作。

## 后续建议
- 是否值得转入正式模块
- 还缺哪些来源或背景信息
- 下一步应该整理什么`,
};

function pickFirstValue(values, fallback) {
  return Array.isArray(values) && values.length > 0 ? values[0] : fallback;
}

function pickStatuses(moduleId, entries) {
  const values = Array.from(
    new Set(
      (entries ?? [])
        .map((entry) => String(entry?.status ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (values.length === 0) {
    return [moduleFallbackStatuses[moduleId]];
  }

  return values;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function getImportTemplateContext(selectedModules) {
  const [meta, data] = await Promise.all([readKnowledgeMeta(), readKnowledgeData()]);
  const normalizedModules = Array.from(new Set(selectedModules ?? [])).filter((moduleId) =>
    knowledgeModuleIds.includes(moduleId),
  );

  const categoriesByModule = Object.fromEntries(
    normalizedModules.map((moduleId) => [moduleId, meta.categories?.[moduleId] ?? []]),
  );
  const statusesByModule = Object.fromEntries(
    normalizedModules.map((moduleId) => [moduleId, pickStatuses(moduleId, data[moduleId])]),
  );

  return {
    meta,
    data,
    categoriesByModule,
    statusesByModule,
  };
}

export async function createEmptyTemplatePreset(selectedModules) {
  const { meta } = await getImportTemplateContext(selectedModules);

  return {
    taxonomy: clone(meta),
    entriesByModule: Object.fromEntries(selectedModules.map((moduleId) => [moduleId, []])),
    markdownByModule: Object.fromEntries(selectedModules.map((moduleId) => [moduleId, {}])),
  };
}

export async function createExampleTemplatePreset(selectedModules) {
  const { meta, categoriesByModule, statusesByModule } =
    await getImportTemplateContext(selectedModules);
  const entriesByModule = {};
  const markdownByModule = {};

  for (const moduleId of selectedModules) {
    const exampleEntry = clone(moduleExampleEntries[moduleId]);
    exampleEntry.category = pickFirstValue(
      categoriesByModule[moduleId],
      exampleEntry.category,
    );
    exampleEntry.status = pickFirstValue(
      statusesByModule[moduleId],
      exampleEntry.status,
    );
    entriesByModule[moduleId] = [exampleEntry];
    markdownByModule[moduleId] = {
      [exampleEntry.id]: moduleExampleMarkdown[moduleId],
    };
  }

  return {
    taxonomy: clone(meta),
    entriesByModule,
    markdownByModule,
  };
}

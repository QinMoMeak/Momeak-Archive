import { knowledgeModuleIds, readKnowledgeMeta, readModuleEntries } from "../knowledge-store.mjs";
import { looksLikeDomain, looksLikeWebsiteHint } from "../reader/url-utils.mjs";
import { analyzeWebsiteEntryWithAi } from "./analyze-website-entry.mjs";
import { requestAiStructuredParse } from "./client.mjs";
import {
  cleanInlineValue,
  cleanMultilineValue,
  dedupeAvailableValues,
  normalizeTags,
  resolveConfiguredField,
} from "./matchers.mjs";
import { getModuleAiConfig } from "./module-config.mjs";
import { buildModulePrompt } from "./prompts/index.mjs";
import { resolveRuntimeAiConfig } from "./resolve-runtime-config.mjs";
import {
  aiModelOutputJsonSchema,
  aiModelOutputSchema,
  aiMultipleModelOutputJsonSchema,
  aiMultipleModelOutputSchema,
  aiParseRequestSchema,
} from "./schema.mjs";

const websiteAccessOptions = ["可访问", "部分可访问", "不可访问"];

function appendMissingField(list, field) {
  if (field && !list.includes(field)) {
    list.push(field);
  }
}

function appendWarning(list, message) {
  if (message && !list.includes(message)) {
    list.push(message);
  }
}

function buildMarkdownFallback(moduleId, fields) {
  const sections = [];

  if (fields.note) {
    sections.push("## 概览", fields.note);
  }

  if (moduleId === "offline" && fields.location) {
    sections.push("## 基本信息", `- 地点：${fields.location}`);
  }

  if (moduleId === "shopping") {
    const lines = [
      fields.platform ? `- 平台：${fields.platform}` : "",
      fields.price ? `- 价格：${fields.price}` : "",
    ].filter(Boolean);

    if (lines.length) {
      sections.push("## 基本信息", ...lines);
    }
  }

  if (moduleId === "websites") {
    const lines = [
      fields.domain ? `- 域名：${fields.domain}` : "",
      fields.content ? `- 网站内容：${fields.content}` : "",
      fields.purpose ? `- 用途：${fields.purpose}` : "",
      fields.access ? `- 可访问性：${fields.access}` : "",
    ].filter(Boolean);

    if (lines.length) {
      sections.push("## 网站概览", ...lines);
    }
  }

  if (moduleId === "inbox") {
    sections.push("## 原始内容", fields.rawContent || "暂无");

    if (fields.aiSummary) {
      sections.push("## AI 摘要", fields.aiSummary);
    }

    if (fields.aiSuggestions) {
      sections.push("## AI 建议", fields.aiSuggestions);
    }
  }

  return sections.join("\n");
}

async function getRuntimeConfig(moduleId) {
  const [meta, entries] = await Promise.all([
    readKnowledgeMeta(),
    readModuleEntries(moduleId),
  ]);
  const aiConfig = getModuleAiConfig(moduleId);

  return {
    availableCategories: dedupeAvailableValues(meta.categories[moduleId] ?? []),
    availableStatuses: dedupeAvailableValues([
      ...aiConfig.defaultStatuses,
      ...entries.map((entry) => entry.status),
    ]),
  };
}

function resolveSuggestedTargetModule(value) {
  const normalized = cleanInlineValue(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  if (knowledgeModuleIds.includes(normalized)) {
    return normalized;
  }

  const aliasMap = getModuleAiConfig("inbox").targetModuleAliases ?? {};
  return aliasMap[normalized] ?? "";
}

function buildInboxSuggestions(aiResult, suggestedTargetModule, suggestedCategory) {
  const parts = [
    cleanMultilineValue(aiResult.suggestedNextAction),
    suggestedTargetModule
      ? `建议后续整理到：${suggestedTargetModule}`
      : "建议暂时继续留在待处理池",
    suggestedCategory ? `建议分类：${suggestedCategory}` : "",
  ].filter(Boolean);

  return parts.join("\n");
}

function createDraft(moduleId, fields) {
  return {
    name: fields.name,
    category: fields.category,
    status: fields.status,
    tags: fields.tags.join(", "),
    note: fields.note,
    markdownContent: fields.markdownContent,
    source: fields.source,
    location: moduleId === "offline" ? fields.location : "",
    rating: moduleId === "offline" && fields.rating !== null ? String(fields.rating) : "",
    platform: moduleId === "shopping" ? fields.platform : "",
    price: moduleId === "shopping" && fields.price !== null ? String(fields.price) : "",
    domain: moduleId === "websites" ? fields.domain : "",
    access: moduleId === "websites" ? fields.access : "",
    content: moduleId === "websites" ? fields.content : "",
    purpose: moduleId === "websites" ? fields.purpose : "",
    rawContent: moduleId === "inbox" ? fields.rawContent : "",
    rawContentType: moduleId === "inbox" ? fields.rawContentType : "",
    aiSummary: moduleId === "inbox" ? fields.aiSummary : "",
    aiSuggestions: moduleId === "inbox" ? fields.aiSuggestions : "",
    suggestedTargetModule: moduleId === "inbox" ? fields.suggestedTargetModule : "",
    suggestedCategory: moduleId === "inbox" ? fields.suggestedCategory : "",
    confidence:
      moduleId === "inbox" && fields.confidence !== null ? String(fields.confidence) : "",
  };
}

function buildFields(moduleId, rawText, aiResult, overrides = {}) {
  const siteContentSummary = cleanInlineValue(
    overrides.siteContentSummary ?? aiResult.siteContentSummary ?? aiResult.content,
  );
  const sitePurpose = cleanInlineValue(
    overrides.sitePurpose ?? aiResult.sitePurpose ?? aiResult.purpose,
  );
  const suggestedTargetModule = cleanInlineValue(overrides.suggestedTargetModule);
  const suggestedCategory = cleanInlineValue(overrides.suggestedCategory);
  const rawContent =
    moduleId === "inbox"
      ? cleanMultilineValue(aiResult.rawContent ?? rawText)
      : "";

  const fields = {
    name: cleanInlineValue(aiResult.name),
    category: overrides.category ?? "",
    status: overrides.status ?? "",
    tags: normalizeTags(
      aiResult.extractedTags?.length ? aiResult.extractedTags : aiResult.tags,
    ),
    source: cleanInlineValue(aiResult.source),
    note: cleanMultilineValue(aiResult.note ?? aiResult.noteDraft),
    markdownContent: cleanMultilineValue(aiResult.markdownContent),
    location: cleanInlineValue(aiResult.location),
    rating: aiResult.rating ?? null,
    platform: cleanInlineValue(aiResult.platform),
    price: aiResult.price ?? null,
    domain: cleanInlineValue(overrides.domain ?? aiResult.domain),
    access: cleanInlineValue(overrides.access ?? aiResult.access),
    content: siteContentSummary,
    purpose: sitePurpose,
    siteContentSummary,
    sitePurpose,
    rawContent,
    rawContentType: cleanInlineValue(aiResult.detectedContentType),
    aiSummary: cleanMultilineValue(aiResult.aiSummary),
    aiSuggestions: buildInboxSuggestions(aiResult, suggestedTargetModule, suggestedCategory),
    suggestedTargetModule,
    suggestedCategory,
    confidence: aiResult.confidence ?? null,
  };

  if (moduleId === "inbox" && !fields.note) {
    fields.note = cleanMultilineValue(aiResult.noteDraft);
  }

  if (!fields.markdownContent && (fields.note || (moduleId === "inbox" && fields.rawContent))) {
    fields.markdownContent = buildMarkdownFallback(moduleId, fields);
  }

  return fields;
}

function buildEntryCandidate({
  moduleId,
  rawText,
  aiResult,
  runtime,
  categoryMatch,
  statusMatch,
  fields,
  readerContext = null,
}) {
  const draft = createDraft(moduleId, fields);
  const filledFields = Object.entries(draft)
    .filter(([, value]) => String(value ?? "").trim().length > 0)
    .map(([key]) => key);

  return {
    moduleId,
    draft,
    filledFields,
    missingFields: [...new Set(aiResult.missingFields)],
    warnings: [...new Set(aiResult.warnings)],
    suggestedCategory: aiResult.suggestedCategory ?? "",
    categoryReason: aiResult.categoryReason ?? "",
    categoryConfidence: aiResult.categoryConfidence ?? null,
    category: categoryMatch.value,
    unmatchedCategory: categoryMatch.unmatchedValue,
    needsCategoryConfirmation: categoryMatch.needsConfirmation,
    availableCategories: categoryMatch.availableValues,
    suggestedStatus: aiResult.suggestedStatus ?? "",
    statusReason: aiResult.statusReason ?? "",
    statusConfidence: aiResult.statusConfidence ?? null,
    status: statusMatch.value,
    unmatchedStatus: statusMatch.unmatchedValue,
    needsStatusConfirmation: statusMatch.needsConfirmation,
    availableStatuses: statusMatch.availableValues,
    detectedContentType: fields.rawContentType,
    suggestedTargetModule: fields.suggestedTargetModule,
    suggestedNextAction: cleanMultilineValue(aiResult.suggestedNextAction),
    confidence: fields.confidence,
    noteDraft: cleanMultilineValue(aiResult.noteDraft),
    siteContentSummary: fields.siteContentSummary,
    sitePurpose: fields.sitePurpose,
    readerUsed: Boolean(readerContext?.used),
    readerStatusLabel: readerContext?.statusLabel ?? "",
    readerUrl: readerContext?.normalizedUrl ?? "",
    readerContentLength: readerContext?.contentLength ?? 0,
  };
}

function validateWebsiteFields({
  rawText,
  aiResult,
  extractedDomain,
  normalizedUrl,
  warnings,
  missingFields,
}) {
  let domain = cleanInlineValue(aiResult.domain);
  let access = cleanInlineValue(aiResult.access);

  if (!domain && extractedDomain) {
    domain = extractedDomain;
  }

  if (domain && !looksLikeDomain(domain)) {
    appendWarning(warnings, "AI 返回的域名格式不合法，已清空，请手动确认。");
    domain = "";
  }

  if (!domain) {
    appendMissingField(missingFields, "domain");
  }

  if (!looksLikeWebsiteHint(rawText) && !normalizedUrl && !domain) {
    appendWarning(
      warnings,
      "原始文本里没有明确的网站线索，请至少补充 URL、域名或网站名称。",
    );
    appendMissingField(missingFields, "name");
  }

  if (access && !websiteAccessOptions.includes(access)) {
    appendWarning(warnings, "AI 返回的可访问状态不在当前支持范围内，已清空，请手动确认。");
    access = "";
  }

  return { domain, access };
}

async function analyzeGenericEntry({
  moduleId,
  rawText,
  runtimeConfig,
  runtime,
  mode,
}) {
  const prompt = buildModulePrompt(moduleId, {
    rawText,
    mode,
    extractedDomain: "",
    availableCategories: runtime.availableCategories,
    availableStatuses: runtime.availableStatuses,
  });

  const aiResult = await requestAiStructuredParse(
    runtimeConfig,
    prompt.systemPrompt,
    prompt.userPrompt,
    mode === "multiple"
      ? {
          schema: aiMultipleModelOutputSchema,
          jsonSchema: aiMultipleModelOutputJsonSchema,
          schemaName: `knowledge_${moduleId}_multiple_parse`,
        }
      : {
          schema: aiModelOutputSchema,
          jsonSchema: aiModelOutputJsonSchema,
          schemaName: `knowledge_${moduleId}_single_parse`,
        },
  );

  return {
    aiResult,
    extractedDomain: "",
    normalizedUrl: "",
    extractedDomains: [],
    readerContext: null,
    readerContexts: [],
  };
}

function finalizeCandidate({
  moduleId,
  sourceRawText,
  aiResult,
  runtime,
  extractedDomain = "",
  normalizedUrl = "",
  readerContext = null,
}) {
  const result = {
    ...aiResult,
    warnings: [...(aiResult.warnings ?? [])],
    missingFields: [...(aiResult.missingFields ?? [])],
  };

  const categoryMatch = resolveConfiguredField(
    moduleId,
    "category",
    result.suggestedCategory,
    runtime.availableCategories,
  );
  const statusMatch = resolveConfiguredField(
    moduleId,
    "status",
    result.suggestedStatus,
    runtime.availableStatuses,
  );

  if (categoryMatch.needsConfirmation) {
    appendWarning(
      result.warnings,
      `AI 建议分类“${categoryMatch.unmatchedValue}”未命中当前配置，请手动确认。`,
    );
  }

  if (statusMatch.needsConfirmation) {
    appendWarning(
      result.warnings,
      `AI 建议状态“${statusMatch.unmatchedValue}”未命中当前可用状态，请手动确认。`,
    );
  }

  let websiteOverrides = {
    domain: "",
    access: "",
    siteContentSummary: "",
    sitePurpose: "",
  };

  if (moduleId === "websites") {
    websiteOverrides = {
      ...validateWebsiteFields({
        rawText: sourceRawText,
        aiResult: result,
        extractedDomain,
        normalizedUrl,
        warnings: result.warnings,
        missingFields: result.missingFields,
      }),
      siteContentSummary: cleanInlineValue(result.siteContentSummary ?? result.content),
      sitePurpose: cleanInlineValue(result.sitePurpose ?? result.purpose),
    };

    if (!websiteOverrides.siteContentSummary) {
      appendMissingField(result.missingFields, "siteContentSummary");
    }

    if (!websiteOverrides.sitePurpose) {
      appendMissingField(result.missingFields, "sitePurpose");
    }
  }

  const suggestedTargetModule =
    moduleId === "inbox" ? resolveSuggestedTargetModule(result.suggestedTargetModule) : "";

  if (moduleId === "inbox" && !suggestedTargetModule && result.suggestedTargetModule) {
    appendWarning(
      result.warnings,
      `AI 建议去向“${result.suggestedTargetModule}”未命中当前模块列表，请手动确认。`,
    );
  }

  const fields = buildFields(moduleId, sourceRawText, result, {
    category: categoryMatch.value,
    status: statusMatch.value,
    suggestedTargetModule,
    suggestedCategory: cleanInlineValue(result.suggestedCategory),
    ...websiteOverrides,
  });

  if (moduleId === "inbox" && !fields.aiSummary) {
    appendMissingField(result.missingFields, "aiSummary");
  }

  return buildEntryCandidate({
    moduleId,
    rawText: sourceRawText,
    aiResult: result,
    runtime,
    categoryMatch,
    statusMatch,
    fields,
    readerContext,
  });
}

export async function parseKnowledgeEntryWithAi(bodyInput) {
  const { moduleId, rawText, mode } = aiParseRequestSchema.parse(bodyInput);
  const runtimeConfig = await resolveRuntimeAiConfig();

  if (!runtimeConfig.model) {
    throw new Error("当前没有可用模型，请先在 AI 设置中选择。");
  }

  const runtime = await getRuntimeConfig(moduleId);
  const analyzed =
    moduleId === "websites"
      ? await analyzeWebsiteEntryWithAi({
          rawText,
          mode,
          runtimeConfig,
          availableCategories: runtime.availableCategories,
          availableStatuses: runtime.availableStatuses,
        })
      : await analyzeGenericEntry({
          moduleId,
          rawText,
          runtimeConfig,
          runtime,
          mode,
        });

  if (mode === "multiple") {
    const rawEntries = analyzed.aiResult.entries ?? [];
    const entries = rawEntries.map((entry, index) =>
      finalizeCandidate({
        moduleId,
        sourceRawText:
          moduleId === "inbox"
            ? cleanMultilineValue(entry.rawContent ?? rawText)
            : rawText,
        aiResult: entry,
        runtime,
        extractedDomain: analyzed.extractedDomains?.[index] ?? "",
        normalizedUrl: analyzed.readerContexts?.[index]?.normalizedUrl ?? "",
        readerContext: analyzed.readerContexts?.[index] ?? null,
      }),
    );

    const warnings = [...new Set([...(analyzed.aiResult.warnings ?? [])])];

    if (entries.length === 0) {
      warnings.push("AI 没有识别出可用的候选条目，请尝试调整输入或切换回单条解析。");
    }

    return {
      result: {
        mode: "multiple",
        moduleId,
        rawText,
        entries,
        warnings,
      },
    };
  }

  const entry = finalizeCandidate({
    moduleId,
    sourceRawText: rawText,
    aiResult: analyzed.aiResult,
    runtime,
    extractedDomain: analyzed.extractedDomain,
    normalizedUrl: analyzed.normalizedUrl,
    readerContext: analyzed.readerContext,
  });

  return {
    result: {
      mode: "single",
      moduleId,
      rawText,
      entry,
    },
  };
}

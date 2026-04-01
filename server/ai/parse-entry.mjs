import { readKnowledgeMeta, readModuleEntries } from "../knowledge-store.mjs";
import { buildModulePrompt } from "./prompts/index.mjs";
import { requestAiStructuredParse } from "./client.mjs";
import { getModuleAiConfig } from "./module-config.mjs";
import { resolveRuntimeAiConfig } from "./resolve-runtime-config.mjs";
import { aiParseRequestSchema } from "./schema.mjs";
import {
  cleanInlineValue,
  cleanMultilineValue,
  dedupeAvailableValues,
  normalizeTags,
  resolveConfiguredField,
} from "./matchers.mjs";
import { analyzeWebsiteEntryWithAi } from "./analyze-website-entry.mjs";
import { looksLikeDomain, looksLikeWebsiteHint } from "../reader/url-utils.mjs";

const websiteAccessOptions = ["可访问", "部分可访问", "不可访问"];

function buildMarkdownFallback(moduleId, fields) {
  const sections = [];

  if (fields.note) {
    sections.push("## 概览", fields.note);
  }

  if (moduleId === "offline") {
    const lines = [fields.location && `- 地点：${fields.location}`].filter(Boolean);

    if (lines.length > 0) {
      sections.push("## 基本信息", ...lines);
    }
  }

  if (moduleId === "shopping") {
    const lines = [
      fields.platform && `- 平台：${fields.platform}`,
      fields.price && `- 价格：${fields.price}`,
    ].filter(Boolean);

    if (lines.length > 0) {
      sections.push("## 基本信息", ...lines);
    }
  }

  if (moduleId === "websites") {
    const lines = [
      fields.domain && `- 域名：${fields.domain}`,
      fields.content && `- 网站内容：${fields.content}`,
      fields.purpose && `- 网站用途：${fields.purpose}`,
      fields.access && `- 可访问性：${fields.access}`,
    ].filter(Boolean);

    if (lines.length > 0) {
      sections.push("## 网站概览", ...lines);
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
    rating:
      moduleId === "offline" && fields.rating !== null ? String(fields.rating) : "",
    platform: moduleId === "shopping" ? fields.platform : "",
    price:
      moduleId === "shopping" && fields.price !== null ? String(fields.price) : "",
    domain: moduleId === "websites" ? fields.domain : "",
    access: moduleId === "websites" ? fields.access : "",
    content: moduleId === "websites" ? fields.content : "",
    purpose: moduleId === "websites" ? fields.purpose : "",
  };
}

function buildFields(moduleId, aiResult, overrides = {}) {
  const siteContentSummary = cleanInlineValue(
    overrides.siteContentSummary ?? aiResult.siteContentSummary ?? aiResult.content,
  );
  const sitePurpose = cleanInlineValue(
    overrides.sitePurpose ?? aiResult.sitePurpose ?? aiResult.purpose,
  );

  const fields = {
    name: cleanInlineValue(aiResult.name),
    category: overrides.category ?? "",
    status: overrides.status ?? "",
    tags: normalizeTags(aiResult.tags),
    source: cleanInlineValue(aiResult.source),
    note: cleanMultilineValue(aiResult.note),
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
  };

  if (!fields.markdownContent && fields.note) {
    fields.markdownContent = buildMarkdownFallback(moduleId, fields);
  }

  return fields;
}

function buildResult({
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
    result: {
      moduleId,
      rawText,
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
      siteContentSummary: fields.siteContentSummary,
      sitePurpose: fields.sitePurpose,
      readerUsed: Boolean(readerContext?.used),
      readerStatusLabel: readerContext?.statusLabel ?? "",
      readerUrl: readerContext?.normalizedUrl ?? "",
      readerContentLength: readerContext?.contentLength ?? 0,
      availableRuntimeCategories: runtime.availableCategories,
      availableRuntimeStatuses: runtime.availableStatuses,
    },
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

  if (extractedDomain) {
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
      "原始文本里没有明确的网站线索，请至少补充 URL、域名或明确的网站名称。",
    );
    appendMissingField(missingFields, "name");
  }

  if (access && !websiteAccessOptions.includes(access)) {
    appendWarning(
      warnings,
      "AI 返回的可访问性状态不在当前支持范围内，已清空，请手动确认。",
    );
    access = "";
  }

  return { domain, access };
}

async function analyzeGenericEntry({
  moduleId,
  rawText,
  runtimeConfig,
  runtime,
}) {
  const prompt = buildModulePrompt(moduleId, {
    rawText,
    extractedDomain: "",
    availableCategories: runtime.availableCategories,
    availableStatuses: runtime.availableStatuses,
  });
  const aiResult = await requestAiStructuredParse(
    runtimeConfig,
    prompt.systemPrompt,
    prompt.userPrompt,
  );

  return {
    aiResult,
    extractedDomain: "",
    normalizedUrl: "",
    readerContext: null,
  };
}

export async function parseKnowledgeEntryWithAi(bodyInput) {
  const { moduleId, rawText } = aiParseRequestSchema.parse(bodyInput);
  const runtimeConfig = await resolveRuntimeAiConfig();

  if (!runtimeConfig.model) {
    throw new Error("当前没有可用模型，请先在 AI 设置中选择。");
  }

  const runtime = await getRuntimeConfig(moduleId);
  const analyzed =
    moduleId === "websites"
      ? await analyzeWebsiteEntryWithAi({
          rawText,
          runtimeConfig,
          availableCategories: runtime.availableCategories,
          availableStatuses: runtime.availableStatuses,
        })
      : await analyzeGenericEntry({
          moduleId,
          rawText,
          runtimeConfig,
          runtime,
        });

  const aiResult = {
    ...analyzed.aiResult,
    warnings: [...analyzed.aiResult.warnings],
    missingFields: [...analyzed.aiResult.missingFields],
  };

  const categoryMatch = resolveConfiguredField(
    moduleId,
    "category",
    aiResult.suggestedCategory,
    runtime.availableCategories,
  );
  const statusMatch = resolveConfiguredField(
    moduleId,
    "status",
    aiResult.suggestedStatus,
    runtime.availableStatuses,
  );

  if (categoryMatch.needsConfirmation) {
    appendWarning(
      aiResult.warnings,
      `AI 建议分类「${categoryMatch.unmatchedValue}」未命中当前配置，请手动确认。`,
    );
  }

  if (statusMatch.needsConfirmation) {
    appendWarning(
      aiResult.warnings,
      `AI 建议状态「${statusMatch.unmatchedValue}」未命中当前可用状态，请手动确认。`,
    );
  }

  let websiteFieldOverrides = {
    domain: "",
    access: "",
    siteContentSummary: "",
    sitePurpose: "",
  };

  if (moduleId === "websites") {
    websiteFieldOverrides = {
      ...validateWebsiteFields({
        rawText,
        aiResult,
        extractedDomain: analyzed.extractedDomain,
        normalizedUrl: analyzed.normalizedUrl,
        warnings: aiResult.warnings,
        missingFields: aiResult.missingFields,
      }),
      siteContentSummary: cleanInlineValue(
        aiResult.siteContentSummary ?? aiResult.content,
      ),
      sitePurpose: cleanInlineValue(aiResult.sitePurpose ?? aiResult.purpose),
    };

    if (!websiteFieldOverrides.sitePurpose) {
      appendMissingField(aiResult.missingFields, "sitePurpose");
    }

    if (!websiteFieldOverrides.siteContentSummary) {
      appendMissingField(aiResult.missingFields, "siteContentSummary");
    }
  }

  const fields = buildFields(moduleId, aiResult, {
    category: categoryMatch.value,
    status: statusMatch.value,
    ...websiteFieldOverrides,
  });

  return buildResult({
    moduleId,
    rawText,
    aiResult,
    runtime,
    categoryMatch,
    statusMatch,
    fields,
    readerContext: analyzed.readerContext,
  });
}

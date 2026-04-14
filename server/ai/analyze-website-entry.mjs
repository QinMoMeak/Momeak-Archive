import { fetchReaderContent } from "../reader/fetch-reader-content.mjs";
import {
  looksLikeWebsiteHint,
  normalizeWebsiteCandidates,
  normalizeWebsiteUrl,
} from "../reader/url-utils.mjs";
import {
  aiModelOutputJsonSchema,
  aiModelOutputSchema,
  aiMultipleModelOutputJsonSchema,
  aiMultipleModelOutputSchema,
} from "./schema.mjs";
import { requestAiStructuredParse } from "./client.mjs";
import { buildWebsitesPrompt } from "./prompts/websites.mjs";

function createStatusLabel(readerResult) {
  if (!readerResult) {
    return "未调用 Reader";
  }

  if (!readerResult.ok) {
    return "读取失败";
  }

  if (!readerResult.isUseful) {
    return "读取成功但内容较少";
  }

  return "读取成功";
}

function createReaderContext(candidate, readerResult, warnings) {
  return {
    used: Boolean(candidate),
    normalizedUrl: candidate?.url ?? "",
    domain: candidate?.domain ?? "",
    statusLabel: createStatusLabel(readerResult),
    markdown: readerResult?.markdown ?? "",
    metaSummary: readerResult?.metaSummary ?? "",
    contentLength: readerResult?.contentLength ?? 0,
    warnings,
  };
}

async function readReaderContexts(candidates) {
  const contexts = await Promise.all(
    candidates.map(async (candidate) => {
      const readerResult = await fetchReaderContent(candidate.readerPathTarget);
      const warnings = [];

      if (!readerResult.ok) {
        if (readerResult.error) {
          warnings.push(readerResult.error);
        }
        warnings.push(...(readerResult.warnings ?? []));
      } else if (!readerResult.isUseful) {
        warnings.push("Reader 已读取网页，但正文较短，本次会结合原始输入做低置信度分析。");
      }

      return createReaderContext(candidate, readerResult, warnings);
    }),
  );

  return contexts;
}

export async function analyzeWebsiteEntryWithAi({
  rawText,
  images = [],
  runtimeConfig,
  availableCategories,
  availableStatuses,
  mode = "single",
}) {
  const warnings = [];
  const missingFields = [];

  if (mode === "multiple") {
    const normalized = normalizeWebsiteCandidates(rawText, 6);
    let readerContexts = [];

    if (normalized.hasUrl) {
      readerContexts = await readReaderContexts(normalized.candidates);
    } else if (looksLikeWebsiteHint(rawText)) {
      warnings.push("检测到网站线索，但未能规范化出可读取的网址，本次仅基于原始输入分析。");
    } else {
      warnings.push("当前输入缺少明确的网址或域名线索，建议补充 URL 或域名。");
      missingFields.push("domain");
    }

    const prompt = buildWebsitesPrompt({
      rawText,
      mode,
      hasImages: images.length > 0,
      imageCount: images.length,
      extractedDomains: normalized.candidates.map((item) => item.domain),
      availableCategories,
      availableStatuses,
      readerContexts,
    });

    const aiResult = await requestAiStructuredParse(
      runtimeConfig,
      prompt.systemPrompt,
      prompt.userPrompt,
      {
        schema: aiMultipleModelOutputSchema,
        jsonSchema: aiMultipleModelOutputJsonSchema,
        schemaName: "knowledge_websites_multiple_parse",
        images,
      },
    );

    return {
      aiResult: {
        ...aiResult,
        warnings: [...warnings, ...(aiResult.warnings ?? [])],
      },
      extractedDomains: normalized.candidates.map((item) => item.domain),
      readerContexts,
      missingFields,
    };
  }

  const normalized = normalizeWebsiteUrl(rawText);
  let readerContext = null;

  if (normalized.hasUrl) {
    const readerResult = await fetchReaderContent(normalized.readerPathTarget);
    const readerWarnings = [];

    if (!readerResult.ok) {
      if (readerResult.error) {
        readerWarnings.push(readerResult.error);
      }
      readerWarnings.push(...(readerResult.warnings ?? []));
    } else if (!readerResult.isUseful) {
      readerWarnings.push("Reader 已读取网页，但正文较短，本次会结合原始输入做低置信度分析。");
    } else {
      readerWarnings.push("已通过 Reader 读取网页正文，并将结果用于网站分析。");
    }

    readerContext = createReaderContext(normalized, readerResult, readerWarnings);
    warnings.push(...readerWarnings);
  } else if (looksLikeWebsiteHint(rawText)) {
    warnings.push("检测到网站线索，但未能规范化出可读取的网址，本次仅基于原始输入分析。");
  } else {
    warnings.push("当前输入缺少明确的网址或域名线索，建议补充 URL 或域名。");
    missingFields.push("domain");
  }

  const prompt = buildWebsitesPrompt({
    rawText,
    mode,
    hasImages: images.length > 0,
    imageCount: images.length,
    extractedDomain: normalized.domain,
    normalizedUrl: normalized.url,
    availableCategories,
    availableStatuses,
    readerContext,
  });

  const aiResult = await requestAiStructuredParse(
    runtimeConfig,
    prompt.systemPrompt,
    prompt.userPrompt,
    {
      schema: aiModelOutputSchema,
      jsonSchema: aiModelOutputJsonSchema,
      schemaName: "knowledge_websites_single_parse",
      images,
    },
  );

  return {
    aiResult: {
      ...aiResult,
      warnings: [...warnings, ...(aiResult.warnings ?? [])],
      missingFields: [...missingFields, ...(aiResult.missingFields ?? [])],
    },
    extractedDomain: normalized.domain,
    normalizedUrl: normalized.url,
    readerContext,
  };
}

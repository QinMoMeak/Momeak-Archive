import { requestAiStructuredParse } from "./client.mjs";
import { buildWebsitesPrompt } from "./prompts/websites.mjs";
import { fetchReaderContent } from "../reader/fetch-reader-content.mjs";
import {
  looksLikeWebsiteHint,
  normalizeWebsiteUrl,
} from "../reader/url-utils.mjs";

function createReaderContext({
  normalizedUrl,
  domain,
  readerResult,
  warnings,
}) {
  if (!readerResult) {
    return {
      used: false,
      normalizedUrl,
      domain,
      statusLabel: "未调用 Reader",
      markdown: "",
      metaSummary: "",
      contentLength: 0,
      warnings,
    };
  }

  return {
    used: true,
    normalizedUrl,
    domain,
    statusLabel: readerResult.ok
      ? readerResult.isUseful
        ? "读取成功"
        : "读取成功但内容较少"
      : "读取失败",
    markdown: readerResult.markdown,
    metaSummary: readerResult.metaSummary,
    contentLength: readerResult.contentLength,
    warnings,
  };
}

export async function analyzeWebsiteEntryWithAi({
  rawText,
  runtimeConfig,
  availableCategories,
  availableStatuses,
}) {
  const normalizedInput = normalizeWebsiteUrl(rawText);
  const warnings = [];
  const missingFields = [];
  let readerResult = null;

  if (normalizedInput.hasUrl) {
    readerResult = await fetchReaderContent(normalizedInput.readerPathTarget);

    if (!readerResult.ok) {
      warnings.push(...readerResult.warnings);
      if (readerResult.error) {
        warnings.push(readerResult.error);
      }
    } else if (!readerResult.isUseful) {
      warnings.push(
        "Reader 已读取网页，但正文较短，本次会结合原始输入做低置信度分析。",
      );
    } else {
      warnings.push("已通过 Reader 读取网页正文，并将结果用于网站分析。");
    }
  } else if (looksLikeWebsiteHint(rawText)) {
    warnings.push("检测到网站线索，但未能规范化出可读取的网址，本次仅基于原始输入分析。");
  } else {
    warnings.push("当前输入缺少明确的网址或域名线索，建议补充 URL 或裸域名。");
    missingFields.push("domain");
  }

  const readerContext = createReaderContext({
    normalizedUrl: normalizedInput.url,
    domain: normalizedInput.domain,
    readerResult,
    warnings,
  });

  const prompt = buildWebsitesPrompt({
    rawText,
    extractedDomain: normalizedInput.domain,
    normalizedUrl: normalizedInput.url,
    availableCategories,
    availableStatuses,
    readerContext,
  });

  const aiResult = await requestAiStructuredParse(
    runtimeConfig,
    prompt.systemPrompt,
    prompt.userPrompt,
  );

  return {
    aiResult: {
      ...aiResult,
      warnings: [...warnings, ...aiResult.warnings],
      missingFields: [...missingFields, ...aiResult.missingFields],
    },
    extractedDomain: normalizedInput.domain,
    normalizedUrl: normalizedInput.url,
    readerContext,
  };
}

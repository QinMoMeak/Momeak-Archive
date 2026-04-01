import { moduleDefinitions } from "@/data/knowledge";
import { formatDate, formatPrice } from "@/lib/knowledge";
import type { DetailField, KnowledgeEntry } from "@/types/knowledge";

const markdownModules = import.meta.glob("../../content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function getMarkdownPath(entry: KnowledgeEntry) {
  return `../../content/${entry.module}/${entry.id}.md`;
}

export function getBundledMarkdownContent(entry: KnowledgeEntry) {
  return markdownModules[getMarkdownPath(entry)]?.trim() ?? "";
}

function getPriceBand(price: number | null) {
  if (price === null) {
    return "未填写";
  }

  if (price < 50) {
    return "低价";
  }

  if (price < 100) {
    return "中价";
  }

  return "高价";
}

function getTagSummary(entry: KnowledgeEntry) {
  if (entry.tags.length === 0) {
    return "暂无标签";
  }

  return entry.tags.slice(0, 3).join(" / ");
}

function getBasicInfo(entry: KnowledgeEntry): DetailField[] {
  const fields: DetailField[] = [
    { label: "分类", value: entry.category },
    { label: "状态", value: entry.status },
  ];

  if (entry.module === "offline") {
    fields.push(
      { label: "地点", value: entry.location },
      {
        label: "评分",
        value: entry.rating === null ? "未评分" : entry.rating.toFixed(1),
      },
    );
  }

  if (entry.module === "shopping") {
    fields.push(
      { label: "平台", value: entry.platform || "未填写" },
      {
        label: "价格",
        value: entry.price === null ? "未填写" : formatPrice(entry.price),
      },
    );
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "域名", value: entry.domain },
      { label: "可访问", value: entry.access },
    );
  }

  if (entry.module === "inbox") {
    fields.push(
      { label: "内容类型", value: entry.rawContentType || "未标记" },
      {
        label: "建议去向",
        value: entry.suggestedTargetModule || "继续留在待处理",
      },
    );
  }

  return fields;
}

function getExtensionInfo(entry: KnowledgeEntry): DetailField[] {
  const definition = moduleDefinitions[entry.module];
  const fields: DetailField[] = [
    { label: "所属模块", value: definition.label },
    { label: "记录 ID", value: entry.id },
    { label: "标签摘要", value: getTagSummary(entry) },
  ];

  if (entry.module === "offline") {
    fields.push({
      label: "推荐强度",
      value:
        entry.rating === null ? "未评分" : entry.rating >= 4.7 ? "高" : "中",
    });
  }

  if (entry.module === "shopping") {
    fields.push({ label: "价格带", value: getPriceBand(entry.price) });
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "网站内容", value: entry.content || "未填写" },
      { label: "用途", value: entry.purpose || "未填写" },
    );
  }

  if (entry.module === "inbox") {
    fields.push(
      { label: "AI 摘要", value: entry.aiSummary || "尚未生成" },
      { label: "AI 建议", value: entry.aiSuggestions || "尚未生成" },
      {
        label: "建议分类",
        value: entry.suggestedCategory || "未建议",
      },
      {
        label: "置信度",
        value:
          entry.confidence === null ? "未提供" : `${Math.round(entry.confidence * 100)}%`,
      },
    );
  }

  return fields;
}

function getSourceAndTime(entry: KnowledgeEntry, hasMarkdown: boolean): DetailField[] {
  return [
    { label: "来源", value: entry.source || "未填写" },
    { label: "新增时间", value: formatDate(entry.createdAt) },
    { label: "更新时间", value: formatDate(entry.updatedAt) },
    {
      label: "正文来源",
      value: hasMarkdown ? "Markdown 文档" : "JSON 备注",
    },
  ];
}

export function resolveEntryDetail(
  entry: KnowledgeEntry,
  markdownOverride?: string | null,
) {
  const markdown = markdownOverride ?? getBundledMarkdownContent(entry);
  const hasMarkdown = markdown.length > 0;
  const definition = moduleDefinitions[entry.module];
  const body =
    entry.module === "inbox"
      ? entry.rawContent || markdown || entry.note || "暂无原始内容。"
      : hasMarkdown
        ? markdown
        : entry.note || "暂无详细说明。";

  return {
    moduleLabel: definition.label,
    description: definition.description,
    body,
    hasMarkdown,
    prefersPlainBody: entry.module === "inbox" && !hasMarkdown,
    basicInfo: getBasicInfo(entry),
    sourceAndTime: getSourceAndTime(entry, hasMarkdown),
    extensionInfo: getExtensionInfo(entry),
  };
}

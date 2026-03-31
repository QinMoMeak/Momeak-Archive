import { moduleDefinitions } from "@/data/knowledge";
import { formatDate, formatPrice } from "@/lib/knowledge";
import type { DetailField, KnowledgeEntry } from "@/types/knowledge";

const markdownModules = import.meta.glob("../../content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function getMarkdownPath(entry: KnowledgeEntry) {
  return `../../content/${entry.module}/${entry.id}.md`;
}

function getMarkdownContent(entry: KnowledgeEntry) {
  return markdownModules[getMarkdownPath(entry)]?.trim() ?? "";
}

function getPriceBand(price: number | null) {
  if (price === null) {
    return "\u672a\u586b\u5199";
  }

  if (price < 50) {
    return "\u4f4e\u4ef7";
  }

  if (price < 100) {
    return "\u4e2d\u4ef7";
  }

  return "\u9ad8\u4ef7";
}

function getTagSummary(entry: KnowledgeEntry) {
  if (entry.tags.length === 0) {
    return "\u6682\u65e0\u6807\u7b7e";
  }

  return entry.tags.slice(0, 2).join(" / ");
}

function getBasicInfo(entry: KnowledgeEntry): DetailField[] {
  const fields: DetailField[] = [
    { label: "\u5206\u7c7b", value: entry.category },
    { label: "\u72b6\u6001", value: entry.status },
  ];

  if (entry.module === "offline") {
    fields.push(
      { label: "\u5730\u70b9", value: entry.location },
      {
        label: "\u8bc4\u5206",
        value: entry.rating === null ? "\u672a\u8bc4\u5206" : entry.rating.toFixed(1),
      },
    );
  }

  if (entry.module === "shopping") {
    fields.push(
      { label: "\u5e73\u53f0", value: entry.platform },
      {
        label: "\u4ef7\u683c",
        value: entry.price === null ? "\u672a\u586b\u5199" : formatPrice(entry.price),
      },
    );
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "\u57df\u540d", value: entry.domain },
      { label: "\u53ef\u8bbf\u95ee", value: entry.access },
    );
  }

  return fields;
}

function getExtensionInfo(entry: KnowledgeEntry): DetailField[] {
  const definition = moduleDefinitions[entry.module];
  const fields: DetailField[] = [
    { label: "\u6240\u5c5e\u6a21\u5757", value: definition.label },
    { label: "\u8bb0\u5f55 ID", value: entry.id },
    { label: "\u6807\u7b7e\u6458\u8981", value: getTagSummary(entry) },
  ];

  if (entry.module === "offline") {
    fields.push({
      label: "\u63a8\u8350\u5f3a\u5ea6",
      value:
        entry.rating === null
          ? "\u672a\u8bc4\u5206"
          : entry.rating >= 4.7
            ? "\u9ad8"
            : "\u4e2d",
    });
  }

  if (entry.module === "shopping") {
    fields.push({ label: "\u4ef7\u683c\u5e26", value: getPriceBand(entry.price) });
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "\u7f51\u7ad9\u5185\u5bb9", value: entry.content || "\u672a\u586b\u5199" },
      { label: "\u7528\u9014", value: entry.purpose || "\u672a\u586b\u5199" },
    );
  }

  return fields;
}

function getSourceAndTime(entry: KnowledgeEntry, hasMarkdown: boolean): DetailField[] {
  return [
    { label: "\u6765\u6e90", value: entry.source || "\u672a\u586b\u5199" },
    { label: "\u65b0\u589e\u65f6\u95f4", value: formatDate(entry.createdAt) },
    { label: "\u66f4\u65b0\u65f6\u95f4", value: formatDate(entry.updatedAt) },
    {
      label: "\u6b63\u6587\u6765\u6e90",
      value: hasMarkdown ? "Markdown \u6587\u6863" : "JSON \u5907\u6ce8",
    },
  ];
}

export function resolveEntryDetail(entry: KnowledgeEntry) {
  const markdown = getMarkdownContent(entry);
  const hasMarkdown = markdown.length > 0;
  const definition = moduleDefinitions[entry.module];

  return {
    moduleLabel: definition.label,
    description: definition.description,
    body: hasMarkdown ? markdown : entry.note || "\u6682\u65e0\u8be6\u7ec6\u8bf4\u660e\u3002",
    hasMarkdown,
    basicInfo: getBasicInfo(entry),
    sourceAndTime: getSourceAndTime(entry, hasMarkdown),
    extensionInfo: getExtensionInfo(entry),
  };
}

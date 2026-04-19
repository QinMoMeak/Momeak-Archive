import { moduleDefinitions } from "@/data/knowledge";
import { formatDate, formatPrice } from "@/lib/knowledge";
import type {
  DetailField,
  KnowledgeEntry,
  OfflineEntry,
  ShoppingEntry,
  SongEntry,
} from "@/types/knowledge";

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

  return entry.tags.slice(0, 3).join(" / ");
}

function getOfflineSourceLabel(entry: OfflineEntry) {
  switch (entry.locationSource) {
    case "browser_geolocation":
      return "\u6d4f\u89c8\u5668\u5b9a\u4f4d";
    case "ip_fallback":
      return "IP \u7c97\u5b9a\u4f4d";
    case "geocode":
      return "\u5730\u5740\u89e3\u6790";
    case "manual":
      return "\u624b\u52a8\u5f55\u5165";
    default:
      return "\u672a\u6807\u8bb0";
  }
}

function getOfflineAccuracyLabel(entry: OfflineEntry) {
  return entry.locationAccuracy === "approximate" ? "\u8fd1\u4f3c\u4f4d\u7f6e" : "\u7cbe\u786e\u4f4d\u7f6e";
}

function getCoordinateLabel(entry: OfflineEntry) {
  if (typeof entry.lng !== "number" || typeof entry.lat !== "number") {
    return entry.locationAccuracy === "approximate"
      ? "IP \u7c97\u5b9a\u4f4d\u672a\u4fdd\u5b58\u7cbe\u786e\u5750\u6807"
      : "\u672a\u8bb0\u5f55\u5750\u6807";
  }

  return `${entry.lng.toFixed(6)}, ${entry.lat.toFixed(6)}`;
}

function buildSongBody(entry: SongEntry) {
  const sections: string[] = [];
  const metaLines = [
    entry.artist ? `- \u6b4c\u624b\uff1a${entry.artist}` : "",
    entry.album ? `- \u4e13\u8f91\uff1a${entry.album}` : "",
    entry.category ? `- \u5206\u7c7b\uff1a${entry.category}` : "",
    entry.status ? `- \u72b6\u6001\uff1a${entry.status}` : "",
    entry.language ? `- \u8bed\u8a00\uff1a${entry.language}` : "",
    entry.mood ? `- \u60c5\u7eea / \u573a\u666f\uff1a${entry.mood}` : "",
    entry.source ? `- \u6765\u6e90\uff1a${entry.source}` : "",
  ].filter(Boolean);

  sections.push(`# ${entry.name}`);

  if (metaLines.length > 0) {
    sections.push("", "## \u6b4c\u66f2\u4fe1\u606f", "", ...metaLines);
  }

  if (entry.note) {
    sections.push("", "## \u6536\u85cf\u5907\u6ce8", "", entry.note);
  }

  if (entry.lyricsSnippet) {
    sections.push("", "## \u6b4c\u8bcd\u7247\u6bb5", "", `> ${entry.lyricsSnippet.replace(/\\n/g, "\\n> ")}`);
  }

  return sections.join("\\n").trim();
}

function getBasicInfo(entry: KnowledgeEntry): DetailField[] {
  const fields: DetailField[] = [
    { label: "\u5206\u7c7b", value: entry.category },
    { label: "\u72b6\u6001", value: entry.status },
  ];

  if (entry.module === "offline") {
    fields.push(
      { label: "\u5730\u70b9\u6587\u672c", value: entry.locationText || entry.location || "\u672a\u586b\u5199" },
      { label: "\u8be6\u7ec6\u5730\u5740", value: entry.formattedAddress || entry.location || "\u672a\u586b\u5199" },
      { label: "\u8bc4\u5206", value: entry.rating === null ? "\u672a\u8bc4\u5206" : entry.rating.toFixed(1) },
      { label: "\u5b9a\u4f4d\u7cbe\u5ea6", value: getOfflineAccuracyLabel(entry) },
    );
  }

  if (entry.module === "shopping") {
    const shoppingEntry = entry as ShoppingEntry;
    fields.push(
      { label: "\u5e73\u53f0", value: shoppingEntry.platform || "\u672a\u586b\u5199" },
      {
        label: "\u4ef7\u683c",
        value: shoppingEntry.price === null ? "\u672a\u586b\u5199" : formatPrice(shoppingEntry.price),
      },
      { label: "\u6570\u91cf", value: shoppingEntry.quantity || "\u672a\u586b\u5199" },
      { label: "\u89c4\u683c / \u578b\u53f7", value: shoppingEntry.specification || "\u672a\u586b\u5199" },
    );
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "\u57df\u540d", value: entry.domain },
      { label: "\u53ef\u8bbf\u95ee", value: entry.access },
    );
  }

  if (entry.module === "inbox") {
    fields.push(
      { label: "\u5185\u5bb9\u7c7b\u578b", value: entry.rawContentType || "\u672a\u6807\u8bb0" },
      { label: "\u5efa\u8bae\u53bb\u5411", value: entry.suggestedTargetModule || "\u7ee7\u7eed\u7559\u5728\u5f85\u5904\u7406" },
    );
  }

  if (entry.module === "songs") {
    fields.push(
      { label: "\u6b4c\u624b / \u6f14\u5531\u8005", value: entry.artist || "\u672a\u586b\u5199" },
      { label: "\u4e13\u8f91", value: entry.album || "\u672a\u586b\u5199" },
      { label: "\u8bed\u8a00", value: entry.language || "\u672a\u586b\u5199" },
      { label: "\u60c5\u7eea / \u573a\u666f", value: entry.mood || "\u672a\u586b\u5199" },
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
    fields.push(
      { label: "\u5b9a\u4f4d\u6765\u6e90", value: getOfflineSourceLabel(entry) },
      { label: "\u5750\u6807", value: getCoordinateLabel(entry) },
      {
        label: "\u7701\u5e02\u533a",
        value:
          [entry.province, entry.city, entry.district].filter(Boolean).join(" / ") || "\u672a\u586b\u5199",
      },
      { label: "adcode", value: entry.adcode || "\u672a\u586b\u5199" },
    );

    if (entry.locationRectangle) {
      fields.push({ label: "IP \u8fd1\u4f3c\u8303\u56f4", value: entry.locationRectangle });
    }

    fields.push({
      label: "\u63a8\u8350\u5f3a\u5ea6",
      value: entry.rating === null ? "\u672a\u8bc4\u5206" : entry.rating >= 4.7 ? "\u9ad8" : "\u4e2d",
    });
  }

  if (entry.module === "shopping") {
    const shoppingEntry = entry as ShoppingEntry;
    fields.push(
      { label: "\u4ef7\u683c\u5e26", value: getPriceBand(shoppingEntry.price) },
      { label: "\u5e97\u94fa / \u6765\u6e90\u5e97", value: shoppingEntry.storeName || "\u672a\u586b\u5199" },
      { label: "\u4f18\u60e0\u4fe1\u606f", value: shoppingEntry.discountInfo || "\u672a\u586b\u5199" },
    );
  }

  if (entry.module === "websites") {
    fields.push(
      { label: "\u7f51\u7ad9\u5185\u5bb9", value: entry.content || "\u672a\u586b\u5199" },
      { label: "\u7528\u9014", value: entry.purpose || "\u672a\u586b\u5199" },
    );
  }

  if (entry.module === "inbox") {
    fields.push(
      { label: "AI \u6458\u8981", value: entry.aiSummary || "\u5c1a\u672a\u751f\u6210" },
      { label: "AI \u5efa\u8bae", value: entry.aiSuggestions || "\u5c1a\u672a\u751f\u6210" },
      { label: "\u5efa\u8bae\u5206\u7c7b", value: entry.suggestedCategory || "\u672a\u5efa\u8bae" },
      {
        label: "\u7f6e\u4fe1\u5ea6",
        value: entry.confidence === null ? "\u672a\u63d0\u4f9b" : `${Math.round(entry.confidence * 100)}%`,
      },
    );
  }

  if (entry.module === "songs") {
    fields.push(
      { label: "\u6765\u6e90", value: entry.source || "\u672a\u586b\u5199" },
      {
        label: "\u6b4c\u8bcd\u7247\u6bb5",
        value: entry.lyricsSnippet
          ? entry.lyricsSnippet.replace(/\s+/g, " ").trim()
          : "\u672a\u586b\u5199",
      },
    );
  }

  return fields;
}

function getSourceAndTime(entry: KnowledgeEntry, hasMarkdown: boolean): DetailField[] {
  return [
    { label: "\u6765\u6e90", value: entry.source || "\u672a\u586b\u5199" },
    { label: "\u65b0\u589e\u65f6\u95f4", value: formatDate(entry.createdAt) },
    { label: "\u66f4\u65b0\u65f6\u95f4", value: formatDate(entry.updatedAt) },
    { label: "\u6b63\u6587\u6765\u6e90", value: hasMarkdown ? "Markdown \u6b63\u6587" : "JSON \u5907\u6ce8" },
  ];
}

export function resolveEntryDetail(entry: KnowledgeEntry, markdownOverride?: string | null) {
  const markdown = markdownOverride ?? getBundledMarkdownContent(entry);
  const hasMarkdown = markdown.length > 0;
  const definition = moduleDefinitions[entry.module];
  const body =
    entry.module === "inbox"
      ? entry.rawContent || markdown || entry.note || "\u6682\u65e0\u539f\u59cb\u5185\u5bb9\u3002"
      : entry.module === "songs"
        ? hasMarkdown
          ? markdown
          : buildSongBody(entry) || "\u6682\u65e0\u8be6\u7ec6\u8bf4\u660e\u3002"
        : hasMarkdown
          ? markdown
          : entry.note || "\u6682\u65e0\u8be6\u7ec6\u8bf4\u660e\u3002";

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

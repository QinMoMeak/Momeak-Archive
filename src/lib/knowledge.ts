import type { AiSuggestionEntry } from "@/types/ai";
import { moduleDefinitions } from "@/data/knowledge";
import type {
  KnowledgeEntry,
  ModuleId,
  QuickAddDraft,
  SortOption,
  SortOptionId,
} from "@/types/knowledge";

export function normalizeTag(tag: string) {
  return tag.trim().toLocaleLowerCase();
}

export function dedupeTags(tags: string[]) {
  const seen = new Set<string>();

  return tags.reduce<string[]>((result, tag) => {
    const cleanTag = tag.trim();

    if (!cleanTag) {
      return result;
    }

    const normalized = normalizeTag(cleanTag);

    if (seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
    result.push(cleanTag);
    return result;
  }, []);
}

export function parseTagsInput(input: string) {
  return dedupeTags(input.split(/[,\uFF0C]/));
}

export function getUniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

function getExcerpt(value: string, maxLength = 80) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function getPrimaryMeta(entry: KnowledgeEntry) {
  switch (entry.module) {
    case "offline":
      return (
        entry.formattedAddress ||
        entry.locationText ||
        entry.location ||
        entry.city ||
        entry.province
      );
    case "shopping":
      return entry.platform || "未填写";
    case "websites":
      return entry.domain;
    case "inbox":
      return getExcerpt(entry.rawContent) || "暂无原始内容";
  }
}

export function getSecondaryMeta(entry: KnowledgeEntry) {
  switch (entry.module) {
    case "offline":
      return entry.rating === null ? "未评分" : entry.rating.toFixed(1);
    case "shopping":
      return entry.price === null ? "未填写" : formatPrice(entry.price);
    case "websites":
      return entry.access;
    case "inbox":
      return entry.aiSummary || entry.rawContentType || "待分析";
  }
}

export function formatPrice(price: number) {
  return `¥${price}`;
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getSortOptions(
  moduleId: ModuleId,
  t?: (key: string, params?: Record<string, string | number>) => string,
): SortOption[] {
  const translate = (key: string, fallback: string) => t?.(key) ?? fallback;

  const baseOptions: SortOption[] = [
    { value: "created-desc", label: translate("sort.createdDesc", "最近新增") },
    { value: "updated-desc", label: translate("sort.updatedDesc", "最近更新") },
  ];

  if (moduleId === "offline") {
    return [
      ...baseOptions,
      { value: "rating-desc", label: translate("sort.ratingDesc", "评分从高到低") },
      { value: "rating-asc", label: translate("sort.ratingAsc", "评分从低到高") },
    ];
  }

  if (moduleId === "shopping") {
    return [
      ...baseOptions,
      { value: "price-desc", label: translate("sort.priceDesc", "价格从高到低") },
      { value: "price-asc", label: translate("sort.priceAsc", "价格从低到高") },
    ];
  }

  return baseOptions;
}

function compareDate(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
}

function getNumericValue(entry: KnowledgeEntry, field: "rating" | "price") {
  if (field === "rating" && "rating" in entry && entry.rating !== null) {
    return entry.rating;
  }

  if (field === "price" && "price" in entry && entry.price !== null) {
    return entry.price;
  }

  return Number.NEGATIVE_INFINITY;
}

export function sortEntries(entries: KnowledgeEntry[], sortBy: SortOptionId) {
  const sorted = [...entries];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case "created-desc":
        return compareDate(left.createdAt, right.createdAt);
      case "updated-desc":
        return compareDate(left.updatedAt, right.updatedAt);
      case "rating-desc":
        return getNumericValue(right, "rating") - getNumericValue(left, "rating");
      case "rating-asc":
        return getNumericValue(left, "rating") - getNumericValue(right, "rating");
      case "price-desc":
        return getNumericValue(right, "price") - getNumericValue(left, "price");
      case "price-asc":
        return getNumericValue(left, "price") - getNumericValue(right, "price");
      default:
        return 0;
    }
  });

  return sorted;
}

export function matchesSearch(entry: KnowledgeEntry, search: string) {
  const query = search.trim().toLocaleLowerCase();

  if (!query) {
    return true;
  }

  const haystack = [
    entry.name,
    entry.category,
    entry.status,
    entry.note,
    entry.source,
    ...entry.tags,
    getPrimaryMeta(entry),
    getSecondaryMeta(entry),
    "content" in entry ? entry.content : "",
    "purpose" in entry ? entry.purpose : "",
    "rawContent" in entry ? entry.rawContent : "",
    "aiSummary" in entry ? entry.aiSummary : "",
    "aiSuggestions" in entry ? entry.aiSuggestions : "",
    "suggestedTargetModule" in entry ? entry.suggestedTargetModule : "",
    "suggestedCategory" in entry ? entry.suggestedCategory : "",
    "formattedAddress" in entry ? (entry.formattedAddress ?? "") : "",
    "locationText" in entry ? (entry.locationText ?? "") : "",
    "province" in entry ? (entry.province ?? "") : "",
    "city" in entry ? (entry.city ?? "") : "",
    "district" in entry ? (entry.district ?? "") : "",
  ]
    .join(" ")
    .toLocaleLowerCase();

  return haystack.includes(query);
}

export function entryMatchesTags(entry: KnowledgeEntry, selectedTags: string[]) {
  if (selectedTags.length === 0) {
    return true;
  }

  const normalizedTags = entry.tags.map((tag) => normalizeTag(tag));
  return selectedTags.every((tag) => normalizedTags.includes(normalizeTag(tag)));
}

export function toggleTag(tags: string[], target: string) {
  const normalizedTarget = normalizeTag(target);

  return tags.some((tag) => normalizeTag(tag) === normalizedTarget)
    ? tags.filter((tag) => normalizeTag(tag) !== normalizedTarget)
    : [...tags, target];
}

export function createDraftFromEntry(
  entry: KnowledgeEntry,
  markdownContent = "",
): QuickAddDraft {
  return {
    name: entry.name,
    category: entry.category,
    status: entry.status,
    tags: entry.tags.join(", "),
    note: entry.note,
    markdownContent,
    source: entry.source,
    location: entry.module === "offline" ? entry.location : "",
    locationText: entry.module === "offline" ? entry.locationText ?? entry.location : "",
    formattedAddress: entry.module === "offline" ? entry.formattedAddress ?? "" : "",
    province: entry.module === "offline" ? entry.province ?? "" : "",
    city: entry.module === "offline" ? entry.city ?? "" : "",
    district: entry.module === "offline" ? entry.district ?? "" : "",
    adcode: entry.module === "offline" ? entry.adcode ?? "" : "",
    lng:
      entry.module === "offline" && typeof entry.lng === "number" ? String(entry.lng) : "",
    lat:
      entry.module === "offline" && typeof entry.lat === "number" ? String(entry.lat) : "",
    locationSource: entry.module === "offline" ? entry.locationSource ?? "" : "",
    locationAccuracy: entry.module === "offline" ? entry.locationAccuracy ?? "" : "",
    locationRectangle: entry.module === "offline" ? entry.locationRectangle ?? "" : "",
    rating: entry.module === "offline" && entry.rating !== null ? String(entry.rating) : "",
    platform: entry.module === "shopping" ? entry.platform : "",
    price: entry.module === "shopping" && entry.price !== null ? String(entry.price) : "",
    domain: entry.module === "websites" ? entry.domain : "",
    access: entry.module === "websites" ? entry.access : "可访问",
    content: entry.module === "websites" ? entry.content : "",
    purpose: entry.module === "websites" ? entry.purpose : "",
    rawContent: entry.module === "inbox" ? entry.rawContent : "",
    rawContentType: entry.module === "inbox" ? entry.rawContentType : "",
    aiSummary: entry.module === "inbox" ? entry.aiSummary : "",
    aiSuggestions: entry.module === "inbox" ? entry.aiSuggestions : "",
    suggestedTargetModule: entry.module === "inbox" ? entry.suggestedTargetModule : "",
    suggestedCategory: entry.module === "inbox" ? entry.suggestedCategory : "",
    confidence:
      entry.module === "inbox" && entry.confidence !== null ? String(entry.confidence) : "",
  };
}

export function getEmptyDraft(moduleId: ModuleId): QuickAddDraft {
  const definition = moduleDefinitions[moduleId];

  return {
    name: "",
    category: definition.defaultCategories[0] ?? "",
    status: definition.defaultStatuses[0] ?? "",
    tags: "",
    note: "",
    markdownContent: "",
    source: "",
    location: "",
    locationText: "",
    formattedAddress: "",
    province: "",
    city: "",
    district: "",
    adcode: "",
    lng: "",
    lat: "",
    locationSource: "",
    locationAccuracy: "",
    locationRectangle: "",
    rating: "",
    platform: "",
    price: "",
    domain: "",
    access: "可访问",
    content: "",
    purpose: "",
    rawContent: "",
    rawContentType: moduleId === "inbox" ? "text" : "",
    aiSummary: "",
    aiSuggestions: "",
    suggestedTargetModule: "",
    suggestedCategory: "",
    confidence: "",
  };
}

function hasDraftValue(value: string) {
  return value.trim().length > 0;
}

export function mergeDraftWithAiResult(
  current: QuickAddDraft,
  result: AiSuggestionEntry,
): QuickAddDraft {
  const nextDraft: QuickAddDraft = { ...current };
  const nextTags = result.draft.tags
    ? getUniqueValues([...parseTagsInput(current.tags), ...parseTagsInput(result.draft.tags)])
    : parseTagsInput(current.tags);

  for (const [key, rawValue] of Object.entries(result.draft) as Array<
    [keyof QuickAddDraft, string]
  >) {
    if (key === "tags") {
      continue;
    }

    if (hasDraftValue(rawValue)) {
      nextDraft[key] = rawValue;
    }
  }

  nextDraft.tags = nextTags.join(", ");

  if (!nextDraft.locationText && nextDraft.location) {
    nextDraft.locationText = nextDraft.location;
  }

  return nextDraft;
}

export function createDraftFromAiCandidate(
  moduleId: ModuleId,
  result: AiSuggestionEntry,
): QuickAddDraft {
  return mergeDraftWithAiResult(getEmptyDraft(moduleId), result);
}

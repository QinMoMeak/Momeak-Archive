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

export function getPrimaryMeta(entry: KnowledgeEntry) {
  switch (entry.module) {
    case "offline":
      return entry.location;
    case "shopping":
      return entry.platform;
    case "websites":
      return entry.domain;
  }
}

export function getSecondaryMeta(entry: KnowledgeEntry) {
  switch (entry.module) {
    case "offline":
      return entry.rating === null ? "\u672a\u8bc4\u5206" : entry.rating.toFixed(1);
    case "shopping":
      return entry.price === null ? "\u672a\u586b\u5199" : formatPrice(entry.price);
    case "websites":
      return entry.access;
  }
}

export function formatPrice(price: number) {
  return `\u00A5${price}`;
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

export function getSortOptions(moduleId: ModuleId): SortOption[] {
  const baseOptions: SortOption[] = [
    { value: "created-desc", label: "\u6700\u8fd1\u65b0\u589e" },
    { value: "updated-desc", label: "\u6700\u8fd1\u66f4\u65b0" },
  ];

  if (moduleId === "offline") {
    return [
      ...baseOptions,
      { value: "rating-desc", label: "\u8bc4\u5206\u4ece\u9ad8\u5230\u4f4e" },
      { value: "rating-asc", label: "\u8bc4\u5206\u4ece\u4f4e\u5230\u9ad8" },
    ];
  }

  if (moduleId === "shopping") {
    return [
      ...baseOptions,
      { value: "price-desc", label: "\u4ef7\u683c\u4ece\u9ad8\u5230\u4f4e" },
      { value: "price-asc", label: "\u4ef7\u683c\u4ece\u4f4e\u5230\u9ad8" },
    ];
  }

  return baseOptions;
}

function compareDate(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
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

function getNumericValue(entry: KnowledgeEntry, field: "rating" | "price") {
  if (field === "rating" && "rating" in entry && entry.rating !== null) {
    return entry.rating;
  }

  if (field === "price" && "price" in entry && entry.price !== null) {
    return entry.price;
  }

  return Number.NEGATIVE_INFINITY;
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

export function getNowDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function createEntryFromDraft(
  moduleId: ModuleId,
  draft: QuickAddDraft,
): KnowledgeEntry {
  const date = getNowDateString();
  const baseEntry = {
    id: `${moduleId}-${Date.now()}`,
    module: moduleId,
    name: draft.name.trim(),
    category: draft.category.trim(),
    status: draft.status.trim(),
    tags: parseTagsInput(draft.tags),
    note: draft.note.trim(),
    source: draft.source.trim() || "\u5feb\u901f\u65b0\u589e",
    createdAt: date,
    updatedAt: date,
  };

  switch (moduleId) {
    case "offline":
      return {
        ...baseEntry,
        module: "offline",
        location: draft.location.trim(),
        rating: draft.rating.trim() ? Number(draft.rating) : null,
      };
    case "shopping":
      return {
        ...baseEntry,
        module: "shopping",
        platform: draft.platform.trim(),
        price: draft.price.trim() ? Number(draft.price) : null,
      };
    case "websites":
      return {
        ...baseEntry,
        module: "websites",
        domain: draft.domain.trim(),
        access: draft.access.trim(),
        content: draft.content.trim(),
        purpose: draft.purpose.trim(),
      };
  }
}

export function getEmptyDraft(moduleId: ModuleId): QuickAddDraft {
  const definition = moduleDefinitions[moduleId];

  return {
    name: "",
    category: definition.defaultCategories[0] ?? "",
    status: definition.defaultStatuses[0] ?? "",
    tags: "",
    note: "",
    source: "",
    location: "",
    rating: "",
    platform: "",
    price: "",
    domain: "",
    access: "\u53ef\u8bbf\u95ee",
    content: "",
    purpose: "",
  };
}

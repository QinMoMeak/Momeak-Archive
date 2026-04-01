export type ModuleId = "offline" | "shopping" | "websites";

export type ModuleIconKey = "store" | "shoppingBag" | "globe";

export type SortOptionId =
  | "created-desc"
  | "updated-desc"
  | "rating-desc"
  | "rating-asc"
  | "price-desc"
  | "price-asc";

export type DetailField = {
  label: string;
  value: string;
};

export type EntryBase = {
  id: string;
  module: ModuleId;
  name: string;
  category: string;
  status: string;
  tags: string[];
  note: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type OfflineEntry = EntryBase & {
  module: "offline";
  location: string;
  rating: number | null;
};

export type ShoppingEntry = EntryBase & {
  module: "shopping";
  platform: string;
  price: number | null;
};

export type WebsiteEntry = EntryBase & {
  module: "websites";
  domain: string;
  access: string;
  content: string;
  purpose: string;
};

export type KnowledgeEntry = OfflineEntry | ShoppingEntry | WebsiteEntry;

export type KnowledgeData = {
  offline: OfflineEntry[];
  shopping: ShoppingEntry[];
  websites: WebsiteEntry[];
};

export type KnowledgeMeta = {
  categories: Record<ModuleId, string[]>;
};

export type ModuleDefinition = {
  id: ModuleId;
  label: string;
  description: string;
  summary: string;
  iconKey: ModuleIconKey;
  tableHeaders: [string, string, string, string, string, string];
  primaryFieldLabel: string;
  secondaryFieldLabel: string;
  defaultCategories: string[];
  defaultStatuses: string[];
};

export type SortOption = {
  value: SortOptionId;
  label: string;
};

export type QuickAddDraft = {
  name: string;
  category: string;
  status: string;
  tags: string;
  note: string;
  markdownContent: string;
  source: string;
  location: string;
  rating: string;
  platform: string;
  price: string;
  domain: string;
  access: string;
  content: string;
  purpose: string;
};

export type CreateKnowledgeEntryPayload = {
  moduleId: ModuleId;
  draft: QuickAddDraft;
};

export type SaveKnowledgeEntryResponse = {
  entry: KnowledgeEntry;
  data: KnowledgeData;
  markdownPath: string | null;
};

export type LoadKnowledgeDataResponse = {
  data: KnowledgeData;
};

export type LoadKnowledgeMetaResponse = {
  meta: KnowledgeMeta;
};

export type UpdateKnowledgeEntryPayload = {
  moduleId: ModuleId;
  entryId: string;
  draft: QuickAddDraft;
};

export type DeleteKnowledgeEntryResponse = {
  data: KnowledgeData;
  deletedEntryId: string;
};

export type AuthSessionResponse = {
  isAdmin: boolean;
  isPasswordConfigured: boolean;
};

export type CreateCategoryPayload = {
  moduleId: ModuleId;
  name: string;
};

export type RenameCategoryPayload = {
  moduleId: ModuleId;
  oldName: string;
  newName: string;
};

export type DeleteCategoryPayload = {
  moduleId: ModuleId;
  name: string;
  replacementName?: string;
};

export type CategoryMutationResponse = {
  data: KnowledgeData;
  meta: KnowledgeMeta;
};

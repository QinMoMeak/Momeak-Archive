import type { ModuleId, QuickAddDraft } from "@/types/knowledge";

export type AiParseMode = "single" | "multiple";

export type AiSuggestionEntry = {
  moduleId: ModuleId;
  draft: QuickAddDraft;
  filledFields: Array<keyof QuickAddDraft>;
  missingFields: string[];
  warnings: string[];
  suggestedCategory: string;
  categoryReason: string;
  categoryConfidence: number | null;
  category: string;
  unmatchedCategory: string;
  needsCategoryConfirmation: boolean;
  availableCategories: string[];
  suggestedStatus: string;
  statusReason: string;
  statusConfidence: number | null;
  status: string;
  unmatchedStatus: string;
  needsStatusConfirmation: boolean;
  availableStatuses: string[];
  detectedContentType?: string;
  suggestedTargetModule?: string;
  suggestedNextAction?: string;
  confidence?: number | null;
  noteDraft?: string;
  siteContentSummary?: string;
  sitePurpose?: string;
  readerUsed?: boolean;
  readerStatusLabel?: string;
  readerUrl?: string;
  readerContentLength?: number;
};

export type AiSingleSuggestionResult = {
  mode: "single";
  moduleId: ModuleId;
  rawText: string;
  entry: AiSuggestionEntry;
};

export type AiMultipleSuggestionResult = {
  mode: "multiple";
  moduleId: ModuleId;
  rawText: string;
  entries: AiSuggestionEntry[];
  warnings: string[];
};

export type AiSuggestionResult =
  | AiSingleSuggestionResult
  | AiMultipleSuggestionResult;

export type AiParseEntryPayload = {
  moduleId: ModuleId;
  rawText: string;
  mode: AiParseMode;
};

export type AiParseEntryResponse = {
  result: AiSuggestionResult;
};

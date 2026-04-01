import type { ModuleId, QuickAddDraft } from "@/types/knowledge";

export type AiSuggestionResult = {
  moduleId: ModuleId;
  rawText: string;
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
  siteContentSummary?: string;
  sitePurpose?: string;
  readerUsed?: boolean;
  readerStatusLabel?: string;
  readerUrl?: string;
  readerContentLength?: number;
};

export type AiParseEntryPayload = {
  moduleId: ModuleId;
  rawText: string;
};

export type AiParseEntryResponse = {
  result: AiSuggestionResult;
};

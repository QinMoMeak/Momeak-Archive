import type {
  AiInputImage,
  AiParseEntryPayload,
  AiParseEntryResponse,
  AiParseMode,
  AiSuggestionResult,
} from "@/types/ai";
import type {
  AiSettingsView,
  SaveAiSettingsPayload,
} from "@/types/ai-settings";
import type {
  AuthSessionResponse,
  BatchCreateKnowledgeEntriesPayload,
  BatchCreateKnowledgeEntriesResponse,
  CategoryMutationResponse,
  CreateCategoryPayload,
  CreateKnowledgeEntryPayload,
  DeleteCategoryPayload,
  DeleteKnowledgeEntryResponse,
  LoadKnowledgeDataResponse,
  LoadKnowledgeMetaResponse,
  ModuleId,
  QuickAddDraft,
  RenameCategoryPayload,
  SaveKnowledgeEntryResponse,
  UpdateKnowledgeEntryPayload,
} from "@/types/knowledge";
import type {
  GeocodeAddressPayload,
  OfflineLocationResult,
  ReverseGeocodePayload,
} from "@/types/location";

const knowledgeApiBase = "/api/knowledge";
const authApiBase = "/api/auth";
const aiApiBase = "/api/ai";
const locationApiBase = "/api/location";

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "操作失败，请稍后重试。";
  } catch {
    return "操作失败，请稍后重试。";
  }
}

export async function fetchKnowledgeData() {
  const response = await fetch(knowledgeApiBase, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as LoadKnowledgeDataResponse;
  return payload.data;
}

export async function fetchKnowledgeMeta() {
  const response = await fetch(`${knowledgeApiBase}/meta`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as LoadKnowledgeMetaResponse;
  return payload.meta;
}

export async function createKnowledgeEntry(moduleId: ModuleId, draft: QuickAddDraft) {
  const payload: CreateKnowledgeEntryPayload = { moduleId, draft };

  const response = await fetch(knowledgeApiBase, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as SaveKnowledgeEntryResponse;
}

export async function createKnowledgeEntriesBatch(
  moduleId: ModuleId,
  drafts: QuickAddDraft[],
) {
  const payload: BatchCreateKnowledgeEntriesPayload = {
    moduleId,
    drafts,
  };

  const response = await fetch(`${knowledgeApiBase}/batch`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as BatchCreateKnowledgeEntriesResponse;
}

export async function updateKnowledgeEntry(
  moduleId: ModuleId,
  entryId: string,
  draft: QuickAddDraft,
) {
  const payload: UpdateKnowledgeEntryPayload = {
    moduleId,
    entryId,
    draft,
  };

  const response = await fetch(`${knowledgeApiBase}/${moduleId}/${entryId}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as SaveKnowledgeEntryResponse;
}

export async function deleteKnowledgeEntry(moduleId: ModuleId, entryId: string) {
  const response = await fetch(`${knowledgeApiBase}/${moduleId}/${entryId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as DeleteKnowledgeEntryResponse;
}

export async function fetchEntryMarkdown(moduleId: ModuleId, entryId: string) {
  const response = await fetch(`${knowledgeApiBase}/content/${moduleId}/${entryId}`, {
    credentials: "same-origin",
  });

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.text();
}

export async function createCategory(moduleId: ModuleId, name: string) {
  const payload: CreateCategoryPayload = { moduleId, name };

  const response = await fetch(`${knowledgeApiBase}/categories`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as CategoryMutationResponse;
}

export async function renameCategory(
  moduleId: ModuleId,
  oldName: string,
  newName: string,
) {
  const payload: RenameCategoryPayload = { moduleId, oldName, newName };

  const response = await fetch(`${knowledgeApiBase}/categories`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as CategoryMutationResponse;
}

export async function removeCategory(
  moduleId: ModuleId,
  name: string,
  replacementName = "",
) {
  const payload: DeleteCategoryPayload = {
    moduleId,
    name,
    replacementName: replacementName || undefined,
  };

  const response = await fetch(`${knowledgeApiBase}/categories/delete`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as CategoryMutationResponse;
}

export async function fetchAuthSession() {
  const response = await fetch(`${authApiBase}/session`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AuthSessionResponse;
}

export async function loginAsAdmin(password: string) {
  const response = await fetch(`${authApiBase}/login`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AuthSessionResponse;
}

export async function logoutAdmin() {
  const response = await fetch(`${authApiBase}/logout`, {
    method: "POST",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AuthSessionResponse;
}

export async function parseEntryWithAi(
  moduleId: ModuleId,
  rawText: string,
  mode: AiParseMode,
  images: AiInputImage[] = [],
) {
  const payload: AiParseEntryPayload = {
    moduleId,
    rawText,
    mode,
    images,
  };

  const response = await fetch(`${aiApiBase}/parse-entry`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payloadJson = (await response.json()) as AiParseEntryResponse;
  return payloadJson.result as AiSuggestionResult;
}

export async function fetchAiSettings() {
  const response = await fetch(`${aiApiBase}/settings`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AiSettingsView;
}

export async function saveAiSettings(payload: SaveAiSettingsPayload) {
  const response = await fetch(`${aiApiBase}/settings`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AiSettingsView;
}

export async function resetAiSettings() {
  const response = await fetch(`${aiApiBase}/settings`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as AiSettingsView;
}

export async function reverseGeocodeOfflineLocation(payload: ReverseGeocodePayload) {
  const response = await fetch(`${locationApiBase}/reverse-geocode`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { location: OfflineLocationResult };
  return data.location;
}

export async function geocodeOfflineLocation(payload: GeocodeAddressPayload) {
  const response = await fetch(`${locationApiBase}/geocode`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { location: OfflineLocationResult };
  return data.location;
}

export async function fetchOfflineIpFallbackLocation() {
  const response = await fetch(`${locationApiBase}/ip-fallback`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { location: OfflineLocationResult };
  return data.location;
}

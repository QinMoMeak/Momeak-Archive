import type { AiParseEntryResponse, AiSuggestionResult } from "@/types/ai";
import type {
  AiSettingsView,
  SaveAiSettingsPayload,
} from "@/types/ai-settings";
import type {
  AuthSessionResponse,
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

const knowledgeApiBase = "/api/knowledge";
const authApiBase = "/api/auth";
const aiApiBase = "/api/ai";

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "\u5199\u5165\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
  } catch {
    return "\u5199\u5165\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
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

export async function createKnowledgeEntry(
  moduleId: ModuleId,
  draft: QuickAddDraft,
) {
  const payload: CreateKnowledgeEntryPayload = {
    moduleId,
    draft,
  };

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
  const response = await fetch(
    `${knowledgeApiBase}/content/${moduleId}/${entryId}`,
    {
      credentials: "same-origin",
    },
  );

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.text();
}

export async function createCategory(moduleId: ModuleId, name: string) {
  const payload: CreateCategoryPayload = {
    moduleId,
    name,
  };

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
  const payload: RenameCategoryPayload = {
    moduleId,
    oldName,
    newName,
  };

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
) {
  const response = await fetch(`${aiApiBase}/parse-entry`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      moduleId,
      rawText,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as AiParseEntryResponse;
  return payload.result as AiSuggestionResult;
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

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
const aiApiBase = "/api/ai";
const locationApiBase = "/api/location";
const ADMIN_SESSION_KEY = "momeak-admin";
const ADMIN_PASSWORD = "7";

function createAuthSession(isAdmin: boolean): AuthSessionResponse {
  return {
    isAdmin,
    isPasswordConfigured: true,
  };
}

async function syncLocalAuthSession(
  action: "login" | "logout",
  password?: string,
) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    await fetch(`/api/auth/${action}`, {
      method: "POST",
      credentials: "same-origin",
      headers: password
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: password ? JSON.stringify({ password }) : undefined,
    });
  } catch {
    // Admin mode is a client-side UI state; the local API bridge is best-effort only.
  }
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "操作失败，请稍后重试。";
  } catch {
    return "操作失败，请稍后重试。";
  }
}

function getNetworkFailureMessage(featureName: string) {
  return `${featureName}服务不可达。若当前运行在 GitHub Pages，定位和写入类功能不可用；若在本地开发，请确认 npm run dev 已启动且本地 API 服务正在运行。`;
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
  const isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";

  if (isAdmin) {
    await syncLocalAuthSession("login", ADMIN_PASSWORD);
  }

  return createAuthSession(isAdmin);
}

export async function loginAsAdmin(password: string) {
  if (password !== ADMIN_PASSWORD) {
    throw new Error("\u5bc6\u7801\u4e0d\u6b63\u786e\uff0c\u65e0\u6cd5\u8fdb\u5165\u7f16\u8f91\u6a21\u5f0f\u3002");
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  await syncLocalAuthSession("login", password);
  return createAuthSession(true);
}

export async function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  await syncLocalAuthSession("logout");
  return createAuthSession(false);
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
  try {
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
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(getNetworkFailureMessage("定位"));
    }

    throw error;
  }
}

export async function geocodeOfflineLocation(payload: GeocodeAddressPayload) {
  try {
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
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(getNetworkFailureMessage("地址解析"));
    }

    throw error;
  }
}

export async function fetchOfflineIpFallbackLocation() {
  try {
    const response = await fetch(`${locationApiBase}/ip-fallback`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = (await response.json()) as { location: OfflineLocationResult };
    return data.location;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(getNetworkFailureMessage("IP 定位"));
    }

    throw error;
  }
}

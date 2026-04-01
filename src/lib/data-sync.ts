import type { ModuleId } from "@/types/knowledge";
import type {
  ApplyImportResponse,
  ImportAiPromptResponse,
  ImportInspectionResponse,
  ImportTemplateKind,
  SaveWebdavSettingsPayload,
  WebdavBackupListResponse,
  WebdavSettingsView,
  WebdavUploadResponse,
} from "@/types/data-sync";

const dataSyncApiBase = "/api/data-sync";

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "操作失败，请稍后重试。";
  } catch {
    return "操作失败，请稍后重试。";
  }
}

function parseFileName(response: Response, fallback = "knowledge-export.zip") {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}

export async function exportKnowledgeZip(modules: ModuleId[]) {
  const response = await fetch(`${dataSyncApiBase}/export`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modules }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return {
    blob: await response.blob(),
    fileName: parseFileName(response),
  };
}

export async function downloadImportTemplateZip(
  modules: ModuleId[],
  kind: ImportTemplateKind,
) {
  const response = await fetch(`${dataSyncApiBase}/templates/${kind}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modules }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return {
    blob: await response.blob(),
    fileName: parseFileName(response, `knowledge-template-${kind}.zip`),
  };
}

export async function fetchImportAiPrompt(modules: ModuleId[]) {
  const response = await fetch(`${dataSyncApiBase}/templates/prompt`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modules }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as ImportAiPromptResponse;
}

async function postZip(path: string, file: File, selectedModules: ModuleId[] = []) {
  const response = await fetch(`${dataSyncApiBase}${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/zip",
      "X-Selected-Modules": selectedModules.join(","),
      "X-File-Name": file.name,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response;
}

export async function inspectKnowledgeImportZip(
  file: File,
  selectedModules: ModuleId[] = [],
) {
  const response = await postZip("/import/inspect", file, selectedModules);
  return (await response.json()) as ImportInspectionResponse;
}

export async function applyKnowledgeImportZip(
  file: File,
  selectedModules: ModuleId[] = [],
) {
  const response = await postZip("/import/apply", file, selectedModules);
  return (await response.json()) as ApplyImportResponse;
}

export async function fetchWebdavSettings() {
  const response = await fetch(`${dataSyncApiBase}/webdav/settings`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as WebdavSettingsView;
}

export async function saveWebdavSettings(payload: SaveWebdavSettingsPayload) {
  const response = await fetch(`${dataSyncApiBase}/webdav/settings`, {
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

  return (await response.json()) as WebdavSettingsView;
}

export async function resetWebdavSettings() {
  const response = await fetch(`${dataSyncApiBase}/webdav/settings`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as WebdavSettingsView;
}

export async function fetchWebdavBackups() {
  const response = await fetch(`${dataSyncApiBase}/webdav/backups`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as WebdavBackupListResponse;
  return payload.files;
}

export async function uploadKnowledgeBackupToWebdav(modules: ModuleId[]) {
  const response = await fetch(`${dataSyncApiBase}/webdav/upload`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modules }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as WebdavUploadResponse;
}

export async function restoreKnowledgeBackupFromWebdav(
  remoteFile: string,
  modules: ModuleId[] = [],
) {
  const response = await fetch(`${dataSyncApiBase}/webdav/restore`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      remoteFile,
      modules,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as ApplyImportResponse;
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function summarizeSelectedModules(
  modules: ModuleId[],
  moduleCounts: Record<ModuleId, number>,
) {
  return modules.reduce(
    (total, moduleId) => total + (moduleCounts[moduleId] ?? 0),
    0,
  );
}

import type { KnowledgeData, KnowledgeMeta, ModuleId } from "@/types/knowledge";

export type ExportManifest = {
  schemaVersion: number;
  exportTime: string;
  exportScope: "full" | "partial";
  exportedModules: ModuleId[];
  totalEntries: number;
  moduleStats: Record<string, { entryCount: number }>;
  sourceAppVersion: string;
  isFullExport: boolean;
};

export type ImportPreview = {
  exportedModules: ModuleId[];
  selectedModules: ModuleId[];
  exportScope: "full" | "partial";
  totalEntries: number;
  moduleStats: Record<
    string,
    {
      importEntryCount: number;
      importContentFileCount: number;
      currentEntryCount: number;
      currentCategoryCount: number;
    }
  >;
  overwriteModules: ModuleId[];
  untouchedModules: string[];
};

export type ImportInspectionResponse = {
  manifest: ExportManifest;
  preview: ImportPreview;
};

export type ApplyImportResponse = {
  data: KnowledgeData;
  meta: KnowledgeMeta;
  appliedModules: ModuleId[];
  manifest: ExportManifest;
  preview: ImportPreview;
  remoteFile?: string;
};

export type RemoteBackupFile = {
  remoteFile: string;
  href: string;
  fileName: string;
  isDirectory: boolean;
  contentLength: number;
  lastModified: string;
};

export type WebdavPreset = {
  serverUrl: string;
  remotePath: string;
  providerLabel: string;
  passwordHint: string;
};

export type WebdavSettingsView = {
  preset: WebdavPreset;
  storedSettings: {
    serverUrl: string;
    username: string;
    remotePath: string;
    hasPassword: boolean;
    maskedPassword: string;
    updatedAt: string;
  } | null;
  effectiveSettings: {
    serverUrl: string;
    username: string;
    remotePath: string;
    hasPassword: boolean;
  } | null;
  storage: {
    mode: "protected-local-file";
    pathLabel: string;
  };
};

export type SaveWebdavSettingsPayload = {
  serverUrl: string;
  username: string;
  password: string;
  remotePath: string;
  keepExistingPassword: boolean;
};

export type WebdavBackupListResponse = {
  files: RemoteBackupFile[];
};

export type WebdavUploadResponse = {
  remoteFile: string;
  remoteUrl: string;
  manifest: ExportManifest;
};

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CloudUpload,
  Copy,
  Download,
  FileArchive,
  HardDriveUpload,
  RefreshCcw,
  RotateCcw,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  ImportAiPromptResponse,
  ImportInspectionResponse,
  ImportTemplateKind,
  RemoteBackupFile,
  SaveWebdavSettingsPayload,
  WebdavSettingsView,
} from "@/types/data-sync";
import type { ModuleId } from "@/types/knowledge";

type ModuleOption = {
  id: ModuleId;
  label: string;
  count: number;
};

type DataSyncDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleOptions: ModuleOption[];
  webdavSettings: WebdavSettingsView | null;
  webdavBackups: RemoteBackupFile[];
  onExport: (modules: ModuleId[]) => Promise<void>;
  onDownloadTemplate: (
    modules: ModuleId[],
    kind: ImportTemplateKind,
  ) => Promise<void>;
  onGenerateAiPrompt: (modules: ModuleId[]) => Promise<ImportAiPromptResponse>;
  onInspectImport: (
    file: File,
    selectedModules?: ModuleId[],
  ) => Promise<ImportInspectionResponse>;
  onApplyImport: (file: File, selectedModules?: ModuleId[]) => Promise<void>;
  onSaveWebdavSettings: (
    payload: SaveWebdavSettingsPayload,
  ) => Promise<void> | void;
  onResetWebdavSettings: () => Promise<void> | void;
  onRefreshBackups: () => Promise<void>;
  onUploadWebdav: (modules: ModuleId[]) => Promise<void>;
  onRestoreWebdavBackup: (remoteFile: string) => Promise<void>;
};

function SelectionList({
  moduleOptions,
  selectedModules,
  onToggle,
  onSelectAll,
  onClear,
}: {
  moduleOptions: ModuleOption[];
  selectedModules: ModuleId[];
  onToggle: (moduleId: ModuleId) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const totalEntries = selectedModules.reduce((total, moduleId) => {
    return total + (moduleOptions.find((item) => item.id === moduleId)?.count ?? 0);
  }, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">模块选择</div>
          <div className="mt-1 text-xs text-slate-500">
            已选 {selectedModules.length} 个模块，共 {totalEntries} 条记录
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            全选
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            清空
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {moduleOptions.map((module) => {
          const checked = selectedModules.includes(module.id);

          return (
            <label
              key={module.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                checked
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(module.id)}
                className="mt-1"
              />
              <div className="min-w-0">
                <div className="font-medium">{module.label}</div>
                <div className={checked ? "text-slate-300" : "text-slate-500"}>
                  {module.count} 条
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function DataSyncDialog({
  open,
  onOpenChange,
  moduleOptions,
  webdavSettings,
  webdavBackups,
  onExport,
  onDownloadTemplate,
  onGenerateAiPrompt,
  onInspectImport,
  onApplyImport,
  onSaveWebdavSettings,
  onResetWebdavSettings,
  onRefreshBackups,
  onUploadWebdav,
  onRestoreWebdavBackup,
}: DataSyncDialogProps) {
  const allModules = useMemo(
    () => moduleOptions.map((item) => item.id),
    [moduleOptions],
  );
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(allModules);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImportInspectionResponse | null>(null);
  const [promptData, setPromptData] = useState<ImportAiPromptResponse | null>(null);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<ImportTemplateKind | "">(
    "",
  );
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingWebdav, setIsSavingWebdav] = useState(false);
  const [isResettingWebdav, setIsResettingWebdav] = useState(false);
  const [isRefreshingBackups, setIsRefreshingBackups] = useState(false);
  const [isUploadingBackup, setIsUploadingBackup] = useState(false);
  const [restoringFile, setRestoringFile] = useState("");
  const [webdavForm, setWebdavForm] = useState<SaveWebdavSettingsPayload>({
    serverUrl: "",
    username: "",
    password: "",
    remotePath: "",
    keepExistingPassword: false,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedModules(allModules);
    setImportFile(null);
    setInspection(null);
    setPromptData(null);
    setCopyNotice("");
    setError("");
    setRestoringFile("");
    setWebdavForm({
      serverUrl: webdavSettings?.effectiveSettings?.serverUrl ?? "",
      username: webdavSettings?.effectiveSettings?.username ?? "",
      password: "",
      remotePath: webdavSettings?.effectiveSettings?.remotePath ?? "",
      keepExistingPassword: Boolean(webdavSettings?.storedSettings?.hasPassword),
    });
  }, [allModules, open, webdavSettings]);

  function toggleModule(moduleId: ModuleId) {
    setSelectedModules((current) =>
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId],
    );
  }

  async function handleExport() {
    if (selectedModules.length === 0) {
      setError("请先选择至少一个模块后再导出。");
      return;
    }

    try {
      setError("");
      setIsExporting(true);
      await onExport(selectedModules);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "导出失败，请稍后重试。",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadTemplate(kind: ImportTemplateKind) {
    if (selectedModules.length === 0) {
      setError("请先选择至少一个模块后再下载模板。");
      return;
    }

    try {
      setError("");
      setIsDownloadingTemplate(kind);
      await onDownloadTemplate(selectedModules, kind);
    } catch (templateError) {
      setError(
        templateError instanceof Error
          ? templateError.message
          : "模板下载失败，请稍后重试。",
      );
    } finally {
      setIsDownloadingTemplate("");
    }
  }

  async function handleGeneratePrompt() {
    if (selectedModules.length === 0) {
      setError("请先选择至少一个模块后再生成 AI 转换指引。");
      return;
    }

    try {
      setError("");
      setCopyNotice("");
      setIsPromptLoading(true);
      setPromptData(await onGenerateAiPrompt(selectedModules));
    } catch (promptError) {
      setError(
        promptError instanceof Error
          ? promptError.message
          : "生成 AI 转换指引失败。",
      );
    } finally {
      setIsPromptLoading(false);
    }
  }

  async function handleCopyPrompt() {
    if (!promptData?.prompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(promptData.prompt);
      setCopyNotice("AI Prompt 已复制。");
    } catch {
      setCopyNotice("复制失败，请手动选择文本复制。");
    }
  }

  async function handleInspectImport() {
    if (!importFile) {
      setError("请先选择一个 ZIP 文件。");
      return;
    }

    try {
      setError("");
      setIsInspecting(true);
      setInspection(await onInspectImport(importFile));
    } catch (inspectError) {
      setInspection(null);
      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "导入预校验失败。",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  async function handleApplyImport() {
    if (!importFile) {
      setError("请先选择一个 ZIP 文件。");
      return;
    }

    if (!inspection) {
      setError("请先执行 ZIP 预校验。");
      return;
    }

    const confirmed = window.confirm(
      `该操作会覆盖以下模块：${inspection.preview.overwriteModules.join("、")}。是否继续？`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setIsImporting(true);
      await onApplyImport(importFile, inspection.preview.selectedModules);
      setImportFile(null);
      setInspection(null);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "导入失败，请稍后重试。",
      );
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSaveWebdav() {
    try {
      setError("");
      setIsSavingWebdav(true);
      await onSaveWebdavSettings(webdavForm);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存 WebDAV 配置失败。",
      );
    } finally {
      setIsSavingWebdav(false);
    }
  }

  async function handleRefreshBackups() {
    try {
      setError("");
      setIsRefreshingBackups(true);
      await onRefreshBackups();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "加载远程备份失败。",
      );
    } finally {
      setIsRefreshingBackups(false);
    }
  }

  async function handleResetWebdav() {
    try {
      setError("");
      setIsResettingWebdav(true);
      await onResetWebdavSettings();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "清空 WebDAV 配置失败。",
      );
    } finally {
      setIsResettingWebdav(false);
    }
  }

  async function handleUploadBackup() {
    if (selectedModules.length === 0) {
      setError("请先选择至少一个模块后再上传。");
      return;
    }

    try {
      setError("");
      setIsUploadingBackup(true);
      await onUploadWebdav(selectedModules);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "上传 WebDAV 备份失败。",
      );
    } finally {
      setIsUploadingBackup(false);
    }
  }

  async function handleRestoreBackup(remoteFile: string) {
    const confirmed = window.confirm(
      `将从 WebDAV 下载并覆盖恢复备份：${remoteFile}。是否继续？`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setRestoringFile(remoteFile);
      await onRestoreWebdavBackup(remoteFile);
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "恢复远程备份失败。",
      );
    } finally {
      setRestoringFile("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HardDriveUpload className="h-5 w-5" />
              导入 / 导出 / 同步
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              本地导入导出和 WebDAV 同步统一使用 ZIP 快照，优先保证恢复可靠性和结构清晰。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[84dvh] space-y-6 overflow-y-auto p-6">
          <section className="space-y-4">
            <div>
              <div className="text-base font-semibold text-slate-900">本地导出</div>
              <div className="mt-1 text-sm text-slate-500">
                支持单模块、多模块或全量导出，最终统一打包为 ZIP。
              </div>
            </div>

            <SelectionList
              moduleOptions={moduleOptions}
              selectedModules={selectedModules}
              onToggle={toggleModule}
              onSelectAll={() => setSelectedModules(allModules)}
              onClear={() => setSelectedModules([])}
            />

            <div className="flex justify-end">
              <Button onClick={() => void handleExport()} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "正在导出..." : "导出 ZIP"}
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div>
              <div className="text-base font-semibold text-slate-900">导入辅助</div>
              <div className="mt-1 text-sm text-slate-500">
                先下载模板，再结合原始表格和 AI Prompt 生成符合要求的 ZIP，会比手工猜格式更稳。
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                onClick={() => void handleDownloadTemplate("empty")}
                disabled={isDownloadingTemplate === "empty"}
              >
                <FileArchive className="mr-2 h-4 w-4" />
                {isDownloadingTemplate === "empty" ? "正在生成..." : "下载空模板"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleDownloadTemplate("example")}
                disabled={isDownloadingTemplate === "example"}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloadingTemplate === "example" ? "正在生成..." : "下载示例模板"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleGeneratePrompt()}
                disabled={isPromptLoading}
              >
                <Bot className="mr-2 h-4 w-4" />
                {isPromptLoading ? "正在生成..." : "查看 AI 转换指引"}
              </Button>
            </div>

            {promptData && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      AI 导入 Prompt
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      适用于 {promptData.selectedModules.join("、")} 模块，可直接复制给外部 AI 或后续转换流程。
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleCopyPrompt()}>
                    <Copy className="mr-2 h-4 w-4" />
                    复制 Prompt
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {promptData.selectedModules.map((moduleId) => (
                    <Badge
                      key={moduleId}
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {moduleId} 分类 {promptData.categoriesByModule[moduleId]?.length ?? 0} 项
                    </Badge>
                  ))}
                </div>

                <textarea
                  readOnly
                  value={promptData.prompt}
                  className="mt-4 min-h-[280px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none"
                />

                {copyNotice && (
                  <div className="mt-3 text-xs text-emerald-600">{copyNotice}</div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div>
              <div className="text-base font-semibold text-slate-900">本地导入</div>
              <div className="mt-1 text-sm text-slate-500">
                只接受 ZIP。导入前会先检查 manifest、模块范围和将要覆盖的内容。
              </div>
            </div>

            <Input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImportFile(file);
                setInspection(null);
              }}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void handleInspectImport()}
                disabled={!importFile || isInspecting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isInspecting ? "正在校验..." : "校验 ZIP"}
              </Button>
              <Button
                onClick={() => void handleApplyImport()}
                disabled={!inspection || isImporting}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isImporting ? "正在恢复..." : "覆盖恢复"}
              </Button>
            </div>

            {inspection && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {inspection.manifest.exportScope === "full" ? "全量包" : "部分导出包"}
                  </Badge>
                  <span>包含模块：{inspection.preview.exportedModules.join("、")}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {inspection.preview.selectedModules.map((moduleId) => {
                    const item = inspection.preview.moduleStats[moduleId];

                    return (
                      <div
                        key={moduleId}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="font-medium text-slate-900">{moduleId}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          导入 {item.importEntryCount} 条，当前 {item.currentEntryCount} 条
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs leading-6 text-slate-500">
                  将覆盖模块：{inspection.preview.overwriteModules.join("、")}；不会影响：
                  {inspection.preview.untouchedModules.join("、")}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
            <div>
              <div className="text-base font-semibold text-slate-900">WebDAV 配置</div>
              <div className="mt-1 text-sm text-slate-500">
                优先兼容坚果云。请使用第三方应用密码，不要使用账号登录密码。
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">服务器地址</label>
                <Input
                  value={webdavForm.serverUrl}
                  onChange={(event) =>
                    setWebdavForm((current) => ({
                      ...current,
                      serverUrl: event.target.value,
                    }))
                  }
                  placeholder={webdavSettings?.preset.serverUrl ?? ""}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">用户名</label>
                <Input
                  value={webdavForm.username}
                  onChange={(event) =>
                    setWebdavForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">应用密码</label>
                <Input
                  type="password"
                  value={webdavForm.password}
                  onChange={(event) =>
                    setWebdavForm((current) => ({
                      ...current,
                      password: event.target.value,
                      keepExistingPassword: false,
                    }))
                  }
                  placeholder="留空则保留当前已保存密码"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">远程目录</label>
                <Input
                  value={webdavForm.remotePath}
                  onChange={(event) =>
                    setWebdavForm((current) => ({
                      ...current,
                      remotePath: event.target.value,
                    }))
                  }
                  placeholder={webdavSettings?.preset.remotePath ?? ""}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {webdavSettings?.preset.passwordHint}
              {webdavSettings?.storedSettings?.hasPassword && (
                <div className="mt-2">
                  当前已保存密码：{webdavSettings.storedSettings.maskedPassword}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => void handleResetWebdav()}
                disabled={isSavingWebdav || isResettingWebdav}
              >
                {isResettingWebdav ? "正在清空..." : "恢复为空"}
              </Button>
              <Button onClick={() => void handleSaveWebdav()} disabled={isSavingWebdav}>
                {isSavingWebdav ? "正在保存..." : "保存 WebDAV 配置"}
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">WebDAV 同步</div>
                <div className="mt-1 text-sm text-slate-500">
                  当前采用 ZIP 快照上传、列出远程备份、下载并恢复的手动同步方式。
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleRefreshBackups()}
                  disabled={isRefreshingBackups}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isRefreshingBackups ? "正在刷新..." : "刷新备份列表"}
                </Button>
                <Button onClick={() => void handleUploadBackup()} disabled={isUploadingBackup}>
                  <CloudUpload className="mr-2 h-4 w-4" />
                  {isUploadingBackup ? "正在上传..." : "上传当前 ZIP 快照"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {webdavBackups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  当前还没有检测到远程 ZIP 备份。请先上传一次快照，或刷新备份列表。
                </div>
              ) : (
                webdavBackups.map((file) => (
                  <div
                    key={file.remoteFile}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {file.remoteFile}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {file.lastModified || "未知时间"} · {file.contentLength} bytes
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void handleRestoreBackup(file.remoteFile)}
                      disabled={restoringFile === file.remoteFile}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {restoringFile === file.remoteFile ? "正在恢复..." : "下载并恢复"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

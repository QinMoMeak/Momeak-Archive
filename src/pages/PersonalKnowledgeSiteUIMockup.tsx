import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  FolderTree,
  LogOut,
  Pencil,
  Plus,
  Settings2,
  Shield,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";

import { AdminAccessDialog } from "@/components/knowledge/AdminAccessDialog";
import { CategoryManagerDialog } from "@/components/knowledge/CategoryManagerDialog";
import { FilterBar } from "@/components/knowledge/FilterBar";
import { KnowledgeDetailDrawer } from "@/components/knowledge/KnowledgeDetailDrawer";
import { QuickAddEntryDialog } from "@/components/knowledge/QuickAddEntryDialog";
import { AiSettingsDialog } from "@/components/settings/AiSettingsDialog";
import { DataSyncDialog } from "@/components/settings/DataSyncDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialKnowledgeData, moduleDefinitions, moduleList } from "@/data/knowledge";
import {
  applyKnowledgeImportZip,
  downloadImportTemplateZip,
  exportKnowledgeZip,
  fetchImportAiPrompt,
  fetchWebdavBackups,
  fetchWebdavSettings,
  resetWebdavSettings,
  restoreKnowledgeBackupFromWebdav,
  saveWebdavSettings,
  summarizeSelectedModules,
  triggerBlobDownload,
  inspectKnowledgeImportZip,
  uploadKnowledgeBackupToWebdav,
} from "@/lib/data-sync";
import {
  createCategory,
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  fetchAiSettings,
  fetchAuthSession,
  fetchEntryMarkdown,
  fetchKnowledgeData,
  fetchKnowledgeMeta,
  loginAsAdmin,
  parseEntryWithAi,
  resetAiSettings,
  removeCategory,
  renameCategory,
  logoutAdmin,
  saveAiSettings,
  updateKnowledgeEntry,
} from "@/lib/knowledge-api";
import { getAiSettingsStatusText } from "@/lib/ai-settings";
import {
  createDraftFromEntry,
  entryMatchesTags,
  formatDate,
  getPrimaryMeta,
  getSecondaryMeta,
  getSortOptions,
  getUniqueValues,
  matchesSearch,
  sortEntries,
  toggleTag,
} from "@/lib/knowledge";
import type {
  KnowledgeData,
  KnowledgeEntry,
  KnowledgeMeta,
  ModuleId,
  QuickAddDraft,
  SortOptionId,
} from "@/types/knowledge";
import type {
  AiSettingsView,
  SaveAiSettingsPayload,
} from "@/types/ai-settings";
import type {
  ImportTemplateKind,
  SaveWebdavSettingsPayload,
  WebdavSettingsView,
  RemoteBackupFile,
} from "@/types/data-sync";

const moduleIcons = {
  store: Store,
  shoppingBag: ShoppingBag,
  globe: Globe,
} as const;
const sidebarWidthStorageKey = "personal-kb-sidebar-width";
const defaultSidebarWidth = 296;
const minSidebarWidth = 240;
const maxSidebarWidth = 360;

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/88 px-4 py-4 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.65)] backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{hint}</div>
    </div>
  );
}

export default function PersonalKnowledgeSiteUIMockup() {
  const [knowledgeData, setKnowledgeData] =
    useState<KnowledgeData>(initialKnowledgeData);
  const [knowledgeMeta, setKnowledgeMeta] = useState<KnowledgeMeta>({
    categories: {
      offline: [...moduleDefinitions.offline.defaultCategories],
      shopping: [...moduleDefinitions.shopping.defaultCategories],
      websites: [...moduleDefinitions.websites.defaultCategories],
    },
  });
  const [activeModule, setActiveModule] = useState<ModuleId>("offline");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOptionId>("updated-desc");
  const [selectedItem, setSelectedItem] = useState<KnowledgeEntry | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPasswordConfigured, setIsPasswordConfigured] = useState(true);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isDataSyncOpen, setIsDataSyncOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettingsView | null>(null);
  const [webdavSettings, setWebdavSettings] = useState<WebdavSettingsView | null>(null);
  const [webdavBackups, setWebdavBackups] = useState<RemoteBackupFile[]>([]);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<{
    mode: "create" | "edit";
    moduleId: ModuleId;
    initialDraft: QuickAddDraft | null;
    entry: KnowledgeEntry | null;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);

  const currentModule = moduleDefinitions[activeModule];
  const Icon = moduleIcons[currentModule.iconKey];
  const rows = knowledgeData[activeModule];
  const moduleEntryCounts = useMemo(
    () =>
      moduleList.reduce<Record<ModuleId, number>>((result, module) => {
        result[module.id] = knowledgeData[module.id].length;
        return result;
      }, {} as Record<ModuleId, number>),
    [knowledgeData],
  );
  const editorModuleId = editorState?.moduleId ?? activeModule;
  const editorRows = knowledgeData[editorModuleId];
  const tableGridClassName =
    "grid grid-cols-[minmax(220px,1.7fr)_minmax(110px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(100px,0.8fr)_minmax(240px,1.5fr)] gap-4";

  function findEntryById(data: KnowledgeData, entryId: string) {
    for (const moduleId of moduleList.map((item) => item.id)) {
      const match = data[moduleId].find((entry) => entry.id === entryId);

      if (match) {
        return match;
      }
    }

    return null;
  }

  useEffect(() => {
    const storedWidth = window.localStorage.getItem(sidebarWidthStorageKey);

    if (!storedWidth) {
      return;
    }

    const parsedWidth = Number(storedWidth);

    if (Number.isFinite(parsedWidth)) {
      setSidebarWidth(
        Math.min(maxSidebarWidth, Math.max(minSidebarWidth, parsedWidth)),
      );
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarWidthStorageKey, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSelectedTags([]);
    setSortBy("updated-desc");
    setSelectedItem(null);
  }, [activeModule]);

  useEffect(() => {
    if (!highlightedEntryId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightedEntryId(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [highlightedEntryId]);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionNotice("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetchKnowledgeData(),
      fetchKnowledgeMeta(),
      fetchAuthSession(),
    ]).then(([dataResult, metaResult, sessionResult]) => {
        if (cancelled) {
          return;
        }

        if (dataResult.status === "fulfilled") {
          setKnowledgeData(dataResult.value);
        }

        if (metaResult.status === "fulfilled") {
          setKnowledgeMeta(metaResult.value);
        }

        if (sessionResult.status === "fulfilled") {
          setIsAdmin(sessionResult.value.isAdmin);
          setIsPasswordConfigured(sessionResult.value.isPasswordConfigured);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAiSettings(null);
      setIsAiSettingsOpen(false);
      setWebdavSettings(null);
      setWebdavBackups([]);
      setIsDataSyncOpen(false);
      return;
    }

    let cancelled = false;
    Promise.allSettled([fetchAiSettings(), fetchWebdavSettings()]).then(
      ([aiResult, webdavResult]) => {
        if (cancelled) {
          return;
        }

        if (aiResult.status === "fulfilled") {
          setAiSettings(aiResult.value);
        } else {
          setActionError(
            aiResult.reason instanceof Error
              ? aiResult.reason.message
              : "无法加载 AI 设置。",
          );
        }

        if (webdavResult.status === "fulfilled") {
          setWebdavSettings(webdavResult.value);
        } else {
          setActionError(
            webdavResult.reason instanceof Error
              ? webdavResult.reason.message
              : "无法加载 WebDAV 设置。",
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const categoryOptions = useMemo(
    () => getUniqueValues(rows.map((item) => item.category)),
    [rows],
  );

  const statusOptions = useMemo(
    () => getUniqueValues(rows.map((item) => item.status)),
    [rows],
  );

  const editorCategoryOptions = useMemo(
    () =>
      getUniqueValues([
        ...knowledgeMeta.categories[editorModuleId],
        ...editorRows.map((item) => item.category),
      ]),
    [editorModuleId, editorRows, knowledgeMeta.categories],
  );

  const editorStatusOptions = useMemo(
    () => getUniqueValues(editorRows.map((item) => item.status)),
    [editorRows],
  );

  const tagOptions = useMemo(
    () => getUniqueValues(rows.flatMap((item) => item.tags)),
    [rows],
  );

  const categoryUsageCounts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((result, entry) => {
        result[entry.category] = (result[entry.category] ?? 0) + 1;
        return result;
      }, {}),
    [rows],
  );

  const manageableCategories = useMemo(
    () =>
      getUniqueValues([
        ...knowledgeMeta.categories[activeModule],
        ...rows.map((item) => item.category),
      ]),
    [activeModule, knowledgeMeta.categories, rows],
  );

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((item) => {
      if (!matchesSearch(item, search)) {
        return false;
      }

      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!entryMatchesTags(item, selectedTags)) {
        return false;
      }

      return true;
    });

    return sortEntries(filtered, sortBy);
  }, [categoryFilter, rows, search, selectedTags, sortBy, statusFilter]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    categoryFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    selectedTags.length,
  ].reduce((total, value) => total + value, 0);

  const visibleTagPool = useMemo(
    () => getUniqueValues(filteredRows.flatMap((item) => item.tags)),
    [filteredRows],
  );

  const latestUpdated = useMemo(() => {
    if (rows.length === 0) {
      return "\u6682\u65e0";
    }

    return formatDate(sortEntries(rows, "updated-desc")[0].updatedAt);
  }, [rows]);

  function handleToggleTag(tag: string) {
    setSelectedTags((current) => toggleTag(current, tag));
  }

  function handleClearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSelectedTags([]);
    setSortBy("updated-desc");
  }

  function handleSidebarResizeStart(startEvent: React.PointerEvent<HTMLDivElement>) {
    if (window.innerWidth < 1024) {
      return;
    }

    const startX = startEvent.clientX;
    const startWidth = sidebarWidth;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(
        Math.min(maxSidebarWidth, Math.max(minSidebarWidth, nextWidth)),
      );
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function openCreateDialog() {
    setActionError("");
    setEditorState({
      mode: "create",
      moduleId: activeModule,
      initialDraft: null,
      entry: null,
    });
  }

  async function openEditDialog(entry: KnowledgeEntry, markdownContent = "") {
    try {
      setActionError("");
      const markdown =
        markdownContent || (await fetchEntryMarkdown(entry.module, entry.id));

      setEditorState({
        mode: "edit",
        moduleId: entry.module,
        initialDraft: createDraftFromEntry(entry, markdown),
        entry,
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "\u65e0\u6cd5\u6253\u5f00\u7f16\u8f91\u72b6\u6001\u3002",
      );
    }
  }

  async function handleSaveEntry(draft: QuickAddDraft) {
    if (!editorState) {
      return;
    }

    setActionError("");

    const result =
      editorState.mode === "edit" && editorState.entry
        ? await updateKnowledgeEntry(
            editorState.moduleId,
            editorState.entry.id,
            draft,
          )
        : await createKnowledgeEntry(editorState.moduleId, draft);

    setKnowledgeData(result.data);
    setHighlightedEntryId(result.entry.id);
    setSelectedItem(result.entry);
    setActiveModule(result.entry.module);
    setKnowledgeMeta((current) => ({
      ...current,
      categories: {
        ...current.categories,
        [result.entry.module]: getUniqueValues([
          ...current.categories[result.entry.module],
          result.entry.category,
        ]),
      },
    }));
    setEditorState(null);
  }

  async function handleDeleteEntry(entry: KnowledgeEntry) {
    const confirmed = window.confirm(
      `\u786e\u8ba4\u5220\u9664\u300c${entry.name}\u300d\uff1f\u8fd9\u4f1a\u540c\u65f6\u5220\u9664 JSON \u7d22\u5f15\u548c Markdown \u6b63\u6587\u3002`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      setDeletingEntryId(entry.id);
      const result = await deleteKnowledgeEntry(entry.module, entry.id);
      setKnowledgeData(result.data);

      if (selectedItem?.id === entry.id) {
        setSelectedItem(null);
      }

      if (editorState?.entry?.id === entry.id) {
        setEditorState(null);
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "\u5220\u9664\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
      );
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function handleLogin(password: string) {
    const session = await loginAsAdmin(password);
    setIsAdmin(session.isAdmin);
    setIsPasswordConfigured(session.isPasswordConfigured);
  }

  async function handleCreateCategoryForModule(moduleId: ModuleId, name: string) {
    const result = await createCategory(moduleId, name);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);
  }

  async function handleCreateCategory(name: string) {
    await handleCreateCategoryForModule(activeModule, name);
  }

  async function handleRenameCategory(oldName: string, newName: string) {
    const result = await renameCategory(activeModule, oldName, newName);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);

    if (selectedItem) {
      setSelectedItem(findEntryById(result.data, selectedItem.id));
    }
  }

  async function handleDeleteCategory(name: string, replacementName = "") {
    const result = await removeCategory(activeModule, name, replacementName);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);

    if (selectedItem) {
      setSelectedItem(findEntryById(result.data, selectedItem.id));
    }
  }

  async function handleLogout() {
    try {
      const session = await logoutAdmin();
      setIsAdmin(session.isAdmin);
      setIsPasswordConfigured(session.isPasswordConfigured);
      setAiSettings(null);
      setIsAiSettingsOpen(false);
      setWebdavSettings(null);
      setWebdavBackups([]);
      setIsDataSyncOpen(false);
      setEditorState(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "\u65e0\u6cd5\u9000\u51fa\u7f16\u8f91\u6a21\u5f0f\u3002",
      );
    }
  }

  async function handleSaveAiSettings(payload: SaveAiSettingsPayload) {
    const result = await saveAiSettings(payload);
    setAiSettings(result);
    setActionNotice("AI 设置已保存，新的解析请求会立即使用最新配置。");
  }

  async function handleResetAiSettings() {
    const result = await resetAiSettings();
    setAiSettings(result);
    setActionNotice("已恢复为默认 AI 配置。");
  }

  async function handleExportKnowledge(modules: ModuleId[]) {
    const exported = await exportKnowledgeZip(modules);
    triggerBlobDownload(exported.blob, exported.fileName);
    setActionNotice(
      `已导出 ${modules.length} 个模块，共 ${summarizeSelectedModules(
        modules,
        moduleEntryCounts,
      )} 条记录。`,
    );
  }

  async function handleDownloadTemplate(
    modules: ModuleId[],
    kind: ImportTemplateKind,
  ) {
    const exported = await downloadImportTemplateZip(modules, kind);
    triggerBlobDownload(exported.blob, exported.fileName);
    setActionNotice(
      kind === "empty"
        ? `已下载空模板，覆盖 ${modules.length} 个模块。`
        : `已下载示例模板，覆盖 ${modules.length} 个模块。`,
    );
  }

  async function handleGenerateImportPrompt(modules: ModuleId[]) {
    return fetchImportAiPrompt(modules);
  }

  async function handleInspectImport(file: File, selectedModules: ModuleId[] = []) {
    return inspectKnowledgeImportZip(file, selectedModules);
  }

  async function handleApplyImport(file: File, selectedModules: ModuleId[] = []) {
    const result = await applyKnowledgeImportZip(file, selectedModules);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);
    setSelectedItem(null);
    setEditorState(null);
    setActionNotice(`已覆盖恢复模块：${result.appliedModules.join("、")}。`);
  }

  async function handleSaveWebdavSettings(payload: SaveWebdavSettingsPayload) {
    const result = await saveWebdavSettings(payload);
    setWebdavSettings(result);
    setActionNotice("已保存 WebDAV 配置。");
  }

  async function handleResetWebdavSettings() {
    const result = await resetWebdavSettings();
    setWebdavSettings(result);
    setWebdavBackups([]);
    setActionNotice("已清空 WebDAV 配置。");
  }

  async function handleRefreshWebdavBackups() {
    const result = await fetchWebdavBackups();
    setWebdavBackups(result);
  }

  async function handleUploadWebdavBackup(modules: ModuleId[]) {
    const result = await uploadKnowledgeBackupToWebdav(modules);
    setActionNotice(`已上传 ZIP 快照到 WebDAV：${result.remoteFile}`);
    await handleRefreshWebdavBackups();
  }

  async function handleRestoreWebdavBackup(remoteFile: string) {
    const result = await restoreKnowledgeBackupFromWebdav(remoteFile);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);
    setSelectedItem(null);
    setEditorState(null);
    setActionNotice(`已从 WebDAV 恢复备份：${remoteFile}`);
    await handleRefreshWebdavBackups();
  }

  const emptyStateText =
    rows.length === 0
      ? "\u5f53\u524d\u6a21\u5757\u8fd8\u6ca1\u6709\u5185\u5bb9\uff0c\u53ef\u4ee5\u5148\u5feb\u901f\u65b0\u589e\u4e00\u6761\u3002"
      : "\u6ca1\u6709\u5339\u914d\u5230\u76f8\u5173\u5185\u5bb9\uff0c\u53ef\u4ee5\u6e05\u7a7a\u7b5b\u9009\u6216\u8c03\u6574\u5173\u952e\u8bcd\u3002";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div
          className="relative w-full border-b border-slate-200/80 bg-white/82 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-[var(--sidebar-width)] lg:min-w-[var(--sidebar-width)] lg:shrink-0 lg:border-b-0 lg:border-r"
          style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        >
          <aside className="flex w-full flex-col justify-between gap-8 p-5 lg:h-screen lg:overflow-y-auto lg:p-6">
            <div>
              <div className="mb-8 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.5)]">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Personal KB
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">
                      {"\u4e2a\u4eba\u77e5\u8bc6\u6536\u96c6\u7ad9"}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {
                        "\u5728\u516c\u5f00\u9605\u8bfb\u4e0e\u7ba1\u7406\u7ef4\u62a4\u4e4b\u95f4\u4fdd\u6301\u540c\u4e00\u5957\u4fe1\u606f\u7ed3\u6784\uff0c\u8ba9\u8bb0\u5f55\u3001\u7b5b\u9009\u548c\u56de\u67e5\u90fd\u66f4\u987a\u624b\u3002"
                      }
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-500"
                  >
                    Live
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {moduleList.map((module) => {
                  const ModuleIcon = moduleIcons[module.iconKey];
                  const active = activeModule === module.id;

                  return (
                    <button
                      key={module.id}
                      onClick={() => setActiveModule(module.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_26px_60px_-42px_rgba(15,23,42,0.85)]"
                          : "border-slate-200/80 bg-white/85 text-slate-800 hover:border-slate-300 hover:bg-white"
                      }`}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-2xl p-2.5 ${
                            active ? "bg-white/12" : "bg-slate-100"
                          }`}
                        >
                          <ModuleIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-medium">{module.label}</div>
                            <div
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                active
                                  ? "bg-white/12 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {moduleEntryCounts[module.id]}
                            </div>
                          </div>
                          <div
                            className={`mt-1 whitespace-normal break-words text-xs leading-5 ${
                              active ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {module.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {isAdmin && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (aiSettings) {
                        setIsAiSettingsOpen(true);
                      }
                    }}
                    disabled={!aiSettings}
                    className="w-full rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3 text-left shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                      AI 设置
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {aiSettings
                        ? getAiSettingsStatusText(aiSettings)
                        : "加载当前 AI 配置中..."}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDataSyncOpen(true);
                      if (webdavSettings?.effectiveSettings) {
                        void handleRefreshWebdavBackups().catch((error) => {
                          setActionError(
                            error instanceof Error
                              ? error.message
                              : "无法加载 WebDAV 备份列表。",
                          );
                        });
                      }
                    }}
                    className="w-full rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-3 text-left shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <FolderTree className="h-4 w-4 text-slate-500" />
                      数据同步
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      导入导出 ZIP、配置 WebDAV、上传或恢复远程备份。
                    </div>
                  </button>
                </div>
              )}

              <Card className="rounded-[24px] border-0 bg-slate-900 text-white shadow-[0_28px_70px_-48px_rgba(15,23,42,1)]">
                <CardContent className="p-4">
                  <div className="text-sm font-medium">
                    {"\u5f53\u524d\u8bbf\u95ee\u6a21\u5f0f"}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      className="rounded-full px-3 py-1"
                    >
                      {isAdmin ? "\u7f16\u8f91\u6a21\u5f0f" : "\u516c\u5f00\u53ea\u8bfb"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">
                    {isAdmin
                      ? "\u65b0\u589e\u3001\u7f16\u8f91\u3001\u5220\u9664\u5df2\u5728\u5f53\u524d\u524d\u53f0\u9875\u9762\u5c31\u5730\u5f00\u542f\u3002"
                      : "\u8bbf\u5ba2\u53ef\u4ee5\u7ee7\u7eed\u516c\u5f00\u9605\u8bfb\uff0c\u4e0d\u4f1a\u770b\u5230\u5199\u5165\u76f8\u5173\u64cd\u4f5c\u3002"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleSidebarResizeStart}
            className="absolute right-0 top-0 hidden h-full w-3 -translate-x-1/2 cursor-col-resize lg:block"
          >
            <div className="mx-auto h-full w-px bg-slate-200 transition hover:bg-slate-400" />
          </div>
        </div>

        <main className="min-w-0 flex-1 p-5 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto max-w-[1480px] space-y-5"
          >
            <section className="rounded-[28px] border border-white/70 bg-white/82 px-5 py-5 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] backdrop-blur md:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                      {"\u5f53\u524d\u6a21\u5757"}
                    </div>
                    {isAdmin && (
                      <Badge className="rounded-full px-3 py-1">
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        {"\u7f16\u8f91\u6a21\u5f0f"}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-[40px]">
                    {currentModule.label}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 md:text-[15px]">
                    {currentModule.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  {isAdmin ? (
                    <>
                      <Button
                        className="h-11 rounded-2xl px-4 shadow-[0_16px_35px_-24px_rgba(15,23,42,0.75)]"
                        onClick={openCreateDialog}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {"\u5feb\u901f\u65b0\u589e\u6761\u76ee"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl px-4"
                        onClick={() => setIsCategoryManagerOpen(true)}
                      >
                        <FolderTree className="mr-2 h-4 w-4" />
                        {"\u7ba1\u7406\u5206\u7c7b"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl px-4"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {"\u9000\u51fa"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl px-4"
                      onClick={() => setIsAdminDialogOpen(true)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {"\u7ba1\u7406\u5458\u767b\u5f55"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <StatCard
                  title={"\u5f53\u524d\u53ef\u89c1"}
                  value={filteredRows.length}
                  hint={`\u6a21\u5757\u603b\u8ba1 ${rows.length} \u6761`}
                />
                <StatCard
                  title={"\u6807\u7b7e\u6c60"}
                  value={visibleTagPool.length}
                  hint={"\u70b9\u51fb\u6807\u7b7e\u53ef\u76f4\u63a5\u8fdb\u5165\u7b5b\u9009"}
                />
                <StatCard
                  title={"\u6700\u8fd1\u66f4\u65b0"}
                  value={latestUpdated}
                  hint={"\u9ed8\u8ba4\u6309\u66f4\u65b0\u65f6\u95f4\u6392\u5e8f"}
                />
              </div>
            </section>

            {actionError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {actionError}
              </div>
            )}

            {actionNotice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionNotice}
              </div>
            )}

            <FilterBar
              search={search}
              onSearchChange={setSearch}
              category={categoryFilter}
              onCategoryChange={setCategoryFilter}
              categoryOptions={categoryOptions}
              status={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={statusOptions}
              selectedTags={selectedTags}
              onTagToggle={handleToggleTag}
              tagOptions={tagOptions}
              sortBy={sortBy}
              onSortChange={(value) => setSortBy(value as SortOptionId)}
              sortOptions={getSortOptions(activeModule)}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              onClearTagSelection={() => setSelectedTags([])}
            />

            <Card className="rounded-[24px] border-0 bg-white/92 shadow-sm backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg">
                    {"\u8868\u683c\u603b\u89c8"}
                  </CardTitle>
                  <div className="text-sm text-slate-500">
                    {activeFilterCount > 0
                      ? `\u5f53\u524d\u547d\u4e2d ${filteredRows.length} \u6761\u7ed3\u679c`
                      : "\u70b9\u51fb\u4efb\u610f\u6761\u76ee\u53ef\u5728\u53f3\u4fa7\u5c55\u5f00\u5b8c\u6574\u8bb0\u5f55"}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:hidden">
                  {filteredRows.map((item) => {
                    const isHighlighted = highlightedEntryId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          isHighlighted
                            ? "border-amber-200 bg-amber-50/80 ring-1 ring-inset ring-amber-200"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-medium text-slate-900">
                              {item.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {`\u65b0\u589e ${item.createdAt} \u00b7 \u66f4\u65b0 ${item.updatedAt}`}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 whitespace-normal rounded-full px-2.5 py-0.5 text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-3 text-sm text-slate-500 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {"\u5206\u7c7b"}
                            </div>
                            <div className="mt-1 break-words">{item.category}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {currentModule.tableHeaders[2]}
                            </div>
                            <div className="mt-1 break-words">{getPrimaryMeta(item)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {currentModule.tableHeaders[3]}
                            </div>
                            <div className="mt-1 break-words">{getSecondaryMeta(item)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <Badge
                              key={`${item.id}-mobile-${tag}`}
                              variant="secondary"
                              className="whitespace-normal rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        {isAdmin && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openEditDialog(item);
                              }}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              {"\u7f16\u8f91"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              disabled={deletingEntryId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteEntry(item);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingEntryId === item.id
                                ? "\u5220\u9664\u4e2d"
                                : "\u5220\u9664"}
                            </Button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                  <div className="min-w-[980px]">
                    <div className={`${tableGridClassName} bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500`}>
                      {currentModule.tableHeaders.map((header) => (
                        <div key={header} className="whitespace-normal break-words">
                          {header}
                        </div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-100 bg-white">
                      {filteredRows.map((item) => {
                        const isHighlighted = highlightedEntryId === item.id;

                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedItem(item)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedItem(item);
                              }
                            }}
                            className={`${tableGridClassName} cursor-pointer items-start px-4 py-3.5 text-left transition ${
                              isHighlighted
                                ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="whitespace-normal break-words font-medium text-slate-800">
                                  {item.name}
                                </div>
                                {isAdmin && (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void openEditDialog(item);
                                      }}
                                    >
                                      <Pencil className="mr-1 h-3.5 w-3.5" />
                                      {"\u7f16\u8f91"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                      disabled={deletingEntryId === item.id}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleDeleteEntry(item);
                                      }}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      {deletingEntryId === item.id
                                        ? "\u5220\u9664\u4e2d"
                                        : "\u5220\u9664"}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                <span>{`\u65b0\u589e\u4e8e ${item.createdAt}`}</span>
                                {isAdmin && (
                                  <span>{`\u66f4\u65b0 ${item.updatedAt}`}</span>
                                )}
                              </div>
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500">
                              {item.category}
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500">
                              {getPrimaryMeta(item)}
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500">
                              {getSecondaryMeta(item)}
                            </div>
                            <div className="pt-0.5">
                              <Badge
                                variant="secondary"
                                className="whitespace-normal rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.tags.map((tag) => (
                                <button
                                  key={`${item.id}-${tag}`}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleToggleTag(tag);
                                  }}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="whitespace-normal rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                                  >
                                    #{tag}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>
                </div>

                {filteredRows.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-12 text-center">
                    <div className="mx-auto max-w-md text-sm leading-6 text-slate-500">
                      {emptyStateText}
                    </div>
                    <div className="mt-4 flex justify-center gap-3">
                      <Button variant="outline" onClick={handleClearFilters}>
                        {"\u6e05\u7a7a\u7b5b\u9009"}
                      </Button>
                      {isAdmin && (
                        <Button onClick={openCreateDialog}>
                          {"\u65b0\u589e\u6761\u76ee"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AdminAccessDialog
        open={isAdminDialogOpen}
        onOpenChange={setIsAdminDialogOpen}
        onSubmit={handleLogin}
        defaultPasswordHint={!isPasswordConfigured}
      />

      <CategoryManagerDialog
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
        moduleLabel={currentModule.label}
        categories={manageableCategories}
        counts={categoryUsageCounts}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <AiSettingsDialog
        open={isAiSettingsOpen}
        onOpenChange={setIsAiSettingsOpen}
        settings={aiSettings}
        onSave={handleSaveAiSettings}
        onResetToDefault={handleResetAiSettings}
      />

      <DataSyncDialog
        open={isDataSyncOpen}
        onOpenChange={setIsDataSyncOpen}
        moduleOptions={moduleList.map((module) => ({
          id: module.id,
          label: module.label,
          count: knowledgeData[module.id].length,
        }))}
        webdavSettings={webdavSettings}
        webdavBackups={webdavBackups}
        onExport={handleExportKnowledge}
        onDownloadTemplate={handleDownloadTemplate}
        onGenerateAiPrompt={handleGenerateImportPrompt}
        onInspectImport={handleInspectImport}
        onApplyImport={handleApplyImport}
        onSaveWebdavSettings={handleSaveWebdavSettings}
        onResetWebdavSettings={handleResetWebdavSettings}
        onRefreshBackups={handleRefreshWebdavBackups}
        onUploadWebdav={handleUploadWebdavBackup}
        onRestoreWebdavBackup={handleRestoreWebdavBackup}
      />

      <QuickAddEntryDialog
        moduleId={editorModuleId}
        open={Boolean(editorState)}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        categoryOptions={editorCategoryOptions}
        statusOptions={editorStatusOptions}
        initialDraft={editorState?.initialDraft ?? null}
        title={
          editorState?.mode === "edit"
            ? "\u7f16\u8f91\u6761\u76ee"
            : "\u5feb\u901f\u65b0\u589e\u6761\u76ee"
        }
        description={
          editorState?.mode === "edit"
            ? `\u76f4\u63a5\u5728\u5f53\u524d\u9875\u9762\u4fee\u6539\u300c${editorState.entry?.name ?? ""}\u300d\u3002\u4fe1\u606f\u7ed3\u6784\u4e0e\u516c\u5f00\u5c55\u793a\u4fdd\u6301\u4e00\u81f4\u3002`
            : undefined
        }
        submitLabel={
          editorState?.mode === "edit"
            ? "\u4fdd\u5b58\u4fee\u6539"
            : "\u4fdd\u5b58\u5e76\u5199\u5165\u4ed3\u5e93"
        }
        onAiParse={(rawText) => parseEntryWithAi(editorModuleId, rawText)}
        onCreateCategory={(name) =>
          handleCreateCategoryForModule(editorModuleId, name)
        }
        onSubmit={handleSaveEntry}
      />

      <KnowledgeDetailDrawer
        entry={selectedItem}
        onClose={() => setSelectedItem(null)}
        isAdmin={isAdmin}
        isDeleting={selectedItem ? deletingEntryId === selectedItem.id : false}
        onTagClick={(tag) => {
          if (selectedItem && selectedItem.module !== activeModule) {
            setActiveModule(selectedItem.module);
          }
          handleToggleTag(tag);
        }}
        onEdit={(entry, markdownContent) => {
          void openEditDialog(entry, markdownContent);
        }}
        onDelete={(entry) => {
          void handleDeleteEntry(entry);
        }}
      />
    </div>
  );
}

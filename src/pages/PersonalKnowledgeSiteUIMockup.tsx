import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Inbox,
  FolderTree,
  Music4,
  LogOut,
  Pencil,
  Plus,
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
import { ShoppingSheetTabs } from "@/components/knowledge/ShoppingSheetTabs";
import { AiSettingsDialog } from "@/components/settings/AiSettingsDialog";
import { DataSyncDialog } from "@/components/settings/DataSyncDialog";
import { InterfaceSettingsPanel } from "@/components/settings/InterfaceSettingsPanel";
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
  createKnowledgeEntriesBatch,
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
  getEmptyDraft,
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
import { useI18n } from "@/providers/I18nProvider";

const moduleIcons = {
  store: Store,
  shoppingBag: ShoppingBag,
  globe: Globe,
  inbox: Inbox,
  music4: Music4,
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
    <div className="rounded-[24px] border border-slate-200/80 bg-white/88 px-4 py-4 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.65)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/88 dark:shadow-[0_24px_60px_-42px_rgba(2,6,23,0.9)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </div>
      <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

export default function PersonalKnowledgeSiteUIMockup() {
  const { t, moduleLabel, moduleDescription, moduleSummary, moduleHeaders } = useI18n();
  const [knowledgeData, setKnowledgeData] =
    useState<KnowledgeData>(initialKnowledgeData);
  const [knowledgeMeta, setKnowledgeMeta] = useState<KnowledgeMeta>({
    categories: {
      offline: [...moduleDefinitions.offline.defaultCategories],
      shopping: [...moduleDefinitions.shopping.defaultCategories],
      websites: [...moduleDefinitions.websites.defaultCategories],
      inbox: [...moduleDefinitions.inbox.defaultCategories],
      songs: [...moduleDefinitions.songs.defaultCategories],
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
  const [shoppingSheetCategory, setShoppingSheetCategory] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const visibleModuleList = useMemo(
    () => (isAdmin ? moduleList : moduleList.filter((module) => module.id !== "inbox")),
    [isAdmin],
  );

  const currentModule = moduleDefinitions[activeModule];
  const translatedCurrentModuleLabel = moduleLabel(activeModule);
  const translatedCurrentModuleSummary = moduleSummary(activeModule);
  const translatedHeaders = moduleHeaders(activeModule);
  const Icon = moduleIcons[currentModule.iconKey];
  const rows = knowledgeData[activeModule];
  const shoppingSheetCategories = useMemo(
    () =>
      getUniqueValues([
        ...moduleDefinitions.shopping.defaultCategories,
        ...(knowledgeMeta.categories.shopping ?? []),
        ...knowledgeData.shopping.map((entry) => entry.category),
      ]),
    [knowledgeData.shopping, knowledgeMeta.categories.shopping],
  );
  const shoppingSheetCounts = useMemo(
    () =>
      knowledgeData.shopping.reduce<Record<string, number>>((result, entry) => {
        result[entry.category] = (result[entry.category] ?? 0) + 1;
        return result;
      }, {}),
    [knowledgeData.shopping],
  );
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
    if (activeModule !== "shopping") {
      return;
    }

    if (shoppingSheetCategories.length === 0) {
      setShoppingSheetCategory("");
      return;
    }

    if (
      !shoppingSheetCategory ||
      !shoppingSheetCategories.includes(shoppingSheetCategory)
    ) {
      setShoppingSheetCategory(shoppingSheetCategories[0]);
    }
  }, [activeModule, shoppingSheetCategories, shoppingSheetCategory]);

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
    if (isAdmin) {
      return;
    }

    if (activeModule === "inbox") {
      setActiveModule("offline");
    }

    if (selectedItem?.module === "inbox") {
      setSelectedItem(null);
    }

    if (editorState?.moduleId === "inbox") {
      setEditorState(null);
    }
  }, [activeModule, editorState, isAdmin, selectedItem]);

  const scopedRows = useMemo(() => {
    if (activeModule === "shopping" && shoppingSheetCategory) {
      return rows.filter((item) => item.category === shoppingSheetCategory);
    }

    return rows;
  }, [activeModule, rows, shoppingSheetCategory]);

  const categoryOptions = useMemo(
    () => getUniqueValues(scopedRows.map((item) => item.category)),
    [scopedRows],
  );

  const statusOptions = useMemo(
    () => getUniqueValues(scopedRows.map((item) => item.status)),
    [scopedRows],
  );

  const tagOptions = useMemo(
    () => getUniqueValues(scopedRows.flatMap((item) => item.tags)),
    [scopedRows],
  );

  const filteredRows = useMemo(() => {
    const next = scopedRows.filter((item) => {
      if (!matchesSearch(item, search)) {
        return false;
      }

      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      return entryMatchesTags(item, selectedTags);
    });

    return sortEntries(next, sortBy);
  }, [scopedRows, search, categoryFilter, statusFilter, selectedTags, sortBy]);

  const visibleTagPool = useMemo(
    () => getUniqueValues(filteredRows.flatMap((item) => item.tags)),
    [filteredRows],
  );

  const activeFilterCount = [
    search.trim().length > 0,
    categoryFilter !== "all",
    statusFilter !== "all",
    selectedTags.length > 0,
  ].filter(Boolean).length;

  const latestUpdated = (filteredRows[0] ?? scopedRows[0])?.updatedAt
    ? formatDate((filteredRows[0] ?? scopedRows[0])!.updatedAt)
    : "--";

  const manageableCategories = knowledgeMeta.categories[activeModule] ?? [];

  const categoryUsageCounts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((result, entry) => {
        result[entry.category] = (result[entry.category] ?? 0) + 1;
        return result;
      }, {}),
    [rows],
  );

  const editorCategoryOptions = useMemo(
    () =>
      getUniqueValues([
        ...moduleDefinitions[editorModuleId].defaultCategories,
        ...(knowledgeMeta.categories[editorModuleId] ?? []),
      ]),
    [editorModuleId, knowledgeMeta.categories],
  );

  const editorStatusOptions = useMemo(
    () =>
      getUniqueValues([
        ...moduleDefinitions[editorModuleId].defaultStatuses,
        ...editorRows.map((entry) => entry.status),
      ]),
    [editorModuleId, editorRows],
  );

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
              : "Unable to load AI settings.",
          );
        }

        if (webdavResult.status === "fulfilled") {
          setWebdavSettings(webdavResult.value);
        } else {
          setActionError(
            webdavResult.reason instanceof Error
              ? webdavResult.reason.message
              : "Unable to load WebDAV settings.",
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function handleSidebarResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    if (window.innerWidth < 1024) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.min(maxSidebarWidth, Math.max(minSidebarWidth, nextWidth)));
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
    const initialDraft =
      activeModule === "shopping" && shoppingSheetCategory
        ? {
            ...getEmptyDraft("shopping"),
            category: shoppingSheetCategory,
          }
        : null;
    setEditorState({
      mode: "create",
      moduleId: activeModule,
      initialDraft,
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
    if (result.entry.module === "shopping") {
      setShoppingSheetCategory(result.entry.category);
    }
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

  async function handleBatchSaveEntries(drafts: QuickAddDraft[]) {
    if (!editorState) {
      return;
    }

    setActionError("");
    const result = await createKnowledgeEntriesBatch(editorState.moduleId, drafts);
    setKnowledgeData(result.data);

    if (result.createdEntries.length > 0) {
      const firstEntry = result.createdEntries[0];
      setHighlightedEntryId(firstEntry.id);
      setSelectedItem(firstEntry);
      setActiveModule(firstEntry.module);
      const nextMeta = await fetchKnowledgeMeta();
      setKnowledgeMeta(nextMeta);
    }

    if (result.createdEntries.length === 0) {
      const reason = result.failures[0]?.message || "没有候选条目被成功创建。";
      setActionError(reason);
      return result;
    }

    if (result.failures.length > 0) {
      setActionNotice(
        `成功添加 ${result.createdEntries.length} 条，跳过 ${result.failures.length} 条。`,
      );
    } else {
      setActionNotice(`成功添加 ${result.createdEntries.length} 条。`);
    }

    return result;
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
    if (moduleId === "shopping") {
      setShoppingSheetCategory(name);
    }
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
    setActionNotice("AI settings saved.");
  }

  async function handleResetAiSettings() {
    const result = await resetAiSettings();
    setAiSettings(result);
    setActionNotice("AI settings restored to defaults.");
  }

  async function handleExportKnowledge(modules: ModuleId[]) {
    const exported = await exportKnowledgeZip(modules);
    triggerBlobDownload(exported.blob, exported.fileName);
    setActionNotice(
      `Exported ${modules.length} module(s), ${summarizeSelectedModules(
        modules,
        moduleEntryCounts,
      )} records in total.`,
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
        ? `Downloaded empty template for ${modules.length} module(s).`
        : `Downloaded example template for ${modules.length} module(s).`,
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
    setActionNotice(`Imported modules: ${result.appliedModules.join(", ")}.`);
  }

  async function handleSaveWebdavSettings(payload: SaveWebdavSettingsPayload) {
    const result = await saveWebdavSettings(payload);
    setWebdavSettings(result);
    setActionNotice("WebDAV settings saved.");
  }

  async function handleResetWebdavSettings() {
    const result = await resetWebdavSettings();
    setWebdavSettings(result);
    setWebdavBackups([]);
    setActionNotice("WebDAV settings cleared.");
  }

  async function handleRefreshWebdavBackups() {
    const result = await fetchWebdavBackups();
    setWebdavBackups(result);
  }

  async function handleUploadWebdavBackup(modules: ModuleId[]) {
    const result = await uploadKnowledgeBackupToWebdav(modules);
    setActionNotice(`Uploaded ZIP snapshot to WebDAV: ${result.remoteFile}`);
    await handleRefreshWebdavBackups();
  }

  async function handleRestoreWebdavBackup(remoteFile: string) {
    const result = await restoreKnowledgeBackupFromWebdav(remoteFile);
    setKnowledgeData(result.data);
    setKnowledgeMeta(result.meta);
    setSelectedItem(null);
    setEditorState(null);
    setActionNotice(`Restored backup from WebDAV: ${remoteFile}`);
    await handleRefreshWebdavBackups();
  }

  const emptyStateText =
    scopedRows.length === 0
      ? t("page.emptyModule")
      : t("page.emptyFiltered");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.06),_transparent_24%),linear-gradient(180deg,#020617_0%,#020617_100%)] dark:text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div
          className="relative w-full border-b border-slate-200/80 bg-white/82 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 lg:sticky lg:top-0 lg:h-screen lg:w-[var(--sidebar-width)] lg:min-w-[var(--sidebar-width)] lg:shrink-0 lg:border-b-0 lg:border-r"
          style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
        >
          <aside className="scrollbar-none flex w-full flex-col justify-between gap-8 p-5 lg:h-screen lg:overflow-y-auto lg:p-6">
            <div>
              <div className="mb-8 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.5)] dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-[0_24px_60px_-40px_rgba(2,6,23,0.9)]">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  Personal KB
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {t("page.brandTitle")}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {
                        t("page.brandDescription")
                      }
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  >
                    {t("page.liveLabel")}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {visibleModuleList.map((module) => {
                  const ModuleIcon = moduleIcons[module.iconKey];
                  const active = activeModule === module.id;

                  return (
                    <button
                      key={module.id}
                      onClick={() => setActiveModule(module.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_26px_60px_-42px_rgba(15,23,42,0.85)] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                          : "border-slate-200/80 bg-white/85 text-slate-800 hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/85 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                      }`}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-2xl p-2.5 ${
                            active ? "bg-white/12 dark:bg-slate-900/15" : "bg-slate-100 dark:bg-slate-900"
                          }`}
                        >
                          <ModuleIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-medium">{moduleLabel(module.id)}</div>
                            <div
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                active
                                  ? "bg-white/12 text-white dark:bg-slate-900/15 dark:text-slate-950"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
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
                            {moduleDescription(module.id)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <InterfaceSettingsPanel
                isAdmin={isAdmin}
                aiSettingsDisabled={!aiSettings}
                aiSettingsStatus={
                  aiSettings
                    ? getAiSettingsStatusText(aiSettings)
                    : t("page.aiSettingsLoading")
                }
                onOpenAiSettings={() => {
                  if (aiSettings) {
                    setIsAiSettingsOpen(true);
                  }
                }}
                onOpenDataSync={() => {
                  setIsDataSyncOpen(true);
                  if (webdavSettings?.effectiveSettings) {
                    void handleRefreshWebdavBackups().catch((error) => {
                      setActionError(
                        error instanceof Error
                          ? error.message
                          : "Unable to load the WebDAV backup list.",
                      );
                    });
                  }
                }}
              />

            </div>
          </aside>
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleSidebarResizeStart}
            className="absolute right-0 top-0 hidden h-full w-3 -translate-x-1/2 cursor-col-resize lg:block"
          >
            <div className="mx-auto h-full w-px bg-slate-200 transition hover:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-600" />
          </div>
        </div>

        <main className="min-w-0 flex-1 p-5 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto max-w-[1480px] space-y-5"
          >
            <section className="rounded-[28px] border border-white/70 bg-white/82 px-5 py-5 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/82 dark:shadow-[0_28px_80px_-52px_rgba(2,6,23,0.95)] md:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      <Icon className="h-3.5 w-3.5" />
                      {t("page.currentModule")}
                    </div>
                    {isAdmin && (
                      <Badge className="rounded-full px-3 py-1">
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        {t("page.adminMode")}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 md:text-[40px]">
                    {translatedCurrentModuleLabel}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400 md:text-[15px]">
                    {translatedCurrentModuleSummary}
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
                        {t("page.quickAdd")}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl px-4"
                        onClick={() => setIsCategoryManagerOpen(true)}
                      >
                        <FolderTree className="mr-2 h-4 w-4" />
                        {t("page.manageCategories")}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-2xl px-4"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("page.logout")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 rounded-2xl px-4"
                      onClick={() => setIsAdminDialogOpen(true)}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {t("page.adminLogin")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <StatCard
                  title={t("page.visible")}
                  value={filteredRows.length}
                  hint={t("page.totalRecords", { count: scopedRows.length })}
                />
                <StatCard
                  title={t("page.tagPool")}
                  value={visibleTagPool.length}
                  hint={t("page.tagHint")}
                />
                <StatCard
                  title={t("page.latestUpdated")}
                  value={latestUpdated}
                  hint={t("page.latestUpdatedHint")}
                />
              </div>
            </section>

            {activeModule === "shopping" && shoppingSheetCategories.length > 0 && (
              <ShoppingSheetTabs
                categories={shoppingSheetCategories}
                activeCategory={shoppingSheetCategory}
                counts={shoppingSheetCounts}
                isAdmin={isAdmin}
                title={t("page.shoppingSheetsTitle")}
                helperText={t("page.shoppingSheetsHint")}
                addLabel={t("page.shoppingAddSheet")}
                inputPlaceholder={t("page.shoppingAddSheetPlaceholder")}
                confirmLabel={t("common.confirm")}
                cancelLabel={t("common.cancel")}
                duplicateMessage={t("page.shoppingSheetDuplicate")}
                onChange={setShoppingSheetCategory}
                onCreateCategory={(name) => handleCreateCategoryForModule("shopping", name)}
              />
            )}

            {actionError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {actionError}
              </div>
            )}

            {actionNotice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
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
              sortOptions={getSortOptions(activeModule, t)}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
              onClearTagSelection={() => setSelectedTags([])}
              showCategoryFilter={activeModule !== "shopping"}
            />

            <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/88">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg">
                    {t("page.tableOverview")}
                  </CardTitle>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {activeFilterCount > 0
                      ? t("page.filteredResultCount", { count: filteredRows.length })
                      : t("page.drawerHint")}
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
                            ? "border-amber-200 bg-amber-50/80 ring-1 ring-inset ring-amber-200 dark:border-amber-500/50 dark:bg-amber-500/10 dark:ring-amber-500/50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-medium text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
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

                        <div className="mt-3 grid gap-3 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {"\u5206\u7c7b"}
                            </div>
                            <div className="mt-1 break-words">{item.category}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {translatedHeaders[2]}
                            </div>
                            <div className="mt-1 break-words">{getPrimaryMeta(item)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {translatedHeaders[3]}
                            </div>
                            <div className="mt-1 break-words">{getSecondaryMeta(item)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <Badge
                              key={`${item.id}-mobile-${tag}`}
                              variant="secondary"
                              className="whitespace-normal rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>

                        {isAdmin && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
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

                <div className="scrollbar-none hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
                  <div className="min-w-[980px]">
                    <div className={`${tableGridClassName} bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400`}>
                      {translatedHeaders.map((header) => (
                        <div key={header} className="whitespace-normal break-words">
                          {header}
                        </div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
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
                                ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/50"
                                : "hover:bg-slate-50 dark:hover:bg-slate-900/80"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="whitespace-normal break-words font-medium text-slate-800 dark:text-slate-100">
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
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                <span>{`\u65b0\u589e\u4e8e ${item.createdAt}`}</span>
                                {isAdmin && (
                                  <span>{`\u66f4\u65b0 ${item.updatedAt}`}</span>
                                )}
                              </div>
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500 dark:text-slate-400">
                              {item.category}
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500 dark:text-slate-400">
                              {getPrimaryMeta(item)}
                            </div>
                            <div className="whitespace-normal break-words text-sm text-slate-500 dark:text-slate-400">
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
                                    className="whitespace-normal rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
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
        moduleLabel={translatedCurrentModuleLabel}
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
        moduleOptions={visibleModuleList.map((module) => ({
          id: module.id,
          label: moduleLabel(module.id),
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
        onAiParse={(rawText, mode, images) =>
          parseEntryWithAi(editorModuleId, rawText, mode, images)
        }
        onCreateCategory={(name) =>
          handleCreateCategoryForModule(editorModuleId, name)
        }
        onSubmit={handleSaveEntry}
        onBatchSubmit={handleBatchSaveEntries}
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

















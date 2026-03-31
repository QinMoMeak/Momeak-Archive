import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, ShoppingBag, Store } from "lucide-react";

import { FilterBar } from "@/components/knowledge/FilterBar";
import { KnowledgeDetailDrawer } from "@/components/knowledge/KnowledgeDetailDrawer";
import { QuickAddEntryDialog } from "@/components/knowledge/QuickAddEntryDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initialKnowledgeData, moduleDefinitions, moduleList } from "@/data/knowledge";
import {
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
  ModuleId,
  SortOptionId,
} from "@/types/knowledge";

const moduleIcons = {
  store: Store,
  shoppingBag: ShoppingBag,
  globe: Globe,
} as const;

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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export default function PersonalKnowledgeSiteUIMockup() {
  const [knowledgeData, setKnowledgeData] =
    useState<KnowledgeData>(initialKnowledgeData);
  const [activeModule, setActiveModule] = useState<ModuleId>("offline");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOptionId>("updated-desc");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeEntry | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);

  const currentModule = moduleDefinitions[activeModule];
  const Icon = moduleIcons[currentModule.iconKey];
  const rows = knowledgeData[activeModule];

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

  const categoryOptions = useMemo(
    () => getUniqueValues(rows.map((item) => item.category)),
    [rows],
  );

  const statusOptions = useMemo(
    () => getUniqueValues(rows.map((item) => item.status)),
    [rows],
  );

  const tagOptions = useMemo(
    () => getUniqueValues(rows.flatMap((item) => item.tags)),
    [rows],
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

  function handleQuickAdd(entry: KnowledgeEntry) {
    setKnowledgeData((current) => ({
      ...current,
      [entry.module]: [entry, ...current[entry.module]],
    }));
    setHighlightedEntryId(entry.id);
    setSelectedItem(entry);
  }

  const emptyStateText =
    rows.length === 0
      ? "\u5f53\u524d\u6a21\u5757\u8fd8\u6ca1\u6709\u5185\u5bb9\uff0c\u53ef\u4ee5\u5148\u5feb\u901f\u65b0\u589e\u4e00\u6761\u3002"
      : "\u6ca1\u6709\u5339\u914d\u5230\u76f8\u5173\u5185\u5bb9\uff0c\u53ef\u4ee5\u6e05\u7a7a\u7b5b\u9009\u6216\u8c03\u6574\u5173\u952e\u8bcd\u3002";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full flex-col justify-between border-b border-slate-200 bg-white/80 p-5 backdrop-blur-xl lg:w-[280px] lg:border-b-0 lg:border-r">
          <div>
            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Personal KB
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                {"\u4e2a\u4eba\u77e5\u8bc6\u6536\u96c6\u7ad9"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {
                  "\u5148\u628a\u9605\u8bfb\u4f53\u9a8c\u505a\u987a\uff0c\u518d\u7ee7\u7eed\u6269\u5c55\u5f55\u5165\u548c\u4ed3\u5e93\u540c\u6b65\u3002\u73b0\u5728\u7684\u6570\u636e\u7ed3\u6784\u5df2\u7ecf\u4e3a JSON + Markdown \u6df7\u5408\u7ef4\u62a4\u9884\u7559\u597d\u4e86\u4f4d\u7f6e\u3002"
                }
              </p>
            </div>

            <div className="space-y-2">
              {moduleList.map((module) => {
                const ModuleIcon = moduleIcons[module.iconKey];
                const active = activeModule === module.id;

                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full rounded-2xl p-4 text-left transition-all ${
                      active
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                    }`}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-2 ${
                          active ? "bg-white/15" : "bg-white"
                        }`}
                      >
                        <ModuleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{module.label}</div>
                        <div
                          className={`mt-1 text-xs leading-5 ${
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

          <Card className="mt-6 rounded-2xl border-0 bg-slate-900 text-white shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-medium">
                {"\u7ef4\u62a4\u65b9\u5f0f"}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {
                  "\u5217\u8868\u6570\u636e\u7ee7\u7eed\u4fdd\u7559\u5728 JSON\uff0c\u957f\u5185\u5bb9\u9010\u6b65\u8fc1\u79fb\u5230 content/<module>/<id>.md\u3002\u8fd9\u6837\u65e2\u5bb9\u6613\u641c\u7d22\uff0c\u4e5f\u9002\u5408\u4ee5\u540e\u505a\u4ed3\u5e93\u5316\u7ef4\u62a4\u3002"
                }
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">
                  <Icon className="h-3.5 w-3.5" />
                  {"\u5f53\u524d\u6a21\u5757"}
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                  {currentModule.label}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {currentModule.summary}
                </p>
              </div>

              <Button
                className="h-10 rounded-xl px-4"
                onClick={() => setIsQuickAddOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {"\u5feb\u901f\u65b0\u589e\u6761\u76ee"}
              </Button>
            </div>

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

            <div className="grid gap-3 md:grid-cols-3">
              <StatCard
                title="\u5f53\u524d\u53ef\u89c1"
                value={filteredRows.length}
                hint={`\u6a21\u5757\u603b\u8ba1 ${rows.length} \u6761`}
              />
              <StatCard
                title="\u6807\u7b7e\u6c60"
                value={visibleTagPool.length}
                hint="\u70b9\u51fb\u6807\u7b7e\u53ef\u76f4\u63a5\u8fdb\u5165\u7b5b\u9009"
              />
              <StatCard
                title="\u6700\u8fd1\u66f4\u65b0"
                value={latestUpdated}
                hint="\u9ed8\u8ba4\u6309\u66f4\u65b0\u65f6\u95f4\u6392\u5e8f"
              />
            </div>

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
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[1.6fr_1fr_1.1fr_0.9fr_0.9fr_1.2fr] gap-3 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                      {currentModule.tableHeaders.map((header) => (
                        <div key={header}>{header}</div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-100 bg-white">
                      {filteredRows.map((item) => {
                        const isHighlighted = highlightedEntryId === item.id;
                        const previewTags = item.tags.slice(0, 2);
                        const remainingTagCount = item.tags.length - previewTags.length;

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
                            className={`grid cursor-pointer grid-cols-[1.6fr_1fr_1.1fr_0.9fr_0.9fr_1.2fr] items-center gap-3 px-4 py-3.5 text-left transition ${
                              isHighlighted
                                ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-800">
                                {item.name}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {`\u65b0\u589e\u4e8e ${item.createdAt}`}
                              </div>
                            </div>
                            <div className="text-sm text-slate-500">{item.category}</div>
                            <div className="truncate text-sm text-slate-500">
                              {getPrimaryMeta(item)}
                            </div>
                            <div className="text-sm text-slate-500">
                              {getSecondaryMeta(item)}
                            </div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {previewTags.map((tag) => (
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
                                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                                  >
                                    #{tag}
                                  </Badge>
                                </button>
                              ))}
                              {remainingTagCount > 0 && (
                                <div className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                                  +{remainingTagCount}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {filteredRows.length === 0 && (
                        <div className="px-4 py-12 text-center">
                          <div className="mx-auto max-w-md text-sm leading-6 text-slate-500">
                            {emptyStateText}
                          </div>
                          <div className="mt-4 flex justify-center gap-3">
                            <Button variant="outline" onClick={handleClearFilters}>
                              {"\u6e05\u7a7a\u7b5b\u9009"}
                            </Button>
                            <Button onClick={() => setIsQuickAddOpen(true)}>
                              {"\u65b0\u589e\u6761\u76ee"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <QuickAddEntryDialog
        moduleId={activeModule}
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        categoryOptions={categoryOptions}
        statusOptions={statusOptions}
        onSubmit={handleQuickAdd}
      />

      <KnowledgeDetailDrawer
        entry={selectedItem}
        onClose={() => setSelectedItem(null)}
        onTagClick={(tag) => {
          if (selectedItem && selectedItem.module !== activeModule) {
            setActiveModule(selectedItem.module);
          }
          handleToggleTag(tag);
        }}
      />
    </div>
  );
}

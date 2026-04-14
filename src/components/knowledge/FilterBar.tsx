import { FilterX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/I18nProvider";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: string[];
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  tagOptions: string[];
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOptions: Array<{ value: string; label: string }>;
  activeFilterCount: number;
  onClearFilters: () => void;
  onClearTagSelection: () => void;
  showCategoryFilter?: boolean;
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700";

function FilterLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
      {children}
    </div>
  );
}

export function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categoryOptions,
  status,
  onStatusChange,
  statusOptions,
  selectedTags,
  onTagToggle,
  tagOptions,
  sortBy,
  onSortChange,
  sortOptions,
  activeFilterCount,
  onClearFilters,
  onClearTagSelection,
  showCategoryFilter = true,
}: FilterBarProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-[0_28px_80px_-50px_rgba(2,6,23,0.95)] md:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <FilterLabel>{t("filter.search")}</FilterLabel>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("filter.searchPlaceholder")}
              className="h-10 rounded-xl border-slate-200 bg-white pl-9 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div className={`grid gap-3 ${showCategoryFilter ? "sm:grid-cols-3 xl:min-w-[520px] xl:grid-cols-3" : "sm:grid-cols-2 xl:min-w-[360px] xl:grid-cols-2"}`}>
          {showCategoryFilter && (
          <div>
            <FilterLabel>{t("filter.category")}</FilterLabel>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="all">{t("filter.allCategories")}</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          )}

          <div>
            <FilterLabel>{t("filter.status")}</FilterLabel>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="all">{t("filter.allStatuses")}</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FilterLabel>{t("filter.sort")}</FilterLabel>
            <select
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
              className={`${selectClassName} w-full`}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t("filter.activeFilters", { count: activeFilterCount })}
          </div>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <FilterX className="mr-1 h-4 w-4" />
            {t("page.clearFilters")}
          </Button>
        </div>

        <div className="rounded-2xl bg-slate-50/80 px-3 py-3 dark:bg-slate-900/70">
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t("filter.tags")}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClearTagSelection}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                selectedTags.length === 0
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              }`}
            >
              {t("filter.allTags")}
            </button>
            {tagOptions.map((tag) => {
              const active = selectedTags.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagToggle(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

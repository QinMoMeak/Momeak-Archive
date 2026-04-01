import { FilterX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";

function FilterLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
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
}: FilterBarProps) {
  return (
    <div className="space-y-4 rounded-[24px] border border-white/70 bg-white/82 p-4 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.55)] backdrop-blur md:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <FilterLabel>{"\u641c\u7d22"}</FilterLabel>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={"\u641c\u7d22\u540d\u79f0\u3001\u6807\u7b7e\u3001\u5907\u6ce8\u3001\u6765\u6e90..."}
              className="h-10 rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px] xl:grid-cols-3">
          <div>
            <FilterLabel>{"\u5206\u7c7b"}</FilterLabel>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="all">{"\u5168\u90e8\u5206\u7c7b"}</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FilterLabel>{"\u72b6\u6001"}</FilterLabel>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="all">{"\u5168\u90e8\u72b6\u6001"}</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FilterLabel>{"\u6392\u5e8f"}</FilterLabel>
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

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {"\u5df2\u542f\u7528"}{" "}
            <span className="font-medium text-slate-800">{activeFilterCount}</span>{" "}
            {"\u4e2a\u7b5b\u9009\u6761\u4ef6"}
          </div>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <FilterX className="mr-1 h-4 w-4" />
            {"\u6e05\u7a7a\u7b5b\u9009"}
          </Button>
        </div>

        <div className="rounded-2xl bg-slate-50/80 px-3 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
            {"\u6807\u7b7e"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClearTagSelection}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                selectedTags.length === 0
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {"\u5168\u90e8\u6807\u7b7e"}
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
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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

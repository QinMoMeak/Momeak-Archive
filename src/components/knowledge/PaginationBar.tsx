import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/I18nProvider";

type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  pageSizeOptions?: number[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  pageSizeOptions = [],
  canGoPrevious,
  canGoNext,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const { t } = useI18n();

  if (totalItems === 0) {
    return null;
  }

  const showPageSizeSelector = Boolean(onPageSizeChange) && pageSizeOptions.length > 1;
  const showPageButtons = totalPages > 1;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("pagination.range", {
              start: startIndex,
              end: endIndex,
              total: totalItems,
            })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t("pagination.pageStatus", {
              page: currentPage,
              totalPages,
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          {showPageSizeSelector && (
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{t("pagination.perPage")}</span>
              <select
                value={pageSize}
                onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                aria-label={t("pagination.perPage")}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {t("pagination.perPageOption", { count: option })}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showPageButtons && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onPageChange(1)}
                disabled={!canGoPrevious}
                aria-label={t("pagination.firstPage")}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!canGoPrevious}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("pagination.previous")}
              </Button>
              <div className="min-w-[88px] text-center text-sm font-medium text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!canGoNext}
              >
                {t("pagination.next")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onPageChange(totalPages)}
                disabled={!canGoNext}
                aria-label={t("pagination.lastPage")}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

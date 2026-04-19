import { useEffect, useMemo, useState } from "react";

type UsePaginationOptions<T> = {
  items: T[];
  initialPageSize?: number;
  pageSizeOptions?: number[];
  resetKey?: string;
};

export type PaginationState<T> = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  setCurrentPage: (page: number) => void;
  goToFirstPage: () => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  goToLastPage: () => void;
  setPageSize: (pageSize: number) => void;
  resetPage: () => void;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), totalPages);
}

export function usePagination<T>({
  items,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  resetKey,
}: UsePaginationOptions<T>): PaginationState<T> {
  const normalizedPageSizeOptions = useMemo(
    () =>
      [...new Set([initialPageSize, ...pageSizeOptions])]
        .filter((value) => Number.isInteger(value) && value > 0)
        .sort((left, right) => left - right),
    [initialPageSize, pageSizeOptions],
  );
  const [pageSize, setPageSizeState] = useState(
    normalizedPageSizeOptions[0] ?? initialPageSize,
  );
  const [currentPage, setCurrentPageState] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPageState(1);
  }, [resetKey]);

  useEffect(() => {
    setCurrentPageState((current) => clampPage(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (normalizedPageSizeOptions.includes(pageSize)) {
      return;
    }

    setPageSizeState(normalizedPageSizeOptions[0] ?? initialPageSize);
  }, [initialPageSize, normalizedPageSizeOptions, pageSize]);

  const safeCurrentPage = clampPage(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(totalItems, safeCurrentPage * pageSize);
  const paginatedItems = useMemo(
    () => items.slice(startIndex === 0 ? 0 : startIndex - 1, endIndex),
    [endIndex, items, startIndex],
  );

  function setCurrentPage(page: number) {
    setCurrentPageState(clampPage(page, totalPages));
  }

  function setPageSize(pageSizeValue: number) {
    setPageSizeState(pageSizeValue);
    setCurrentPageState(1);
  }

  return {
    currentPage: safeCurrentPage,
    totalPages,
    pageSize,
    pageSizeOptions: normalizedPageSizeOptions,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
    canGoPrevious: safeCurrentPage > 1,
    canGoNext: safeCurrentPage < totalPages,
    setCurrentPage,
    goToFirstPage: () => setCurrentPage(1),
    goToPreviousPage: () => setCurrentPage(safeCurrentPage - 1),
    goToNextPage: () => setCurrentPage(safeCurrentPage + 1),
    goToLastPage: () => setCurrentPage(totalPages),
    setPageSize,
    resetPage: () => setCurrentPageState(1),
  };
}

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShoppingSheetTabsProps = {
  categories: string[];
  activeCategory: string;
  counts: Record<string, number>;
  isAdmin: boolean;
  title: string;
  helperText: string;
  addLabel: string;
  inputPlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  duplicateMessage: string;
  onChange: (category: string) => void;
  onCreateCategory: (name: string) => Promise<void> | void;
};

export function ShoppingSheetTabs({
  categories,
  activeCategory,
  counts,
  isAdmin,
  title,
  helperText,
  addLabel,
  inputPlaceholder,
  confirmLabel,
  cancelLabel,
  duplicateMessage,
  onChange,
  onCreateCategory,
}: ShoppingSheetTabsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdding) {
      setDraftName("");
      setError("");
      setIsSubmitting(false);
    }
  }, [isAdding]);

  async function handleCreate() {
    const name = draftName.trim();

    if (!name) {
      return;
    }

    if (categories.some((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError(duplicateMessage);
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      await onCreateCategory(name);
      setIsAdding(false);
      onChange(name);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : duplicateMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80 dark:shadow-[0_20px_52px_-42px_rgba(2,6,23,0.95)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</div>
          <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">{helperText}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const active = category === activeCategory;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChange(category)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                }`}
              >
                <span className="whitespace-nowrap">{category}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                    active
                      ? "bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-950"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {counts[category] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {isAdmin && !isAdding && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={() => setIsAdding(true)}
            title={addLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isAdmin && isAdding && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={inputPlaceholder}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setIsAdding(false)}
              >
                <X className="mr-1 h-4 w-4" />
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => void handleCreate()}
                disabled={isSubmitting || !draftName.trim()}
              >
                <Check className="mr-1 h-4 w-4" />
                {isSubmitting ? confirmLabel : confirmLabel}
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}

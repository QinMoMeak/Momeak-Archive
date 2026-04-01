import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
type CategoryManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleLabel: string;
  categories: string[];
  counts: Record<string, number>;
  onCreateCategory: (name: string) => Promise<void> | void;
  onRenameCategory: (oldName: string, newName: string) => Promise<void> | void;
  onDeleteCategory: (
    name: string,
    replacementName?: string,
  ) => Promise<void> | void;
};

const selectClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";

export function CategoryManagerDialog({
  open,
  onOpenChange,
  moduleLabel,
  categories,
  counts,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryManagerDialogProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [replacementMap, setReplacementMap] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNewCategoryName("");
      setEditingCategory(null);
      setEditingName("");
      setReplacementMap({});
      setError("");
      setPendingKey(null);
    }
  }, [open]);

  const sortedCategories = useMemo(() => [...categories], [categories]);

  async function handleCreate() {
    try {
      setError("");
      setPendingKey("create");
      await onCreateCategory(newCategoryName);
      setNewCategoryName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u65b0\u589e\u5206\u7c7b\u5931\u8d25\u3002",
      );
    } finally {
      setPendingKey(null);
    }
  }

  async function handleRename(oldName: string) {
    try {
      setError("");
      setPendingKey(`rename:${oldName}`);
      await onRenameCategory(oldName, editingName);
      setEditingCategory(null);
      setEditingName("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u91cd\u547d\u540d\u5931\u8d25\u3002",
      );
    } finally {
      setPendingKey(null);
    }
  }

  async function handleDelete(category: string, fallbackReplacement = "") {
    try {
      setError("");
      setPendingKey(`delete:${category}`);
      await onDeleteCategory(
        category,
        replacementMap[category] || fallbackReplacement,
      );
      setReplacementMap((current) => {
        const next = { ...current };
        delete next[category];
        return next;
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u5220\u9664\u5206\u7c7b\u5931\u8d25\u3002",
      );
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {"\u5206\u7c7b\u7ba1\u7406"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              {`\u5f53\u524d\u6a21\u5757\uff1a${moduleLabel}\u3002\u5728\u8fd9\u91cc\u53ef\u4ee5\u65b0\u589e\u3001\u91cd\u547d\u540d\u6216\u5220\u9664\u5206\u7c7b\uff0c\u5220\u9664\u65f6\u4f1a\u8981\u6c42\u4e3a\u65e7\u6761\u76ee\u6307\u5b9a\u66ff\u6362\u5206\u7c7b\u3002`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-medium text-slate-700">
              {"\u65b0\u589e\u5206\u7c7b"}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={"\u4f8b\u5982\uff1a\u4e34\u65f6\u5de5\u5177 / \u5468\u8fb9\u4e70\u624b"}
              />
              <Button
                onClick={handleCreate}
                disabled={pendingKey === "create"}
              >
                <Plus className="mr-2 h-4 w-4" />
                {pendingKey === "create"
                  ? "\u65b0\u589e\u4e2d..."
                  : "\u65b0\u589e\u5206\u7c7b"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {sortedCategories.map((category) => {
              const usageCount = counts[category] ?? 0;
              const replacementOptions = sortedCategories.filter(
                (item) => item !== category,
              );

              return (
                <div
                  key={category}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  {editingCategory === category ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => void handleRename(category)}
                          disabled={pendingKey === `rename:${category}`}
                        >
                          {pendingKey === `rename:${category}`
                            ? "\u4fdd\u5b58\u4e2d..."
                            : "\u4fdd\u5b58"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(null);
                            setEditingName("");
                          }}
                        >
                          {"\u53d6\u6d88"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {category}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {usageCount > 0
                              ? `\u5f53\u524d\u6709 ${usageCount} \u6761\u5185\u5bb9\u6b63\u5728\u4f7f\u7528`
                              : "\u5f53\u524d\u6682\u672a\u88ab\u6761\u76ee\u4f7f\u7528"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category);
                              setEditingName(category);
                            }}
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            {"\u91cd\u547d\u540d"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() =>
                              void handleDelete(category, replacementOptions[0] ?? "")
                            }
                            disabled={pendingKey === `delete:${category}`}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {pendingKey === `delete:${category}`
                              ? "\u5220\u9664\u4e2d..."
                              : "\u5220\u9664"}
                          </Button>
                        </div>
                      </div>

                      {usageCount > 0 && replacementOptions.length > 0 && (
                        <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                          <div className="text-sm text-slate-500">
                            {"\u5220\u9664\u540e\u66ff\u6362\u4e3a"}
                          </div>
                          <select
                            value={replacementMap[category] ?? replacementOptions[0] ?? ""}
                            onChange={(event) =>
                              setReplacementMap((current) => ({
                                ...current,
                                [category]: event.target.value,
                              }))
                            }
                            className={selectClassName}
                          >
                            {replacementOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

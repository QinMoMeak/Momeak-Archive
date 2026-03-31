import { useEffect, useMemo, useState } from "react";

import { moduleDefinitions } from "@/data/knowledge";
import { createEntryFromDraft, getEmptyDraft } from "@/lib/knowledge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeEntry, ModuleId, QuickAddDraft } from "@/types/knowledge";

type QuickAddEntryDialogProps = {
  moduleId: ModuleId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: string[];
  statusOptions: string[];
  onSubmit: (entry: KnowledgeEntry) => void;
};

const selectClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";

export function QuickAddEntryDialog({
  moduleId,
  open,
  onOpenChange,
  categoryOptions,
  statusOptions,
  onSubmit,
}: QuickAddEntryDialogProps) {
  const definition = moduleDefinitions[moduleId];
  const [draft, setDraft] = useState<QuickAddDraft>(getEmptyDraft(moduleId));
  const [error, setError] = useState("");

  const availableCategories = useMemo(
    () => Array.from(new Set([...definition.defaultCategories, ...categoryOptions])),
    [categoryOptions, definition.defaultCategories],
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set([...definition.defaultStatuses, ...statusOptions])),
    [definition.defaultStatuses, statusOptions],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const emptyDraft = getEmptyDraft(moduleId);
    emptyDraft.category = availableCategories[0] ?? "";
    emptyDraft.status = availableStatuses[0] ?? "";

    setDraft(emptyDraft);
    setError("");
  }, [availableCategories, availableStatuses, moduleId, open]);

  function updateDraft<K extends keyof QuickAddDraft>(
    key: K,
    value: QuickAddDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit() {
    if (!draft.name.trim()) {
      setError("\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002");
      return;
    }

    if (!draft.category.trim()) {
      setError("\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5206\u7c7b\u3002");
      return;
    }

    if (!draft.status.trim()) {
      setError("\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u72b6\u6001\u3002");
      return;
    }

    if (moduleId === "offline" && !draft.location.trim()) {
      setError("\u7ebf\u4e0b\u597d\u5e97\u81f3\u5c11\u9700\u8981\u586b\u5199\u5730\u70b9\u3002");
      return;
    }

    if (moduleId === "shopping" && !draft.platform.trim()) {
      setError("\u7f51\u8d2d\u597d\u7269\u81f3\u5c11\u9700\u8981\u586b\u5199\u5e73\u53f0\u3002");
      return;
    }

    if (moduleId === "websites" && !draft.domain.trim()) {
      setError("\u7f51\u7ad9\u6536\u96c6\u81f3\u5c11\u9700\u8981\u586b\u5199\u57df\u540d\u3002");
      return;
    }

    onSubmit(createEntryFromDraft(moduleId, draft));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {"\u5feb\u901f\u65b0\u589e\u6761\u76ee"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              {`\u5f53\u524d\u6a21\u5757\uff1a${definition.label}\u3002\u53ea\u586b\u5fc5\u8981\u5b57\u6bb5\u5373\u53ef\u52a0\u5165\u5217\u8868\uff0c\u5176\u4ed6\u5185\u5bb9\u540e\u7eed\u518d\u8865\u3002`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u540d\u79f0"}
              </label>
              <Input
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder={
                  "\u4f8b\u5982\uff1a\u5c71\u91ce\u98df\u5802 / 65W \u6c2e\u5316\u9553\u5145\u7535\u5668"
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u5206\u7c7b"}
              </label>
              <select
                value={draft.category}
                onChange={(event) => updateDraft("category", event.target.value)}
                className={selectClassName}
              >
                {availableCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u72b6\u6001"}
              </label>
              <select
                value={draft.status}
                onChange={(event) => updateDraft("status", event.target.value)}
                className={selectClassName}
              >
                {availableStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {moduleId === "offline" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u5730\u70b9"}
                </label>
                <Input
                  value={draft.location}
                  onChange={(event) => updateDraft("location", event.target.value)}
                  placeholder={"\u4f8b\u5982\uff1a\u676d\u5dde \u00b7 \u897f\u6e56\u533a"}
                />
              </div>
            )}

            {moduleId === "offline" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u8bc4\u5206"}
                </label>
                <Input
                  value={draft.rating}
                  onChange={(event) => updateDraft("rating", event.target.value)}
                  placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982 4.8"}
                />
              </div>
            )}

            {moduleId === "shopping" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u5e73\u53f0"}
                </label>
                <Input
                  value={draft.platform}
                  onChange={(event) => updateDraft("platform", event.target.value)}
                  placeholder={"\u4f8b\u5982\uff1a\u6dd8\u5b9d / \u4eac\u4e1c"}
                />
              </div>
            )}

            {moduleId === "shopping" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u4ef7\u683c"}
                </label>
                <Input
                  value={draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                  placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982 99"}
                />
              </div>
            )}

            {moduleId === "websites" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u57df\u540d"}
                </label>
                <Input
                  value={draft.domain}
                  onChange={(event) => updateDraft("domain", event.target.value)}
                  placeholder={"cloudconvert.com"}
                />
              </div>
            )}

            {moduleId === "websites" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u53ef\u8bbf\u95ee"}
                </label>
                <select
                  value={draft.access}
                  onChange={(event) => updateDraft("access", event.target.value)}
                  className={selectClassName}
                >
                  <option value="\u53ef\u8bbf\u95ee">
                    {"\u53ef\u8bbf\u95ee"}
                  </option>
                  <option value="\u90e8\u5206\u53ef\u8bbf\u95ee">
                    {"\u90e8\u5206\u53ef\u8bbf\u95ee"}
                  </option>
                  <option value="\u4e0d\u53ef\u8bbf\u95ee">
                    {"\u4e0d\u53ef\u8bbf\u95ee"}
                  </option>
                </select>
              </div>
            )}

            {moduleId === "websites" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u7f51\u7ad9\u5185\u5bb9"}
                </label>
                <Input
                  value={draft.content}
                  onChange={(event) => updateDraft("content", event.target.value)}
                  placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982\uff1a\u5728\u7ebf\u683c\u5f0f\u8f6c\u6362"}
                />
              </div>
            )}

            {moduleId === "websites" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {"\u7528\u9014"}
                </label>
                <Input
                  value={draft.purpose}
                  onChange={(event) => updateDraft("purpose", event.target.value)}
                  placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982\uff1a\u5904\u7406\u56fe\u7247\u548c\u6587\u6863"}
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u6807\u7b7e"}
              </label>
              <Input
                value={draft.tags}
                onChange={(event) => updateDraft("tags", event.target.value)}
                placeholder={"\u591a\u4e2a\u6807\u7b7e\u7528\u4e2d\u6587\u9017\u53f7\u6216\u82f1\u6587\u9017\u53f7\u5206\u9694"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u6765\u6e90"}
              </label>
              <Input
                value={draft.source}
                onChange={(event) => updateDraft("source", event.target.value)}
                placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982\uff1a\u670b\u53cb\u63a8\u8350 / \u81ea\u5df1\u4e70\u8fc7 / \u641c\u7d22\u53d1\u73b0"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {"\u5907\u6ce8"}
              </label>
              <Textarea
                value={draft.note}
                onChange={(event) => updateDraft("note", event.target.value)}
                placeholder={"\u53ef\u9009\uff0c\u5148\u8bb0\u6700\u5173\u952e\u7684\u4e00\u53e5\u5224\u65ad\u5373\u53ef"}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {"\u53d6\u6d88"}
            </Button>
            <Button onClick={handleSubmit}>
              {"\u4fdd\u5b58\u5e76\u52a0\u5165\u5217\u8868"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

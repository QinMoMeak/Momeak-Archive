import { useEffect, useMemo, useState } from "react";

import { AiAssistPanel } from "@/components/knowledge/AiAssistPanel";
import { Badge } from "@/components/ui/badge";
import { moduleDefinitions } from "@/data/knowledge";
import {
  getEmptyDraft,
  getUniqueValues,
  mergeDraftWithAiResult,
} from "@/lib/knowledge";
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
import type { AiSuggestionResult } from "@/types/ai";
import type { ModuleId, QuickAddDraft } from "@/types/knowledge";

type QuickAddEntryDialogProps = {
  moduleId: ModuleId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions: string[];
  statusOptions: string[];
  initialDraft?: QuickAddDraft | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  onAiParse: (rawText: string) => Promise<AiSuggestionResult>;
  onCreateCategory?: (name: string) => Promise<void> | void;
  onSubmit: (draft: QuickAddDraft) => Promise<void> | void;
};

const selectClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";

export function QuickAddEntryDialog({
  moduleId,
  open,
  onOpenChange,
  categoryOptions,
  statusOptions,
  initialDraft,
  title,
  description,
  submitLabel,
  onAiParse,
  onCreateCategory,
  onSubmit,
}: QuickAddEntryDialogProps) {
  const definition = moduleDefinitions[moduleId];
  const [draft, setDraft] = useState<QuickAddDraft>(getEmptyDraft(moduleId));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState<AiSuggestionResult | null>(null);

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

    if (initialDraft) {
      setDraft(initialDraft);
    } else {
      const emptyDraft = getEmptyDraft(moduleId);
      emptyDraft.category = availableCategories[0] ?? "";
      emptyDraft.status = availableStatuses[0] ?? "";
      setDraft(emptyDraft);
    }
    setError("");
    setAiError("");
    setIsSubmitting(false);
    setIsAiParsing(false);
    setAiResult(null);
    setAiRawText("");
  }, [availableCategories, availableStatuses, initialDraft, moduleId, open]);

  function updateDraft<K extends keyof QuickAddDraft>(
    key: K,
    value: QuickAddDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "category") {
      setAiResult((current) =>
        current
          ? {
              ...current,
              category: String(value),
              unmatchedCategory: "",
              needsCategoryConfirmation: false,
            }
          : current,
      );
    }

    if (key === "status") {
      setAiResult((current) =>
        current
          ? {
              ...current,
              status: String(value),
              unmatchedStatus: "",
              needsStatusConfirmation: false,
            }
          : current,
      );
    }
  }

  async function handleAiParse() {
    if (!aiRawText.trim()) {
      setAiError("请先输入一段原始文本，再开始 AI 解析。");
      return;
    }

    try {
      setAiError("");
      setIsAiParsing(true);
      const result = await onAiParse(aiRawText);
      setAiResult(result);
      setDraft((current) => mergeDraftWithAiResult(current, result));
    } catch (parseError) {
      setAiError(
        parseError instanceof Error
          ? parseError.message
          : "AI 解析失败，请稍后重试或继续手动录入。",
      );
    } finally {
      setIsAiParsing(false);
    }
  }

  async function handleCreateSuggestedCategory(name: string) {
    if (!onCreateCategory) {
      return;
    }

    try {
      setAiError("");
      await onCreateCategory(name);
      updateDraft("category", name);
      setAiResult((current) =>
        current
          ? {
              ...current,
              category: name,
              unmatchedCategory: "",
              needsCategoryConfirmation: false,
              availableCategories: getUniqueValues([
                ...current.availableCategories,
                name,
              ]),
              filledFields: current.filledFields.includes("category")
                ? current.filledFields
                : [...current.filledFields, "category"],
            }
          : current,
      );
    } catch (createError) {
      setAiError(
        createError instanceof Error
          ? createError.message
          : "新增分类失败，请稍后重试。",
      );
    }
  }

  const aiFilledFields = useMemo(
    () => new Set(aiResult?.filledFields ?? []),
    [aiResult],
  );

  function renderFieldLabel(label: string, field: keyof QuickAddDraft) {
    return (
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {aiFilledFields.has(field) && (
          <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
            AI 已填充
          </Badge>
        )}
      </div>
    );
  }

  async function handleSubmit() {
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

    if (moduleId === "websites" && !draft.domain.trim()) {
      setError("\u7f51\u7ad9\u6536\u96c6\u81f3\u5c11\u9700\u8981\u586b\u5199\u57df\u540d\u3002");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      await onSubmit(draft);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "\u5199\u5165\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {title ?? "\u5feb\u901f\u65b0\u589e\u6761\u76ee"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              {description ??
                `\u5f53\u524d\u6a21\u5757\uff1a${definition.label}\u3002\u53ea\u586b\u5fc5\u8981\u5b57\u6bb5\u5373\u53ef\u52a0\u5165\u5217\u8868\uff0c\u5176\u4ed6\u5185\u5bb9\u540e\u7eed\u518d\u8865\u3002`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[80dvh] space-y-5 overflow-y-auto p-6">
          <AiAssistPanel
            moduleId={moduleId}
            rawText={aiRawText}
            onRawTextChange={setAiRawText}
            onParse={() => void handleAiParse()}
            isParsing={isAiParsing}
            error={aiError}
            result={aiResult}
            onCreateSuggestedCategory={
              onCreateCategory
                ? (name) => handleCreateSuggestedCategory(name)
                : undefined
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {renderFieldLabel("名称", "name")}
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
                {renderFieldLabel("分类", "category")}
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
                {renderFieldLabel("状态", "status")}
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
                  {renderFieldLabel("地点", "location")}
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
                  {renderFieldLabel("评分", "rating")}
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
                  {renderFieldLabel("平台", "platform")}
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
                  {renderFieldLabel("价格", "price")}
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
                  {renderFieldLabel("域名", "domain")}
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
                  {renderFieldLabel("可访问", "access")}
                </label>
                <select
                  value={draft.access}
                  onChange={(event) => updateDraft("access", event.target.value)}
                  className={selectClassName}
                >
                  <option value={"\u53ef\u8bbf\u95ee"}>
                    {"\u53ef\u8bbf\u95ee"}
                  </option>
                  <option value={"\u90e8\u5206\u53ef\u8bbf\u95ee"}>
                    {"\u90e8\u5206\u53ef\u8bbf\u95ee"}
                  </option>
                  <option value={"\u4e0d\u53ef\u8bbf\u95ee"}>
                    {"\u4e0d\u53ef\u8bbf\u95ee"}
                  </option>
                </select>
              </div>
            )}

            {moduleId === "websites" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {renderFieldLabel("网站内容", "content")}
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
                  {renderFieldLabel("用途", "purpose")}
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
                {renderFieldLabel("标签", "tags")}
              </label>
              <Input
                value={draft.tags}
                onChange={(event) => updateDraft("tags", event.target.value)}
                placeholder={"\u591a\u4e2a\u6807\u7b7e\u7528\u4e2d\u6587\u9017\u53f7\u6216\u82f1\u6587\u9017\u53f7\u5206\u9694"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {renderFieldLabel("来源", "source")}
              </label>
              <Input
                value={draft.source}
                onChange={(event) => updateDraft("source", event.target.value)}
                placeholder={"\u53ef\u9009\uff0c\u4f8b\u5982\uff1a\u670b\u53cb\u63a8\u8350 / \u81ea\u5df1\u4e70\u8fc7 / \u641c\u7d22\u53d1\u73b0"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {renderFieldLabel("简短备注", "note")}
              </label>
              <Textarea
                value={draft.note}
                onChange={(event) => updateDraft("note", event.target.value)}
                placeholder={
                  "\u53ef\u9009\uff0c\u7528\u4e00\u4e24\u53e5\u8bdd\u6982\u62ec\u8fd9\u6761\u8bb0\u5f55\u7684\u6838\u5fc3\u5224\u65ad"
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {renderFieldLabel("详细 Markdown 内容", "markdownContent")}
              </label>
              <Textarea
                value={draft.markdownContent}
                onChange={(event) =>
                  updateDraft("markdownContent", event.target.value)
                }
                placeholder={
                  "\u53ef\u9009\uff0c\u652f\u6301\u6807\u9898\u3001\u5217\u8868\u3001\u5f15\u7528\u3001\u94fe\u63a5\u7b49\uff0c\u4f1a\u5199\u5165 content/<module>/<id>.md"
                }
                className="min-h-40"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {"\u53d6\u6d88"}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? "\u5199\u5165\u4e2d..."
                : submitLabel ?? "\u4fdd\u5b58\u5e76\u5199\u5165\u4ed3\u5e93"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, MapPin, Navigation, Sparkles } from "lucide-react";

import { AiAssistPanel } from "@/components/knowledge/AiAssistPanel";
import { AiCandidateReviewDialog } from "@/components/knowledge/AiCandidateReviewDialog";
import { Badge } from "@/components/ui/badge";
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
import { moduleDefinitions } from "@/data/knowledge";
import {
  fetchOfflineIpFallbackLocation,
  geocodeOfflineLocation,
  reverseGeocodeOfflineLocation,
} from "@/lib/knowledge-api";
import { getEmptyDraft, getUniqueValues, mergeDraftWithAiResult } from "@/lib/knowledge";
import type { AiParseMode, AiSuggestionResult } from "@/types/ai";
import type {
  BatchCreateKnowledgeEntriesResponse,
  ModuleId,
  QuickAddDraft,
} from "@/types/knowledge";
import type { OfflineLocationResult } from "@/types/location";

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
  onAiParse: (rawText: string, mode: AiParseMode) => Promise<AiSuggestionResult>;
  onCreateCategory?: (name: string) => Promise<void> | void;
  onSubmit: (draft: QuickAddDraft) => Promise<void> | void;
  onBatchSubmit?: (
    drafts: QuickAddDraft[],
  ) => Promise<BatchCreateKnowledgeEntriesResponse | void>;
};

const selectClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-800";

const rawContentTypeOptions = [
  "text",
  "url",
  "image",
  "mixed",
  "note",
  "review",
  "lyrics",
  "screenshot-note",
];

function mapLocationResultToDraft(result: OfflineLocationResult) {
  const location = result.locationText || result.formattedAddress || result.city || result.province;

  return {
    location,
    locationText: result.locationText || location,
    formattedAddress: result.formattedAddress || "",
    province: result.province || "",
    city: result.city || "",
    district: result.district || "",
    adcode: result.adcode || "",
    lng: typeof result.lng === "number" ? String(result.lng) : "",
    lat: typeof result.lat === "number" ? String(result.lat) : "",
    locationSource: result.locationSource,
    locationAccuracy: result.locationAccuracy,
    locationRectangle: result.locationRectangle || "",
  };
}

function LocationSummary({ draft }: { draft: QuickAddDraft }) {
  const coordinateLabel =
    draft.lng && draft.lat ? `${draft.lng}, ${draft.lat}` : "未记录精确坐标";
  const sourceLabel =
    {
      browser_geolocation: "浏览器定位",
      ip_fallback: "IP 兜底定位",
      geocode: "地址解析",
      manual: "手动录入",
    }[draft.locationSource] ?? "未标记";
  const accuracyLabel =
    draft.locationAccuracy === "approximate" ? "近似位置" : "精确位置";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            详细地址
          </div>
          <div className="mt-1 break-words text-slate-700 dark:text-slate-200">
            {draft.formattedAddress || "未解析"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            经纬度
          </div>
          <div className="mt-1 break-words text-slate-700 dark:text-slate-200">
            {coordinateLabel}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            定位来源
          </div>
          <div className="mt-1 text-slate-700 dark:text-slate-200">{sourceLabel}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            精度级别
          </div>
          <div className="mt-1 text-slate-700 dark:text-slate-200">{accuracyLabel}</div>
        </div>
      </div>
      {draft.locationAccuracy === "approximate" && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          当前是基于 IP 的近似位置，只能反映城市级范围，不代表真实当前位置。
          {draft.locationRectangle && (
            <div className="mt-1 break-all text-[11px] opacity-80">
              rectangle: {draft.locationRectangle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickAddEntryDialog(props: QuickAddEntryDialogProps) {
  const {
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
    onBatchSubmit,
  } = props;
  const definition = moduleDefinitions[moduleId];
  const [draft, setDraft] = useState<QuickAddDraft>(getEmptyDraft(moduleId));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState<AiSuggestionResult | null>(null);
  const [aiParseMode, setAiParseMode] = useState<AiParseMode>("single");
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [candidateSubmitError, setCandidateSubmitError] = useState("");
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

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
      setAiRawText(initialDraft.rawContent || "");
    } else {
      const emptyDraft = getEmptyDraft(moduleId);
      emptyDraft.category = availableCategories[0] ?? "";
      emptyDraft.status = availableStatuses[0] ?? "";
      setDraft(emptyDraft);
      setAiRawText("");
    }

    setError("");
    setAiError("");
    setCandidateSubmitError("");
    setIsSubmitting(false);
    setIsAiParsing(false);
    setIsBatchSubmitting(false);
    setAiParseMode("single");
    setAiResult(null);
    setIsCandidateDialogOpen(false);
    setLocationNotice("");
    setLocationError("");
    setIsResolvingLocation(false);
  }, [availableCategories, availableStatuses, initialDraft, moduleId, open]);

  function updateDraft<K extends keyof QuickAddDraft>(key: K, value: QuickAddDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(moduleId === "offline" && key === "locationText"
        ? { location: String(value) }
        : {}),
    }));
  }

  async function handleAiParse() {
    if (!aiRawText.trim()) {
      setAiError("请先输入一段原始文本，再开始 AI 解析。");
      return;
    }

    try {
      setAiError("");
      setCandidateSubmitError("");
      setIsAiParsing(true);
      const result = await onAiParse(aiRawText, aiParseMode);
      setAiResult(result);

      if (result.mode === "single") {
        setDraft((current) => {
          const merged = mergeDraftWithAiResult(current, result.entry);

          if (moduleId === "offline" && !merged.locationText && merged.location) {
            merged.locationText = merged.location;
          }

          return merged;
        });
        setIsCandidateDialogOpen(false);
        return;
      }

      if (result.entries.length === 0) {
        setAiError("AI 没有识别出可用条目，请调整输入后再试。");
        return;
      }

      setIsCandidateDialogOpen(true);
    } catch (parseError) {
      setAiError(
        parseError instanceof Error ? parseError.message : "AI 解析失败，请稍后再试。",
      );
    } finally {
      setIsAiParsing(false);
    }
  }

  const aiFilledFields = useMemo(
    () => new Set(aiResult?.mode === "single" ? aiResult.entry.filledFields : []),
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

  function applyLocationResult(result: OfflineLocationResult) {
    setDraft((current) => ({
      ...current,
      ...mapLocationResultToDraft(result),
    }));
    setLocationNotice(result.message || result.warning || "地点信息已更新。");
    setLocationError("");
  }

  async function handleOfflineLocationFallback(message?: string) {
    const fallbackResult = await fetchOfflineIpFallbackLocation();
    applyLocationResult({
      ...fallbackResult,
      message: fallbackResult.message || message || fallbackResult.warning,
    });
  }

  async function handleLocateCurrentPosition() {
    if (!("geolocation" in navigator)) {
      setIsResolvingLocation(true);
      try {
        await handleOfflineLocationFallback("当前浏览器不支持精确定位，已回退到 IP 粗定位。");
      } catch (resolveError) {
        setLocationError(
          resolveError instanceof Error ? resolveError.message : "无法获取当前位置。",
        );
      } finally {
        setIsResolvingLocation(false);
      }
      return;
    }

    setIsResolvingLocation(true);
    setLocationNotice("");
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await reverseGeocodeOfflineLocation({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
            locationText: draft.locationText || draft.location,
          });
          applyLocationResult(result);
        } catch (resolveError) {
          setLocationError(
            resolveError instanceof Error ? resolveError.message : "逆地理编码失败。",
          );
        } finally {
          setIsResolvingLocation(false);
        }
      },
      async () => {
        try {
          await handleOfflineLocationFallback("定位授权失败，已回退到 IP 粗定位。");
        } catch (resolveError) {
          setLocationError(
            resolveError instanceof Error ? resolveError.message : "无法获取当前位置。",
          );
        } finally {
          setIsResolvingLocation(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function handleResolveLocationText() {
    if (!draft.locationText.trim()) {
      setLocationError("请先输入地点文本，再解析地址。");
      return;
    }

    try {
      setIsResolvingLocation(true);
      setLocationNotice("");
      setLocationError("");
      const result = await geocodeOfflineLocation({
        address: draft.locationText,
        city: draft.city,
      });
      applyLocationResult(result);
    } catch (resolveError) {
      setLocationError(
        resolveError instanceof Error ? resolveError.message : "地址解析失败。",
      );
    } finally {
      setIsResolvingLocation(false);
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
        current?.mode === "single"
          ? {
              ...current,
              entry: {
                ...current.entry,
                category: name,
                unmatchedCategory: "",
                needsCategoryConfirmation: false,
                availableCategories: getUniqueValues([
                  ...current.entry.availableCategories,
                  name,
                ]),
                filledFields: current.entry.filledFields.includes("category")
                  ? current.entry.filledFields
                  : [...current.entry.filledFields, "category"],
              },
            }
          : current,
      );
    } catch (createError) {
      setAiError(
        createError instanceof Error ? createError.message : "新增分类失败，请稍后再试。",
      );
    }
  }

  async function handleSubmit() {
    if (moduleId === "inbox") {
      if (!draft.rawContent.trim()) {
        setError("待处理模块至少需要填写原始内容。");
        return;
      }
    } else {
      if (!draft.name.trim()) {
        setError("名称不能为空。");
        return;
      }

      if (!draft.category.trim()) {
        setError("请至少选择一个分类。");
        return;
      }

      if (!draft.status.trim()) {
        setError("请至少选择一个状态。");
        return;
      }

      if (moduleId === "offline" && !draft.locationText.trim() && !draft.location.trim()) {
        setError("线下好店至少需要填写地点文本。");
        return;
      }

      if (moduleId === "websites" && !draft.domain.trim()) {
        setError("网站收集至少需要填写域名。");
        return;
      }
    }

    try {
      setError("");
      setIsSubmitting(true);
      await onSubmit(draft);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "写入失败，请稍后再试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBatchConfirm(drafts: QuickAddDraft[]) {
    if (!onBatchSubmit) {
      return;
    }

    try {
      setCandidateSubmitError("");
      setIsBatchSubmitting(true);
      const result = await onBatchSubmit(drafts);

      if (result && result.createdEntries.length === 0) {
        setCandidateSubmitError(
          result.failures[0]?.message || "没有候选条目被创建，请先调整候选结果。",
        );
        return;
      }

      setIsCandidateDialogOpen(false);
      onOpenChange(false);
    } catch (batchError) {
      setCandidateSubmitError(
        batchError instanceof Error ? batchError.message : "批量创建失败，请稍后再试。",
      );
    } finally {
      setIsBatchSubmitting(false);
    }
  }

  const isInbox = moduleId === "inbox";
  const isOffline = moduleId === "offline";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl rounded-[28px] border-0 p-0">
          <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white dark:border-slate-800 dark:bg-slate-950">
            <DialogHeader>
              <DialogTitle className="text-xl">{title ?? "快速新增条目"}</DialogTitle>
              <DialogDescription className="mt-2 text-slate-300">
                {description ??
                  `当前模块：${definition.label}。先填最少字段即可，其余内容可以后续再补。`}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="scrollbar-none max-h-[80dvh] space-y-5 overflow-y-auto bg-white p-6 dark:bg-slate-950">
            <AiAssistPanel
              moduleId={moduleId}
              rawText={aiRawText}
              parseMode={aiParseMode}
              onParseModeChange={setAiParseMode}
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
              <div className={isInbox ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {renderFieldLabel(isInbox ? "标题（可选）" : "名称", "name")}
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder={
                    isInbox
                      ? "可留空，保存时会根据原始内容自动生成短标题"
                      : "例如：山野食堂 / 65W 氮化镓充电器"
                  }
                />
              </div>

              {isInbox && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {renderFieldLabel("原始内容", "rawContent")}
                  </label>
                  <Textarea
                    value={draft.rawContent}
                    onChange={(event) => updateDraft("rawContent", event.target.value)}
                    placeholder="把原始文本、链接、截图说明、灵感、评价或聊天片段直接保存进来。"
                    className="min-h-40"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
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

              {isOffline && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {renderFieldLabel("地点文本", "locationText")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isResolvingLocation}
                          onClick={() => void handleLocateCurrentPosition()}
                        >
                          {isResolvingLocation ? (
                            <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Navigation className="mr-1 h-4 w-4" />
                          )}
                          获取当前位置
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isResolvingLocation || !draft.locationText.trim()}
                          onClick={() => void handleResolveLocationText()}
                        >
                          <MapPin className="mr-1 h-4 w-4" />
                          解析地点
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={draft.locationText}
                      onChange={(event) => updateDraft("locationText", event.target.value)}
                      placeholder="例如：杭州西湖区、苏州平江路、上海静安寺附近"
                    />
                    <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      优先使用浏览器精确定位；若授权失败，则回退到高德 IP 粗定位。IP 结果只代表近似城市范围。
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("评分", "rating")}
                    </label>
                    <Input
                      value={draft.rating}
                      onChange={(event) => updateDraft("rating", event.target.value)}
                      placeholder="可选，例如 4.8"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <LocationSummary draft={draft} />
                  </div>

                  {(locationNotice || locationError) && (
                    <div className="space-y-2 md:col-span-2">
                      {locationNotice && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {locationNotice}
                        </div>
                      )}
                      {locationError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                          {locationError}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {moduleId === "shopping" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("平台", "platform")}
                    </label>
                    <Input value={draft.platform} onChange={(event) => updateDraft("platform", event.target.value)} placeholder="例如：淘宝 / 京东" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("价格", "price")}
                    </label>
                    <Input value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} placeholder="可选，例如 99" />
                  </div>
                </>
              )}

              {moduleId === "websites" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("域名", "domain")}
                    </label>
                    <Input value={draft.domain} onChange={(event) => updateDraft("domain", event.target.value)} placeholder="cloudconvert.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("可访问", "access")}
                    </label>
                    <select value={draft.access} onChange={(event) => updateDraft("access", event.target.value)} className={selectClassName}>
                      <option value="可访问">可访问</option>
                      <option value="部分可访问">部分可访问</option>
                      <option value="不可访问">不可访问</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("网站内容", "content")}
                    </label>
                    <Input value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} placeholder="例如：在线格式转换" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("用途", "purpose")}
                    </label>
                    <Input value={draft.purpose} onChange={(event) => updateDraft("purpose", event.target.value)} placeholder="例如：处理图片和文档" />
                  </div>
                </>
              )}

              {isInbox && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("内容类型", "rawContentType")}
                    </label>
                    <select value={draft.rawContentType} onChange={(event) => updateDraft("rawContentType", event.target.value)} className={selectClassName}>
                      {rawContentTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("建议去向", "suggestedTargetModule")}
                    </label>
                    <Input value={draft.suggestedTargetModule} onChange={(event) => updateDraft("suggestedTargetModule", event.target.value)} placeholder="例如：websites / shopping / offline / inbox" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("AI 摘要", "aiSummary")}
                    </label>
                    <Textarea value={draft.aiSummary} onChange={(event) => updateDraft("aiSummary", event.target.value)} placeholder="可由 AI 自动生成，也可手动补充。" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {renderFieldLabel("AI 建议", "aiSuggestions")}
                    </label>
                    <Textarea value={draft.aiSuggestions} onChange={(event) => updateDraft("aiSuggestions", event.target.value)} placeholder="例如：建议整理后转入网站收集，或建议保留原文继续观察。" />
                  </div>
                </>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {renderFieldLabel("标签", "tags")}
                </label>
                <Input value={draft.tags} onChange={(event) => updateDraft("tags", event.target.value)} placeholder="多个标签用中文逗号或英文逗号分隔" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {renderFieldLabel("来源", "source")}
                </label>
                <Input value={draft.source} onChange={(event) => updateDraft("source", event.target.value)} placeholder="可选，例如：朋友推荐 / 聊天记录 / 搜索发现" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {renderFieldLabel("简短备注", "note")}
                </label>
                <Textarea value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} placeholder="可选，用一两句话概括这条记录的核心判断。" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {renderFieldLabel("详细 Markdown 内容", "markdownContent")}
                </label>
                <Textarea value={draft.markdownContent} onChange={(event) => updateDraft("markdownContent", event.target.value)} placeholder="可选，支持标题、列表、引用、链接等，会写入 content/<module>/<id>.md" className="min-h-40" />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    写入中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {submitLabel ?? "保存并写入仓库"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AiCandidateReviewDialog
        open={isCandidateDialogOpen}
        onOpenChange={setIsCandidateDialogOpen}
        moduleId={moduleId}
        entries={aiResult?.mode === "multiple" ? aiResult.entries : []}
        warnings={aiResult?.mode === "multiple" ? aiResult.warnings : []}
        isSubmitting={isBatchSubmitting}
        error={candidateSubmitError}
        onConfirm={(drafts) => handleBatchConfirm(drafts)}
      />
    </>
  );
}

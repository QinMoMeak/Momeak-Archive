import { LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";

import { AiImageUpload } from "@/components/knowledge/AiImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiInputImage, AiParseMode, AiSuggestionResult } from "@/types/ai";
import type { ModuleId } from "@/types/knowledge";

type AiAssistPanelProps = {
  moduleId: ModuleId;
  rawText: string;
  images: AiInputImage[];
  parseMode: AiParseMode;
  onParseModeChange: (mode: AiParseMode) => void;
  onRawTextChange: (value: string) => void;
  onSelectImages: (files: FileList | File[]) => void;
  onRemoveImage: (imageId: string) => void;
  onParse: () => void;
  isParsing: boolean;
  error: string;
  result: AiSuggestionResult | null;
  onCreateSuggestedCategory?: (name: string) => Promise<void> | void;
};

function InfoList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div
        className={`text-sm font-medium ${
          tone === "warning"
            ? "text-amber-900 dark:text-amber-200"
            : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={`${title}-${item}`}
            variant={tone === "warning" ? "outline" : "secondary"}
            className="whitespace-normal rounded-full"
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getParsingSteps(moduleId: ModuleId, mode: AiParseMode, hasImages: boolean) {
  if (hasImages) {
    if (moduleId === "shopping") {
      return mode === "multiple"
        ? ["正在识别截图中的多个商品", "正在生成候选结果"]
        : ["正在识别截图中的商品信息", "正在回填购物条目字段"];
    }

    if (moduleId === "songs") {
      return mode === "multiple"
        ? ["正在拆分歌单截图中的多首歌曲", "正在生成候选歌曲记录"]
        : ["正在识别截图里的歌曲线索", "正在回填歌曲字段"];
    }

    return mode === "multiple"
      ? ["正在上传图片并拆分多个对象", "正在生成候选结果"]
      : ["正在识别图片内容", "正在生成结构化结果"];
  }

  if (moduleId === "websites") {
    return mode === "multiple"
      ? ["正在读取多个网站内容", "正在拆分并分析多个网站"]
      : ["正在读取网页内容", "正在分析网站用途"];
  }

  if (moduleId === "inbox") {
    return mode === "multiple"
      ? ["正在拆分多条原始内容", "正在生成摘要与整理建议"]
      : ["正在理解原始内容", "正在生成摘要与整理建议"];
  }

  if (moduleId === "songs") {
    return mode === "multiple"
      ? ["正在拆分多首歌曲线索", "正在生成候选歌曲记录"]
      : ["正在提取歌曲名、歌手和场景信息", "正在整理可回填字段"];
  }

  return mode === "multiple"
    ? ["正在识别多个对象", "正在生成候选结果"]
    : ["正在提取结构化字段", "正在整理可回填内容"];
}

function getInputPlaceholder(moduleId: ModuleId) {
  if (moduleId === "songs") {
    return "可粘贴歌词片段、歌名 + 歌手、聊天记录、KTV 清单、评论区描述或歌单文本";
  }

  return "可粘贴商品清单、订单摘要、购买评价、网站合集、聊天摘录或备注说明";
}

function getImageHelperText(moduleId: ModuleId) {
  if (moduleId === "songs") {
    return "支持歌单截图、音乐播放列表、KTV 点歌记录和短视频配乐截图，也可与文本一起解析。";
  }

  return "支持商品截图、订单截图、评价截图和详情页截图。可仅上传图片，也可与文本一起解析。";
}

function getParseHint(moduleId: ModuleId, parseMode: AiParseMode, hasImages: boolean) {
  if (hasImages) {
    return moduleId === "songs"
      ? "上传图片后会结合可见歌名、歌手、歌词和上下文一起分析。"
      : "上传图片后会结合可见内容与文本上下文一起分析。";
  }

  if (parseMode === "multiple") {
    return moduleId === "songs"
      ? "多条解析适合歌单、榜单和截图合集，不会直接入库，确认后才会批量创建。"
      : "多条解析不会直接入库，确认后才会批量创建。";
  }

  return moduleId === "songs"
    ? "单条解析会尽量把输入整理成一条歌曲记录，适合歌词片段或单首歌线索。"
    : "单条解析会尽量把整段内容聚合成一条记录。";
}

export function AiAssistPanel({
  moduleId,
  rawText,
  images,
  parseMode,
  onParseModeChange,
  onRawTextChange,
  onSelectImages,
  onRemoveImage,
  onParse,
  isParsing,
  error,
  result,
  onCreateSuggestedCategory,
}: AiAssistPanelProps) {
  const isSingle = result?.mode === "single";
  const singleEntry = isSingle ? result.entry : null;
  const hasCategoryMismatch =
    Boolean(singleEntry?.needsCategoryConfirmation) && Boolean(singleEntry?.unmatchedCategory);
  const hasStatusMismatch =
    Boolean(singleEntry?.needsStatusConfirmation) && Boolean(singleEntry?.unmatchedStatus);
  const parsingSteps = getParsingSteps(moduleId, parseMode, images.length > 0);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            <Sparkles className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            AI 辅助解析
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            支持文本、截图或两者一起输入。单条解析会直接回填表单，多条解析会先生成候选结果供你确认。
          </p>
        </div>

        {result?.mode === "single" && (
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            已填充 {result.entry.filledFields.length} 个字段
          </Badge>
        )}

        {result?.mode === "multiple" && (
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            已识别 {result.entries.length} 条候选
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => onParseModeChange("single")}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              parseMode === "single"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            单条解析
          </button>
          <button
            type="button"
            onClick={() => onParseModeChange("multiple")}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              parseMode === "multiple"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            多条解析
          </button>
        </div>

        {parseMode === "multiple" && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
            适合榜单、表格、合集、推荐清单和多项列表。AI 会先拆成候选结果，再由你确认是否批量创建。
          </div>
        )}

        <Textarea
          value={rawText}
          onChange={(event) => onRawTextChange(event.target.value)}
          placeholder={getInputPlaceholder(moduleId)}
          className="min-h-28 bg-white dark:bg-slate-950"
        />

        <AiImageUpload
          images={images}
          onSelectFiles={onSelectImages}
          onRemoveImage={onRemoveImage}
          disabled={isParsing}
          helperText={getImageHelperText(moduleId)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onParse} disabled={isParsing || (!rawText.trim() && images.length === 0)}>
            {isParsing ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isParsing ? parsingSteps[0] : "AI 解析"}
          </Button>
          <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {getParseHint(moduleId, parseMode, images.length > 0)}
          </div>
        </div>

        {isParsing && parsingSteps.length > 1 && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
            <div className="flex items-center gap-2 font-medium">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {parsingSteps[0]}
            </div>
            <div className="mt-1 text-xs opacity-80">{parsingSteps[1]}</div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {result?.mode === "multiple" && (
          <div className="space-y-3">
            {result.warnings.length > 0 && (
              <InfoList title="解析提醒" items={result.warnings} tone="warning" />
            )}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              AI 已生成 {result.entries.length} 条候选结果。确认后才会批量创建，未保留的条目不会写入。
            </div>
          </div>
        )}

        {singleEntry && (
          <div className="space-y-3">
            {singleEntry.readerUsed && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {singleEntry.readerStatusLabel || "已启用 Reader"}
                </div>
                {singleEntry.readerUrl && (
                  <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                    {singleEntry.readerUrl}
                  </div>
                )}
              </div>
            )}

            {hasCategoryMismatch && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <div>
                      AI 建议分类为“{singleEntry.unmatchedCategory}”，但当前分类配置中不存在，请手动确认。
                    </div>
                    {singleEntry.availableCategories.length > 0 && (
                      <div className="text-xs opacity-80">
                        当前可用分类：{singleEntry.availableCategories.join("、")}
                      </div>
                    )}
                    {onCreateSuggestedCategory && singleEntry.unmatchedCategory && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                        onClick={() => void onCreateSuggestedCategory(singleEntry.unmatchedCategory)}
                      >
                        新增并使用该分类
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {hasStatusMismatch && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                AI 建议状态为“{singleEntry.unmatchedStatus}”，但当前可用状态中不存在，请手动确认。
              </div>
            )}

            <InfoList title="缺失字段" items={singleEntry.missingFields} tone="warning" />
            <InfoList title="解析提醒" items={singleEntry.warnings} tone="warning" />
          </div>
        )}
      </div>
    </div>
  );
}

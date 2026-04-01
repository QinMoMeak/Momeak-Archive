import { LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiSuggestionResult } from "@/types/ai";
import type { ModuleId } from "@/types/knowledge";

type AiAssistPanelProps = {
  moduleId: ModuleId;
  rawText: string;
  onRawTextChange: (value: string) => void;
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
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`text-sm font-medium ${
          tone === "warning" ? "text-amber-900" : "text-slate-800"
        }`}
      >
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge
            key={`${title}-${item}`}
            variant={tone === "warning" ? "outline" : "secondary"}
            className="rounded-full"
          >
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getParsingSteps(moduleId: ModuleId) {
  if (moduleId === "websites") {
    return ["正在读取网页内容", "正在分析网站用途"];
  }

  return ["正在提取结构化字段"];
}

export function AiAssistPanel({
  moduleId,
  rawText,
  onRawTextChange,
  onParse,
  isParsing,
  error,
  result,
  onCreateSuggestedCategory,
}: AiAssistPanelProps) {
  const hasCategoryMismatch =
    Boolean(result?.needsCategoryConfirmation) && Boolean(result?.unmatchedCategory);
  const hasStatusMismatch =
    Boolean(result?.needsStatusConfirmation) && Boolean(result?.unmatchedStatus);
  const parsingSteps = getParsingSteps(moduleId);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Sparkles className="h-4 w-4 text-slate-500" />
            AI 辅助解析
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            粘贴一段原始描述后自动提取结构化字段。解析结果只会回填表单，仍可继续手动修改。
          </p>
        </div>
        {result && (
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            已填充 {result.filledFields.length} 个字段
          </Badge>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={rawText}
          onChange={(event) => onRawTextChange(event.target.value)}
          placeholder="例如：贴一段网页介绍、商品描述、朋友推荐文本，或包含网址 / 域名的网站说明。"
          className="min-h-28 bg-white"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onParse} disabled={isParsing || !rawText.trim()}>
            {isParsing ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isParsing ? parsingSteps[0] : "AI 解析"}
          </Button>
          <div className="text-xs leading-5 text-slate-500">
            当前为单轮结构化提取，不会覆盖你后续的手动修改。
          </div>
        </div>

        {isParsing && parsingSteps.length > 1 && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <div className="flex items-center gap-2 font-medium">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {parsingSteps[0]}
            </div>
            <div className="mt-1 text-xs text-sky-700">{parsingSteps[1]}</div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {result.readerUsed && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">
                  {result.readerStatusLabel || "已启用 Reader"}
                </div>
                {result.readerUrl && (
                  <div className="mt-1 break-all text-xs text-slate-500">
                    {result.readerUrl}
                  </div>
                )}
              </div>
            )}

            {hasCategoryMismatch && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <div>
                      AI 建议分类为“{result.unmatchedCategory}”，但当前分类配置中不存在，请手动确认。
                    </div>
                    {result.availableCategories.length > 0 && (
                      <div className="text-xs text-amber-800">
                        当前可用分类：{result.availableCategories.join("、")}
                      </div>
                    )}
                    {onCreateSuggestedCategory && (
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                          onClick={() =>
                            void onCreateSuggestedCategory(result.unmatchedCategory)
                          }
                        >
                          新增并使用该分类
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {hasStatusMismatch && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                AI 建议状态为“{result.unmatchedStatus}”，但当前可用状态中不存在，请手动选择现有状态。
              </div>
            )}

            <InfoList title="缺失字段" items={result.missingFields} tone="warning" />
            <InfoList title="解析提醒" items={result.warnings} tone="warning" />
          </div>
        )}
      </div>
    </div>
  );
}

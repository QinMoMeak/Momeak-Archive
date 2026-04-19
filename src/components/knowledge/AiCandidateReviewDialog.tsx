import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Sparkles, Trash2 } from "lucide-react";

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
import { createDraftFromAiCandidate } from "@/lib/knowledge";
import type { AiSuggestionEntry } from "@/types/ai";
import type { ModuleId, QuickAddDraft } from "@/types/knowledge";

type EditableCandidate = {
  id: string;
  selected: boolean;
  draft: QuickAddDraft;
  missingFields: string[];
  warnings: string[];
};

type AiCandidateReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: ModuleId;
  entries: AiSuggestionEntry[];
  warnings?: string[];
  isSubmitting?: boolean;
  error?: string;
  onConfirm: (drafts: QuickAddDraft[]) => Promise<void> | void;
};

function createCandidates(moduleId: ModuleId, entries: AiSuggestionEntry[]): EditableCandidate[] {
  return entries.map((entry, index) => ({
    id: `${entry.draft.name || "candidate"}-${index}`,
    selected: true,
    draft: createDraftFromAiCandidate(moduleId, entry),
    missingFields: entry.missingFields,
    warnings: entry.warnings,
  }));
}

function CandidateField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {children}
    </label>
  );
}

export function AiCandidateReviewDialog({
  open,
  onOpenChange,
  moduleId,
  entries,
  warnings = [],
  isSubmitting = false,
  error = "",
  onConfirm,
}: AiCandidateReviewDialogProps) {
  const [candidates, setCandidates] = useState<EditableCandidate[]>([]);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setCandidates(createCandidates(moduleId, entries));
    setLocalError("");
  }, [entries, moduleId, open]);

  const selectedCount = useMemo(
    () => candidates.filter((candidate) => candidate.selected).length,
    [candidates],
  );

  function updateDraft(
    candidateId: string,
    key: keyof QuickAddDraft,
    value: QuickAddDraft[keyof QuickAddDraft],
  ) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              draft: {
                ...candidate.draft,
                [key]: value,
              },
            }
          : candidate,
      ),
    );
  }

  function toggleCandidate(candidateId: string) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, selected: !candidate.selected }
          : candidate,
      ),
    );
  }

  function removeCandidate(candidateId: string) {
    setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
  }

  function selectAll(nextSelected: boolean) {
    setCandidates((current) =>
      current.map((candidate) => ({ ...candidate, selected: nextSelected })),
    );
  }

  async function handleConfirm() {
    const drafts = candidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.draft);

    if (drafts.length === 0) {
      setLocalError("请至少保留一条候选结果后再批量创建。");
      return;
    }

    setLocalError("");
    await onConfirm(drafts);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckSquare className="h-5 w-5" />
              确认 AI 候选结果
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              多条解析适合榜单、表格、合集和推荐清单。先确认候选结果，再批量创建。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="scrollbar-none max-h-[82dvh] space-y-4 overflow-y-auto bg-white p-6 dark:bg-slate-950">
          {warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="mb-2 font-medium">解析提醒</div>
              <div className="space-y-1">
                {warnings.map((warning) => (
                  <div key={warning}>- {warning}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              已识别 {candidates.length} 条候选，当前选中 {selectedCount} 条。
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                全选
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                全不选
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className={`rounded-[24px] border p-4 transition ${
                  candidate.selected
                    ? "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/70"
                    : "border-slate-200/70 bg-white/70 opacity-70 dark:border-slate-800/70 dark:bg-slate-950/60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={candidate.selected}
                      onChange={() => toggleCandidate(candidate.id)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        候选 {index + 1}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        批量创建前可调整关键字段
                      </div>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    {candidate.missingFields.length > 0 && (
                      <Badge variant="outline" className="rounded-full">
                        缺失 {candidate.missingFields.length}
                      </Badge>
                    )}
                    {candidate.warnings.length > 0 && (
                      <Badge variant="outline" className="rounded-full text-amber-700">
                        提醒 {candidate.warnings.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-rose-600"
                      onClick={() => removeCandidate(candidate.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <CandidateField label="标题">
                    <Input
                      value={candidate.draft.name}
                      onChange={(event) =>
                        updateDraft(candidate.id, "name", event.target.value)
                      }
                    />
                  </CandidateField>

                  <CandidateField label="来源">
                    <Input
                      value={candidate.draft.source}
                      onChange={(event) =>
                        updateDraft(candidate.id, "source", event.target.value)
                      }
                    />
                  </CandidateField>

                  <CandidateField label="分类">
                    <Input
                      value={candidate.draft.category}
                      onChange={(event) =>
                        updateDraft(candidate.id, "category", event.target.value)
                      }
                    />
                  </CandidateField>

                  <CandidateField label="状态">
                    <Input
                      value={candidate.draft.status}
                      onChange={(event) =>
                        updateDraft(candidate.id, "status", event.target.value)
                      }
                    />
                  </CandidateField>

                  <div className="md:col-span-2">
                    <CandidateField label="标签">
                      <Input
                        value={candidate.draft.tags}
                        onChange={(event) =>
                          updateDraft(candidate.id, "tags", event.target.value)
                        }
                      />
                    </CandidateField>
                  </div>

                  {moduleId === "offline" && (
                    <CandidateField label="地点">
                      <Input
                        value={candidate.draft.location}
                        onChange={(event) =>
                          updateDraft(candidate.id, "location", event.target.value)
                        }
                      />
                    </CandidateField>
                  )}

                  {moduleId === "shopping" && (
                    <>
                      <CandidateField label="平台">
                        <Input
                          value={candidate.draft.platform}
                          onChange={(event) =>
                            updateDraft(candidate.id, "platform", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="价格">
                        <Input
                          value={candidate.draft.price}
                          onChange={(event) =>
                            updateDraft(candidate.id, "price", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="数量">
                        <Input
                          value={candidate.draft.quantity}
                          onChange={(event) =>
                            updateDraft(candidate.id, "quantity", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="规格 / 型号">
                        <Input
                          value={candidate.draft.specification}
                          onChange={(event) =>
                            updateDraft(candidate.id, "specification", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="店铺 / 来源店">
                        <Input
                          value={candidate.draft.storeName}
                          onChange={(event) =>
                            updateDraft(candidate.id, "storeName", event.target.value)
                          }
                        />
                      </CandidateField>
                      <div className="md:col-span-2">
                        <CandidateField label="优惠信息">
                          <Textarea
                            value={candidate.draft.discountInfo}
                            onChange={(event) =>
                              updateDraft(candidate.id, "discountInfo", event.target.value)
                            }
                            className="min-h-24"
                          />
                        </CandidateField>
                      </div>
                    </>
                  )}

                  {moduleId === "websites" && (
                    <>
                      <CandidateField label="域名 / URL">
                        <Input
                          value={candidate.draft.domain}
                          onChange={(event) =>
                            updateDraft(candidate.id, "domain", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="可访问">
                        <Input
                          value={candidate.draft.access}
                          onChange={(event) =>
                            updateDraft(candidate.id, "access", event.target.value)
                          }
                        />
                      </CandidateField>
                    </>
                  )}

                  {moduleId === "songs" && (
                    <>
                      <CandidateField label="æ­æ / æ¼å±è">
                        <Input
                          value={candidate.draft.artist}
                          onChange={(event) =>
                            updateDraft(candidate.id, "artist", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="ä¸è¾">
                        <Input
                          value={candidate.draft.album}
                          onChange={(event) =>
                            updateDraft(candidate.id, "album", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="æç»ª / åºæ¯">
                        <Input
                          value={candidate.draft.mood}
                          onChange={(event) =>
                            updateDraft(candidate.id, "mood", event.target.value)
                          }
                        />
                      </CandidateField>
                      <CandidateField label="ä¸è¾">
                        <Input
                          value={candidate.draft.language}
                          onChange={(event) =>
                            updateDraft(candidate.id, "language", event.target.value)
                          }
                        />
                      </CandidateField>
                      <div className="md:col-span-2">
                        <CandidateField label="æ­è¯çæ®µ">
                          <Textarea
                            value={candidate.draft.lyricsSnippet}
                            onChange={(event) =>
                              updateDraft(candidate.id, "lyricsSnippet", event.target.value)
                            }
                            className="min-h-24"
                          />
                        </CandidateField>
                      </div>
                    </>
                  )}

                  {moduleId === "inbox" && (
                    <div className="md:col-span-2">
                      <CandidateField label="原始内容">
                        <Textarea
                          value={candidate.draft.rawContent}
                          onChange={(event) =>
                            updateDraft(candidate.id, "rawContent", event.target.value)
                          }
                          className="min-h-28"
                        />
                      </CandidateField>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <CandidateField label="摘要 / 备注">
                      <Textarea
                        value={candidate.draft.note}
                        onChange={(event) =>
                          updateDraft(candidate.id, "note", event.target.value)
                        }
                        className="min-h-24"
                      />
                    </CandidateField>
                  </div>
                </div>

                {(candidate.missingFields.length > 0 || candidate.warnings.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {candidate.missingFields.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        <div className="font-medium">缺失字段</div>
                        <div className="mt-1 break-words">
                          {candidate.missingFields.join("、")}
                        </div>
                      </div>
                    )}
                    {candidate.warnings.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        <div className="font-medium">解析提醒</div>
                        <div className="mt-1 space-y-1">
                          {candidate.warnings.map((warning) => (
                            <div key={`${candidate.id}-${warning}`}>- {warning}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {(localError || error) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {localError || error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  批量创建中...
                </>
              ) : (
                `批量创建 ${selectedCount} 条`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

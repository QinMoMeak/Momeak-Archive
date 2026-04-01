import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Hash, Layers3, Pencil, Trash2, X } from "lucide-react";

import { MarkdownContent } from "@/components/knowledge/MarkdownContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchEntryMarkdown } from "@/lib/knowledge-api";
import {
  getBundledMarkdownContent,
  resolveEntryDetail,
} from "@/lib/knowledge-detail";
import type { DetailField, KnowledgeEntry } from "@/types/knowledge";

type KnowledgeDetailDrawerProps = {
  entry: KnowledgeEntry | null;
  onClose: () => void;
  onTagClick: (tag: string) => void;
  isAdmin?: boolean;
  isDeleting?: boolean;
  onEdit?: (entry: KnowledgeEntry, markdownContent: string) => void;
  onDelete?: (entry: KnowledgeEntry) => void;
};

function DetailFieldGrid({ fields }: { fields: DetailField[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={`${field.label}-${field.value}`}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
            {field.label}
          </div>
          <div className="mt-2 text-sm font-medium leading-6 text-slate-800">
            {field.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KnowledgeDetailDrawer({
  entry,
  onClose,
  onTagClick,
  isAdmin = false,
  isDeleting = false,
  onEdit,
  onDelete,
}: KnowledgeDetailDrawerProps) {
  const [remoteMarkdown, setRemoteMarkdown] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [entry, onClose]);

  useEffect(() => {
    if (!entry) {
      setRemoteMarkdown(null);
      return;
    }

    let cancelled = false;
    setRemoteMarkdown(null);

    fetchEntryMarkdown(entry.module, entry.id)
      .then((content) => {
        if (!cancelled && content.trim()) {
          setRemoteMarkdown(content.trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteMarkdown(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  if (!entry) {
    return null;
  }

  const detail = resolveEntryDetail(
    entry,
    remoteMarkdown ?? getBundledMarkdownContent(entry),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-[100dvh] w-full max-w-full flex-col bg-white shadow-2xl sm:max-w-[640px] lg:max-w-[700px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {detail.moduleLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {entry.status}
                </Badge>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                  {detail.hasMarkdown
                    ? "Markdown \u6b63\u6587"
                    : "JSON \u5907\u6ce8"}
                </div>
              </div>

              <h3 className="mt-3 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
                {entry.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {detail.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onEdit(entry, remoteMarkdown ?? getBundledMarkdownContent(entry))
                  }
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  {"\u7f16\u8f91"}
                </Button>
              )}
              {isAdmin && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {isDeleting ? "\u5220\u9664\u4e2d..." : "\u5220\u9664"}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            <Card className="rounded-2xl border-slate-200 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers3 className="h-4 w-4 text-slate-400" />
                  {"\u57fa\u672c\u4fe1\u606f"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailFieldGrid fields={detail.basicInfo} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="h-4 w-4 text-slate-400" />
                  {"\u6807\u7b7e"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.length === 0 && (
                    <div className="text-sm text-slate-400">
                      {"\u8fd8\u6ca1\u6709\u6807\u7b7e"}
                    </div>
                  )}
                  {entry.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onTagClick(tag)}
                      className="rounded-full"
                    >
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                      >
                        #{tag}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-slate-400" />
                  {"\u5907\u6ce8 / \u8be6\u7ec6\u8bf4\u660e"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={detail.body} />
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">
                    {"\u6765\u6e90\u4e0e\u65f6\u95f4"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailFieldGrid fields={detail.sourceAndTime} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">
                    {"\u6269\u5c55\u4fe1\u606f"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailFieldGrid fields={detail.extensionInfo} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

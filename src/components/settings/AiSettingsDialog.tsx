import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RotateCcw, Sparkles } from "lucide-react";

import {
  buildAiSettingsInitialForm,
  getModelOptionsByProvider,
  getProviderById,
  isReasonableApiKey,
} from "@/lib/ai-settings";
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
import type {
  AiSettingsView,
  SaveAiSettingsPayload,
} from "@/types/ai-settings";

type AiSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AiSettingsView | null;
  onSave: (payload: SaveAiSettingsPayload) => Promise<void> | void;
  onResetToDefault: () => Promise<void> | void;
};

const selectClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";

export function AiSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  onResetToDefault,
}: AiSettingsDialogProps) {
  const [form, setForm] = useState<SaveAiSettingsPayload>({
    provider: "openai",
    model: "",
    apiKey: "",
    baseUrl: "",
    keepExistingApiKey: false,
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!open || !settings) {
      return;
    }

    setForm(buildAiSettingsInitialForm(settings));
    setError("");
    setIsSaving(false);
    setIsResetting(false);
    setShowApiKey(false);
  }, [open, settings]);

  const currentProvider = useMemo(
    () => getProviderById(settings?.providers ?? [], form.provider),
    [form.provider, settings?.providers],
  );
  const modelOptions = useMemo(
    () => getModelOptionsByProvider(settings?.providers ?? [], form.provider),
    [form.provider, settings?.providers],
  );

  function updateForm<K extends keyof SaveAiSettingsPayload>(
    key: K,
    value: SaveAiSettingsPayload[K],
  ) {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      if (key === "provider") {
        const nextModels = getModelOptionsByProvider(
          settings?.providers ?? [],
          String(value),
        );
        if (!nextModels.some((model) => model.id === next.model)) {
          next.model = nextModels[0]?.id ?? "";
        }

        const provider = getProviderById(settings?.providers ?? [], String(value));
        if (!current.baseUrl || current.baseUrl === currentProvider?.defaultBaseUrl) {
          next.baseUrl = provider?.defaultBaseUrl ?? "";
        }
      }

      if (key === "apiKey") {
        next.keepExistingApiKey = false;
      }

      return next;
    });
  }

  async function handleSave() {
    if (!form.provider) {
      setError("请选择 AI 服务商。");
      return;
    }

    if (!form.model) {
      setError("请选择模型。");
      return;
    }

    if (!form.apiKey.trim() && !form.keepExistingApiKey) {
      setError("请填写 API Key，或保留当前已保存的 Key。");
      return;
    }

    if (form.apiKey.trim() && !isReasonableApiKey(form.apiKey)) {
      setError("API Key 格式看起来不正确，请检查后重试。");
      return;
    }

    try {
      setError("");
      setIsSaving(true);
      await onSave(form);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "保存 AI 设置失败，请稍后重试。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    try {
      setError("");
      setIsResetting(true);
      await onResetToDefault();
      onOpenChange(false);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "恢复默认配置失败，请稍后重试。",
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] border-0 p-0">
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5" />
              AI 设置
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-300">
              仅管理员可见。这里配置的是当前本地仓库运行环境使用的 AI 服务商、模型和 Key。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {settings && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {settings.storedSettings ? "手动配置优先" : "当前使用默认配置"}
                </Badge>
                <div className="text-sm text-slate-600">
                  Provider: {settings.effectiveSettings.provider} · Model:{" "}
                  {settings.effectiveSettings.model}
                </div>
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                {settings.storedSettings
                  ? `当前手动配置保存在 ${settings.storage.pathLabel}，普通访客不会看到。`
                  : "当前还没有手动配置，AI 解析会回退到服务端环境变量默认值。"}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                服务商
              </label>
              <select
                value={form.provider}
                onChange={(event) => updateForm("provider", event.target.value)}
                className={selectClassName}
              >
                {(settings?.providers ?? []).map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {currentProvider && (
                <div className="text-xs leading-5 text-slate-500">
                  {currentProvider.description}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                模型
              </label>
              <select
                value={form.model}
                onChange={(event) => updateForm("model", event.target.value)}
                className={selectClassName}
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
              {modelOptions.find((model) => model.id === form.model) && (
                <div className="text-xs leading-5 text-slate-500">
                  {
                    modelOptions.find((model) => model.id === form.model)
                      ?.description
                  }
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                API Key
              </label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(event) => updateForm("apiKey", event.target.value)}
                  placeholder="留空可保留当前已保存 Key，或回退到 .env.local 默认值"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey((current) => !current)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                {settings?.storedSettings?.hasApiKey
                  ? `当前已保存手动 Key：${settings.storedSettings.maskedApiKey}。留空则继续保留。`
                  : settings?.fallbackStatus.hasEnvironmentApiKey
                    ? `当前没有手动 Key，会回退到环境变量 Key：${settings.fallbackStatus.maskedEnvironmentApiKey || "已配置" }。`
                    : "当前没有可回退的默认 Key，首次保存时请填写。"}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Base URL（可选）
              </label>
              <Input
                value={form.baseUrl}
                onChange={(event) => updateForm("baseUrl", event.target.value)}
                placeholder={currentProvider?.defaultBaseUrl ?? "留空则使用当前服务商默认地址"}
              />
              <div className="text-xs leading-5 text-slate-500">
                留空时自动使用 {currentProvider?.label ?? "当前服务商"} 的默认地址。
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => void handleReset()}
              disabled={isSaving || isResetting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isResetting ? "恢复中..." : "恢复默认配置"}
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isResetting}
              >
                取消
              </Button>
              <Button onClick={() => void handleSave()} disabled={isSaving || isResetting}>
                {isSaving ? "保存中..." : "保存设置"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

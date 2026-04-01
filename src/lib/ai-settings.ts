import type {
  AiProviderOption,
  AiSettingsView,
  SaveAiSettingsPayload,
} from "@/types/ai-settings";

export function getProviderById(
  providers: AiProviderOption[],
  providerId: string,
) {
  return providers.find((provider) => provider.id === providerId) ?? null;
}

export function getModelOptionsByProvider(
  providers: AiProviderOption[],
  providerId: string,
) {
  return getProviderById(providers, providerId)?.models ?? [];
}

export function isReasonableApiKey(apiKey: string) {
  const normalized = apiKey.trim();
  return normalized.length >= 12 && !/\s/.test(normalized);
}

export function buildAiSettingsInitialForm(settings: AiSettingsView) {
  return {
    provider: settings.storedSettings?.provider || settings.effectiveSettings.provider,
    model: settings.storedSettings?.model || settings.effectiveSettings.model,
    apiKey: "",
    baseUrl:
      settings.storedSettings?.baseUrl || settings.effectiveSettings.baseUrl || "",
    keepExistingApiKey: Boolean(
      settings.storedSettings?.hasApiKey || settings.fallbackStatus.hasEnvironmentApiKey,
    ),
  } satisfies SaveAiSettingsPayload;
}

export function getAiSettingsStatusText(settings: AiSettingsView) {
  if (settings.storedSettings) {
    return "当前使用管理员手动配置";
  }

  if (settings.effectiveSettings.hasApiKey) {
    return "当前回退到服务端默认配置";
  }

  return "当前还没有可用的 AI Key";
}

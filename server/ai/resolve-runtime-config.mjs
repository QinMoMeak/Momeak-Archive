import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  configuredAiApiBaseUrl,
  configuredAiApiKey,
  configuredAiModel,
  configuredAiProvider,
} from "../config.mjs";
import { getAiModel, getAiProvider, getAiProviders } from "./providers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const localConfigDir = path.join(repoRoot, ".local");
const aiSettingsFile = path.join(localConfigDir, "ai-settings.json");

function cleanInlineValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function maskApiKey(apiKey) {
  const normalized = cleanInlineValue(apiKey);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= 8) {
    return "已保存";
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function isReasonableApiKey(apiKey) {
  const normalized = cleanInlineValue(apiKey);
  return normalized.length >= 12 && !/\s/.test(normalized);
}

function sanitizeStoredSettings(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const provider = cleanInlineValue(input.provider);
  const model = cleanInlineValue(input.model);
  const apiKey = cleanInlineValue(input.apiKey);
  const baseUrl = cleanInlineValue(input.baseUrl);
  const updatedAt = cleanInlineValue(input.updatedAt);

  if (!provider && !model && !apiKey && !baseUrl) {
    return null;
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl,
    updatedAt,
  };
}

async function ensureLocalConfigDir() {
  await fs.mkdir(localConfigDir, { recursive: true });
}

export async function readStoredAiSettings() {
  try {
    const raw = await fs.readFile(aiSettingsFile, "utf8");
    return sanitizeStoredSettings(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeStoredAiSettings(settingsInput) {
  const settings = sanitizeStoredSettings(settingsInput);

  if (!settings) {
    throw new Error("没有可保存的 AI 配置。");
  }

  await ensureLocalConfigDir();
  await fs.writeFile(
    aiSettingsFile,
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8",
  );

  return settings;
}

export async function clearStoredAiSettings() {
  try {
    await fs.unlink(aiSettingsFile);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export function getEnvironmentAiDefaults() {
  const provider = getAiProvider(configuredAiProvider)
    ? configuredAiProvider
    : "openai";

  return {
    provider,
    model: cleanInlineValue(configuredAiModel),
    apiKey: cleanInlineValue(configuredAiApiKey),
    baseUrl: cleanInlineValue(configuredAiApiBaseUrl),
  };
}

function resolveModel(provider, preferredModel) {
  if (!preferredModel) {
    return {
      value: provider.defaultModel,
      source: "default",
    };
  }

  if (provider.models.some((model) => model.id === preferredModel)) {
    return {
      value: preferredModel,
      source: "configured",
    };
  }

  return {
    value: provider.defaultModel,
    source: "default",
  };
}

export async function resolveRuntimeAiConfig() {
  const providers = getAiProviders();
  const storedSettings = await readStoredAiSettings();
  const envDefaults = getEnvironmentAiDefaults();
  const hasManualSettings = Boolean(storedSettings);

  const providerSource = storedSettings?.provider
    ? "manual"
    : envDefaults.provider
      ? "env"
      : "default";
  const provider =
    getAiProvider(storedSettings?.provider) ??
    getAiProvider(envDefaults.provider) ??
    getAiProvider("openai");

  if (!provider) {
    throw new Error("当前没有可用的 AI 服务商配置。");
  }

  const modelCandidate = storedSettings?.model || envDefaults.model;
  const modelResolution = resolveModel(provider, modelCandidate);
  const modelSource = storedSettings?.model
    ? modelResolution.source === "configured"
      ? "manual"
      : "default"
    : envDefaults.model
      ? modelResolution.source === "configured"
        ? "env"
        : "default"
      : "default";

  const baseUrl = hasManualSettings
    ? storedSettings?.baseUrl || provider.defaultBaseUrl
    : envDefaults.baseUrl || provider.defaultBaseUrl;
  const baseUrlSource = hasManualSettings
    ? storedSettings?.baseUrl
      ? "manual"
      : "default"
    : envDefaults.baseUrl
      ? "env"
      : "default";

  const apiKey = storedSettings?.apiKey || envDefaults.apiKey || "";
  const apiKeySource = storedSettings?.apiKey
    ? "manual"
    : envDefaults.apiKey
      ? "env"
      : "missing";

  return {
    providers,
    provider,
    model: modelResolution.value,
    modelOption: getAiModel(provider.id, modelResolution.value),
    supportsImages: Boolean(getAiModel(provider.id, modelResolution.value)?.supportsImages),
    apiKey,
    baseUrl,
    sources: {
      provider: providerSource,
      model: modelSource,
      apiKey: apiKeySource,
      baseUrl: baseUrlSource,
    },
    storedSettings,
    envDefaults,
  };
}

export async function getAiSettingsView() {
  const runtime = await resolveRuntimeAiConfig();

  return {
    providers: runtime.providers,
    storedSettings: runtime.storedSettings
      ? {
          provider: runtime.storedSettings.provider,
          model: runtime.storedSettings.model,
          baseUrl: runtime.storedSettings.baseUrl,
          hasApiKey: Boolean(runtime.storedSettings.apiKey),
          maskedApiKey: maskApiKey(runtime.storedSettings.apiKey),
          updatedAt: runtime.storedSettings.updatedAt,
        }
      : null,
    effectiveSettings: {
      provider: runtime.provider.id,
      model: runtime.model,
      baseUrl: runtime.baseUrl,
      supportsImages: runtime.supportsImages,
      sources: runtime.sources,
      hasApiKey: Boolean(runtime.apiKey),
      apiKeySource: runtime.sources.apiKey,
    },
    fallbackStatus: {
      usingManualSettings: Boolean(runtime.storedSettings),
      hasEnvironmentApiKey: Boolean(runtime.envDefaults.apiKey),
      maskedEnvironmentApiKey: maskApiKey(runtime.envDefaults.apiKey),
    },
    storage: {
      mode: "protected-local-file",
      pathLabel: ".local/ai-settings.json",
    },
  };
}

export async function saveAiSettings(settingsInput) {
  const providerId = cleanInlineValue(settingsInput.provider);
  const provider = getAiProvider(providerId);

  if (!provider) {
    throw new Error("请选择有效的 AI 服务商。");
  }

  const model = cleanInlineValue(settingsInput.model);

  if (!model) {
    throw new Error("请选择模型。");
  }

  if (!provider.models.some((item) => item.id === model)) {
    throw new Error("当前模型不属于所选服务商，请重新选择。");
  }

  const previous = await readStoredAiSettings();
  const keepExistingApiKey = Boolean(settingsInput.keepExistingApiKey);
  const nextApiKey = cleanInlineValue(settingsInput.apiKey);
  const environmentDefaults = getEnvironmentAiDefaults();

  let apiKey = "";

  if (nextApiKey) {
    if (!isReasonableApiKey(nextApiKey)) {
      throw new Error("API Key 格式看起来不正确，请检查后重试。");
    }

    apiKey = nextApiKey;
  } else if (keepExistingApiKey && previous?.apiKey) {
    apiKey = previous.apiKey;
  } else if (!previous?.apiKey && !environmentDefaults.apiKey) {
    throw new Error("当前没有可用的 API Key，请填写后再保存。");
  }

  await writeStoredAiSettings({
    provider: provider.id,
    model,
    apiKey,
    baseUrl: cleanInlineValue(settingsInput.baseUrl),
    updatedAt: new Date().toISOString(),
  });

  return getAiSettingsView();
}

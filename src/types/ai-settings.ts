export type AiModelOption = {
  id: string;
  label: string;
  description: string;
};

export type AiProviderOption = {
  id: string;
  label: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: AiModelOption[];
};

export type StoredAiSettings = {
  provider: string;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  updatedAt: string;
} | null;

export type EffectiveAiSettings = {
  provider: string;
  model: string;
  baseUrl: string;
  sources: {
    provider: "manual" | "env" | "default";
    model: "manual" | "env" | "default";
    apiKey: "manual" | "env" | "missing";
    baseUrl: "manual" | "env" | "default";
  };
  hasApiKey: boolean;
  apiKeySource: "manual" | "env" | "missing";
};

export type AiSettingsView = {
  providers: AiProviderOption[];
  storedSettings: StoredAiSettings;
  effectiveSettings: EffectiveAiSettings;
  fallbackStatus: {
    usingManualSettings: boolean;
    hasEnvironmentApiKey: boolean;
    maskedEnvironmentApiKey: string;
  };
  storage: {
    mode: "protected-local-file";
    pathLabel: string;
  };
};

export type SaveAiSettingsPayload = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  keepExistingApiKey: boolean;
};


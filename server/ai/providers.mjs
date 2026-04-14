export const aiProviderCatalog = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Direct OpenAI-compatible API for the default runtime.",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    models: [
      {
        id: "gpt-4.1-mini",
        label: "gpt-4.1-mini",
        description: "Lightweight structured extraction with image support.",
        supportsImages: true,
      },
      {
        id: "gpt-4.1",
        label: "gpt-4.1",
        description: "Stronger extraction and organization with image support.",
        supportsImages: true,
      },
      {
        id: "gpt-4o-mini",
        label: "gpt-4o-mini",
        description: "Fast multimodal parsing for text and screenshots.",
        supportsImages: true,
      },
    ],
  },
  {
    id: "iflow",
    label: "iFlow",
    description: "OpenAI-compatible gateway suitable for the current parsing flow.",
    defaultBaseUrl: "https://apis.iflow.cn/v1",
    defaultModel: "Qwen3-Max",
    models: [
      {
        id: "Qwen3-Max",
        label: "Qwen3-Max",
        description: "General high-capability model for structured parsing.",
      },
      {
        id: "qwen",
        label: "qwen",
        description: "Basic Qwen multimodal parsing.",
        supportsImages: true,
      },
      {
        id: "qwen3.5-omni-plus-image",
        label: "qwen3.5-omni-plus-image",
        description: "Qwen 3.5 image-oriented multimodal model.",
        supportsImages: true,
        apiStyle: "responses",
      },
      {
        id: "Qwen3-Coder-Plus",
        label: "Qwen3-Coder-Plus",
        description: "Coding-oriented model kept as an advanced option.",
      },
      {
        id: "DeepSeek-R1",
        label: "DeepSeek-R1",
        description: "Reasoning-oriented fallback for extraction tasks.",
      },
      {
        id: "Kimi-K2-Instruct-0905",
        label: "Kimi-K2-Instruct-0905",
        description: "Long-context organization and summarization.",
      },
      {
        id: "Qwen3-32B",
        label: "Qwen3-32B",
        description: "Lower-cost structured parsing option.",
      },
      {
        id: "iFlow-ROME",
        label: "iFlow-ROME",
        description: "Provider-specific experimental option.",
      },
    ],
  },
  {
    id: "blaze",
    label: "Blaze",
    description: "Blaze OpenAI-compatible gateway with its own model ids.",
    defaultBaseUrl: "https://blazeai.boxu.dev/api",
    defaultModel: "anthropic/claude-sonnet-4-6",
    models: [
      {
        id: "anthropic/claude-sonnet-4-6",
        label: "anthropic/claude-sonnet-4-6",
        description: "Stable structured extraction and note organization.",
      },
      {
        id: "deepseek-v3.2",
        label: "deepseek-v3.2",
        description: "Blaze native DeepSeek text model.",
      },
      {
        id: "grok/grok-4.1-expert",
        label: "grok/grok-4.1-expert",
        description: "Higher-capability multimodal analysis.",
        supportsImages: true,
      },
      {
        id: "grok/grok-4.1-mini",
        label: "grok/grok-4.1-mini",
        description: "Lighter multimodal option.",
        supportsImages: true,
      },
      {
        id: "grok/grok-4.20-beta",
        label: "grok/grok-4.20-beta",
        description: "Experimental multimodal backup.",
        supportsImages: true,
      },
      {
        id: "minimax-m2.5",
        label: "minimax-m2.5",
        description: "Long-text organization and extraction.",
      },
      {
        id: "kimi-k2.5",
        label: "kimi-k2.5",
        description: "Long-context summarization and organization.",
      },
      {
        id: "qwen/qwen3.5-omni-plus",
        label: "qwen",
        description: "Recommended Blaze Qwen multimodal model for screenshot parsing.",
        supportsImages: true,
      },
      {
        id: "qwen/qwen3.5-omni-plus-image",
        label: "qwen/qwen3.5-omni-plus-image",
        description:
          "Blaze image-only Qwen model. Kept for compatibility, but may require provider-specific handling.",
      },
      {
        id: "openai/gpt-6",
        label: "openai/gpt-6",
        description: "General-purpose backup model exposed by Blaze.",
      },
      {
        id: "z-ai/glm5-rp",
        label: "z-ai/glm5-rp",
        description: "GLM5 routing profile from Blaze.",
      },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "OpenAI-compatible routed provider.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4.1-mini",
    models: [
      {
        id: "openai/gpt-4.1-mini",
        label: "openai/gpt-4.1-mini",
        description: "Lightweight OpenRouter multimodal model.",
        supportsImages: true,
      },
      {
        id: "openai/gpt-4.1",
        label: "openai/gpt-4.1",
        description: "Stronger OpenRouter multimodal model.",
        supportsImages: true,
      },
      {
        id: "openai/gpt-4o-mini",
        label: "openai/gpt-4o-mini",
        description: "Fast OpenRouter multimodal option.",
        supportsImages: true,
      },
    ],
  },
];

export function getAiProviders() {
  return aiProviderCatalog.map((provider) => ({
    ...provider,
    models: provider.models.map((model) => ({ ...model })),
  }));
}

export function getAiProvider(providerId) {
  return aiProviderCatalog.find((provider) => provider.id === providerId) ?? null;
}

export function getAiModel(providerId, modelId) {
  const provider = getAiProvider(providerId);

  if (!provider) {
    return null;
  }

  return provider.models.find((model) => model.id === modelId) ?? null;
}

export function modelSupportsImages(providerId, modelId) {
  const model = getAiModel(providerId, modelId);
  return Boolean(model?.supportsImages);
}

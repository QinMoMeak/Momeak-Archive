export const aiProviderCatalog = [
  {
    id: "openai",
    label: "OpenAI",
    description: "直接调用 OpenAI 官方接口，适合当前默认方案。",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4.1-mini",
    models: [
      {
        id: "gpt-4.1-mini",
        label: "gpt-4.1-mini",
        description: "成本较低，适合结构化提取。",
      },
      {
        id: "gpt-4.1",
        label: "gpt-4.1",
        description: "更强的抽取与整理能力。",
      },
      {
        id: "gpt-4o-mini",
        label: "gpt-4o-mini",
        description: "响应更快，适合轻量解析。",
      },
    ],
  },
  {
    id: "iflow",
    label: "iFlow",
    description: "iFlow 提供 OpenAI 兼容的聊天接口，适合直接复用当前结构化解析链路。",
    defaultBaseUrl: "https://apis.iflow.cn/v1",
    defaultModel: "Qwen3-Max",
    models: [
      {
        id: "Qwen3-Max",
        label: "Qwen3-Max",
        description: "通义千问 3 系列 Max 版本，适合通用解析与复杂整理。",
      },
      {
        id: "Qwen3-Coder-Plus",
        label: "Qwen3-Coder-Plus",
        description: "更偏代码与 Agent 能力，也可用于结构化抽取。",
      },
      {
        id: "DeepSeek-R1",
        label: "DeepSeek-R1",
        description: "推理能力较强，适合信息抽取和判断类任务。",
      },
      {
        id: "Kimi-K2-Instruct-0905",
        label: "Kimi-K2-Instruct-0905",
        description: "长上下文能力较好，适合较长原始文本整理。",
      },
      {
        id: "Qwen3-32B",
        label: "Qwen3-32B",
        description: "相对轻量，适合成本敏感的结构化录入场景。",
      },
      {
        id: "iFlow-ROME",
        label: "iFlow-ROME",
        description: "iFlow 文档中提供的智能体方向模型，可作为扩展选项。",
      },
    ],
  },
  {
    id: "blaze",
    label: "Blaze",
    description: "Blaze 提供 OpenAI 兼容接口，可直接复用当前 AI 解析与设置体系。",
    defaultBaseUrl: "https://blazeai.boxu.dev/api",
    defaultModel: "anthropic/claude-sonnet-4-6",
    models: [
      {
        id: "anthropic/claude-sonnet-4-6",
        label: "anthropic/claude-sonnet-4-6",
        description: "Claude Sonnet 4.6，适合稳定的结构化提取与整理。",
      },
      {
        id: "deepseek-ai/deepseek-v3.2",
        label: "deepseek-ai/deepseek-v3.2",
        description: "DeepSeek V3.2，适合信息抽取和通用推理任务。",
      },
      {
        id: "grok/grok-4.1-expert",
        label: "grok/grok-4.1-expert",
        description: "Grok 4.1 Expert，适合更复杂的分析与整合。",
      },
      {
        id: "grok/grok-4.1-mini",
        label: "grok/grok-4.1-mini",
        description: "Grok 4.1 Mini，适合轻量和成本敏感场景。",
      },
      {
        id: "grok/grok-4.20-beta",
        label: "grok/grok-4.20-beta",
        description: "Grok 4.20 Beta，适合作为实验性备选模型。",
      },
      {
        id: "minimaxai/minimax-m2.5",
        label: "minimaxai/minimax-m2.5",
        description: "MiniMax M2.5，适合长文本整理和泛知识提取。",
      },
      {
        id: "moonshotai/kimi-k2.5",
        label: "moonshotai/kimi-k2.5",
        description: "Kimi K2.5，适合较长上下文的知识归纳。",
      },
      {
        id: "openai/claude-sonnet-4.6",
        label: "openai/claude-sonnet-4.6",
        description: "按 Blaze 提供的模型名接入，保留为可选项。",
      },
      {
        id: "openai/gpt-5.4",
        label: "openai/gpt-5.4",
        description: "适合作为更强能力的通用结构化解析模型。",
      },
      {
        id: "openai/gpt-5.3-codex",
        label: "openai/gpt-5.3-codex",
        description: "更偏结构和规则理解，适合作为高级备选。",
      },
      {
        id: "z-ai/glm5",
        label: "z-ai/glm5",
        description: "GLM5，可作为 Blaze 下的通用备选模型。",
      },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "通过 OpenRouter 的 OpenAI 兼容接口转发模型请求。",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4.1-mini",
    models: [
      {
        id: "openai/gpt-4.1-mini",
        label: "openai/gpt-4.1-mini",
        description: "经 OpenRouter 转发的 OpenAI 轻量模型。",
      },
      {
        id: "openai/gpt-4.1",
        label: "openai/gpt-4.1",
        description: "经 OpenRouter 转发的 OpenAI 主力模型。",
      },
      {
        id: "openai/gpt-4o-mini",
        label: "openai/gpt-4o-mini",
        description: "经 OpenRouter 转发的快速轻量模型。",
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

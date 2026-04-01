import { ZodError } from "zod";

import { openAiTimeoutMs } from "../config.mjs";
import { aiModelOutputJsonSchema, aiModelOutputSchema } from "./schema.mjs";

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId),
  };
}

function extractJsonCandidate(payload) {
  if (payload && typeof payload === "object" && Array.isArray(payload.choices)) {
    const choice = payload.choices[0];
    const content = choice?.message?.content;

    if (typeof content === "string" && content.trim()) {
      return content;
    }
  }

  throw new Error("AI 返回内容为空，无法完成解析。");
}

export async function requestAiStructuredParse(
  runtimeConfig,
  systemPrompt,
  userPrompt,
  {
    schema = aiModelOutputSchema,
    jsonSchema = aiModelOutputJsonSchema,
    schemaName = "knowledge_entry_parse",
  } = {},
) {
  if (!runtimeConfig.apiKey) {
    throw new Error(
      "当前没有可用的 API Key。请在 AI 设置中填写，或在 .env.local 中配置默认值。",
    );
  }

  const endpoint = `${runtimeConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeout = createTimeoutSignal(openAiTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtimeConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: timeout.signal,
      body: JSON.stringify({
        model: runtimeConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI 解析请求失败（${response.status}）。${errorText || "请检查模型配置或服务端日志。"}`,
      );
    }

    const payload = await response.json();
    const candidate = extractJsonCandidate(payload);
    const parsed = JSON.parse(candidate);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("AI 返回了不可解析的 JSON，已中止本次自动填充。");
    }

    if (error instanceof ZodError) {
      throw new Error("AI 返回结构不完整，已中止本次自动填充，请重试。");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI 解析超时，请稍后重试。");
    }

    throw error;
  } finally {
    timeout.cancel();
  }
}

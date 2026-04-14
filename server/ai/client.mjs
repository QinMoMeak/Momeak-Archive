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
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.choices)) {
      const choice = payload.choices[0];
      const content = choice?.message?.content;

      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }

      if (Array.isArray(content)) {
        const joined = content
          .map((item) => (typeof item?.text === "string" ? item.text : ""))
          .join("")
          .trim();

        if (joined) {
          return joined;
        }
      }
    }

    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
      return payload.output_text.trim();
    }

    if (Array.isArray(payload.output)) {
      const joined = payload.output
        .flatMap((item) => item?.content ?? [])
        .map((item) => {
          if (typeof item?.text === "string") {
            return item.text;
          }

          if (typeof item?.output_text === "string") {
            return item.output_text;
          }

          return "";
        })
        .join("")
        .trim();

      if (joined) {
        return joined;
      }
    }
  }

  throw new Error("AI returned empty content, cannot continue structured parsing.");
}

function stripMarkdownCodeFence(value) {
  const normalized = value.trim();
  const match = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : normalized;
}

function findBalancedJsonSlice(value) {
  const normalized = value.trim();
  const start = normalized.search(/[\[{]/);

  if (start === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]") {
      depth -= 1;

      if (depth === 0) {
        return normalized.slice(start, index + 1);
      }
    }
  }

  return "";
}

function parseStructuredJson(candidate) {
  const normalized = stripMarkdownCodeFence(candidate);

  try {
    return JSON.parse(normalized);
  } catch {
    const extracted = findBalancedJsonSlice(normalized);

    if (extracted) {
      return JSON.parse(extracted);
    }

    throw new SyntaxError("Unable to extract valid JSON from model output.");
  }
}

function createChatUserMessageContent(userPrompt, images = []) {
  if (!images.length) {
    return userPrompt;
  }

  return [
    {
      type: "text",
      text: userPrompt,
    },
    ...images.map((image) => ({
      type: "image_url",
      image_url: {
        url: image.dataUrl,
      },
    })),
  ];
}

function createResponsesContent(userPrompt, images = []) {
  return [
    {
      type: "input_text",
      text: userPrompt,
    },
    ...images.map((image) => ({
      type: "input_image",
      image_url: image.dataUrl,
    })),
  ];
}

function getApiStyle(runtimeConfig) {
  return runtimeConfig.modelOption?.apiStyle === "responses" ? "responses" : "chat";
}

function buildRequest(runtimeConfig, systemPrompt, userPrompt, jsonSchema, schemaName, images) {
  const baseUrl = runtimeConfig.baseUrl.replace(/\/$/, "");
  const apiStyle = getApiStyle(runtimeConfig);

  if (apiStyle === "responses") {
    return {
      endpoint: `${baseUrl}/responses`,
      body: {
        model: runtimeConfig.model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: systemPrompt,
              },
            ],
          },
          {
            role: "user",
            content: createResponsesContent(userPrompt, images),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema: jsonSchema,
          },
        },
      },
    };
  }

  return {
    endpoint: `${baseUrl}/chat/completions`,
    body: {
      model: runtimeConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: createChatUserMessageContent(userPrompt, images),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    },
  };
}

export async function requestAiStructuredParse(
  runtimeConfig,
  systemPrompt,
  userPrompt,
  {
    schema = aiModelOutputSchema,
    jsonSchema = aiModelOutputJsonSchema,
    schemaName = "knowledge_entry_parse",
    images = [],
  } = {},
) {
  if (!runtimeConfig.apiKey) {
    throw new Error(
      "No API key is available. Configure one in AI settings or provide a default in .env.local.",
    );
  }

  const timeout = createTimeoutSignal(openAiTimeoutMs);
  const request = buildRequest(
    runtimeConfig,
    systemPrompt,
    userPrompt,
    jsonSchema,
    schemaName,
    images,
  );

  try {
    const response = await fetch(request.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtimeConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: timeout.signal,
      body: JSON.stringify(request.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI parse request failed (${response.status}).${errorText ? ` ${errorText}` : ""}`,
      );
    }

    const payload = await response.json();
    const candidate = extractJsonCandidate(payload);
    const parsed = parseStructuredJson(candidate);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("AI returned JSON-like content, but it could not be parsed reliably.");
    }

    if (error instanceof ZodError) {
      throw new Error("AI returned incomplete structured data, so auto-fill was stopped.");
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI parsing timed out. Please try again.");
    }

    throw error;
  } finally {
    timeout.cancel();
  }
}

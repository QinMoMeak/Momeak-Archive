import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const entries = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    entries[key] = value;
  }

  return entries;
}

const envFileValues = {
  ...parseEnvFile(path.join(repoRoot, ".env")),
  ...parseEnvFile(path.join(repoRoot, ".env.local")),
};

function resolveValue(key, fallback) {
  return process.env[key] || envFileValues[key] || fallback;
}

export const knowledgeAdminPassword = resolveValue(
  "KNOWLEDGE_ADMIN_PASSWORD",
  "admin123",
);
export const isDefaultAdminPassword =
  knowledgeAdminPassword === "admin123" &&
  !process.env.KNOWLEDGE_ADMIN_PASSWORD &&
  !envFileValues.KNOWLEDGE_ADMIN_PASSWORD;
export const sessionDurationMs = Number(
  resolveValue("KNOWLEDGE_SESSION_DURATION_MS", String(1000 * 60 * 60 * 12)),
);
export const configuredAiProvider = resolveValue("AI_PROVIDER", "openai");
export const configuredAiApiKey =
  resolveValue("AI_API_KEY", "") || resolveValue("OPENAI_API_KEY", "");
export const configuredAiModel =
  resolveValue("AI_MODEL", "") || resolveValue("OPENAI_MODEL", "gpt-4.1-mini");
export const configuredAiApiBaseUrl =
  resolveValue("AI_API_BASE_URL", "") || resolveValue("OPENAI_API_BASE_URL", "");
export const openAiTimeoutMs = Number(
  resolveValue("OPENAI_TIMEOUT_MS", String(1000 * 90)),
);
export const readerApiBaseUrl = resolveValue(
  "JINA_READER_BASE_URL",
  "https://r.jina.ai",
);
export const readerApiKey = resolveValue("JINA_READER_API_KEY", "");
export const readerEngine = resolveValue("JINA_READER_ENGINE", "direct");
export const readerBaseMode = resolveValue("JINA_READER_BASE", "final");
export const readerRespondWith = resolveValue(
  "JINA_READER_RESPOND_WITH",
  "markdown",
);
export const readerTimeoutMs = Number(
  resolveValue("JINA_READER_TIMEOUT_MS", String(1000 * 20)),
);
export const readerMaxContentChars = Number(
  resolveValue("JINA_READER_MAX_CONTENT_CHARS", String(12000)),
);
export const readerMinUsefulChars = Number(
  resolveValue("JINA_READER_MIN_USEFUL_CHARS", String(400)),
);
export const amapWebServiceKey = resolveValue("AMAP_WEB_SERVICE_KEY", "");
export const amapWebServiceBaseUrl = resolveValue(
  "AMAP_WEB_SERVICE_BASE_URL",
  "https://restapi.amap.com",
);
export const amapTimeoutMs = Number(
  resolveValue("AMAP_TIMEOUT_MS", String(1000 * 15)),
);

import { readerMaxContentChars, readerMinUsefulChars } from "../config.mjs";

function normalizeMetaSummary(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return "";
  }

  const candidateKeys = [
    "title",
    "description",
    "url",
    "finalUrl",
    "contentType",
    "status",
    "publishedTime",
    "language",
  ];

  return candidateKeys
    .filter((key) => meta[key])
    .map((key) => `- ${key}: ${String(meta[key]).trim()}`)
    .join("\n");
}

function normalizeObjectPayloadSummary(dataObject) {
  if (!dataObject || typeof dataObject !== "object" || Array.isArray(dataObject)) {
    return "";
  }

  const candidateKeys = ["title", "description", "url", "contentType"];

  return candidateKeys
    .filter((key) => dataObject[key])
    .map((key) => `- ${key}: ${String(dataObject[key]).trim()}`)
    .join("\n");
}

function trimReaderContent(value) {
  const content = String(value ?? "").replace(/\r\n/g, "\n").trim();

  if (!content) {
    return {
      markdown: "",
      contentLength: 0,
      truncated: false,
      isUseful: false,
    };
  }

  if (content.length <= readerMaxContentChars) {
    return {
      markdown: content,
      contentLength: content.length,
      truncated: false,
      isUseful: content.length >= readerMinUsefulChars,
    };
  }

  return {
    markdown: `${content.slice(0, readerMaxContentChars).trimEnd()}\n\n[内容已截断，用于控制分析长度]`,
    contentLength: content.length,
    truncated: true,
    isUseful: readerMaxContentChars >= readerMinUsefulChars,
  };
}

export function normalizeReaderResponse({ httpStatus, payload }) {
  let envelope = payload;

  if (typeof payload === "string") {
    envelope = {
      code: httpStatus,
      status: httpStatus,
      data: payload,
      meta: null,
    };
  }

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return {
      ok: false,
      code: httpStatus,
      status: httpStatus,
      data: "",
      meta: null,
      metaSummary: "",
      markdown: "",
      contentLength: 0,
      truncated: false,
      isUseful: false,
      error: "Reader 返回格式不可解析。",
    };
  }

  const code = Number(envelope.code ?? httpStatus);
  const status = Number(envelope.status ?? httpStatus);
  const rawData = envelope.data;
  const data =
    typeof rawData === "string"
      ? rawData
      : rawData &&
          typeof rawData === "object" &&
          !Array.isArray(rawData) &&
          typeof rawData.content === "string"
        ? rawData.content
        : "";
  const meta =
    envelope.meta && typeof envelope.meta === "object" && !Array.isArray(envelope.meta)
      ? envelope.meta
      : null;
  const trimmed = trimReaderContent(data);
  const ok =
    httpStatus >= 200 &&
    httpStatus < 300 &&
    code >= 200 &&
    code < 300 &&
    String(status).startsWith("2");

  return {
    ok,
    code,
    status,
    data,
    meta,
    metaSummary: [normalizeObjectPayloadSummary(rawData), normalizeMetaSummary(meta)]
      .filter(Boolean)
      .join("\n"),
    markdown: trimmed.markdown,
    contentLength: trimmed.contentLength,
    truncated: trimmed.truncated,
    isUseful: trimmed.isUseful,
    error: ok ? "" : `Reader 返回非成功状态（code=${code}, status=${status}）。`,
  };
}

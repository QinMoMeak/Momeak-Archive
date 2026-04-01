import { ProxyAgent } from "undici";

import {
  readerApiBaseUrl,
  readerApiKey,
  readerBaseMode,
  readerEngine,
  readerRespondWith,
  readerTimeoutMs,
} from "../config.mjs";
import { normalizeReaderResponse } from "./normalize-reader-response.mjs";

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId),
  };
}

function toHeaderTimeoutValue(timeoutMs) {
  const timeoutSeconds = Math.round(timeoutMs / 1000);
  return String(Math.min(180, Math.max(1, timeoutSeconds)));
}

function getProxyDispatcher() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    "";

  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

const proxyDispatcher = getProxyDispatcher();

export function getDefaultReaderRequestConfig() {
  return {
    engine: readerEngine,
    base: readerBaseMode,
    respondWith: readerRespondWith,
    timeoutMs: readerTimeoutMs,
  };
}

export async function fetchReaderContent(readerPathTarget, overrides = {}) {
  const config = {
    ...getDefaultReaderRequestConfig(),
    ...overrides,
  };

  if (!readerPathTarget) {
    return {
      used: false,
      ok: false,
      code: 0,
      status: 0,
      markdown: "",
      data: "",
      meta: null,
      metaSummary: "",
      contentLength: 0,
      truncated: false,
      isUseful: false,
      error: "缺少可读取的网址。",
      warnings: ["没有可用的网址，跳过 Reader 调用。"],
    };
  }

  const endpoint = `${readerApiBaseUrl.replace(/\/$/, "")}/${readerPathTarget.replace(/^\//, "")}`;
  const timeout = createTimeoutSignal(config.timeoutMs);
  const headers = {
    Accept: "application/json",
    "X-Base": config.base,
    "X-Engine": config.engine,
    "X-Respond-With": config.respondWith,
    "X-Return-Format": config.respondWith,
    "X-Retain-Images": "none",
    "X-Timeout": toHeaderTimeoutValue(config.timeoutMs),
  };

  if (readerApiKey) {
    headers.Authorization = `Bearer ${readerApiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: timeout.signal,
      dispatcher: proxyDispatcher,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const normalized = normalizeReaderResponse({
      httpStatus: response.status,
      payload,
    });

    return {
      used: true,
      endpoint,
      headers: {
        Accept: headers.Accept,
        "X-Base": headers["X-Base"],
        "X-Engine": headers["X-Engine"],
        "X-Respond-With": headers["X-Respond-With"],
        "X-Return-Format": headers["X-Return-Format"],
        "X-Retain-Images": headers["X-Retain-Images"],
        "X-Timeout": headers["X-Timeout"],
      },
      warnings: [],
      ...normalized,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        used: true,
        ok: false,
        code: 408,
        status: 40800,
        endpoint,
        headers: {
          Accept: headers.Accept,
          "X-Base": headers["X-Base"],
          "X-Engine": headers["X-Engine"],
          "X-Respond-With": headers["X-Respond-With"],
          "X-Return-Format": headers["X-Return-Format"],
          "X-Retain-Images": headers["X-Retain-Images"],
          "X-Timeout": headers["X-Timeout"],
        },
        markdown: "",
        data: "",
        meta: null,
        metaSummary: "",
        contentLength: 0,
        truncated: false,
        isUseful: false,
        error: "Reader 读取网页超时。",
        warnings: ["Reader 读取网页超时，已回退为仅基于原始输入分析。"],
      };
    }

    return {
      used: true,
      ok: false,
      code: 500,
      status: 50000,
      endpoint,
      headers: {
        Accept: headers.Accept,
        "X-Base": headers["X-Base"],
        "X-Engine": headers["X-Engine"],
        "X-Respond-With": headers["X-Respond-With"],
        "X-Return-Format": headers["X-Return-Format"],
        "X-Retain-Images": headers["X-Retain-Images"],
        "X-Timeout": headers["X-Timeout"],
      },
      markdown: "",
      data: "",
      meta: null,
      metaSummary: "",
      contentLength: 0,
      truncated: false,
      isUseful: false,
      error:
        error instanceof Error
          ? `Reader 调用失败：${error.message}`
          : "Reader 调用失败。",
      warnings: ["Reader 调用失败，已回退为仅基于原始输入分析。"],
    };
  } finally {
    timeout.cancel();
  }
}

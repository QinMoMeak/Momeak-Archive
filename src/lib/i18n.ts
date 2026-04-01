import { en } from "@/locales/en";
import { zhCN } from "@/locales/zh-CN";
import type { ModuleId } from "@/types/knowledge";

export const locales = {
  "zh-CN": zhCN,
  en,
} as const;

export type Locale = keyof typeof locales;

export const localeStorageKey = "personal-kb-locale";

export function isLocale(value: string): value is Locale {
  return value in locales;
}

export function resolveLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : "zh-CN";
}

export function detectBrowserLocale() {
  if (typeof navigator === "undefined") {
    return "zh-CN" as Locale;
  }

  return navigator.language.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}

function getMessageValue(messages: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, messages);
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
) {
  const message =
    getMessageValue(locales[locale] as unknown as Record<string, unknown>, key) ??
    getMessageValue(locales["zh-CN"] as unknown as Record<string, unknown>, key);

  if (typeof message !== "string") {
    return key;
  }

  return Object.entries(params ?? {}).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
    message,
  );
}

export function getModuleHeaders(locale: Locale, moduleId: ModuleId) {
  const value = getMessageValue(
    locales[locale] as unknown as Record<string, unknown>,
    `modules.${moduleId}.headers`,
  );
  const fallback = getMessageValue(
    locales["zh-CN"] as unknown as Record<string, unknown>,
    `modules.${moduleId}.headers`,
  );

  return (Array.isArray(value) ? value : fallback) as string[];
}

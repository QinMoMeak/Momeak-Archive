import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  detectBrowserLocale,
  getModuleHeaders,
  localeStorageKey,
  resolveLocale,
  translate,
  type Locale,
} from "@/lib/i18n";
import type { ModuleId } from "@/types/knowledge";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  moduleLabel: (moduleId: ModuleId) => string;
  moduleDescription: (moduleId: ModuleId) => string;
  moduleSummary: (moduleId: ModuleId) => string;
  moduleHeaders: (moduleId: ModuleId) => string[];
  formatDate: (value: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "zh-CN";
    }

    return resolveLocale(window.localStorage.getItem(localeStorageKey) ?? detectBrowserLocale());
  });

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params);

    return {
      locale,
      setLocale: setLocaleState,
      t,
      moduleLabel: (moduleId) => t(`modules.${moduleId}.label`),
      moduleDescription: (moduleId) => t(`modules.${moduleId}.description`),
      moduleSummary: (moduleId) => t(`modules.${moduleId}.summary`),
      moduleHeaders: (moduleId) => getModuleHeaders(locale, moduleId),
      formatDate: (value) => {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          return value;
        }

        return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}

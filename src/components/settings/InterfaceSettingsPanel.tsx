import { useEffect, useRef, useState } from "react";
import {
  Check,
  FolderTree,
  Languages,
  Monitor,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Locale } from "@/lib/i18n";
import type { ThemeMode } from "@/lib/theme";

type MenuKey = "locale" | "theme" | null;

type InterfaceSettingsPanelProps = {
  isAdmin?: boolean;
  aiSettingsStatus?: string;
  aiSettingsDisabled?: boolean;
  onOpenAiSettings?: () => void;
  onOpenDataSync?: () => void;
};

const triggerClassName =
  "flex h-11 items-center rounded-full border border-slate-200/80 bg-white/92 px-3 text-sm text-slate-700 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700/80 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900";

const menuClassName =
  "absolute left-0 top-[calc(100%+10px)] z-20 min-w-[170px] overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/96 p-1.5 shadow-[0_26px_70px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/90 dark:bg-slate-950/96 dark:shadow-[0_30px_70px_-42px_rgba(2,6,23,0.92)]";

const utilityTriggerClassName =
  "flex h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/92 text-sm text-slate-700 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.45)] transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700/80 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900";

export function InterfaceSettingsPanel({
  isAdmin = false,
  aiSettingsStatus = "",
  aiSettingsDisabled = false,
  onOpenAiSettings,
  onOpenDataSync,
}: InterfaceSettingsPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  const localeOptions: Array<{ value: Locale; label: string; short: string }> = [
    { value: "zh-CN", label: t("preferences.chinese"), short: "CN" },
    { value: "en", label: t("preferences.english"), short: "EN" },
  ];

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
    icon: typeof Sun;
  }> = [
    { value: "light", label: t("preferences.light"), icon: Sun },
    { value: "dark", label: t("preferences.dark"), icon: Moon },
    { value: "system", label: t("preferences.system"), icon: Monitor },
  ];

  const currentLocale = localeOptions.find((option) => option.value === locale);
  const currentTheme = themeOptions.find((option) => option.value === mode);
  const CurrentThemeIcon = currentTheme?.icon ?? Monitor;

  return (
    <div
      ref={rootRef}
      className="rounded-[24px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-[0_24px_60px_-40px_rgba(2,6,23,0.9)]"
    >
      <div className={`grid gap-2 ${isAdmin ? "grid-cols-4" : "grid-cols-2"}`}>
        <div className="relative min-w-0">
          <button
            type="button"
            aria-label={t("preferences.language")}
            aria-expanded={openMenu === "locale"}
            className={cn(triggerClassName, "w-full min-w-0 justify-center gap-1.5 px-0")}
            onClick={() =>
              setOpenMenu((current) => (current === "locale" ? null : "locale"))
            }
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Languages className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="font-medium">{currentLocale?.short ?? "CN"}</span>
            </span>
          </button>

          {openMenu === "locale" && (
            <div className={menuClassName}>
              {localeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm transition",
                    locale === option.value
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
                  )}
                  onClick={() => {
                    setLocale(option.value);
                    setOpenMenu(null);
                  }}
                >
                  <span>{option.label}</span>
                  {locale === option.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label={t("preferences.theme")}
            aria-expanded={openMenu === "theme"}
            className={cn(triggerClassName, "w-full justify-center px-0")}
            onClick={() =>
              setOpenMenu((current) => (current === "theme" ? null : "theme"))
            }
          >
            <CurrentThemeIcon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
          </button>

          {openMenu === "theme" && (
            <div className={cn(menuClassName, "right-0 left-auto min-w-[168px]")}>
              {themeOptions.map((option) => {
                const OptionIcon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm transition",
                      mode === option.value
                        ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
                    )}
                    onClick={() => {
                      setMode(option.value);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <OptionIcon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </span>
                    {mode === option.value && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isAdmin && (
          <>
            <button
              type="button"
              className={cn(utilityTriggerClassName, "w-full px-0")}
              onClick={onOpenAiSettings}
              disabled={aiSettingsDisabled}
              title={aiSettingsStatus || t("page.aiSettings")}
              aria-label={t("page.aiSettings")}
            >
              <Settings2 className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
            </button>

            <button
              type="button"
              className={cn(utilityTriggerClassName, "w-full px-0")}
              onClick={onOpenDataSync}
              title={t("page.dataSyncHint")}
              aria-label={t("page.dataSync")}
            >
              <FolderTree className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

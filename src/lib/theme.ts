export const themeModes = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof themeModes)[number];

export const themeStorageKey = "personal-kb-theme-mode";

export function isThemeMode(value: string): value is ThemeMode {
  return themeModes.includes(value as ThemeMode);
}

export function resolveThemeMode(value: string | null | undefined): ThemeMode {
  return value && isThemeMode(value) ? value : "system";
}

export function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light" as const;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? ("dark" as const)
    : ("light" as const);
}

export function getResolvedTheme(mode: ThemeMode) {
  return mode === "system" ? getSystemTheme() : mode;
}

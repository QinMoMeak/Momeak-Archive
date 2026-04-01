import { getModuleAiConfig } from "./module-config.mjs";

function normalizeForMatch(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, "")
    .replace(/[／/·・._-]/g, "");
}

function dedupeStrings(values) {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = normalizeForMatch(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function normalizeTags(tags) {
  const seen = new Set();

  return (tags ?? [])
    .map((tag) => String(tag ?? "").replace(/^#/, "").trim())
    .filter((tag) => {
      const normalized = normalizeForMatch(tag);

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function matchConfiguredValue(suggestedValue, availableValues, aliasMap) {
  const suggestion = String(suggestedValue ?? "").trim();

  if (!suggestion) {
    return {
      value: "",
      unmatchedValue: "",
      needsConfirmation: false,
    };
  }

  const exactMatch = availableValues.find((item) => item === suggestion);

  if (exactMatch) {
    return {
      value: exactMatch,
      unmatchedValue: "",
      needsConfirmation: false,
    };
  }

  const normalizedSuggestion = normalizeForMatch(suggestion);
  const normalizedMatch = availableValues.find(
    (item) => normalizeForMatch(item) === normalizedSuggestion,
  );

  if (normalizedMatch) {
    return {
      value: normalizedMatch,
      unmatchedValue: "",
      needsConfirmation: false,
    };
  }

  const normalizedAliasEntries = Object.entries(aliasMap).map(([key, value]) => [
    normalizeForMatch(key),
    value,
  ]);
  const aliasTarget = Object.fromEntries(normalizedAliasEntries)[normalizedSuggestion];

  if (aliasTarget) {
    const aliasMatch = availableValues.find(
      (item) => normalizeForMatch(item) === normalizeForMatch(aliasTarget),
    );

    if (aliasMatch) {
      return {
        value: aliasMatch,
        unmatchedValue: "",
        needsConfirmation: false,
      };
    }
  }

  return {
    value: "",
    unmatchedValue: suggestion,
    needsConfirmation: true,
  };
}

export function resolveConfiguredField(moduleId, field, suggestedValue, availableValues) {
  const config = getModuleAiConfig(moduleId);
  const aliasMap =
    field === "category" ? config.categoryAliases : config.statusAliases;

  return {
    ...matchConfiguredValue(suggestedValue, dedupeStrings(availableValues), aliasMap),
    availableValues: dedupeStrings(availableValues),
  };
}

export function cleanInlineValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function cleanMultilineValue(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

export function dedupeAvailableValues(values) {
  return dedupeStrings(values.map((item) => cleanInlineValue(item)).filter(Boolean));
}

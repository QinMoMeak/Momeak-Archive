import { buildOfflinePrompt } from "./offline.mjs";
import { buildShoppingPrompt } from "./shopping.mjs";
import { buildWebsitesPrompt } from "./websites.mjs";

export function buildModulePrompt(moduleId, context) {
  if (moduleId === "offline") {
    return buildOfflinePrompt(context);
  }

  if (moduleId === "shopping") {
    return buildShoppingPrompt(context);
  }

  if (moduleId === "websites") {
    return buildWebsitesPrompt(context);
  }

  throw new Error("不支持的模块类型。");
}


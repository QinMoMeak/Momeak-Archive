import { buildInboxPrompt } from "./inbox.mjs";
import { buildOfflinePrompt } from "./offline.mjs";
import { buildShoppingPrompt } from "./shopping.mjs";
import { buildSongsPrompt } from "./songs.mjs";
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

  if (moduleId === "inbox") {
    return buildInboxPrompt(context);
  }

  if (moduleId === "songs") {
    return buildSongsPrompt(context);
  }

  throw new Error("不支持的模块类型。");
}

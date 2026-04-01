import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { jianguoyunPreset } from "./jianguoyun-preset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const localConfigDir = path.join(repoRoot, ".local");
const webdavSettingsFile = path.join(localConfigDir, "webdav-settings.json");

function cleanInlineValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function maskPassword(password) {
  const normalized = cleanInlineValue(password);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= 8) {
    return "已保存";
  }

  return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
}

function sanitizeStoredSettings(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const serverUrl = cleanInlineValue(input.serverUrl);
  const username = cleanInlineValue(input.username);
  const password = cleanInlineValue(input.password);
  const remotePath = cleanInlineValue(input.remotePath);
  const updatedAt = cleanInlineValue(input.updatedAt);

  if (!serverUrl && !username && !password && !remotePath) {
    return null;
  }

  return {
    serverUrl,
    username,
    password,
    remotePath,
    updatedAt,
  };
}

async function ensureLocalConfigDir() {
  await fs.mkdir(localConfigDir, { recursive: true });
}

export async function readStoredWebdavSettings() {
  try {
    const raw = await fs.readFile(webdavSettingsFile, "utf8");
    return sanitizeStoredSettings(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeStoredWebdavSettings(settingsInput) {
  const settings = sanitizeStoredSettings(settingsInput);

  if (!settings) {
    throw new Error("没有可保存的 WebDAV 配置。");
  }

  await ensureLocalConfigDir();
  await fs.writeFile(
    webdavSettingsFile,
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8",
  );

  return settings;
}

export async function clearStoredWebdavSettings() {
  try {
    await fs.unlink(webdavSettingsFile);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export async function getWebdavSettingsView() {
  const storedSettings = await readStoredWebdavSettings();

  return {
    preset: jianguoyunPreset,
    storedSettings: storedSettings
      ? {
          serverUrl: storedSettings.serverUrl,
          username: storedSettings.username,
          remotePath: storedSettings.remotePath,
          hasPassword: Boolean(storedSettings.password),
          maskedPassword: maskPassword(storedSettings.password),
          updatedAt: storedSettings.updatedAt,
        }
      : null,
    effectiveSettings: storedSettings
      ? {
          serverUrl: storedSettings.serverUrl,
          username: storedSettings.username,
          remotePath: storedSettings.remotePath,
          hasPassword: Boolean(storedSettings.password),
        }
      : null,
    storage: {
      mode: "protected-local-file",
      pathLabel: ".local/webdav-settings.json",
    },
  };
}

export async function resolveRuntimeWebdavSettings() {
  const storedSettings = await readStoredWebdavSettings();

  if (!storedSettings) {
    throw new Error("当前还没有保存 WebDAV 配置。");
  }

  if (!storedSettings.serverUrl || !storedSettings.username || !storedSettings.password) {
    throw new Error("WebDAV 配置不完整，请补全服务器地址、用户名和应用密码。");
  }

  return storedSettings;
}

export async function saveWebdavSettings(settingsInput) {
  const previous = await readStoredWebdavSettings();
  const nextPassword = cleanInlineValue(settingsInput.password);
  const keepExistingPassword = Boolean(settingsInput.keepExistingPassword);
  const password =
    nextPassword || (keepExistingPassword ? previous?.password ?? "" : "");

  if (!password) {
    throw new Error("请填写 WebDAV 应用密码。");
  }

  await writeStoredWebdavSettings({
    serverUrl: cleanInlineValue(settingsInput.serverUrl) || jianguoyunPreset.serverUrl,
    username: cleanInlineValue(settingsInput.username),
    password,
    remotePath: cleanInlineValue(settingsInput.remotePath) || jianguoyunPreset.remotePath,
    updatedAt: new Date().toISOString(),
  });

  return getWebdavSettingsView();
}

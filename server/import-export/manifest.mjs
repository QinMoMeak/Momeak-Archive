import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { knowledgeModuleIds } from "../knowledge-store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const exportSchemaVersion = 1;

let cachedPackageVersion = "";

async function getPackageVersion() {
  if (cachedPackageVersion) {
    return cachedPackageVersion;
  }

  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    cachedPackageVersion = String(parsed.version ?? "").trim();
  } catch {
    cachedPackageVersion = "";
  }

  return cachedPackageVersion;
}

export function buildModuleStats(entriesByModule) {
  return Object.fromEntries(
    Object.entries(entriesByModule).map(([moduleId, entries]) => [
      moduleId,
      {
        entryCount: Array.isArray(entries) ? entries.length : 0,
      },
    ]),
  );
}

export async function createExportManifest({
  exportedModules,
  entriesByModule,
}) {
  const moduleStats = buildModuleStats(entriesByModule);
  const totalEntries = Object.values(moduleStats).reduce(
    (total, item) => total + item.entryCount,
    0,
  );
  const isFull = exportedModules.length === knowledgeModuleIds.length;

  return {
    schemaVersion: exportSchemaVersion,
    exportTime: new Date().toISOString(),
    exportScope: isFull ? "full" : "partial",
    exportedModules,
    totalEntries,
    moduleStats,
    sourceAppVersion: await getPackageVersion(),
    isFullExport: isFull,
  };
}

export function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("导入包缺少有效的 manifest.json。");
  }

  if (manifest.schemaVersion !== exportSchemaVersion) {
    throw new Error("导入包 schemaVersion 不兼容。");
  }

  if (!Array.isArray(manifest.exportedModules) || manifest.exportedModules.length === 0) {
    throw new Error("导入包 manifest 缺少 exportedModules。");
  }
}

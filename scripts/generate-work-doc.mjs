import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { workDocConfig } from "./work-doc.config.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, workDocConfig.docsDirName);
const filePattern = new RegExp(
  `^(\\d+)\\.(\\d+)\\.(\\d+)-${workDocConfig.fileSuffix}\\.md$`,
);

function parseArgs(argv) {
  const result = {
    summary: [],
    changes: [],
    impacts: [],
    suggestions: [],
    files: [],
    bump: workDocConfig.defaultBump,
    title: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (!current.startsWith("--")) {
      continue;
    }

    switch (current) {
      case "--summary":
        if (next) {
          result.summary.push(next);
          index += 1;
        }
        break;
      case "--change":
        if (next) {
          result.changes.push(next);
          index += 1;
        }
        break;
      case "--impact":
        if (next) {
          result.impacts.push(next);
          index += 1;
        }
        break;
      case "--next":
        if (next) {
          result.suggestions.push(next);
          index += 1;
        }
        break;
      case "--file":
        if (next) {
          result.files.push(next);
          index += 1;
        }
        break;
      case "--bump":
        if (next === "patch" || next === "minor" || next === "major") {
          result.bump = next;
          index += 1;
        }
        break;
      case "--title":
        if (next) {
          result.title = next;
          index += 1;
        }
        break;
      default:
        break;
    }
  }

  return result;
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());

  if (!match) {
    throw new Error(`无效的版本号：${version}`);
  }

  return match.slice(1).map((value) => Number(value));
}

function formatVersion([major, minor, patch]) {
  return `${major}.${minor}.${patch}`;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

function bumpVersion(versionParts, bumpType) {
  const [major, minor, patch] = versionParts;

  if (bumpType === "major") {
    return [major + 1, 0, 0];
  }

  if (bumpType === "minor") {
    return [major, minor + 1, 0];
  }

  return [major, minor, patch + 1];
}

async function ensureDocsDir() {
  await fs.mkdir(docsDir, { recursive: true });
}

async function readExistingVersions() {
  await ensureDocsDir();
  const entries = await fs.readdir(docsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .map((name) => {
      const match = filePattern.exec(name);

      if (!match) {
        return null;
      }

      return {
        name,
        version: match.slice(1).map((value) => Number(value)),
      };
    })
    .filter(Boolean);
}

async function getNextVersion(bumpType) {
  const existing = await readExistingVersions();
  const baseVersion = parseVersion(workDocConfig.baseVersion);
  const scopedExisting = workDocConfig.lockVersionSeriesToBase
    ? existing.filter(
        (item) =>
          item.version[0] === baseVersion[0] && item.version[1] === baseVersion[1],
      )
    : existing;

  if (scopedExisting.length === 0) {
    return workDocConfig.startAtBaseWhenNoHistory
      ? baseVersion
      : bumpVersion(baseVersion, bumpType);
  }

  const latest = scopedExisting
    .map((item) => item.version)
    .sort((left, right) => compareVersions(right, left))[0];

  return bumpVersion(latest, bumpType);
}

async function getChangedFiles() {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["status", "--short"],
      { cwd: repoRoot },
    );

    return stdout
      .split(/\r?\n/)
      .map((line) => line.replace(/\r/g, ""))
      .filter(Boolean)
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildAutoSummary(files) {
  if (files.length === 0) {
    return ["本次改动已完成，建议补充更具体的工作摘要。"];
  }

  const buckets = [
    { test: (file) => file.startsWith("server/"), label: "服务端接口与数据逻辑" },
    { test: (file) => file.startsWith("src/components/"), label: "前端界面与交互" },
    { test: (file) => file.startsWith("src/lib/"), label: "前端调用与工具封装" },
    { test: (file) => file.startsWith("src/pages/"), label: "页面编排与页面级逻辑" },
    { test: (file) => file.startsWith("docs/"), label: "文档与维护记录" },
    { test: () => true, label: "其他项目文件" },
  ];
  const labels = [];

  for (const file of files) {
    const matched = buckets.find((bucket) => bucket.test(file));

    if (matched && !labels.includes(matched.label)) {
      labels.push(matched.label);
    }
  }

  return [`本次改动主要涉及：${labels.join("、")}。`];
}

function formatBulletLines(items, fallback) {
  const values = items.filter(Boolean);

  if (values.length === 0) {
    return [`- ${fallback}`];
  }

  return values.map((item) => `- ${item}`);
}

function buildMarkdown({
  version,
  generatedAt,
  title,
  summary,
  files,
  changes,
  impacts,
  suggestions,
}) {
  return `# ${title || `工作说明 ${version}`}

- 版本号：${version}
- 生成时间：${generatedAt}

## 本次改动摘要
${formatBulletLines(summary, "请补充本次改动摘要。").join("\n")}

## 主要修改文件
${formatBulletLines(files, "本次未自动识别到主要修改文件，请手动补充。").join("\n")}

## 功能变化
${formatBulletLines(changes, "请补充本次功能变化。").join("\n")}

## 可能的影响范围
${formatBulletLines(impacts, "请结合构建、回归和联调结果补充影响范围。").join("\n")}

## 后续建议
${formatBulletLines(suggestions, "如需继续扩展，可在下一次改动中补充。").join("\n")}
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const changedFiles = args.files.length > 0 ? args.files : await getChangedFiles();
  const nextVersion = await getNextVersion(args.bump);
  const version = formatVersion(nextVersion);
  const fileName = `${version}-${workDocConfig.fileSuffix}.md`;
  const filePath = path.join(docsDir, fileName);
  const generatedAt = new Date().toISOString();
  const summary = args.summary.length > 0 ? args.summary : buildAutoSummary(changedFiles);

  const markdown = buildMarkdown({
    version,
    generatedAt,
    title: args.title,
    summary,
    files: changedFiles,
    changes: args.changes,
    impacts: args.impacts,
    suggestions: args.suggestions,
  });

  await ensureDocsDir();
  await fs.writeFile(filePath, markdown, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        version,
        fileName,
        filePath,
      },
      null,
      2,
    ),
  );
}

await main();

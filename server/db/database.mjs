import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.KNOWLEDGE_REPO_ROOT
  ? path.resolve(process.env.KNOWLEDGE_REPO_ROOT)
  : path.resolve(__dirname, "..", "..");

export const databaseFilePath =
  process.env.KNOWLEDGE_DB_FILE || path.join(repoRoot, "data", "momeak.sqlite");

let database = null;

export function getDatabase() {
  if (database) {
    return database;
  }

  fs.mkdirSync(path.dirname(databaseFilePath), { recursive: true });

  database = new DatabaseSync(databaseFilePath);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  initializeSchema(database);
  seedFromJsonIfEmpty(database);

  return database;
}

export function closeDatabase() {
  if (database) {
    database.close();
    database = null;
  }
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_info (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      module TEXT NOT NULL CHECK (module IN ('offline','shopping','websites','inbox','songs')),
      id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      position INTEGER,
      PRIMARY KEY (module, id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_module_position
      ON entries (module, position);

    CREATE TABLE IF NOT EXISTS markdowns (
      module TEXT NOT NULL CHECK (module IN ('offline','shopping','websites','inbox','songs')),
      entry_id TEXT NOT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (module, entry_id),
      FOREIGN KEY (module, entry_id) REFERENCES entries (module, id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS taxonomy (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL DEFAULT '{}'
    );
  `);

  const row = db.prepare("SELECT value FROM schema_info WHERE key = 'version'").get();

  if (!row) {
    db.prepare("INSERT INTO schema_info (key, value) VALUES ('version', '1')").run();
  }
}

// 数据库为空但 data/*.json 存在时，自动从 JSON 种子初始化（幂等）。
// 这保证了首次切换到 SQLite 时零手工步骤：直接 npm run dev:server 即可。
function seedFromJsonIfEmpty(db) {
  const countRow = db
    .prepare("SELECT COUNT(*) AS total FROM entries")
    .get();

  if (Number(countRow.total) > 0) {
    return;
  }

  const dataDir = path.join(repoRoot, "data");
  const moduleIds = ["offline", "shopping", "websites", "inbox", "songs"];
  let seeded = 0;

  const insertEntry = db.prepare(`
    INSERT INTO entries (module, id, name, category, status, tags, payload, created_at, updated_at, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMarkdown = db.prepare(`
    INSERT OR REPLACE INTO markdowns (module, entry_id, content)
    VALUES (?, ?, ?)
  `);

  db.exec("BEGIN");
  try {
    for (const moduleId of moduleIds) {
      const jsonPath = path.join(dataDir, `${moduleId}.json`);

      if (!fs.existsSync(jsonPath)) {
        continue;
      }

      const entries = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      for (const [position, entry] of entries.entries()) {
        insertEntry.run(
          moduleId,
          entry.id,
          entry.name ?? "",
          entry.category ?? "",
          entry.status ?? "",
          JSON.stringify(entry.tags ?? []),
          JSON.stringify(entry),
          entry.createdAt ?? "",
          entry.updatedAt ?? "",
          position,
        );
        seeded += 1;
      }

      const contentDir = path.join(repoRoot, "content", moduleId);

      if (fs.existsSync(contentDir)) {
        for (const fileName of fs.readdirSync(contentDir)) {
          if (!fileName.endsWith(".md")) {
            continue;
          }

          const entryId = fileName.slice(0, -".md".length);
          const content = fs.readFileSync(path.join(contentDir, fileName), "utf8");
          insertMarkdown.run(moduleId, entryId, content);
        }
      }
    }

    const taxonomyPath = path.join(dataDir, "taxonomy.json");

    if (fs.existsSync(taxonomyPath)) {
      db.prepare(
        "INSERT OR REPLACE INTO taxonomy (id, payload) VALUES (1, ?)",
      ).run(fs.readFileSync(taxonomyPath, "utf8"));
    }

    db.exec("COMMIT");
    console.log(
      `[knowledge-db] seeded ${seeded} entries from JSON seeds into ${databaseFilePath}`,
    );
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

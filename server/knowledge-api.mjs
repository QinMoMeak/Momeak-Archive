import http from "node:http";
import { randomUUID } from "node:crypto";

import {
  createCategory,
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  deleteCategory,
  readKnowledgeData,
  readKnowledgeMeta,
  readMarkdownContent,
  renameCategory,
  updateKnowledgeEntry,
} from "./knowledge-store.mjs";
import { parseKnowledgeEntryWithAi } from "./ai/parse-entry.mjs";
import { createKnowledgeExport } from "./import-export/create-knowledge-export.mjs";
import { createImportTemplate } from "./import-export/create-import-template.mjs";
import { createExampleTemplate } from "./import-export/create-example-template.mjs";
import { generateImportAiPrompt } from "./import-export/generate-import-ai-prompt.mjs";
import { validateImportPackage } from "./import-export/validate-import-package.mjs";
import { applyKnowledgeImport } from "./import-export/apply-knowledge-import.mjs";
import {
  clearStoredAiSettings,
  getAiSettingsView,
  saveAiSettings,
} from "./ai/resolve-runtime-config.mjs";
import {
  clearStoredWebdavSettings,
  getWebdavSettingsView,
  saveWebdavSettings,
} from "./webdav/settings.mjs";
import {
  downloadBackupFromWebdav,
  listWebdavBackupFiles,
  uploadBackupToWebdav,
} from "./webdav/client.mjs";
import {
  isDefaultAdminPassword,
  knowledgeAdminPassword,
  sessionDurationMs,
} from "./config.mjs";

const host = "127.0.0.1";
const port = Number(process.env.KNOWLEDGE_API_PORT || 5174);
const authCookieName = "knowledge_admin_session";
const sessions = new Map();

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Selected-Modules, X-File-Name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Selected-Modules, X-File-Name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(payload);
}

function sendBinary(response, statusCode, payload, fileName) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Selected-Modules, X-File-Name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  });
  response.end(payload);
}

function appendCookie(response, cookieValue) {
  const currentCookie = response.getHeader("Set-Cookie");
  const nextValue = currentCookie
    ? Array.isArray(currentCookie)
      ? [...currentCookie, cookieValue]
      : [currentCookie, cookieValue]
    : cookieValue;

  response.setHeader("Set-Cookie", nextValue);
}

function parseCookies(request) {
  const header = request.headers.cookie;

  if (!header) {
    return {};
  }

  return header.split(";").reduce((result, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split("=");
    result[rawKey] = decodeURIComponent(rawValue.join("="));
    return result;
  }, {});
}

function getSession(request) {
  const cookies = parseCookies(request);
  const sessionId = cookies[authCookieName];

  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return {
    id: sessionId,
    ...session,
  };
}

function requireAdmin(request) {
  const session = getSession(request);

  if (!session) {
    throw createHttpError(
      401,
      "\u8bf7\u5148\u4ee5\u7ba1\u7406\u5458\u8eab\u4efd\u767b\u5f55\u540e\u518d\u8fdb\u884c\u5199\u5165\u64cd\u4f5c\u3002",
    );
  }

  return session;
}

function getAuthPayload(request) {
  return {
    isAdmin: Boolean(getSession(request)),
    isPasswordConfigured: !isDefaultAdminPassword,
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

function readBufferBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

function parseSelectedModulesHeader(request) {
  const rawHeader = request.headers["x-selected-modules"];

  if (!rawHeader) {
    return [];
  }

  return String(rawHeader)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "\u8bf7\u6c42\u5730\u5740\u65e0\u6548\u3002" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Selected-Modules, X-File-Name",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    response.end();
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/knowledge") {
      sendJson(response, 200, {
        data: await readKnowledgeData(),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/knowledge/meta") {
      sendJson(response, 200, {
        meta: await readKnowledgeMeta(),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      sendJson(response, 200, getAuthPayload(request));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/ai/settings") {
      requireAdmin(request);
      sendJson(response, 200, await getAiSettingsView());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/parse-entry") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await parseKnowledgeEntryWithAi(body);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/ai/settings") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      sendJson(response, 200, await saveAiSettings(body));
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/ai/settings") {
      requireAdmin(request);
      await clearStoredAiSettings();
      sendJson(response, 200, await getAiSettingsView());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/data-sync/webdav/settings") {
      requireAdmin(request);
      sendJson(response, 200, await getWebdavSettingsView());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/data-sync/webdav/settings") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      sendJson(response, 200, await saveWebdavSettings(body));
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/data-sync/webdav/settings") {
      requireAdmin(request);
      await clearStoredWebdavSettings();
      sendJson(response, 200, await getWebdavSettingsView());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/data-sync/webdav/backups") {
      requireAdmin(request);
      sendJson(response, 200, {
        files: await listWebdavBackupFiles(),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/export") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const exported = await createKnowledgeExport(body.modules ?? []);
      sendBinary(response, 200, exported.buffer, exported.fileName);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/templates/empty") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const exported = await createImportTemplate(body.modules ?? []);
      sendBinary(response, 200, exported.buffer, exported.fileName);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/templates/example") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const exported = await createExampleTemplate(body.modules ?? []);
      sendBinary(response, 200, exported.buffer, exported.fileName);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/templates/prompt") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      sendJson(response, 200, await generateImportAiPrompt(body.modules ?? []));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/import/inspect") {
      requireAdmin(request);
      const buffer = await readBufferBody(request);
      const selectedModules = parseSelectedModulesHeader(request);
      const inspected = await validateImportPackage(buffer, selectedModules);
      sendJson(response, 200, {
        manifest: inspected.manifest,
        preview: inspected.preview,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/import/apply") {
      requireAdmin(request);
      const buffer = await readBufferBody(request);
      const selectedModules = parseSelectedModulesHeader(request);
      const applied = await applyKnowledgeImport(buffer, selectedModules);
      sendJson(response, 200, applied);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/webdav/upload") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const exported = await createKnowledgeExport(body.modules ?? []);
      const remoteFile = exported.fileName.replace(
        "knowledge-export-",
        "knowledge-backup-",
      );
      const uploaded = await uploadBackupToWebdav(remoteFile, exported.buffer);
      sendJson(response, 200, {
        remoteFile: uploaded.remoteFile,
        remoteUrl: uploaded.remoteUrl,
        manifest: exported.manifest,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/data-sync/webdav/restore") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");

      if (!body.remoteFile) {
        sendJson(response, 400, { error: "请先选择要恢复的远程备份文件。" });
        return;
      }

      const downloaded = await downloadBackupFromWebdav(body.remoteFile);
      const applied = await applyKnowledgeImport(downloaded.buffer, body.modules ?? []);
      sendJson(response, 200, {
        ...applied,
        remoteFile: downloaded.remoteFile,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const password = String(body.password ?? "");

      if (!password || password !== knowledgeAdminPassword) {
        sendJson(response, 401, {
          error: "\u5bc6\u7801\u4e0d\u6b63\u786e\uff0c\u65e0\u6cd5\u8fdb\u5165\u7f16\u8f91\u6a21\u5f0f\u3002",
        });
        return;
      }

      const sessionId = randomUUID();
      const expiresAt = Date.now() + sessionDurationMs;
      sessions.set(sessionId, { expiresAt });
      appendCookie(
        response,
        `${authCookieName}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
          sessionDurationMs / 1000,
        )}`,
      );
      sendJson(response, 200, {
        isAdmin: true,
        isPasswordConfigured: !isDefaultAdminPassword,
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const session = getSession(request);

      if (session) {
        sessions.delete(session.id);
      }

      appendCookie(
        response,
        `${authCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
      sendJson(response, 200, {
        isAdmin: false,
        isPasswordConfigured: !isDefaultAdminPassword,
      });
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/knowledge/content/")) {
      const [, , , , moduleId, entryId] = url.pathname.split("/");

      if (!moduleId || !entryId) {
        sendJson(response, 400, { error: "\u5185\u5bb9\u8def\u5f84\u65e0\u6548\u3002" });
        return;
      }

      const markdown = await readMarkdownContent(moduleId, entryId);

      if (!markdown) {
        sendJson(response, 404, { error: "\u6ca1\u6709\u627e\u5230 Markdown \u5185\u5bb9\u3002" });
        return;
      }

      sendText(response, 200, markdown);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/knowledge") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await createKnowledgeEntry(body.moduleId, body.draft ?? {});
      sendJson(response, 201, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/knowledge/categories") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await createCategory(body.moduleId, body.name);
      sendJson(response, 201, result);
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/knowledge/categories") {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await renameCategory(
        body.moduleId,
        body.oldName,
        body.newName,
      );
      sendJson(response, 200, result);
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/knowledge/categories/delete"
    ) {
      requireAdmin(request);
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await deleteCategory(
        body.moduleId,
        body.name,
        body.replacementName,
      );
      sendJson(response, 200, result);
      return;
    }

    if (
      request.method === "PUT" &&
      /^\/api\/knowledge\/(offline|shopping|websites)\/[^/]+$/.test(url.pathname)
    ) {
      requireAdmin(request);
      const [, , , moduleId, entryId] = url.pathname.split("/");
      const rawBody = await readBody(request);
      const body = JSON.parse(rawBody || "{}");
      const result = await updateKnowledgeEntry(
        moduleId,
        entryId,
        body.draft ?? {},
      );
      sendJson(response, 200, result);
      return;
    }

    if (
      request.method === "DELETE" &&
      /^\/api\/knowledge\/(offline|shopping|websites)\/[^/]+$/.test(url.pathname)
    ) {
      requireAdmin(request);
      const [, , , moduleId, entryId] = url.pathname.split("/");
      const result = await deleteKnowledgeEntry(moduleId, entryId);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "\u672a\u627e\u5230\u5bf9\u5e94\u7684\u672c\u5730\u5199\u5165\u63a5\u53e3\u3002" });
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    const message =
      error instanceof Error
        ? error.message
        : "\u672c\u5730\u5199\u5165\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7ec8\u7aef\u65e5\u5fd7\u3002";

    sendJson(response, statusCode, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`[knowledge-api] listening on http://${host}:${port}`);
});

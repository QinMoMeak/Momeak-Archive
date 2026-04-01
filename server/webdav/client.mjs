import { XMLParser } from "fast-xml-parser";
import { ProxyAgent } from "undici";

import { resolveRuntimeWebdavSettings } from "./settings.mjs";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function getProxyDispatcher() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    "";

  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

const proxyDispatcher = getProxyDispatcher();

function trimSlashes(value) {
  return String(value ?? "").replace(/^\/+|\/+$/g, "");
}

function createAuthHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

function normalizeBaseUrl(serverUrl) {
  return `${String(serverUrl).replace(/\/+$/, "")}/`;
}

function buildRemoteDirectoryUrl(settings) {
  const baseUrl = normalizeBaseUrl(settings.serverUrl);
  const remotePath = trimSlashes(settings.remotePath);
  return remotePath ? `${baseUrl}${remotePath}/` : baseUrl;
}

async function requestWebdav(settings, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: createAuthHeader(settings.username, settings.password),
      ...(options.body ? { "Content-Type": "application/octet-stream" } : {}),
      ...options.headers,
    },
    dispatcher: proxyDispatcher,
  });

  return response;
}

async function ensureRemoteDirectory(settings, directoryUrl) {
  const response = await requestWebdav(settings, directoryUrl, {
    method: "MKCOL",
  });

  if (response.ok || response.status === 405) {
    return;
  }

  const errorText = await response.text();
  throw new Error(
    `无法创建 WebDAV 目录（${response.status}）：${errorText || "请检查路径和权限。"}`,
  );
}

function extractResponseEntries(xmlText, directoryUrl) {
  const parsed = xmlParser.parse(xmlText);
  const multistatus = parsed["d:multistatus"] || parsed.multistatus || parsed["D:multistatus"];
  const rawResponses =
    multistatus?.["d:response"] ||
    multistatus?.response ||
    multistatus?.["D:response"] ||
    [];
  const responseList = Array.isArray(rawResponses) ? rawResponses : [rawResponses];

  return responseList
    .map((item) => {
      const href = item?.["d:href"] || item?.href || item?.["D:href"] || "";
      const propStat =
        item?.["d:propstat"] || item?.propstat || item?.["D:propstat"] || {};
      const prop =
        propStat?.["d:prop"] || propStat?.prop || propStat?.["D:prop"] || {};
      const resourceType =
        prop?.["d:resourcetype"] || prop?.resourcetype || prop?.["D:resourcetype"];
      const isDirectory = Boolean(
        resourceType?.["d:collection"] ||
          resourceType?.collection ||
          resourceType?.["D:collection"],
      );
      const decodedHref = decodeURIComponent(String(href));
      const fileName = decodedHref.split("/").filter(Boolean).at(-1) ?? "";

      return {
        href: decodedHref,
        fileName,
        isDirectory,
        contentLength: Number(
          prop?.["d:getcontentlength"] ||
            prop?.getcontentlength ||
            prop?.["D:getcontentlength"] ||
            0,
        ),
        lastModified:
          prop?.["d:getlastmodified"] ||
          prop?.getlastmodified ||
          prop?.["D:getlastmodified"] ||
          "",
      };
    })
    .filter(
      (item) =>
        item.href &&
        item.href !== directoryUrl &&
        item.fileName &&
        !item.isDirectory &&
        item.fileName.toLowerCase().endsWith(".zip"),
    );
}

export async function listWebdavBackupFiles() {
  const settings = await resolveRuntimeWebdavSettings();
  const directoryUrl = buildRemoteDirectoryUrl(settings);
  await ensureRemoteDirectory(settings, directoryUrl);

  const response = await requestWebdav(settings, directoryUrl, {
    method: "PROPFIND",
    headers: {
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:getlastmodified />
    <d:getcontentlength />
    <d:resourcetype />
  </d:prop>
</d:propfind>`,
  });

  if (!response.ok && response.status !== 207) {
    const errorText = await response.text();
    throw new Error(
      `列出 WebDAV 备份失败（${response.status}）：${errorText || "请检查路径和凭证。"}`,
    );
  }

  const xmlText = await response.text();

  return extractResponseEntries(xmlText, directoryUrl).map((item) => ({
    ...item,
    remoteFile: item.fileName,
  }));
}

export async function uploadBackupToWebdav(fileName, buffer) {
  const settings = await resolveRuntimeWebdavSettings();
  const directoryUrl = buildRemoteDirectoryUrl(settings);
  await ensureRemoteDirectory(settings, directoryUrl);
  const targetUrl = `${directoryUrl}${encodeURIComponent(fileName)}`;
  const response = await requestWebdav(settings, targetUrl, {
    method: "PUT",
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `上传 WebDAV 备份失败（${response.status}）：${errorText || "请检查坚果云配置。"}`,
    );
  }

  return {
    remoteFile: fileName,
    remoteUrl: targetUrl,
  };
}

export async function downloadBackupFromWebdav(remoteFile) {
  const settings = await resolveRuntimeWebdavSettings();
  const directoryUrl = buildRemoteDirectoryUrl(settings);
  const targetUrl = `${directoryUrl}${encodeURIComponent(trimSlashes(remoteFile))}`;
  const response = await requestWebdav(settings, targetUrl, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `下载 WebDAV 备份失败（${response.status}）：${errorText || "请检查远程文件名。"}`,
    );
  }

  return {
    remoteFile,
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

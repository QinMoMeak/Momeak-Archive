function ensureProtocol(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export function extractUrlCandidate(rawText) {
  const text = String(rawText ?? "").trim();
  const urlMatch = text.match(/\bhttps?:\/\/[^\s<>"'`]+/i);

  if (urlMatch?.[0]) {
    return urlMatch[0];
  }

  const bareDomainMatch = text.match(
    /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>"'`]*)?/i,
  );

  return bareDomainMatch?.[0] ?? "";
}

export function normalizeWebsiteUrl(input) {
  const candidate = extractUrlCandidate(input);

  if (!candidate) {
    return {
      hasUrl: false,
      url: "",
      domain: "",
      readerPathTarget: "",
    };
  }

  try {
    const normalized = new URL(ensureProtocol(candidate));
    normalized.hash = "";

    const domain = normalized.hostname.replace(/^www\./i, "").toLowerCase();
    const isHttps = normalized.protocol === "https:";
    const readerPathTarget = isHttps
      ? `${normalized.host}${normalized.pathname}${normalized.search}`
      : `${normalized.protocol}//${normalized.host}${normalized.pathname}${normalized.search}`;

    return {
      hasUrl: true,
      url: normalized.toString(),
      domain,
      readerPathTarget,
    };
  } catch {
    return {
      hasUrl: false,
      url: "",
      domain: "",
      readerPathTarget: "",
    };
  }
}

export function looksLikeWebsiteHint(rawText) {
  const text = String(rawText ?? "").toLowerCase();

  return (
    /https?:\/\//.test(text) ||
    /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/.test(text) ||
    /(网站|官网|域名|url|网址|站点|site|domain)/.test(text)
  );
}

export function looksLikeDomain(value) {
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(String(value ?? "").trim());
}

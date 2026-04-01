function ensureProtocol(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function toNormalizedCandidate(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return null;
  }

  try {
    const normalized = new URL(ensureProtocol(trimmed));
    normalized.hash = "";

    const domain = normalized.hostname.replace(/^www\./i, "").toLowerCase();
    const url = normalized.toString();
    const readerPathTarget =
      normalized.protocol === "https:"
        ? `${normalized.host}${normalized.pathname}${normalized.search}`
        : `${normalized.protocol}//${normalized.host}${normalized.pathname}${normalized.search}`;

    return {
      input: trimmed,
      url,
      domain,
      readerPathTarget,
    };
  } catch {
    return null;
  }
}

export function extractUrlCandidates(rawText, limit = 8) {
  const text = String(rawText ?? "");
  const matches = [
    ...text.matchAll(/\bhttps?:\/\/[^\s<>"'`]+/gi),
    ...text.matchAll(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>"'`]*)?/gi),
  ].map((match) => match[0]);

  const seen = new Set();
  const candidates = [];

  for (const match of matches) {
    const normalized = toNormalizedCandidate(match);

    if (!normalized || seen.has(normalized.url)) {
      continue;
    }

    seen.add(normalized.url);
    candidates.push(normalized);

    if (candidates.length >= limit) {
      break;
    }
  }

  return candidates;
}

export function extractUrlCandidate(rawText) {
  return extractUrlCandidates(rawText, 1)[0]?.input ?? "";
}

export function normalizeWebsiteCandidates(rawText, limit = 8) {
  const candidates = extractUrlCandidates(rawText, limit);

  return {
    hasUrl: candidates.length > 0,
    candidates,
    first: candidates[0] ?? null,
  };
}

export function normalizeWebsiteUrl(input) {
  const normalized = normalizeWebsiteCandidates(input, 1);
  const first = normalized.first;

  if (!first) {
    return {
      hasUrl: false,
      url: "",
      domain: "",
      readerPathTarget: "",
    };
  }

  return {
    hasUrl: true,
    url: first.url,
    domain: first.domain,
    readerPathTarget: first.readerPathTarget,
  };
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

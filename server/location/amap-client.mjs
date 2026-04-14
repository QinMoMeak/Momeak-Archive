import {
  amapTimeoutMs,
  amapWebServiceBaseUrl,
  amapWebServiceKey,
} from "../config.mjs";

function ensureAmapKey() {
  if (!amapWebServiceKey) {
    const error = new Error(
      "未配置高德 Web Service Key，请先在 .env.local 中设置 AMAP_WEB_SERVICE_KEY。",
    );
    error.statusCode = 500;
    throw error;
  }
}

async function requestAmap(pathname, params) {
  ensureAmapKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), amapTimeoutMs);

  try {
    const searchParams = new URLSearchParams({
      ...params,
      key: amapWebServiceKey,
      output: "json",
    });
    const response = await fetch(
      `${amapWebServiceBaseUrl}${pathname}?${searchParams.toString()}`,
      {
        signal: controller.signal,
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      const error = new Error(payload.info || "高德接口请求失败。");
      error.statusCode = response.status;
      throw error;
    }

    if (String(payload.status) !== "1") {
      const error = new Error(payload.info || "高德接口返回失败状态。");
      error.statusCode = 502;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error("高德地图请求超时，请稍后再试。");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function reverseGeocodeByCoords({ lng, lat }) {
  return requestAmap("/v3/geocode/regeo", {
    location: `${lng},${lat}`,
    extensions: "base",
    radius: "1000",
  });
}

export async function geocodeAddress({ address, city = "" }) {
  return requestAmap("/v3/geocode/geo", {
    address,
    city,
  });
}

export async function searchPlaceText({ keywords, city = "" }) {
  return requestAmap("/v5/place/text", {
    keywords,
    region: city,
  });
}

export async function locateByIp(ip = "") {
  return requestAmap("/v3/ip", ip ? { ip } : {});
}

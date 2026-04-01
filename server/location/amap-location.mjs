import {
  geocodeAddress,
  locateByIp,
  reverseGeocodeByCoords,
} from "./amap-client.mjs";

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeCity(value) {
  if (Array.isArray(value)) {
    return cleanText(value[0]);
  }

  return cleanText(value);
}

function normalizeLocationText(parts) {
  return parts.map(cleanText).filter(Boolean).join(" ");
}

export function buildOfflineLocationPatch(result) {
  const formattedAddress = cleanText(result.formattedAddress);
  const locationText =
    cleanText(result.locationText) ||
    formattedAddress ||
    normalizeLocationText([result.city, result.district, result.province]);

  return {
    location: locationText || formattedAddress,
    locationText,
    formattedAddress,
    province: cleanText(result.province),
    city: cleanText(result.city),
    district: cleanText(result.district),
    adcode: cleanText(result.adcode),
    lng:
      typeof result.lng === "number" && Number.isFinite(result.lng) ? String(result.lng) : "",
    lat:
      typeof result.lat === "number" && Number.isFinite(result.lat) ? String(result.lat) : "",
    locationSource: cleanText(result.locationSource),
    locationAccuracy: cleanText(result.locationAccuracy),
    locationRectangle: cleanText(result.locationRectangle),
  };
}

export async function resolveCurrentPosition({ lng, lat, locationText = "" }) {
  const payload = await reverseGeocodeByCoords({ lng, lat });
  const regeocode = payload.regeocode ?? {};
  const component = regeocode.addressComponent ?? {};

  return {
    locationText: cleanText(locationText) || cleanText(regeocode.formatted_address),
    formattedAddress: cleanText(regeocode.formatted_address),
    province: cleanText(component.province),
    city: normalizeCity(component.city) || cleanText(component.province),
    district: cleanText(component.district),
    adcode: cleanText(component.adcode),
    lng,
    lat,
    locationSource: "browser_geolocation",
    locationAccuracy: "exact",
    locationRectangle: "",
  };
}

export async function resolveAddressText({ address, city = "" }) {
  const trimmedAddress = cleanText(address);

  if (!trimmedAddress) {
    const error = new Error("请先输入地点文本，再解析地址。");
    error.statusCode = 400;
    throw error;
  }

  const payload = await geocodeAddress({ address: trimmedAddress, city });
  const geocodes = Array.isArray(payload.geocodes) ? payload.geocodes : [];

  if (geocodes.length === 0) {
    const error = new Error("未找到匹配地址，请补充更明确的店名、商圈或详细地址。");
    error.statusCode = 400;
    throw error;
  }

  const target = geocodes[0];
  const [lng = "", lat = ""] = cleanText(target.location).split(",");
  const lngValue = Number(lng);
  const latValue = Number(lat);

  return {
    locationText: trimmedAddress,
    formattedAddress: cleanText(target.formatted_address) || trimmedAddress,
    province: cleanText(target.province),
    city: cleanText(target.city),
    district: cleanText(target.district),
    adcode: cleanText(target.adcode),
    lng: Number.isFinite(lngValue) ? lngValue : null,
    lat: Number.isFinite(latValue) ? latValue : null,
    locationSource: "geocode",
    locationAccuracy: "exact",
    locationRectangle: "",
    warning:
      geocodes.length > 1
        ? "当前地址存在多个匹配结果，已使用第一条，请确认是否准确。"
        : "",
  };
}

export async function resolveIpFallback(ip = "") {
  const payload = await locateByIp(ip);
  const rectangle = cleanText(payload.rectangle);

  return {
    locationText: normalizeLocationText([payload.city, payload.province]),
    formattedAddress: normalizeLocationText([payload.province, payload.city]),
    province: cleanText(payload.province),
    city: cleanText(payload.city),
    district: "",
    adcode: cleanText(payload.adcode),
    lng: null,
    lat: null,
    locationSource: "ip_fallback",
    locationAccuracy: "approximate",
    locationRectangle: rectangle,
    message: "定位授权失败，已回退到基于 IP 的近似位置。",
    warning: rectangle
      ? "这是基于 IP 的粗略位置，只能反映城市级范围，不代表真实当前位置。"
      : "这是基于 IP 的粗略位置，只能反映城市级范围，不代表真实当前位置。",
  };
}

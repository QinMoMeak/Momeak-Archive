import {
  geocodeAddress,
  locateByIp,
  reverseGeocodeByCoords,
  searchPlaceText,
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

function buildGeocodeResult(target, trimmedAddress, geocodesLength) {
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
      geocodesLength > 1 ? "当前地址存在多个匹配结果，已使用第一条，请确认是否准确。" : "",
  };
}

function buildPoiResult(target, trimmedAddress, poisLength, city) {
  const [lng = "", lat = ""] = cleanText(target.location).split(",");
  const lngValue = Number(lng);
  const latValue = Number(lat);
  const cityValue = normalizeCity(target.cityname || target.city);
  const districtValue = cleanText(target.adname || target.district);
  const provinceValue = cleanText(target.pname || target.province);
  const poiAddress = normalizeLocationText([
    provinceValue,
    cityValue,
    districtValue,
    cleanText(target.address),
    cleanText(target.name),
  ]);

  return {
    locationText: trimmedAddress,
    formattedAddress: poiAddress || trimmedAddress,
    province: provinceValue,
    city: cityValue || cleanText(city),
    district: districtValue,
    adcode: cleanText(target.adcode),
    lng: Number.isFinite(lngValue) ? lngValue : null,
    lat: Number.isFinite(latValue) ? latValue : null,
    locationSource: "geocode",
    locationAccuracy: "exact",
    locationRectangle: "",
    warning:
      poisLength > 1
        ? "当前输入更像店铺名或商圈，已从 POI 搜索结果中使用第一条，请确认是否准确。"
        : "当前输入通过 POI 搜索解析，若结果偏差较大，建议补充更完整地址。",
  };
}

export async function resolveAddressText({ address, city = "" }) {
  const trimmedAddress = cleanText(address);

  if (!trimmedAddress) {
    const error = new Error("请先输入地点文本，再解析地址。");
    error.statusCode = 400;
    throw error;
  }

  try {
    const payload = await geocodeAddress({ address: trimmedAddress, city });
    const geocodes = Array.isArray(payload.geocodes) ? payload.geocodes : [];

    if (geocodes.length > 0) {
      return buildGeocodeResult(geocodes[0], trimmedAddress, geocodes.length);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isHardFailure =
      message.includes("INVALID_USER_KEY") ||
      message.includes("SERVICE_NOT_AVAILABLE") ||
      message.includes("USER_DAILY_QUERY_OVER_LIMIT");

    if (isHardFailure) {
      throw error;
    }
  }

  const placePayload = await searchPlaceText({
    keywords: trimmedAddress,
    city,
  });
  const pois = Array.isArray(placePayload.pois) ? placePayload.pois : [];

  if (pois.length === 0) {
    const error = new Error("未找到匹配地点，请补充更明确的店名、商圈或详细地址。");
    error.statusCode = 400;
    throw error;
  }

  return buildPoiResult(pois[0], trimmedAddress, pois.length, city);
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
    warning:
      rectangle
        ? "这是基于 IP 的粗略位置，只能反映城市级范围，不代表真实当前位置。"
        : "这是基于 IP 的粗略位置，只能反映城市级范围，不代表真实当前位置。",
  };
}

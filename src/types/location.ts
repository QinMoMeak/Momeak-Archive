export type OfflineLocationSource =
  | "manual"
  | "browser_geolocation"
  | "ip_fallback"
  | "geocode";

export type OfflineLocationAccuracy = "exact" | "approximate";

export type OfflineLocationResult = {
  locationText: string;
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  adcode: string;
  lng: number | null;
  lat: number | null;
  locationSource: OfflineLocationSource;
  locationAccuracy: OfflineLocationAccuracy;
  locationRectangle: string;
  message?: string;
  warning?: string;
};

export type ReverseGeocodePayload = {
  lng: number;
  lat: number;
  locationText?: string;
};

export type GeocodeAddressPayload = {
  address: string;
  city?: string;
};

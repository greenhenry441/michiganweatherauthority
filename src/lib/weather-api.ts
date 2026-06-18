// Free NWS API client. No key required. https://www.weather.gov/documentation/services-web-api

const UA = "(Michigan Weather Authority, contact@mwa.example)";
const HEADERS: HeadersInit = {
  "User-Agent": UA,
  Accept: "application/geo+json",
};

export interface NWSPoint {
  properties: {
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    relativeLocation: { properties: { city: string; state: string } };
    gridId: string;
    gridX: number;
    gridY: number;
    timeZone: string;
  };
}

export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: { value: number | null };
  relativeHumidity?: { value: number | null };
  dewpoint?: { value: number | null; unitCode: string };
}

export interface Forecast {
  properties: { periods: ForecastPeriod[]; updated: string };
}

export interface NWSAlert {
  id: string;
  properties: {
    id: string;
    event: string;
    headline: string;
    description: string;
    instruction: string | null;
    severity: string;
    certainty: string;
    urgency: string;
    areaDesc: string;
    sent: string;
    effective: string;
    expires: string;
    senderName: string;
  };
}

export async function getPoint(lat: number, lon: number): Promise<NWSPoint> {
  const res = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`points ${res.status}`);
  return res.json();
}

export async function getForecast(url: string): Promise<Forecast> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  return res.json();
}

/**
 * All active NWS alerts impacting Michigan: land (area=MI) + Great Lakes marine zones.
 * Deduped by alert id. Great Lakes marine covers Lake Superior, Michigan, Huron, Erie
 * — we filter to MI-relevant zones (LSZ, LMZ, LHZ, LEZ).
 */
export async function getMichiganAlerts(): Promise<NWSAlert[]> {
  const [land, marine] = await Promise.all([
    fetch(`https://api.weather.gov/alerts/active?area=MI`, { headers: HEADERS }).then((r) => (r.ok ? r.json() : { features: [] })),
    fetch(`https://api.weather.gov/alerts/active?region=GL`, { headers: HEADERS }).then((r) => (r.ok ? r.json() : { features: [] })),
  ]);
  const seen = new Set<string>();
  const out: NWSAlert[] = [];
  const push = (features: NWSAlert[]) => {
    for (const f of features ?? []) {
      const id = f.properties?.id ?? f.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(f);
    }
  };
  push(land.features ?? []);
  // Filter Great Lakes marine to zones touching Michigan waters
  const miMarine = (marine.features ?? []).filter((f: NWSAlert) => {
    const a = (f.properties.areaDesc || "").toLowerCase();
    // Explicit "MI" mention, MI-named waters, or Michigan-shoreline place names
    return /\bmi\b|michigan|lake superior|lake huron|saginaw|whitefish|munising|grand traverse|keweenaw|st\.? clair|detroit river|mackinac|drummond|seul choix|point betsie|manistee|ludington|holland mi|south haven mi|st joseph mi|new buffalo|port huron|alpena|presque isle|rogers city|tawas|harbor beach|port austin/.test(a);
  });
  push(miMarine);
  return out;
}

export async function getCityWeather(lat: number, lon: number) {
  const point = await getPoint(lat, lon);
  const [forecast, hourly] = await Promise.all([
    getForecast(point.properties.forecast),
    getForecast(point.properties.forecastHourly),
  ]);
  return { point, forecast, hourly };
}

// ---------- Open-Meteo: AQI + UV + extra current stats (free, no key) ----------

export interface ExtraStats {
  uvIndex: number | null;
  uvIndexMax: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  visibilityMi: number | null;
  pressureMb: number | null;
  cloudCover: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export async function getExtraStats(lat: number, lon: number): Promise<ExtraStats> {
  const fx = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index,visibility,surface_pressure,cloud_cover&daily=uv_index_max,sunrise,sunset&timezone=auto&forecast_days=1`;
  const aq = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,ozone&timezone=auto`;
  const [f, a] = await Promise.all([
    fetch(fx).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(aq).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const visM = f?.current?.visibility ?? null;
  const pressPa = f?.current?.surface_pressure ?? null;
  return {
    uvIndex: f?.current?.uv_index ?? null,
    uvIndexMax: f?.daily?.uv_index_max?.[0] ?? null,
    aqi: a?.current?.us_aqi ?? null,
    pm25: a?.current?.pm2_5 ?? null,
    pm10: a?.current?.pm10 ?? null,
    ozone: a?.current?.ozone ?? null,
    visibilityMi: visM != null ? +(visM / 1609.34).toFixed(1) : null,
    pressureMb: pressPa != null ? +(pressPa).toFixed(0) : null,
    cloudCover: f?.current?.cloud_cover ?? null,
    sunrise: f?.daily?.sunrise?.[0] ?? null,
    sunset: f?.daily?.sunset?.[0] ?? null,
  };
}

export function aqiCategory(aqi: number | null): { label: string; color: string } {
  if (aqi == null) return { label: "—", color: "bg-muted text-muted-foreground" };
  if (aqi <= 50) return { label: "Good", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" };
  if (aqi <= 100) return { label: "Moderate", color: "bg-yellow-500/15 text-yellow-800 border-yellow-500/30" };
  if (aqi <= 150) return { label: "Unhealthy (SG)", color: "bg-orange-500/15 text-orange-700 border-orange-500/30" };
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-red-500/15 text-red-700 border-red-500/30" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-purple-500/15 text-purple-700 border-purple-500/30" };
  return { label: "Hazardous", color: "bg-rose-600/20 text-rose-800 border-rose-500/40" };
}

export function uvCategory(uv: number | null): { label: string; color: string } {
  if (uv == null) return { label: "—", color: "bg-muted text-muted-foreground" };
  if (uv < 3) return { label: "Low", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" };
  if (uv < 6) return { label: "Moderate", color: "bg-yellow-500/15 text-yellow-800 border-yellow-500/30" };
  if (uv < 8) return { label: "High", color: "bg-orange-500/15 text-orange-700 border-orange-500/30" };
  if (uv < 11) return { label: "Very High", color: "bg-red-500/15 text-red-700 border-red-500/30" };
  return { label: "Extreme", color: "bg-purple-500/15 text-purple-700 border-purple-500/30" };
}

// ---------- NWS Text Products (AFD, HWO, etc.) ----------

export const MI_OFFICES: { id: string; name: string }[] = [
  { id: "DTX", name: "Detroit / Pontiac" },
  { id: "GRR", name: "Grand Rapids" },
  { id: "APX", name: "Gaylord" },
  { id: "MQT", name: "Marquette" },
  { id: "IWX", name: "Northern Indiana (SW MI)" },
];

export interface ProductSummary {
  id: string;
  wmoCollectiveId: string;
  issuanceTime: string;
  productCode: string;
  productName: string;
}

const NWS_LD_HEADERS: HeadersInit = { "User-Agent": UA, Accept: "application/ld+json" };

export async function getProductTypes(office: string): Promise<{ productCode: string; productName: string }[]> {
  const r = await fetch(`https://api.weather.gov/products/locations/${office}/types`, { headers: NWS_LD_HEADERS });
  if (!r.ok) return [];
  const j = await r.json();
  return (j["@graph"] ?? []).map((g: any) => ({ productCode: g.productCode, productName: g.productName }));
}

export async function getProductList(office: string, productCode: string): Promise<ProductSummary[]> {
  const r = await fetch(`https://api.weather.gov/products/locations/${office}/types/${productCode}`, { headers: NWS_LD_HEADERS });
  if (!r.ok) return [];
  const j = await r.json();
  return (j["@graph"] ?? []).slice(0, 10);
}

export async function getProductText(id: string): Promise<string> {
  const r = await fetch(`https://api.weather.gov/products/${id}`, { headers: NWS_LD_HEADERS });
  if (!r.ok) throw new Error(`product ${r.status}`);
  const j = await r.json();
  return j.productText ?? "";
}

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

export async function getMichiganAlerts(): Promise<NWSAlert[]> {
  const res = await fetch(`https://api.weather.gov/alerts/active?area=MI`, { headers: HEADERS });
  if (!res.ok) throw new Error(`alerts ${res.status}`);
  const data = await res.json();
  return data.features ?? [];
}

export async function getCityWeather(lat: number, lon: number) {
  const point = await getPoint(lat, lon);
  const [forecast, hourly] = await Promise.all([
    getForecast(point.properties.forecast),
    getForecast(point.properties.forecastHourly),
  ]);
  return { point, forecast, hourly };
}

export type AlertSeverity = "extreme" | "severe" | "moderate" | "minor";
export type AlertCategory = "warning" | "watch" | "advisory" | "statement";

export interface AlertType {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  colorVar: string; // CSS var name from styles.css
  icon: string; // lucide icon name
}

// Complete catalog of NWS-issued alert products (CAP/VTEC event names).
// Source: NWS Directive 10-518 / CAP product list. Covers convective, winter,
// hydrologic, marine, tropical, fire, non-precip, air quality, space weather,
// tsunami/earthquake/volcano, child-abduction, and administrative products.
export const NWS_ALERT_TYPES: AlertType[] = [
  // -------- Convective / severe local storms --------
  { id: "tornado-warning", name: "Tornado Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Tornado" },
  { id: "tornado-watch", name: "Tornado Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Tornado" },
  { id: "severe-thunderstorm-warning", name: "Severe Thunderstorm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudLightning" },
  { id: "severe-thunderstorm-watch", name: "Severe Thunderstorm Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "CloudLightning" },
  { id: "severe-weather-statement", name: "Severe Weather Statement", category: "statement", severity: "moderate", colorVar: "--statement", icon: "Megaphone" },
  { id: "extreme-wind-warning", name: "Extreme Wind Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Wind" },
  { id: "tornado-emergency", name: "Tornado Emergency (PDS)", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Tornado" },
  { id: "flash-flood-emergency", name: "Flash Flood Emergency", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },
  { id: "special-marine-warning", name: "Special Marine Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Sailboat" },
  { id: "marine-weather-statement", name: "Marine Weather Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Sailboat" },

  // -------- Hydrologic / flood --------
  { id: "flash-flood-warning", name: "Flash Flood Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },
  { id: "flash-flood-watch", name: "Flash Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "flash-flood-statement", name: "Flash Flood Statement", category: "statement", severity: "moderate", colorVar: "--statement", icon: "Waves" },
  { id: "flood-warning", name: "Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "flood-watch", name: "Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "flood-advisory", name: "Flood Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "flood-statement", name: "Flood Statement", category: "statement", severity: "moderate", colorVar: "--statement", icon: "Waves" },
  { id: "areal-flood-warning", name: "Areal Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "areal-flood-watch", name: "Areal Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "areal-flood-advisory", name: "Areal Flood Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "river-flood-warning", name: "River Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "river-flood-watch", name: "River Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "river-flood-statement", name: "River Flood Statement", category: "statement", severity: "moderate", colorVar: "--statement", icon: "Waves" },
  { id: "coastal-flood-warning", name: "Coastal Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "coastal-flood-watch", name: "Coastal Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "coastal-flood-advisory", name: "Coastal Flood Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "coastal-flood-statement", name: "Coastal Flood Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "lakeshore-flood-warning", name: "Lakeshore Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "lakeshore-flood-watch", name: "Lakeshore Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "lakeshore-flood-advisory", name: "Lakeshore Flood Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "lakeshore-flood-statement", name: "Lakeshore Flood Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "hydrologic-outlook", name: "Hydrologic Outlook", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "hydrologic-statement", name: "Hydrologic Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "dam-break-warning", name: "Dam Break Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },

  // -------- Winter weather --------
  { id: "winter-storm-warning", name: "Winter Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Snowflake" },
  { id: "winter-storm-watch", name: "Winter Storm Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Snowflake" },
  { id: "winter-weather-advisory", name: "Winter Weather Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "blizzard-warning", name: "Blizzard Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Snowflake" },
  { id: "blizzard-watch", name: "Blizzard Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Snowflake" },
  { id: "ice-storm-warning", name: "Ice Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Snowflake" },
  { id: "heavy-snow-warning", name: "Heavy Snow Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Snowflake" },
  { id: "snow-squall-warning", name: "Snow Squall Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudSnow" },
  { id: "lake-effect-snow-warning", name: "Lake Effect Snow Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudSnow" },
  { id: "lake-effect-snow-watch", name: "Lake Effect Snow Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "CloudSnow" },
  { id: "lake-effect-snow-advisory", name: "Lake Effect Snow Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "freezing-rain-advisory", name: "Freezing Rain Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "freezing-fog-advisory", name: "Freezing Fog Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudFog" },
  { id: "freezing-spray-advisory", name: "Freezing Spray Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "heavy-freezing-spray-warning", name: "Heavy Freezing Spray Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudSnow" },
  { id: "avalanche-warning", name: "Avalanche Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Mountain" },
  { id: "avalanche-watch", name: "Avalanche Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Mountain" },
  { id: "avalanche-advisory", name: "Avalanche Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Mountain" },
  { id: "winter-storm-outlook", name: "Winter Storm Outlook", category: "statement", severity: "minor", colorVar: "--statement", icon: "CloudSnow" },

  // -------- Wind / cold / heat --------
  { id: "high-wind-warning", name: "High Wind Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "high-wind-watch", name: "High Wind Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Wind" },
  { id: "wind-advisory", name: "Wind Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "lake-wind-advisory", name: "Lake Wind Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "extreme-cold-warning", name: "Extreme Cold Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Thermometer" },
  { id: "extreme-cold-watch", name: "Extreme Cold Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Thermometer" },
  { id: "cold-weather-advisory", name: "Cold Weather Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Thermometer" },
  { id: "wind-chill-warning", name: "Wind Chill Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "wind-chill-watch", name: "Wind Chill Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Wind" },
  { id: "wind-chill-advisory", name: "Wind Chill Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "extreme-heat-warning", name: "Extreme Heat Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Thermometer" },
  { id: "extreme-heat-watch", name: "Extreme Heat Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Thermometer" },
  { id: "excessive-heat-warning", name: "Excessive Heat Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Thermometer" },
  { id: "excessive-heat-watch", name: "Excessive Heat Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Thermometer" },
  { id: "heat-advisory", name: "Heat Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Thermometer" },
  { id: "freeze-warning", name: "Freeze Warning", category: "warning", severity: "moderate", colorVar: "--warning", icon: "Thermometer" },
  { id: "freeze-watch", name: "Freeze Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Thermometer" },
  { id: "hard-freeze-warning", name: "Hard Freeze Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Thermometer" },
  { id: "hard-freeze-watch", name: "Hard Freeze Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Thermometer" },
  { id: "frost-advisory", name: "Frost Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Snowflake" },

  // -------- Visibility / dust / fog --------
  { id: "dense-fog-advisory", name: "Dense Fog Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudFog" },
  { id: "dense-smoke-advisory", name: "Dense Smoke Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudFog" },
  { id: "blowing-dust-warning", name: "Blowing Dust Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "blowing-dust-advisory", name: "Blowing Dust Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "dust-storm-warning", name: "Dust Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "ashfall-warning", name: "Ashfall Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Mountain" },
  { id: "ashfall-advisory", name: "Ashfall Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Mountain" },
  { id: "volcano-warning", name: "Volcano Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Mountain" },

  // -------- Fire / air quality --------
  { id: "red-flag-warning", name: "Red Flag Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Flame" },
  { id: "fire-weather-watch", name: "Fire Weather Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Flame" },
  { id: "extreme-fire-danger", name: "Extreme Fire Danger", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Flame" },
  { id: "air-quality-alert", name: "Air Quality Alert", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "air-stagnation-advisory", name: "Air Stagnation Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },

  // -------- Tropical --------
  { id: "hurricane-warning", name: "Hurricane Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Tornado" },
  { id: "hurricane-watch", name: "Hurricane Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Tornado" },
  { id: "hurricane-local-statement", name: "Hurricane Local Statement", category: "statement", severity: "moderate", colorVar: "--statement", icon: "Tornado" },
  { id: "tropical-storm-warning", name: "Tropical Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "tropical-storm-watch", name: "Tropical Storm Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Wind" },
  { id: "tropical-depression-warning", name: "Tropical Depression Warning", category: "warning", severity: "moderate", colorVar: "--warning", icon: "Wind" },
  { id: "storm-surge-warning", name: "Storm Surge Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },
  { id: "storm-surge-watch", name: "Storm Surge Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Waves" },
  { id: "extreme-wind-watch", name: "Extreme Wind Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Wind" },
  { id: "typhoon-warning", name: "Typhoon Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Tornado" },
  { id: "typhoon-watch", name: "Typhoon Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Tornado" },

  // -------- Marine (Great Lakes + coastal) --------
  { id: "gale-warning", name: "Gale Warning (Marine)", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "gale-watch", name: "Gale Watch (Marine)", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Wind" },
  { id: "storm-warning", name: "Storm Warning (Marine)", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Wind" },
  { id: "storm-watch", name: "Storm Watch (Marine)", category: "watch", severity: "severe", colorVar: "--watch", icon: "Wind" },
  { id: "hurricane-force-wind-warning", name: "Hurricane Force Wind Warning (Marine)", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Wind" },
  { id: "hurricane-force-wind-watch", name: "Hurricane Force Wind Watch (Marine)", category: "watch", severity: "severe", colorVar: "--watch", icon: "Wind" },
  { id: "small-craft-advisory", name: "Small Craft Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Sailboat" },
  { id: "small-craft-advisory-winds", name: "Small Craft Advisory for Winds", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "small-craft-advisory-rough-bar", name: "Small Craft Advisory for Rough Bar", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Sailboat" },
  { id: "small-craft-advisory-hazardous-seas", name: "Small Craft Advisory for Hazardous Seas", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Sailboat" },
  { id: "hazardous-seas-warning", name: "Hazardous Seas Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "hazardous-seas-watch", name: "Hazardous Seas Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "low-water-advisory", name: "Low Water Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "brisk-wind-advisory", name: "Brisk Wind Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "marine-dense-fog-advisory", name: "Marine Dense Fog Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudFog" },
  { id: "beach-hazards-statement", name: "Beach Hazards Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "rip-current-statement", name: "Rip Current Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "high-surf-warning", name: "High Surf Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "high-surf-advisory", name: "High Surf Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Waves" },
  { id: "great-lakes-marine-weather-message", name: "Great Lakes Marine Weather Message", category: "statement", severity: "minor", colorVar: "--statement", icon: "Sailboat" },

  // -------- Tsunami / earthquake --------
  { id: "tsunami-warning", name: "Tsunami Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },
  { id: "tsunami-advisory", name: "Tsunami Advisory", category: "advisory", severity: "severe", colorVar: "--advisory", icon: "Waves" },
  { id: "tsunami-watch", name: "Tsunami Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Waves" },
  { id: "tsunami-information-statement", name: "Tsunami Information Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "earthquake-warning", name: "Earthquake Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Mountain" },

  // -------- Space weather --------
  { id: "space-weather-warning", name: "Space Weather Warning (Geomagnetic Storm)", category: "warning", severity: "moderate", colorVar: "--warning", icon: "Sun" },
  { id: "space-weather-watch", name: "Space Weather Watch", category: "watch", severity: "minor", colorVar: "--watch", icon: "Sun" },
  { id: "space-weather-advisory", name: "Space Weather Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Sun" },

  // -------- Public safety / non-weather (NWS-relayed) --------
  { id: "child-abduction-emergency", name: "Child Abduction Emergency (AMBER)", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "law-enforcement-warning", name: "Law Enforcement Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "AlertTriangle" },
  { id: "civil-emergency-message", name: "Civil Emergency Message", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "civil-danger-warning", name: "Civil Danger Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "evacuation-immediate", name: "Evacuation Immediate", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "shelter-in-place-warning", name: "Shelter In Place Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "hazardous-materials-warning", name: "Hazardous Materials Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "radiological-hazard-warning", name: "Radiological Hazard Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "nuclear-power-plant-warning", name: "Nuclear Power Plant Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "AlertTriangle" },
  { id: "fire-warning", name: "Fire Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Flame" },
  { id: "local-area-emergency", name: "Local Area Emergency", category: "advisory", severity: "moderate", colorVar: "--advisory", icon: "AlertTriangle" },
  { id: "911-telephone-outage", name: "911 Telephone Outage Emergency", category: "advisory", severity: "moderate", colorVar: "--advisory", icon: "AlertTriangle" },

  // -------- Statements / outlooks / admin --------
  { id: "special-weather-statement", name: "Special Weather Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "short-term-forecast", name: "Short Term Forecast", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "hazardous-weather-outlook", name: "Hazardous Weather Outlook", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "public-information-statement", name: "Public Information Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "administrative-message", name: "Administrative Message", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "test-message", name: "Test Message", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "required-monthly-test", name: "Required Monthly Test", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "required-weekly-test", name: "Required Weekly Test", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "practice-demo-warning", name: "Practice / Demo Warning", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
];

export function getAlertType(id: string): AlertType | undefined {
  return NWS_ALERT_TYPES.find((a) => a.id === id);
}

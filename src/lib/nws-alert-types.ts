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

// Common NWS-issued alert products for Michigan
export const NWS_ALERT_TYPES: AlertType[] = [
  { id: "tornado-warning", name: "Tornado Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Tornado" },
  { id: "tornado-watch", name: "Tornado Watch", category: "watch", severity: "severe", colorVar: "--watch", icon: "Tornado" },
  { id: "severe-thunderstorm-warning", name: "Severe Thunderstorm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudLightning" },
  { id: "severe-thunderstorm-watch", name: "Severe Thunderstorm Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "CloudLightning" },
  { id: "flash-flood-warning", name: "Flash Flood Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Waves" },
  { id: "flood-warning", name: "Flood Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Waves" },
  { id: "flood-watch", name: "Flood Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Waves" },
  { id: "winter-storm-warning", name: "Winter Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Snowflake" },
  { id: "winter-storm-watch", name: "Winter Storm Watch", category: "watch", severity: "moderate", colorVar: "--watch", icon: "Snowflake" },
  { id: "blizzard-warning", name: "Blizzard Warning", category: "warning", severity: "extreme", colorVar: "--severe", icon: "Snowflake" },
  { id: "ice-storm-warning", name: "Ice Storm Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Snowflake" },
  { id: "winter-weather-advisory", name: "Winter Weather Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "wind-chill-warning", name: "Wind Chill Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "wind-chill-advisory", name: "Wind Chill Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "high-wind-warning", name: "High Wind Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "wind-advisory", name: "Wind Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
  { id: "excessive-heat-warning", name: "Excessive Heat Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "Thermometer" },
  { id: "heat-advisory", name: "Heat Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Thermometer" },
  { id: "dense-fog-advisory", name: "Dense Fog Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudFog" },
  { id: "freeze-warning", name: "Freeze Warning", category: "warning", severity: "moderate", colorVar: "--warning", icon: "Thermometer" },
  { id: "frost-advisory", name: "Frost Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Snowflake" },
  { id: "lake-effect-snow-warning", name: "Lake Effect Snow Warning", category: "warning", severity: "severe", colorVar: "--warning", icon: "CloudSnow" },
  { id: "lake-effect-snow-advisory", name: "Lake Effect Snow Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "CloudSnow" },
  { id: "gale-warning", name: "Gale Warning (Marine)", category: "warning", severity: "severe", colorVar: "--warning", icon: "Wind" },
  { id: "small-craft-advisory", name: "Small Craft Advisory", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Sailboat" },
  { id: "beach-hazards-statement", name: "Beach Hazards Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Waves" },
  { id: "special-weather-statement", name: "Special Weather Statement", category: "statement", severity: "minor", colorVar: "--statement", icon: "Megaphone" },
  { id: "air-quality-alert", name: "Air Quality Alert", category: "advisory", severity: "minor", colorVar: "--advisory", icon: "Wind" },
];

export function getAlertType(id: string): AlertType | undefined {
  return NWS_ALERT_TYPES.find((a) => a.id === id);
}

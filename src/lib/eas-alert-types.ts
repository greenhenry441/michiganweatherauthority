import type { AlertCategory, AlertSeverity } from "./nws-alert-types";

export interface EasAlertType {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  // Standard EAS event code (informational)
  code: string;
}

// Non-weather EAS / IPAWS alert products + tests + MWA system notifications.
export const EAS_ALERT_TYPES: EasAlertType[] = [
  { id: "rmt", name: "Required Monthly Test", category: "statement", severity: "minor", code: "RMT" },
  { id: "rwt", name: "Required Weekly Test", category: "statement", severity: "minor", code: "RWT" },
  { id: "dmo", name: "Practice / Demo Warning", category: "statement", severity: "minor", code: "DMO" },
  { id: "amber", name: "AMBER Alert (Child Abduction)", category: "warning", severity: "extreme", code: "CAE" },
  { id: "blue", name: "Blue Alert (Law Enforcement)", category: "warning", severity: "severe", code: "BLU" },
  { id: "civil-emergency", name: "Civil Emergency Message", category: "warning", severity: "extreme", code: "CEM" },
  { id: "civil-danger", name: "Civil Danger Warning", category: "warning", severity: "extreme", code: "CDW" },
  { id: "law-enforcement", name: "Law Enforcement Warning", category: "warning", severity: "severe", code: "LEW" },
  { id: "local-area-emergency", name: "Local Area Emergency", category: "advisory", severity: "moderate", code: "LAE" },
  { id: "evacuation-immediate", name: "Evacuation Immediate", category: "warning", severity: "extreme", code: "EVI" },
  { id: "shelter-in-place", name: "Shelter In Place Warning", category: "warning", severity: "extreme", code: "SPW" },
  { id: "hazardous-materials", name: "Hazardous Materials Warning", category: "warning", severity: "extreme", code: "HMW" },
  { id: "radiological-hazard", name: "Radiological Hazard Warning", category: "warning", severity: "extreme", code: "RHW" },
  { id: "nuclear-power-plant", name: "Nuclear Power Plant Warning", category: "warning", severity: "extreme", code: "NUW" },
  { id: "fire-warning", name: "Fire Warning", category: "warning", severity: "severe", code: "FRW" },
  { id: "911-outage", name: "911 Telephone Outage", category: "advisory", severity: "moderate", code: "TOE" },
  { id: "administrative-message", name: "Administrative Message", category: "statement", severity: "minor", code: "ADR" },
  { id: "national-periodic-test", name: "National Periodic Test", category: "statement", severity: "minor", code: "NPT" },
];

export const MWA_NETWORK_TYPE: EasAlertType = {
  id: "mwa-network-notification",
  name: "MWA Network Notification",
  category: "statement",
  severity: "minor",
  code: "MWA",
};

export function getEasType(id: string): EasAlertType | undefined {
  if (id === MWA_NETWORK_TYPE.id) return MWA_NETWORK_TYPE;
  return EAS_ALERT_TYPES.find((a) => a.id === id);
}

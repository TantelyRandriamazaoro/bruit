export const COOLDOWN_MS = 30 * 60 * 1000;
export const HEATMAP_DAYS = 7;
/** Two windows of HEATMAP_DAYS for municipal week-over-week Insights */
export const INSIGHTS_DAYS = HEATMAP_DAYS * 2;
export const DEVICE_ID_KEY = "bruit_device_id";
export const LAST_REPORT_AT_KEY = "bruit_last_report_at";

/** Antananarivo — fallback when geolocation is unavailable */
export const DEFAULT_CENTER = {
  lat: -18.8792,
  lng: 47.5079,
} as const;

export const DEFAULT_ZOOM = 13;

/** Carto Positron — clean light basemap close to Apple Maps */
export const MAP_STYLE_LIGHT_URL =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** Carto Dark Matter — OLED-friendly dark basemap */
export const MAP_STYLE_DARK_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function mapStyleForTheme(theme: "light" | "dark" | undefined) {
  return theme === "dark" ? MAP_STYLE_DARK_URL : MAP_STYLE_LIGHT_URL;
}

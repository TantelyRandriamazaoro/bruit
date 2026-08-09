import type { Map } from "maplibre-gl";

/**
 * Approximate Google Maps roadmap palette (2024–2026 default):
 * soft land, teal water, muted parks, gray (not yellow) roads.
 */
const GOOGLE_LIGHT = {
  background: "#ebe8e1",
  landcover: "#dcead4",
  park: "#c9e6b8",
  residential: "#e8e6e0",
  landuse: "#e4e9d8",
  water: "#a8d1d8",
  waterway: "#8fbfc8",
  waterShadow: "rgba(120, 170, 180, 0.18)",
  building: "#ddd9d2",
  buildingTop: "#e8e4dc",
  buildingOutline: "#d0cbc2",
  roadMinor: "#ffffff",
  roadMajor: "#ffffff",
  roadMotor: "#f0f0f0",
  roadCase: "#d5d2cb",
  roadCaseMajor: "#c9c5bd",
  rail: "#c4c0b8",
  aeroway: "#d8d4cc",
  boundary: "#c2beb6",
  label: "#5f6368",
  labelHalo: "rgba(255, 255, 255, 0.92)",
  waterLabel: "#4a7c8c",
  roadLabel: "#70757a",
  parkLabel: "#4d7a45",
} as const;

const GOOGLE_DARK = {
  background: "#1f1f1f",
  landcover: "#1a2420",
  park: "#1a2e22",
  residential: "#242424",
  landuse: "#1e2620",
  water: "#0d2a33",
  waterway: "#163a45",
  waterShadow: "rgba(0, 0, 0, 0.35)",
  building: "#2c2c2c",
  buildingTop: "#333333",
  buildingOutline: "#1a1a1a",
  roadMinor: "#3c4043",
  roadMajor: "#474747",
  roadMotor: "#555555",
  roadCase: "#2a2a2a",
  roadCaseMajor: "#1f1f1f",
  rail: "#3a3a3a",
  aeroway: "#333333",
  boundary: "#3c4043",
  label: "#9aa0a6",
  labelHalo: "rgba(0, 0, 0, 0.72)",
  waterLabel: "#6a9aaa",
  roadLabel: "#b0b0b0",
  parkLabel: "#7a9a72",
} as const;

type Palette = typeof GOOGLE_LIGHT | typeof GOOGLE_DARK;

const ROAD_LAYER_RE = /^(road_|tunnel_|bridge_|rail)/;

function setPaint(map: Map, id: string, prop: string, value: unknown) {
  try {
    if (!map.getLayer(id)) {
      return;
    }
    map.setPaintProperty(id, prop, value);
  } catch {
    // Some layers use expression forms that reject overrides — skip.
  }
}

function applyFills(map: Map, p: Palette) {
  setPaint(map, "background", "background-color", p.background);
  setPaint(map, "landcover", "fill-color", p.landcover);
  setPaint(map, "landcover", "fill-opacity", 0.85);
  setPaint(map, "park_national_park", "fill-color", p.park);
  setPaint(map, "park_national_park", "fill-opacity", 0.9);
  setPaint(map, "park_nature_reserve", "fill-color", p.park);
  setPaint(map, "landuse", "fill-color", p.landuse);
  setPaint(map, "landuse_residential", "fill-color", p.residential);
  setPaint(map, "water", "fill-color", p.water);
  setPaint(map, "water", "fill-opacity", 1);
  setPaint(map, "water_shadow", "fill-color", p.waterShadow);
  setPaint(map, "waterway", "line-color", p.waterway);
  setPaint(map, "building", "fill-color", p.building);
  setPaint(map, "building-top", "fill-color", p.buildingTop);
  setPaint(map, "building-top", "fill-outline-color", p.buildingOutline);
  setPaint(map, "aeroway-runway", "line-color", p.aeroway);
  setPaint(map, "aeroway-taxiway", "line-color", p.aeroway);
  setPaint(map, "boundary_county", "line-color", p.boundary);
  setPaint(map, "boundary_state", "line-color", p.boundary);
  setPaint(map, "boundary_country_outline", "line-color", p.boundary);
  setPaint(map, "boundary_country_inner", "line-color", p.boundary);
}

function roadFillColor(id: string, p: Palette): string {
  if (id.includes("mot") || id.includes("trunk")) {
    return p.roadMotor;
  }
  if (id.includes("pri") || id.includes("sec")) {
    return p.roadMajor;
  }
  return p.roadMinor;
}

function roadCaseColor(id: string, p: Palette): string {
  if (id.includes("mot") || id.includes("trunk") || id.includes("pri")) {
    return p.roadCaseMajor;
  }
  return p.roadCase;
}

function applyRoads(map: Map, p: Palette) {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return;
  }

  for (const layer of layers) {
    const { id, type } = layer;
    if (type !== "line" || !ROAD_LAYER_RE.test(id)) {
      continue;
    }

    const isCase = id.includes("_case");
    const isRail = id === "rail" || id.startsWith("rail_") || id.includes("_rail");

    if (isRail) {
      setPaint(map, id, "line-color", p.rail);
      setPaint(map, id, "line-opacity", 0.7);
      continue;
    }

    if (isCase) {
      setPaint(map, id, "line-color", roadCaseColor(id, p));
      setPaint(map, id, "line-opacity", 1);
    } else {
      setPaint(map, id, "line-color", roadFillColor(id, p));
      setPaint(map, id, "line-opacity", 1);
    }
  }
}

function applyLabels(map: Map, p: Palette) {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return;
  }

  for (const layer of layers) {
    if (layer.type !== "symbol") {
      continue;
    }
    const { id } = layer;

    if (id.startsWith("water") || id === "waterway_label") {
      setPaint(map, id, "text-color", p.waterLabel);
      setPaint(map, id, "text-halo-color", p.labelHalo);
      continue;
    }

    if (id.startsWith("roadname") || id === "housenumber") {
      setPaint(map, id, "text-color", p.roadLabel);
      setPaint(map, id, "text-halo-color", p.labelHalo);
      continue;
    }

    if (id.startsWith("poi_park")) {
      setPaint(map, id, "text-color", p.parkLabel);
      setPaint(map, id, "text-halo-color", p.labelHalo);
      continue;
    }

    setPaint(map, id, "text-color", p.label);
    setPaint(map, id, "text-halo-color", p.labelHalo);
    setPaint(map, id, "icon-color", p.label);
  }
}

/**
 * Recolor Carto Positron / Dark Matter toward the current Google Maps
 * roadmap look for the given app theme.
 */
export function applyGoogleMapsBasemapTheme(
  map: Map,
  theme: "light" | "dark",
) {
  const palette = theme === "dark" ? GOOGLE_DARK : GOOGLE_LIGHT;
  applyFills(map, palette);
  applyRoads(map, palette);
  applyLabels(map, palette);
}

import type { Map } from "maplibre-gl";

const ROAD_LAYER_RE = /^(road_|tunnel_|bridge_|rail)/;

/** Charcoal fills — closer to Apple Maps night than Dark Matter’s blue-gray */
const SOFT_ROAD_FILL = "#1e2026";
const SOFT_ROAD_MAJOR = "#252830";
const SOFT_WATERWAY = "#1a2228";
const SOFT_WATER = "#1c242a";

/** Layers that ship with high-contrast blue-gray fills in Dark Matter */
const HARSH_FILL_LAYERS = new Set([
  "road_minor_fill",
  "road_sec_fill_noramp",
  "road_pri_fill_noramp",
  "road_trunk_fill_noramp",
  "road_mot_fill_noramp",
  "road_mot_fill_ramp",
  "tunnel_pri_fill",
  "tunnel_mot_fill",
  "bridge_trunk_fill",
  "bridge_mot_fill",
]);

/**
 * Tone down Carto Dark Matter roads/water so the basemap
 * doesn’t overpower the heatmap chrome.
 */
export function softenDarkBasemapRoads(map: Map) {
  const layers = map.getStyle()?.layers;
  if (!layers) {
    return;
  }

  for (const layer of layers) {
    const { id, type } = layer;

    try {
      if (id === "waterway" && type === "line") {
        map.setPaintProperty(id, "line-color", SOFT_WATERWAY);
        map.setPaintProperty(id, "line-opacity", 0.45);
        continue;
      }

      if (id === "water" && type === "fill") {
        map.setPaintProperty(id, "fill-color", SOFT_WATER);
        map.setPaintProperty(id, "fill-opacity", 0.7);
        continue;
      }

      if (type !== "line" || !ROAD_LAYER_RE.test(id)) {
        continue;
      }

      const isCase = id.includes("_case");
      const isFill =
        id.includes("_fill") ||
        id.endsWith("_path") ||
        id === "rail" ||
        id.startsWith("rail_");

      if (HARSH_FILL_LAYERS.has(id)) {
        map.setPaintProperty(
          id,
          "line-color",
          id.includes("pri") || id.includes("mot")
            ? SOFT_ROAD_MAJOR
            : SOFT_ROAD_FILL,
        );
      }

      if (isCase) {
        map.setPaintProperty(id, "line-opacity", 0.38);
      } else if (isFill) {
        map.setPaintProperty(id, "line-opacity", 0.52);
      } else {
        map.setPaintProperty(id, "line-opacity", 0.48);
      }
    } catch {
      // Some layers use expression forms that reject overrides — skip.
    }
  }
}

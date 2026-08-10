"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type Map,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  mapStyleForTheme,
} from "@/lib/constants";
import { applyGoogleMapsBasemapTheme } from "@/lib/map-style";
import {
  isHotReportGroup,
  liveCellKeyForReport,
  liveMapWeight,
  newestByLiveCell,
} from "@/lib/live-map";
import {
  createLucideMarkerIcon,
  PHONE_MARKER_COLORS,
} from "@/lib/lucide-marker";
import { PHONE_ICON_NODE } from "@/lib/lucide-phone-node";
import {
  COOL_HEATMAP_COLOR,
  HOT_HEATMAP_COLOR,
  intensityRadiusScale,
} from "@/lib/noise-meta";
import {
  policeStationsToGeoJSON,
  type SelectedPoliceStation,
} from "@/lib/police-stations";
import type { NoiseReport } from "@/lib/supabase/types";

const HEAT_LAYER_IDS = ["noise-heat-cool", "noise-heat-hot"] as const;

let workerConfigured = false;

function ensureMapLibreWorker() {
  if (workerConfigured || typeof window === "undefined") {
    return;
  }
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  workerConfigured = true;
}

export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  locate: () => void;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  resize: () => void;
};

type MapViewProps = {
  reports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  heatmapVisible?: boolean;
  onMapApi?: (api: MapApi) => void;
  onSelectPoliceStation?: (station: SelectedPoliceStation) => void;
};

function reportsToGeoJSON(
  reports: NoiseReport[],
  now = Date.now(),
): GeoJSON.FeatureCollection {
  const newestByCell = newestByLiveCell(reports);

  return {
    type: "FeatureCollection",
    features: reports.map((report) => {
      const cellNewest =
        newestByCell.get(liveCellKeyForReport(report)) ??
        new Date(report.created_at).getTime();
      return {
        type: "Feature",
        properties: {
          id: report.id,
          created_at: report.created_at,
          weight: liveMapWeight(report, cellNewest, now),
          radius: intensityRadiusScale(report.intensity),
          hot: isHotReportGroup(cellNewest, now) ? 1 : 0,
        },
        geometry: {
          type: "Point",
          coordinates: [report.lng, report.lat],
        },
      };
    }),
  };
}

function addNoiseHeatLayer(
  map: Map,
  reports: NoiseReport[],
  heatmapVisible: boolean,
) {
  if (map.getSource("noise-reports")) {
    return;
  }

  map.addSource("noise-reports", {
    type: "geojson",
    data: reportsToGeoJSON(reports),
  });

  const visibility = heatmapVisible ? "visible" : "none";
  // Loud baseline ≈ 150 m at DEFAULT_CENTER / DEFAULT_ZOOM
  // (Antananarivo z15 ≈ 4.5 m/px → ~33 px). Zoomed-out sizes stay
  // screen-readable; past default zoom, grow toward meter-stable.
  const loudRadiusPxAtDefaultZoom = 33;
  const sharedPaint = {
    "heatmap-weight": ["coalesce", ["get", "weight"], 0.75] as [
      "coalesce",
      ["get", string],
      number,
    ],
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      0.55,
      DEFAULT_ZOOM,
      1.25,
    ] as [
      "interpolate",
      ["linear"],
      ["zoom"],
      number,
      number,
      number,
      number,
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      ["*", 30, ["coalesce", ["get", "radius"], 1]],
      DEFAULT_ZOOM,
      ["*", loudRadiusPxAtDefaultZoom, ["coalesce", ["get", "radius"], 1]],
      DEFAULT_ZOOM + 2,
      [
        "*",
        loudRadiusPxAtDefaultZoom * 4,
        ["coalesce", ["get", "radius"], 1],
      ],
    ] as unknown as [
      "interpolate",
      ["linear"],
      ["zoom"],
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    "heatmap-opacity": 0.78,
  };

  // Cool under hot so fresh activity stays visually on top.
  map.addLayer({
    id: "noise-heat-cool",
    type: "heatmap",
    source: "noise-reports",
    maxzoom: 18,
    filter: ["==", ["get", "hot"], 0],
    layout: { visibility },
    paint: {
      ...sharedPaint,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        ...COOL_HEATMAP_COLOR,
      ],
    },
  });

  map.addLayer({
    id: "noise-heat-hot",
    type: "heatmap",
    source: "noise-reports",
    maxzoom: 18,
    filter: ["==", ["get", "hot"], 1],
    layout: { visibility },
    paint: {
      ...sharedPaint,
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        ...HOT_HEATMAP_COLOR,
      ],
    },
  });
}

function addPoliceStationsLayer(map: Map, isDark: boolean) {
  if (map.getSource("police-stations")) {
    return;
  }

  const phoneImageId = "police-phone-pin";
  if (map.hasImage(phoneImageId)) {
    map.removeImage(phoneImageId);
  }
  map.addImage(
    phoneImageId,
    createLucideMarkerIcon(PHONE_ICON_NODE, PHONE_MARKER_COLORS, 160),
    { pixelRatio: 2 },
  );

  map.addSource("police-stations", {
    type: "geojson",
    data: policeStationsToGeoJSON(),
  });

  map.addLayer({
    id: "police-stations-halo",
    type: "circle",
    source: "police-stations",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        9,
        14,
        12,
        17,
        16,
      ],
      "circle-color": "rgba(52, 199, 89, 0.2)",
      "circle-opacity": 0.8,
      "circle-blur": 0.45,
    },
  });

  map.addLayer({
    id: "police-stations-icon",
    type: "symbol",
    source: "police-stations",
    layout: {
      "icon-image": phoneImageId,
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.38,
        14,
        0.52,
        17,
        0.64,
      ],
      "icon-anchor": "bottom",
      "icon-offset": [0, 2],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  map.addLayer({
    id: "police-stations-label",
    type: "symbol",
    source: "police-stations",
    minzoom: 13.4,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      "text-size": 11,
      "text-offset": [0, 0.45],
      "text-anchor": "top",
      "text-max-width": 10,
      "text-optional": true,
    },
    paint: {
      "text-color": isDark ? "#f5f5f7" : "#1d1d1f",
      "text-halo-color": isDark
        ? "rgba(0, 0, 0, 0.72)"
        : "rgba(255, 255, 255, 0.92)",
      "text-halo-width": 1.4,
    },
  });
}

export function MapView({
  reports,
  userLocation,
  heatmapVisible = true,
  onMapApi,
  onSelectPoliceStation,
}: MapViewProps) {
  const t = useTranslations("Map");
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const mapStyleUrl = mapStyleForTheme(
    resolvedTheme === "dark" ? "dark" : "light",
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const userLocationRef = useRef(userLocation);
  const reportsRef = useRef(reports);
  const heatmapVisibleRef = useRef(heatmapVisible);
  const onSelectPoliceStationRef = useRef(onSelectPoliceStation);
  const cameraRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const didFitUser = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [styleReady, setStyleReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setThemeReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    heatmapVisibleRef.current = heatmapVisible;
  }, [heatmapVisible]);

  useEffect(() => {
    onSelectPoliceStationRef.current = onSelectPoliceStation;
  }, [onSelectPoliceStation]);

  useEffect(() => {
    if (!containerRef.current || !themeReady) {
      return;
    }

    ensureMapLibreWorker();

    const container = containerRef.current;
    const saved = cameraRef.current;
    const map = new MapLibreMap({
      container,
      style: mapStyleUrl,
      center: saved?.center ?? [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: saved?.zoom ?? DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    map.on("error", (event) => {
      console.error("MapLibre error:", event.error);
      setMapError(event.error?.message ?? t("failed"));
    });

    map.on("load", () => {
      setMapError(null);
      map.resize();
      const isDark = mapStyleUrl.includes("dark-matter");
      applyGoogleMapsBasemapTheme(map, isDark ? "dark" : "light");
      addNoiseHeatLayer(map, reportsRef.current, heatmapVisibleRef.current);
      addPoliceStationsLayer(map, isDark);
      setStyleReady(true);

      const selectPoliceStation = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") {
          return;
        }

        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const rawPhone = feature.properties?.phone;
        const phone =
          typeof rawPhone === "string" && rawPhone.length > 0 ? rawPhone : null;

        onSelectPoliceStationRef.current?.({
          id: String(feature.properties?.id ?? `${lng},${lat}`),
          name: String(feature.properties?.name ?? "Commissariat"),
          phone,
          lat,
          lng,
        });
      };

      map.on("click", "police-stations-icon", selectPoliceStation);
      map.on("click", "police-stations-halo", selectPoliceStation);
      map.on("mouseenter", "police-stations-icon", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "police-stations-icon", () => {
        map.getCanvas().style.cursor = "";
      });

      const loc = userLocationRef.current;
      if (loc) {
        const el = document.createElement("div");
        el.className = "bruit-user-dot";
        el.innerHTML =
          '<span class="bruit-user-pulse"></span><span class="bruit-user-core"></span>';
        userMarkerRef.current = new Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);

        if (!didFitUser.current && !saved) {
          map.easeTo({
            center: [loc.lng, loc.lat],
            zoom: Math.max(map.getZoom(), DEFAULT_ZOOM),
            duration: 850,
          });
          didFitUser.current = true;
        }
      }
    });

    mapRef.current = map;

    onMapApi?.({
      zoomIn: () => {
        map.zoomIn({ duration: 220 });
      },
      zoomOut: () => {
        map.zoomOut({ duration: 220 });
      },
      locate: () => {
        const loc = userLocationRef.current;
        if (!loc) {
          return;
        }
        map.easeTo({
          center: [loc.lng, loc.lat],
          zoom: Math.max(map.getZoom(), DEFAULT_ZOOM),
          duration: 700,
        });
      },
      flyTo: (lng, lat, zoom = 15) => {
        map.easeTo({
          center: [lng, lat],
          zoom,
          duration: 750,
        });
      },
      resize: () => {
        map.resize();
      },
    });

    return () => {
      const center = map.getCenter();
      cameraRef.current = {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
      };
      resizeObserver.disconnect();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
    // Recreate when basemap theme changes; onMapApi is stable (setState).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleUrl, themeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }

    const source = map.getSource("noise-reports") as GeoJSONSource | undefined;
    source?.setData(reportsToGeoJSON(reports));
  }, [reports, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }

    const visibility = heatmapVisible ? "visible" : "none";
    for (const layerId of HEAT_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  }, [heatmapVisible, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !userLocation) {
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "bruit-user-dot";
      el.innerHTML =
        '<span class="bruit-user-pulse"></span><span class="bruit-user-core"></span>';
      userMarkerRef.current = new Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }

    if (!didFitUser.current) {
      map.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: Math.max(map.getZoom(), DEFAULT_ZOOM),
        duration: 850,
      });
      didFitUser.current = true;
    }
  }, [userLocation, styleReady]);

  return (
    <>
      <div
        ref={containerRef}
        className="bruit-map absolute inset-0"
        aria-label={t("aria")}
      />
      {mapError ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-danger)]">
          {mapError}
        </div>
      ) : null}
    </>
  );
}

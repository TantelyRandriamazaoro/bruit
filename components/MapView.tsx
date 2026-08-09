"use client";

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
import { softenDarkBasemapRoads } from "@/lib/map-style";
import { liveMapWeight } from "@/lib/live-map";
import {
  createLucideMarkerIcon,
  PHONE_MARKER_COLORS,
} from "@/lib/lucide-marker";
import { PHONE_ICON_NODE } from "@/lib/lucide-phone-node";
import {
  policeStationsToGeoJSON,
  type SelectedPoliceStation,
} from "@/lib/police-stations";
import type { NoiseReport } from "@/lib/supabase/types";

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
  return {
    type: "FeatureCollection",
    features: reports.map((report) => ({
      type: "Feature",
      properties: {
        id: report.id,
        created_at: report.created_at,
        weight: liveMapWeight(report, now),
      },
      geometry: {
        type: "Point",
        coordinates: [report.lng, report.lat],
      },
    })),
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

  map.addLayer({
    id: "noise-heat",
    type: "heatmap",
    source: "noise-reports",
    maxzoom: 18,
    layout: {
      visibility: heatmapVisible ? "visible" : "none",
    },
    paint: {
      "heatmap-weight": ["coalesce", ["get", "weight"], 0.75],
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.55,
        15,
        1.25,
      ],
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(0,0,0,0)",
        0.12,
        "rgba(90, 200, 250, 0.35)",
        0.3,
        "rgba(50, 173, 230, 0.5)",
        0.5,
        "rgba(255, 159, 10, 0.65)",
        0.72,
        "rgba(255, 69, 58, 0.78)",
        1,
        "rgba(255, 45, 85, 0.9)",
      ],
      "heatmap-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        22,
        15,
        42,
      ],
      "heatmap-opacity": 0.78,
    },
  });
}

function addPoliceStationsLayer(map: Map, isDark: boolean) {
  if (map.getSource("police-stations")) {
    return;
  }

  if (!map.hasImage("police-phone")) {
    map.addImage(
      "police-phone",
      createLucideMarkerIcon(PHONE_ICON_NODE, PHONE_MARKER_COLORS, 128),
      { pixelRatio: 2 },
    );
  }

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
        13,
        14,
        17,
        17,
        22,
      ],
      "circle-color": "rgba(52, 199, 89, 0.18)",
      "circle-opacity": 0.9,
    },
  });

  map.addLayer({
    id: "police-stations-icon",
    type: "symbol",
    source: "police-stations",
    layout: {
      "icon-image": "police-phone",
      "icon-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        10,
        0.52,
        14,
        0.7,
        17,
        0.84,
      ],
      "icon-anchor": "center",
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
      "text-offset": [0, 1.75],
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
      setMapError(event.error?.message ?? "Map failed to load.");
    });

    map.on("load", () => {
      setMapError(null);
      map.resize();
      if (mapStyleUrl.includes("dark-matter")) {
        softenDarkBasemapRoads(map);
      }
      addNoiseHeatLayer(map, reportsRef.current, heatmapVisibleRef.current);
      addPoliceStationsLayer(map, mapStyleUrl.includes("dark-matter"));
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
    if (!map || !styleReady || !map.getLayer("noise-heat")) {
      return;
    }

    map.setLayoutProperty(
      "noise-heat",
      "visibility",
      heatmapVisible ? "visible" : "none",
    );
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
        aria-label="Noise pollution map"
      />
      {mapError ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-danger)]">
          {mapError}
        </div>
      ) : null}
    </>
  );
}

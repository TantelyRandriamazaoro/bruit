"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type Map,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE_URL,
} from "@/lib/constants";
import { intensityWeight } from "@/lib/noise-meta";
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
};

type MapViewProps = {
  reports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  heatmapVisible?: boolean;
  onMapApi?: (api: MapApi) => void;
};

function reportsToGeoJSON(reports: NoiseReport[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((report) => ({
      type: "Feature",
      properties: {
        id: report.id,
        created_at: report.created_at,
        weight: intensityWeight(report.intensity),
      },
      geometry: {
        type: "Point",
        coordinates: [report.lng, report.lat],
      },
    })),
  };
}

export function MapView({
  reports,
  userLocation,
  heatmapVisible = true,
  onMapApi,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const userLocationRef = useRef(userLocation);
  const didFitUser = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    ensureMapLibreWorker();

    const container = containerRef.current;
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: DEFAULT_ZOOM,
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
    });

    return () => {
      resizeObserver.disconnect();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const update = () => {
      const source = map.getSource("noise-reports") as GeoJSONSource | undefined;
      source?.setData(reportsToGeoJSON(reports));
    };

    if (map.isStyleLoaded() && map.getSource("noise-reports")) {
      update();
    } else {
      map.once("load", update);
    }
  }, [reports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const apply = () => {
      if (!map.getLayer("noise-heat")) {
        return;
      }
      map.setLayoutProperty(
        "noise-heat",
        "visibility",
        heatmapVisible ? "visible" : "none",
      );
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [heatmapVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) {
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
  }, [userLocation]);

  return (
    <>
      <div
        ref={containerRef}
        className="bruit-map absolute inset-0 h-full w-full"
        aria-label="Noise pollution map"
      />
      {mapError ? (
        <div className="bruit-chrome absolute inset-x-4 top-[7.5rem] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-danger)]">
          {mapError}
        </div>
      ) : null}
    </>
  );
}

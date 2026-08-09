"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type Map,
} from "maplibre-gl";
import { mapStyleForTheme } from "@/lib/constants";
import { softenDarkBasemapRoads } from "@/lib/map-style";
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

function reportsToGeoJSON(reports: NoiseReport[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: reports.map((report) => ({
      type: "Feature",
      properties: {
        id: report.id,
        weight: intensityWeight(report.intensity),
      },
      geometry: {
        type: "Point",
        coordinates: [report.lng, report.lat],
      },
    })),
  };
}

type HotspotMiniMapProps = {
  lat: number;
  lng: number;
  reports: NoiseReport[];
  label: string;
};

export function HotspotMiniMap({
  lat,
  lng,
  reports,
  label,
}: HotspotMiniMapProps) {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const mapStyleUrl = mapStyleForTheme(
    resolvedTheme === "dark" ? "dark" : "light",
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const reportsRef = useRef(reports);
  const [failed, setFailed] = useState(false);
  const [styleReady, setStyleReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setThemeReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    if (!containerRef.current || !themeReady) {
      return;
    }

    ensureMapLibreWorker();
    setFailed(false);

    const container = containerRef.current;
    let map: Map;

    try {
      map = new MapLibreMap({
        container,
        style: mapStyleUrl,
        center: [lng, lat],
        zoom: 14.2,
        interactive: false,
        attributionControl: false,
        dragPan: false,
        dragRotate: false,
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        touchZoomRotate: false,
      });
    } catch (error) {
      console.error(error);
      const frame = window.requestAnimationFrame(() => setFailed(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    map.on("error", () => {
      setFailed(true);
    });

    map.on("load", () => {
      map.resize();
      if (mapStyleUrl.includes("dark-matter")) {
        softenDarkBasemapRoads(map);
      }
      map.addSource("hotspot-reports", {
        type: "geojson",
        data: reportsToGeoJSON(reportsRef.current),
      });
      map.addLayer({
        id: "hotspot-heat",
        type: "heatmap",
        source: "hotspot-reports",
        maxzoom: 18,
        paint: {
          "heatmap-weight": ["coalesce", ["get", "weight"], 0.75],
          "heatmap-intensity": 1.1,
          "heatmap-radius": 28,
          "heatmap-opacity": 0.85,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.15,
            "rgba(90, 200, 250, 0.4)",
            0.4,
            "rgba(255, 159, 10, 0.65)",
            0.75,
            "rgba(255, 69, 58, 0.8)",
            1,
            "rgba(255, 45, 85, 0.92)",
          ],
        },
      });
      setStyleReady(true);
    });

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
    // lat/lng updates handled below; recreate only when basemap theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleUrl, themeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }

    map.jumpTo({ center: [lng, lat], zoom: 14.2 });
    const source = map.getSource("hotspot-reports") as
      | GeoJSONSource
      | undefined;
    source?.setData(reportsToGeoJSON(reports));
  }, [lat, lng, reports, styleReady]);

  if (failed) {
    return (
      <div
        className="bruit-mini-map-fallback"
        aria-label={`Map preview unavailable for ${label}`}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="bruit-mini-map"
      aria-label={`Heatmap preview for ${label}`}
      role="img"
    />
  );
}

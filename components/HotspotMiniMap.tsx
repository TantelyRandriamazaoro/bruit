"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type Map,
} from "maplibre-gl";
import { MAP_STYLE_URL } from "@/lib/constants";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    ensureMapLibreWorker();

    const container = containerRef.current;
    let map: Map;

    try {
      map = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
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
      map.addSource("hotspot-reports", {
        type: "geojson",
        data: reportsToGeoJSON(reports),
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
    });

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per card
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const update = () => {
      map.jumpTo({ center: [lng, lat], zoom: 14.2 });
      const source = map.getSource("hotspot-reports") as
        | GeoJSONSource
        | undefined;
      source?.setData(reportsToGeoJSON(reports));
    };

    if (map.isStyleLoaded() && map.getSource("hotspot-reports")) {
      update();
    } else {
      map.once("load", update);
    }
  }, [lat, lng, reports]);

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

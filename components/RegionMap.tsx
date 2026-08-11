"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type Map,
} from "maplibre-gl";
import { mapStyleForTheme } from "@/lib/constants";
import { applyGoogleMapsBasemapTheme } from "@/lib/map-style";
import { HOT_HEATMAP_COLOR, intensityWeight } from "@/lib/noise-meta";
import type { RegionBounds } from "@/lib/region-bounds";
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

function fitRegion(map: Map, bounds: RegionBounds, animate: boolean) {
  const box = new LngLatBounds(
    [bounds.west, bounds.south],
    [bounds.east, bounds.north],
  );
  map.fitBounds(box, {
    padding: { top: 40, bottom: 56, left: 28, right: 28 },
    maxZoom: 15,
    duration: animate ? 750 : 0,
  });
}

type RegionMapProps = {
  reports: NoiseReport[];
  bounds: RegionBounds | null;
  label: string;
  /** Re-fit when this key changes (region open / region switch). */
  fitKey: string;
  /** Preview cards stay non-interactive; the drawer enables pan/zoom. */
  interactive?: boolean;
};

export function RegionMap({
  reports,
  bounds,
  label,
  fitKey,
  interactive = true,
}: RegionMapProps) {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const mapStyleUrl = mapStyleForTheme(
    resolvedTheme === "dark" ? "dark" : "light",
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const reportsRef = useRef(reports);
  const boundsRef = useRef(bounds);
  const fitKeyRef = useRef(fitKey);
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
    boundsRef.current = bounds;
  }, [bounds]);

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
        center: [47.5079, -18.8792],
        zoom: 9.5,
        interactive,
        attributionControl: false,
        dragPan: interactive,
        dragRotate: false,
        scrollZoom: interactive,
        boxZoom: interactive,
        doubleClickZoom: interactive,
        keyboard: interactive,
        touchZoomRotate: interactive,
        pitchWithRotate: false,
        touchPitch: false,
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
      applyGoogleMapsBasemapTheme(
        map,
        mapStyleUrl.includes("dark-matter") ? "dark" : "light",
      );
      map.addSource("region-reports", {
        type: "geojson",
        data: reportsToGeoJSON(reportsRef.current),
      });
      map.addLayer({
        id: "region-heat",
        type: "heatmap",
        source: "region-reports",
        maxzoom: 18,
        paint: {
          "heatmap-weight": ["coalesce", ["get", "weight"], 0.75],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.55,
            12,
            1.15,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            18,
            12,
            34,
          ],
          "heatmap-opacity": 0.82,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            ...HOT_HEATMAP_COLOR,
          ],
        },
      });
      if (boundsRef.current) {
        fitRegion(map, boundsRef.current, false);
      }
      setStyleReady(true);
    });

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyleUrl, themeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }
    const source = map.getSource("region-reports") as GeoJSONSource | undefined;
    source?.setData(reportsToGeoJSON(reports));
  }, [reports, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !bounds) {
      return;
    }
    const regionChanged = fitKeyRef.current !== fitKey;
    fitKeyRef.current = fitKey;
    // Always fit on region/open key change; soft re-fit if bounds widen later.
    fitRegion(map, bounds, regionChanged);
  }, [bounds, fitKey, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) {
      return;
    }
    const frame = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [styleReady]);

  if (failed) {
    return (
      <div
        className="bruit-region-map-fallback"
        role="img"
        aria-label={label}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="bruit-region-map"
      aria-label={label}
      role={interactive ? "application" : "img"}
      aria-hidden={!interactive}
    />
  );
}

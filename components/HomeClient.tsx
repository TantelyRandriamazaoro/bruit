"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AboutSheet } from "@/components/AboutSheet";
import { BrandBar } from "@/components/BrandBar";
import { HelpContacts } from "@/components/HelpContacts";
import { InsightsView } from "@/components/InsightsView";
import { MapChrome } from "@/components/MapChrome";
import { ReportDrawer } from "@/components/ReportDrawer";
import { ReportFeed } from "@/components/ReportFeed";
import { TabBar, type AppTab } from "@/components/TabBar";
import type { MapApi } from "@/components/MapView";
import { resolveAreaLabels } from "@/lib/area-labels";
import {
  getCooldownRemainingMs,
  setLastReportAt,
} from "@/lib/cooldown";
import { getDeviceId } from "@/lib/device-id";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import {
  createNoiseReport,
  fetchRecentReports,
  filterReportsSince,
} from "@/lib/reports";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { NoiseReport } from "@/lib/supabase/types";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--bruit-map-wash)]">
        <p className="text-sm font-medium text-[var(--bruit-muted)]">
          Loading map…
        </p>
      </div>
    ),
  },
);

type Status = {
  message: string;
  tone: "neutral" | "success" | "error";
} | null;

function subscribeNoop() {
  return () => {};
}

function getConfiguredSnapshot() {
  return isSupabaseConfigured();
}

function getConfiguredServerSnapshot() {
  return false;
}

export function HomeClient() {
  const configured = useSyncExternalStore(
    subscribeNoop,
    getConfiguredSnapshot,
    getConfiguredServerSnapshot,
  );
  const [reports, setReports] = useState<NoiseReport[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const [mapApi, setMapApi] = useState<MapApi | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);

  const refreshReports = useCallback(async () => {
    if (!configured) {
      return;
    }

    try {
      const data = await fetchRecentReports();
      setReports(data);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError(
        "Could not load noise reports. Check your Supabase project and migration.",
      );
    }
  }, [configured]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCooldownMs(getCooldownRemainingMs());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!configured || !hydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refreshReports();
    }, 0);
    const id = window.setInterval(() => void refreshReports(), 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(id);
    };
  }, [configured, hydrated, refreshReports]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!navigator.geolocation) {
      const timeout = window.setTimeout(() => {
        setLocationError("Geolocation is not supported in this browser.");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Location access is off. Enable it in browser settings to report.",
          );
        } else {
          setLocationError("Could not get your location right now.");
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [hydrated]);

  useEffect(() => {
    if (activeTab !== "map") {
      return;
    }
    const id = window.setTimeout(() => {
      mapApi?.resize();
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeTab, mapApi]);

  const openDrawer = () => {
    if (!configured) {
      setStatus({
        message: "Add your Bruit Supabase keys to .env.local to report.",
        tone: "error",
      });
      return;
    }

    if (!navigator.geolocation) {
      setStatus({
        message: "Geolocation is not supported in this browser.",
        tone: "error",
      });
      return;
    }

    setStatus(null);
    setDrawerOpen(true);
  };

  const submitReport = async (details: {
    category: NoiseCategory;
    intensity: NoiseIntensity;
  }) => {
    setBusy(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        try {
          const deviceId = getDeviceId();
          const result = await createNoiseReport({
            deviceId,
            lat,
            lng,
            category: details.category,
            intensity: details.intensity,
          });

          if (!result.ok) {
            if (result.error === "rate_limited") {
              const retryMs = (result.retry_after_seconds ?? 1) * 1000;
              const lastAt = Date.now() - (30 * 60 * 1000 - retryMs);
              setLastReportAt(lastAt);
              setCooldownMs(getCooldownRemainingMs());
              setDrawerOpen(false);
              setStatus({
                message: `You can report again in ${Math.ceil(retryMs / 1000 / 60)} min.`,
                tone: "error",
              });
            } else {
              setStatus({
                message: "Could not submit that report. Try again.",
                tone: "error",
              });
            }
            return;
          }

          setLastReportAt(Date.now());
          setCooldownMs(getCooldownRemainingMs());
          setDrawerOpen(false);
          setActiveTab("feed");
          setStatus({
            message: "Noise reported. Thank you.",
            tone: "success",
          });
          void resolveAreaLabels([{ lat, lng }]);
          await refreshReports();
        } catch (err) {
          console.error(err);
          setStatus({
            message: "Network error while reporting. Try again.",
            tone: "error",
          });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Location access is off. Enable it in browser settings to report.",
          );
          setStatus({
            message: "Allow location access to report noise.",
            tone: "error",
          });
        } else {
          setStatus({
            message: "Could not get your location. Try again.",
            tone: "error",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 10_000 },
    );
  };

  const recentReports = useMemo(
    () => filterReportsSince(reports),
    [reports],
  );

  const openHotspotOnMap = useCallback(
    (hotspot: { lat: number; lng: number }) => {
      setActiveTab("map");
      window.setTimeout(() => {
        mapApi?.resize();
        mapApi?.flyTo(hotspot.lng, hotspot.lat, 15.8);
      }, 60);
    },
    [mapApi],
  );

  const showMapChrome = activeTab === "map" && !aboutOpen;
  const tabHidden = aboutOpen;

  return (
    <div
      ref={setShellEl}
      className="relative h-dvh w-full overflow-hidden bg-[var(--bruit-map-wash)]"
    >
      <div
        className={
          activeTab === "map" ? "absolute inset-0" : "invisible absolute inset-0"
        }
        aria-hidden={activeTab !== "map"}
      >
        <MapView
          reports={recentReports}
          userLocation={userLocation}
          onMapApi={setMapApi}
        />
      </div>

      {activeTab === "feed" ? (
        <ReportFeed
          reports={recentReports}
          canReport={configured && cooldownMs <= 0}
          onReport={openDrawer}
          onSelectReport={(report) => {
            openHotspotOnMap(report);
          }}
        />
      ) : null}

      {activeTab === "insights" ? (
        <InsightsView
          reports={reports}
          canReport={configured && cooldownMs <= 0}
          onReport={openDrawer}
          onOpenHotspot={openHotspotOnMap}
        />
      ) : null}

      {activeTab === "help" ? <HelpContacts /> : null}

      {showMapChrome ? <BrandBar /> : null}

      <MapChrome
        reportCount={recentReports.length}
        canLocate={Boolean(userLocation)}
        hidden={!showMapChrome}
        onLocate={() => mapApi?.locate()}
        onZoomIn={() => mapApi?.zoomIn()}
        onZoomOut={() => mapApi?.zoomOut()}
        onOpenAbout={() => setAboutOpen(true)}
      />

      {!configured && activeTab === "map" && !drawerOpen ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-ink)]">
          Missing Supabase env. Copy{" "}
          <code className="font-mono text-xs">.env.example</code> to{" "}
          <code className="font-mono text-xs">.env.local</code> with your Bruit
          project URL and publishable key.
        </div>
      ) : null}

      {configured && loadError && activeTab === "map" && !drawerOpen ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-danger)]">
          {loadError}
        </div>
      ) : null}

      {locationError && !status && showMapChrome && !drawerOpen ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-36 z-20 mx-auto max-w-sm">
          <div className="bruit-chrome rounded-2xl px-4 py-2.5 text-center text-sm text-[var(--bruit-muted)]">
            {locationError}
          </div>
        </div>
      ) : null}

      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        onReport={openDrawer}
        cooldownMs={cooldownMs}
        busy={busy && !drawerOpen}
        hidden={tabHidden}
        feedCount={recentReports.length}
        statusMessage={drawerOpen ? null : (status?.message ?? null)}
        statusTone={status?.tone ?? "neutral"}
      />

      <ReportDrawer
        open={drawerOpen}
        busy={busy}
        container={shellEl}
        onClose={() => {
          if (!busy) {
            setDrawerOpen(false);
          }
        }}
        onSubmit={(details) => void submitReport(details)}
      />

      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

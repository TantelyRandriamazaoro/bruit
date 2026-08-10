"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AboutSheet } from "@/components/AboutSheet";
import { HelpContacts } from "@/components/HelpContacts";
import { InsightsView } from "@/components/InsightsView";
import { MapChrome } from "@/components/MapChrome";
import { MapLoading } from "@/components/MapLoading";
import { OpenInBrowserAlert } from "@/components/OpenInBrowserAlert";
import { PoliceStationDrawer } from "@/components/PoliceStationDrawer";
import { MeasureDrawer } from "@/components/MeasureDrawer";
import { ReportDrawer } from "@/components/ReportDrawer";
import { ReportFeed } from "@/components/ReportFeed";
import { TabBar, type AppTab } from "@/components/TabBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeDrawer } from "@/components/WelcomeDrawer";
import type { MapApi } from "@/components/MapView";
import { resolveAreaLabels } from "@/lib/area-labels";
import { IN_APP_BROWSER_ALERT_DISMISSED_KEY } from "@/lib/constants";
import {
  clearLastReportAt,
  getCooldownRemainingMs,
  setLastReportAt,
} from "@/lib/cooldown";
import { getDeviceId } from "@/lib/device-id";
import { isInAppBrowser } from "@/lib/in-app-browser";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import { filterLiveMapReports } from "@/lib/live-map";
import type { SelectedPoliceStation } from "@/lib/police-stations";
import {
  createNoiseReport,
  deleteNoiseReport,
  fetchMyReports,
  fetchRecentReports,
  filterReportsSince,
} from "@/lib/reports";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { NoiseReport } from "@/lib/supabase/types";
import { hasSeenWelcome, markWelcomeSeen } from "@/lib/welcome";

function hasDismissedInAppBrowserAlert(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return (
    window.sessionStorage.getItem(IN_APP_BROWSER_ALERT_DISMISSED_KEY) === "1"
  );
}

function markInAppBrowserAlertDismissed(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(IN_APP_BROWSER_ALERT_DISMISSED_KEY, "1");
}

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

type Status = {
  message: string;
  tone: "neutral" | "success" | "error";
} | null;

// NEXT_PUBLIC_* is inlined at build time on both server and client, so this is
// stable across SSR and hydration (no flash of the missing-env banner).
const configured = isSupabaseConfigured();

export function HomeClient() {
  const t = useTranslations("Status");
  const [reports, setReports] = useState<NoiseReport[]>([]);
  const [myReports, setMyReports] = useState<NoiseReport[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [reportSeedReading, setReportSeedReading] = useState<{
    avgDb: number;
    peakDb: number;
  } | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [inAppBrowserAlertOpen, setInAppBrowserAlertOpen] = useState(false);
  const [selectedPoliceStation, setSelectedPoliceStation] =
    useState<SelectedPoliceStation | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("map");
  const [mapApi, setMapApi] = useState<MapApi | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [shellEl, setShellEl] = useState<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const policeDrawerOpen = selectedPoliceStation !== null;
  const overlayOpen =
    drawerOpen ||
    measureOpen ||
    policeDrawerOpen ||
    welcomeOpen ||
    inAppBrowserAlertOpen;

  const syncCooldownFromMyReports = useCallback((mine: NoiseReport[]) => {
    const newest = mine[0];
    if (!newest) {
      clearLastReportAt();
      setCooldownMs(getCooldownRemainingMs());
      return;
    }

    const createdAt = new Date(newest.created_at).getTime();
    if (!Number.isFinite(createdAt)) {
      return;
    }

    setLastReportAt(createdAt);
    setCooldownMs(getCooldownRemainingMs());
  }, []);

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
      setLoadError(t("loadError"));
      return;
    }

    try {
      const deviceId = getDeviceId();
      if (!deviceId) {
        setMyReports([]);
        return;
      }

      const mine = await fetchMyReports(deviceId);
      setMyReports(mine);
    } catch (err) {
      console.error(err);
      setMyReports([]);
    }
  }, [configured, t]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCooldownMs(getCooldownRemainingMs());
      const trapped = isInAppBrowser();
      setInAppBrowser(trapped);
      setHydrated(true);
      if (!hasSeenWelcome()) {
        setWelcomeOpen(true);
      } else if (trapped && !hasDismissedInAppBrowserAlert()) {
        setInAppBrowserAlertOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const dismissWelcome = useCallback(() => {
    markWelcomeSeen();
    setWelcomeOpen(false);
    if (isInAppBrowser() && !hasDismissedInAppBrowserAlert()) {
      setInAppBrowserAlertOpen(true);
    }
  }, []);

  const dismissInAppBrowserAlert = useCallback(() => {
    markInAppBrowserAlertDismissed();
    setInAppBrowserAlertOpen(false);
  }, []);

  const requireExternalBrowser = useCallback(() => {
    if (!inAppBrowser) {
      return false;
    }
    setStatus(null);
    setSelectedPoliceStation(null);
    setDrawerOpen(false);
    setMeasureOpen(false);
    setInAppBrowserAlertOpen(true);
    return true;
  }, [inAppBrowser]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!status) {
      return;
    }
    const ms = status.tone === "success" ? 3400 : 5200;
    const id = window.setTimeout(() => setStatus(null), ms);
    return () => window.clearTimeout(id);
  }, [status]);

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

    // Facebook / Instagram webviews rarely grant location — skip the prompt.
    if (inAppBrowser) {
      const timeout = window.setTimeout(() => {
        setLocationError(null);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    if (!navigator.geolocation) {
      const timeout = window.setTimeout(() => {
        setLocationError(t("geoUnsupported"));
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
          setLocationError(t("locationOff"));
        } else {
          setLocationError(t("locationUnavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [hydrated, inAppBrowser, t]);

  useEffect(() => {
    if (activeTab !== "map") {
      return;
    }
    const id = window.setTimeout(() => {
      mapApi?.resize();
    }, 50);
    return () => window.clearTimeout(id);
  }, [activeTab, mapApi]);

  const openDrawer = (seed?: { avgDb: number; peakDb: number } | null) => {
    if (!configured) {
      setStatus({
        message: t("missingEnv"),
        tone: "error",
      });
      return;
    }

    if (requireExternalBrowser()) {
      return;
    }

    if (!navigator.geolocation) {
      setStatus({
        message: t("geoUnsupported"),
        tone: "error",
      });
      return;
    }

    setStatus(null);
    setSelectedPoliceStation(null);
    setMeasureOpen(false);
    setReportSeedReading(seed ?? null);
    setDrawerOpen(true);
  };

  const openMeasure = () => {
    if (requireExternalBrowser()) {
      return;
    }

    setStatus(null);
    setSelectedPoliceStation(null);
    setDrawerOpen(false);
    setMeasureOpen(true);
  };

  const submitReport = async (details: {
    category: NoiseCategory;
    intensity: NoiseIntensity;
    dbAvg?: number | null;
    dbPeak?: number | null;
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
            dbAvg: details.dbAvg,
            dbPeak: details.dbPeak,
          });

          if (!result.ok) {
            if (result.error === "rate_limited") {
              const retryMs = (result.retry_after_seconds ?? 1) * 1000;
              const lastAt = Date.now() - (30 * 60 * 1000 - retryMs);
              setLastReportAt(lastAt);
              setCooldownMs(getCooldownRemainingMs());
              setDrawerOpen(false);
              setReportSeedReading(null);
              setStatus({
                message: t("rateLimited", {
                  minutes: Math.ceil(retryMs / 1000 / 60),
                }),
                tone: "error",
              });
            } else {
              setStatus({
                message: t("submitFailed"),
                tone: "error",
              });
            }
            return;
          }

          setLastReportAt(Date.now());
          setCooldownMs(getCooldownRemainingMs());
          setDrawerOpen(false);
          setReportSeedReading(null);
          setActiveTab("feed");
          setStatus({
            message: t("reported"),
            tone: "success",
          });
          void resolveAreaLabels([{ lat, lng }]);
          await refreshReports();
        } catch (err) {
          console.error(err);
          setStatus({
            message: t("networkError"),
            tone: "error",
          });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(t("locationOff"));
          setStatus({
            message: t("allowLocation"),
            tone: "error",
          });
        } else {
          setStatus({
            message: t("locationRetry"),
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

  const liveMapReports = useMemo(
    () => filterLiveMapReports(reports, now),
    [reports, now],
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

  const handleDeleteReport = useCallback(
    async (report: NoiseReport) => {
      if (!configured || deletingReportId) {
        return;
      }

      const deviceId = getDeviceId();
      if (!deviceId) {
        setStatus({
          message: t("deleteFailed"),
          tone: "error",
        });
        return;
      }

      setDeletingReportId(report.id);
      setStatus(null);

      try {
        const result = await deleteNoiseReport({
          deviceId,
          reportId: report.id,
        });

        if (!result.ok) {
          setStatus({
            message: t("deleteFailed"),
            tone: "error",
          });
          return;
        }

        const nextMine = myReports.filter((item) => item.id !== report.id);
        setMyReports(nextMine);
        setReports((prev) => prev.filter((item) => item.id !== report.id));
        syncCooldownFromMyReports(nextMine);
        setStatus({
          message: t("deleted"),
          tone: "success",
        });
      } catch (err) {
        console.error(err);
        setStatus({
          message: t("deleteFailed"),
          tone: "error",
        });
      } finally {
        setDeletingReportId(null);
      }
    },
    [configured, deletingReportId, myReports, syncCooldownFromMyReports, t],
  );

  const showMapChrome = activeTab === "map";

  return (
    <div
      ref={setShellEl}
      className="bruit-shell bg-[var(--bruit-map-wash)]"
    >
      <div
        className={
          activeTab === "map" ? "absolute inset-0" : "invisible absolute inset-0"
        }
        aria-hidden={activeTab !== "map"}
      >
        <MapView
          reports={liveMapReports}
          userLocation={userLocation}
          onMapApi={setMapApi}
          onSelectPoliceStation={(station) => {
            setDrawerOpen(false);
            setMeasureOpen(false);
            setAboutOpen(false);
            setSelectedPoliceStation(station);
          }}
        />
      </div>

      {activeTab === "feed" ? (
        <ReportFeed
          reports={recentReports}
          myReports={myReports}
          userLocation={userLocation}
          canReport={configured && cooldownMs <= 0}
          deletingReportId={deletingReportId}
          onReport={() => openDrawer()}
          onSelectReport={(report) => {
            openHotspotOnMap(report);
          }}
          onDeleteReport={(report) => void handleDeleteReport(report)}
        />
      ) : null}

      {activeTab === "insights" ? (
        <InsightsView
          reports={reports}
          canReport={configured && cooldownMs <= 0}
          onReport={() => openDrawer()}
          onOpenHotspot={openHotspotOnMap}
        />
      ) : null}

      {activeTab === "help" ? (
        <HelpContacts userLocation={userLocation} />
      ) : null}

      {activeTab !== "map" ? (
        <div className="pointer-events-none absolute right-3.5 top-0 z-20 pt-[max(0.7rem,env(safe-area-inset-top))]">
          <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
            <ThemeToggle />
          </div>
        </div>
      ) : null}

      <MapChrome
        reportCount={liveMapReports.length}
        canLocate={Boolean(userLocation)}
        hidden={!showMapChrome}
        onLocate={() => mapApi?.locate()}
        onZoomIn={() => mapApi?.zoomIn()}
        onZoomOut={() => mapApi?.zoomOut()}
        onOpenAbout={() => setAboutOpen(true)}
      />

      {!configured && activeTab === "map" && !overlayOpen ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-ink)]">
          {t("missingEnvBanner")}
        </div>
      ) : null}

      {configured && loadError && activeTab === "map" && !overlayOpen ? (
        <div className="bruit-chrome absolute inset-x-4 top-[max(7rem,calc(env(safe-area-inset-top)+6.25rem))] z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm text-[var(--bruit-danger)]">
          {loadError}
        </div>
      ) : null}

      {locationError && !status && showMapChrome && !overlayOpen ? (
        <div className="pointer-events-none absolute inset-x-4 z-20 mx-auto max-w-sm bottom-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+0.75rem)]">
          <div className="bruit-chrome rounded-2xl px-4 py-2.5 text-center text-sm text-[var(--bruit-muted)]">
            {locationError}
          </div>
        </div>
      ) : null}

      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        onReport={() => openDrawer()}
        onMeasure={openMeasure}
        cooldownMs={cooldownMs}
        busy={busy && !drawerOpen}
        feedCount={recentReports.length}
        statusMessage={overlayOpen ? null : (status?.message ?? null)}
        statusTone={status?.tone ?? "neutral"}
        onDismissStatus={() => setStatus(null)}
      />

      <MeasureDrawer
        open={measureOpen}
        container={shellEl}
        onClose={() => setMeasureOpen(false)}
        onReportThis={(reading) => openDrawer(reading)}
      />

      <ReportDrawer
        open={drawerOpen}
        busy={busy}
        seedReading={reportSeedReading}
        container={shellEl}
        onClose={() => {
          if (!busy) {
            setDrawerOpen(false);
            setReportSeedReading(null);
          }
        }}
        onSubmit={(details) => void submitReport(details)}
      />

      <PoliceStationDrawer
        station={selectedPoliceStation}
        container={shellEl}
        onClose={() => setSelectedPoliceStation(null)}
      />

      <AboutSheet
        open={aboutOpen}
        container={shellEl}
        onClose={() => setAboutOpen(false)}
      />

      <WelcomeDrawer
        open={welcomeOpen}
        container={shellEl}
        onClose={dismissWelcome}
      />

      <OpenInBrowserAlert
        open={inAppBrowserAlertOpen && !welcomeOpen}
        onDismiss={dismissInAppBrowserAlert}
      />
    </div>
  );
}

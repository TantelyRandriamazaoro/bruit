"use client";

import {
  AudioLines,
  Phone,
  ShieldCheck,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Drawer } from "vaul";

type WelcomeDrawerProps = {
  open: boolean;
  /** Keep drawer inside the app shell (covers the tab bar). */
  container?: HTMLElement | null;
  onClose: () => void;
};

const FEATURES = [
  {
    id: "report",
    icon: Volume2,
    titleKey: "featureReportTitle",
    bodyKey: "featureReportBody",
    tone: "accent",
  },
  {
    id: "authorities",
    icon: Phone,
    titleKey: "featureAuthoritiesTitle",
    bodyKey: "featureAuthoritiesBody",
    tone: "blue",
  },
  {
    id: "anonymous",
    icon: ShieldCheck,
    titleKey: "featureAnonymousTitle",
    bodyKey: "featureAnonymousBody",
    tone: "green",
  },
] as const;

function FeatureIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: (typeof FEATURES)[number]["tone"];
}) {
  return (
    <span
      className={`bruit-welcome-symbol bruit-welcome-symbol--${tone}`}
      aria-hidden
    >
      <Icon size={36} strokeWidth={1.65} absoluteStrokeWidth />
    </span>
  );
}

export function WelcomeDrawer({
  open,
  container = null,
  onClose,
}: WelcomeDrawerProps) {
  const t = useTranslations("Welcome");
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      shouldScaleBackground={false}
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-welcome-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-welcome-sheet bruit-drawer-content fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-md flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-welcome-handle mx-auto mt-2" />

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6">
            <div className="bruit-welcome-hero flex flex-col items-center px-2 text-center">
              <AudioLines
                className="bruit-welcome-hero-symbol"
                size={64}
                strokeWidth={1.35}
                absoluteStrokeWidth
                aria-hidden
              />
              <Drawer.Title
                id={titleId}
                className="bruit-welcome-title mt-4"
              >
                {t("title")}
              </Drawer.Title>
              <Drawer.Description id={descriptionId} className="sr-only">
                {t("subtitle")}
              </Drawer.Description>
            </div>

            <ul className="bruit-welcome-features mx-auto mt-10 w-full max-w-[20.5rem]">
              {FEATURES.map((feature) => (
                <li key={feature.id} className="bruit-welcome-feature">
                  <FeatureIcon icon={feature.icon} tone={feature.tone} />
                  <div className="min-w-0 text-left">
                    <p className="bruit-welcome-feature-title">
                      {t(feature.titleKey)}
                    </p>
                    <p className="bruit-welcome-feature-body">
                      {t(feature.bodyKey)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <button
                type="button"
                onClick={onClose}
                className="bruit-welcome-continue cursor-pointer"
              >
                {t("continue")}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

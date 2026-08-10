"use client";

import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import {
  openInExternalBrowser,
  preferredExternalBrowser,
  type ExternalBrowser,
} from "@/lib/in-app-browser";

type OpenInBrowserAlertProps = {
  open: boolean;
  onDismiss: () => void;
};

export function OpenInBrowserAlert({
  open,
  onDismiss,
}: OpenInBrowserAlertProps) {
  const t = useTranslations("OpenInBrowser");
  const titleId = useId();
  const descriptionId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const browser: ExternalBrowser =
    typeof navigator === "undefined"
      ? "browser"
      : preferredExternalBrowser();

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      primaryRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

  if (!open) {
    return null;
  }

  const title =
    browser === "safari"
      ? t("titleSafari")
      : browser === "chrome"
        ? t("titleChrome")
        : t("titleBrowser");
  const message =
    browser === "safari"
      ? t("messageSafari")
      : browser === "chrome"
        ? t("messageChrome")
        : t("messageBrowser");
  const primary =
    browser === "safari"
      ? t("openSafari")
      : browser === "chrome"
        ? t("openChrome")
        : t("openBrowser");
  const hint =
    browser === "safari"
      ? t("hintSafari")
      : browser === "chrome"
        ? t("hintChrome")
        : t("hintBrowser");

  return (
    <div className="bruit-alert-root" role="presentation">
      <button
        type="button"
        className="bruit-alert-scrim"
        aria-label={t("dismiss")}
        onClick={onDismiss}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="bruit-alert"
      >
        <div className="bruit-alert-body">
          <span className="bruit-alert-symbol" aria-hidden>
            <Compass size={36} strokeWidth={1.5} absoluteStrokeWidth />
          </span>
          <h2 id={titleId} className="bruit-alert-title">
            {title}
          </h2>
          <p id={descriptionId} className="bruit-alert-message">
            {message}
          </p>
          <p className="bruit-alert-hint">{hint}</p>
        </div>

        <div className="bruit-alert-actions">
          <button
            ref={primaryRef}
            type="button"
            className="bruit-alert-action bruit-alert-action--primary cursor-pointer"
            onClick={() => {
              openInExternalBrowser();
            }}
          >
            {primary}
          </button>
          <button
            type="button"
            className="bruit-alert-action cursor-pointer"
            onClick={onDismiss}
          >
            {t("notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}

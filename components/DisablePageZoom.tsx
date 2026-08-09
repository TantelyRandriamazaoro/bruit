"use client";

import { useEffect } from "react";

/**
 * Blocks browser page zoom (pinch / ctrl-wheel / Safari gestures).
 * MapLibre still zooms via its own touch/wheel handlers on `.bruit-map`.
 */
export function DisablePageZoom() {
  useEffect(() => {
    const blockSafariPageGesture = (event: Event) => {
      event.preventDefault();
    };

    // Stop the browser from pinch-zooming the page. MapLibre reads the same
    // touch points in its own listeners, so map zoom still works.
    const blockBrowserPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const blockCtrlWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", blockSafariPageGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", blockSafariPageGesture, {
      passive: false,
    });
    document.addEventListener("gestureend", blockSafariPageGesture, {
      passive: false,
    });
    document.addEventListener("touchmove", blockBrowserPinch, {
      passive: false,
      capture: true,
    });
    document.addEventListener("wheel", blockCtrlWheelZoom, {
      passive: false,
      capture: true,
    });

    return () => {
      document.removeEventListener("gesturestart", blockSafariPageGesture);
      document.removeEventListener("gesturechange", blockSafariPageGesture);
      document.removeEventListener("gestureend", blockSafariPageGesture);
      document.removeEventListener("touchmove", blockBrowserPinch, true);
      document.removeEventListener("wheel", blockCtrlWheelZoom, true);
    };
  }, []);

  return null;
}

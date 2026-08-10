export type ExternalBrowser = "safari" | "chrome" | "browser";

const IN_APP_UA =
  /FBAN|FBAV|FB_IAB|FBIOS|FBSS|Instagram|Line\/|TikTok|BytedanceWebview|musical_ly|Twitter|LinkedInApp|Snapchat|Pinterest|MicroMessenger|Weibo/i;

export function isInAppBrowser(userAgent = getUserAgent()): boolean {
  if (!userAgent) {
    return false;
  }
  return IN_APP_UA.test(userAgent);
}

export function preferredExternalBrowser(
  userAgent = getUserAgent(),
): ExternalBrowser {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "safari";
  }
  if (/Android/i.test(userAgent)) {
    return "chrome";
  }
  return "browser";
}

/**
 * Best-effort escape from common in-app browsers.
 * Facebook/Instagram often ignore this — the UI must still explain the manual path.
 */
export function openInExternalBrowser(url = getCurrentUrl()): boolean {
  if (typeof window === "undefined" || !url) {
    return false;
  }

  const ua = getUserAgent();

  if (/Android/i.test(ua)) {
    try {
      const parsed = new URL(url);
      const intent = `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;end`;
      window.location.href = intent;
      return true;
    } catch {
      // fall through
    }
  }

  if (/iPhone|iPad|iPod/i.test(ua)) {
    // Works on some iOS builds; ignored inside many Meta webviews.
    const safariUrl = url.replace(/^https:/i, "x-safari-https:");
    if (safariUrl !== url) {
      window.location.href = safariUrl;
      return true;
    }
  }

  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

function getUserAgent(): string {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.userAgent || "";
}

function getCurrentUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.href;
}

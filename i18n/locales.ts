export const locales = ["en", "fr"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

/** Cookie used when the user picks a language in About. */
export const LOCALE_COOKIE = "bruit-locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "fr";
}

/** Pick en/fr from an Accept-Language header (device language). */
export function localeFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): AppLocale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, qValue] = part.trim().split(";q=");
      const q = qValue ? Number(qValue) : 1;
      return {
        tag: tag.trim().toLowerCase(),
        q: Number.isFinite(q) ? q : 0,
      };
    })
    .filter((part) => part.tag && part.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    if (tag === "*" || tag.startsWith("en")) {
      return "en";
    }
    if (tag.startsWith("fr")) {
      return "fr";
    }
  }

  return defaultLocale;
}

export function resolveLocale(input: {
  cookieValue?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(input.cookieValue)) {
    return input.cookieValue;
  }
  return localeFromAcceptLanguage(input.acceptLanguage);
}

/** Persist the user's language choice (same URL; applied on next render). */
export function setLocaleCookie(locale: AppLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
}

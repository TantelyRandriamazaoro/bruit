import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import mg from "../messages/mg.json";
import { LOCALE_COOKIE, resolveLocale } from "./locales";

const messagesByLocale = {
  en,
  fr,
  mg,
} as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocale({
    cookieValue: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});

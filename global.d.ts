import en from "./messages/en.json";
import type { AppLocale } from "./i18n/locales";

type Messages = typeof en;

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: Messages;
  }
}

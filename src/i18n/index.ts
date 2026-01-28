import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "../services/settingsStorage";

import en from "./locales/en.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
};

// Get initial language from settings (defaults to 'en')
const initialLanguage = getLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;

// Helper to change language (call this when user changes language in settings)
export function changeLanguage(lang: string): void {
  i18n.changeLanguage(lang);
}

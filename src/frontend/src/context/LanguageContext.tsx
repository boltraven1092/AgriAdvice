import { IntlProvider } from "react-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { getLanguageByCode, RTL_LANGUAGES, type LanguageCode } from "../config/languages";
import { getUserPreference, patchUserPreference } from "../lib/api.ts";
import { getStoredLanguage, isLoggedIn, setStoredLanguage } from "../lib/storage";
import { enMessages, type MessageKey } from "../translations/en";
import { getMessages } from "../translations";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (nextLanguage: LanguageCode) => void;
  persistLanguagePreference: (nextLanguage: LanguageCode) => Promise<void>;
  syncLanguageOnLogin: () => Promise<void>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};

const DEFAULT_LANGUAGE: LanguageCode = "hi";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => getStoredLanguage() ?? DEFAULT_LANGUAGE);

  useEffect(() => {
    const isRtl = RTL_LANGUAGES.includes(language);
    document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function syncFromBackend() {
      if (!isLoggedIn()) {
        return;
      }

      try {
        const backendLanguage = await getUserPreference();
        if (!cancelled) {
          setLanguageState(backendLanguage);
          setStoredLanguage(backendLanguage);
        }
      } catch {
        // localStorage remains the fallback if backend is not available.
      }
    }

    void syncFromBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setStoredLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const persistLanguagePreference = useCallback(
    async (nextLanguage: LanguageCode) => {
      setLanguage(nextLanguage);
      if (!isLoggedIn()) {
        return;
      }
      await patchUserPreference(nextLanguage);
    },
    [setLanguage]
  );

  const syncLanguageOnLogin = useCallback(async () => {
    try {
      const backendLanguage = await getUserPreference();
      const localLanguage = getStoredLanguage();

      if (!localLanguage || localLanguage !== backendLanguage) {
        setStoredLanguage(backendLanguage);
        setLanguageState(backendLanguage);
      }
    } catch {
      // keep local preference if backend fetch fails.
    }
  }, []);

  const messages = useMemo(() => getMessages(language), [language]);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => {
      const source = messages[key] ?? enMessages[key] ?? key;
      return interpolate(source, values);
    },
    [messages]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      persistLanguagePreference,
      syncLanguageOnLogin,
      t,
    }),
    [language, persistLanguagePreference, setLanguage, syncLanguageOnLogin, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      <IntlProvider locale={language} messages={messages} defaultLocale="en">
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function getLanguageDisplayName(language: LanguageCode): string {
  const languageEntry = getLanguageByCode(language);
  return languageEntry.englishName;
}

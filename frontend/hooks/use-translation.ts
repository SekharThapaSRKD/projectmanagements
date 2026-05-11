'use client';

import { useLanguageStore, translations, type Locale } from '@/lib/language-store';

export function useTranslation() {
  const { locale, setLocale } = useLanguageStore();

  const t = (path: string) => {
    const keys = path.split('.');
    let result = translations[locale];
    
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        // Fallback to English if key missing in current locale
        let fallback = translations['en'];
        for (const fKey of keys) {
          fallback = fallback?.[fKey];
        }
        return fallback || path;
      }
    }
    
    return result;
  };

  return { t, locale, setLocale };
}

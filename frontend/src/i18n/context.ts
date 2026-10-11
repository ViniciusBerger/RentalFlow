import { createContext, useContext } from 'react';
import { translate, type Locale, type MessageKey } from './messages';

export const STORAGE_KEY = 'rentalflow-language';
export function initialLanguage(): Locale {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'pt-BR') return saved;
    }
  } catch { /* Language selection works even when storage is unavailable. */ }
  return 'pt-BR';
}

export type LanguageContextValue = {locale: Locale; setLocale: (next: Locale) => void; t: (key: MessageKey) => string};
// English default keeps isolated components usable without an app-level provider.
export const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en', setLocale: () => {}, t: (key) => translate('en', key),
});
export const useLanguage = () => useContext(LanguageContext);

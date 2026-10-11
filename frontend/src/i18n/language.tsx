import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { translate, type Locale } from './messages';
import { LanguageContext, initialLanguage, STORAGE_KEY, useLanguage } from './context';

export function LanguageProvider({children, initialLocale}: {children: ReactNode; initialLocale?: Locale}) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? initialLanguage());
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
    try { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locale); }
    catch { /* Language remains usable without persistent storage. */ }
  }, [locale]);
  return <LanguageContext.Provider value={{locale, setLocale, t: key => translate(locale, key)}}>{children}</LanguageContext.Provider>;
}

export function LanguageSwitcher() {
  const {locale, setLocale, t} = useLanguage();
  return (
    <label className="rf-language-switcher">
      <span>{t('language')}</span>
      <select aria-label={t('language')} value={locale} onChange={e => setLocale(e.target.value as Locale)}>
        <option value="pt-BR">{t('portuguese')}</option>
        <option value="en">{t('english')}</option>
      </select>
    </label>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings, updateSettings } from '@/services/storage/database';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      setLanguage(settings.language || 'en');
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized) {return;}
    i18n.changeLanguage(language);
    updateSettings({ language });
  }, [language, initialized]); // Remove i18n from deps since it's stable

  const setLang = (lang: 'en' | 'fr') => setLanguage(lang);
  const toggle = () => setLanguage(l => l === 'en' ? 'fr' : 'en');

  return { language, setLanguage: setLang, toggle };
}

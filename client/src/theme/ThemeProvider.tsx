import { useCallback, useEffect, useMemo, useState } from 'react';
import darkThemeHref from 'primereact/resources/themes/lara-dark-teal/theme.css?url';
import lightThemeHref from 'primereact/resources/themes/lara-light-teal/theme.css?url';
import { ThemeContext, type Theme } from './useTheme';

const STORAGE_KEY = 'matchmind-theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ensureThemeLink(theme: Theme): void {
  const id = 'primereact-theme';
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  link.href = theme === 'dark' ? darkThemeHref : lightThemeHref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    ensureThemeLink(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

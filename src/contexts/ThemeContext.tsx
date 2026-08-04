import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK } from '../constants/theme';

export type ThemeMode = 'System' | 'Light' | 'Dark';
export type ThemeColors = typeof LIGHT;

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const THEME_STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT,
  isDark: false,
  themeMode: 'System',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('System');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((value) => {
      if (value) setThemeModeState(value as ThemeMode);
      setLoaded(true);
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const isDark = themeMode === 'Dark' || (themeMode === 'System' && systemScheme === 'dark');
  const colors = isDark ? DARK : LIGHT;

  const value = useMemo(
    () => ({ colors, isDark, themeMode, setThemeMode }),
    [colors, isDark, themeMode]
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

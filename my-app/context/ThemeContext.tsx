import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { lightColors, darkColors, Theme, setGlobalThemeColors } from '../constants/Theme';
import { safeStorage } from '../services/safeStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = '@study_insights_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const saved = await safeStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setThemeModeState(saved as ThemeMode);
          const computedDark =
            saved === 'dark' ? true : saved === 'light' ? false : deviceColorScheme === 'dark';
          setGlobalThemeColors(computedDark ? darkColors : lightColors);
        }
      } catch (e) {
        // ignore
      }
    }
    loadStoredTheme();
  }, []);

  const isDark =
    themeMode === 'dark'
      ? true
      : themeMode === 'light'
      ? false
      : deviceColorScheme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    setGlobalThemeColors(colors);
  }, [colors]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    const nextDark = mode === 'dark' ? true : mode === 'light' ? false : deviceColorScheme === 'dark';
    setGlobalThemeColors(nextDark ? darkColors : lightColors);
    await safeStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export const useAppTheme = useTheme;

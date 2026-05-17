import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { supabase } from './supabase';

type ThemeType = 'Light' | 'Dark' | 'System';
type TextSizeType = 'Small' | 'Medium' | 'Large';

type SettingsContextType = {
  theme: ThemeType;
  textSize: TextSizeType;
  language: string;

  colors: any;
  fontScale: number;

  setTheme: (v: ThemeType) => void;
  setTextSize: (v: TextSizeType) => void;
  setLanguage: (v: string) => void;

  refreshSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: any) {
  const [theme, setTheme] = useState<ThemeType>('System');
  const [textSize, setTextSize] = useState<TextSizeType>('Medium');
  const [language, setLanguage] = useState('English');

  const refreshSettings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const meta = user?.user_metadata || {};

    setTheme(meta.display_theme || 'System');
    setTextSize(meta.text_size || 'Medium');
    setLanguage(meta.language || 'English');
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const systemTheme = Appearance.getColorScheme();

  const activeTheme =
    theme === 'System' ? systemTheme : theme.toLowerCase();

  const colors =
    activeTheme === 'dark'
      ? {
          background: '#0F172A',
          card: '#1E293B',
          text: '#FFFFFF',
          subtext: '#94A3B8',
          primary: '#6366F1',
        }
      : {
          background: '#F8FAFC',
          card: '#FFFFFF',
          text: '#0F172A',
          subtext: '#64748B',
          primary: '#4F46E5',
        };

  const fontScale =
    textSize === 'Small' ? 0.9 : textSize === 'Large' ? 1.15 : 1;

  return (
    <SettingsContext.Provider
      value={{
        theme,
        textSize,
        language,
        colors,
        fontScale,
        setTheme,
        setTextSize,
        setLanguage,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
}
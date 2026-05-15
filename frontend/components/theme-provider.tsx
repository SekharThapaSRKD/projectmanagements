'use client';

import { ThemeProvider as NextThemeProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import { useEffect } from 'react';
import { initializeStylePreset } from '@/lib/style-preset';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    initializeStylePreset();
  }, []);

  return <NextThemeProvider attribute="class" defaultTheme="light" enableSystem {...props}>{children}</NextThemeProvider>;
}
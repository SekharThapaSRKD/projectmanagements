'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'zh' | 'ja';

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'teamflow-language-storage',
    }
  )
);

export const translations: Partial<Record<Locale, any>> = {
  en: {
    common: {
      dashboard: 'Dashboard',
      projects: 'Board',
      tasks: 'Tasks',
      settings: 'Settings',
      admin: 'Admin',
      search: 'Search...',
      invite: 'Invite',
      logout: 'Logout',
    },
    admin: {
      console: 'Console',
      personnel: 'Personnel',
      security: 'Security',
      core: 'Core',
      nodes: 'Nodes',
      ledger: 'Ledger',
      override: 'Override',
    }
  },
  es: {
    common: {
      dashboard: 'Tablero',
      projects: 'Tablero',
      tasks: 'Tareas',
      settings: 'Ajustes',
      admin: 'Admin',
      search: 'Buscar...',
      invite: 'Invitar',
      logout: 'Cerrar sesión',
    },
    admin: {
      console: 'Consola',
      personnel: 'Personal',
      security: 'Seguridad',
      core: 'Núcleo',
      nodes: 'Nodos',
      ledger: 'Libro mayor',
      override: 'Anulación',
    }
  },
  hi: {
    common: {
      dashboard: 'डैशबोर्ड',
      projects: 'बोर्ड',
      tasks: 'कार्य',
      settings: 'सेटिंग्स',
      admin: 'एडमिन',
      search: 'खोजें...',
      invite: 'आमंत्रित करें',
      logout: 'लॉगआउट',
    },
    admin: {
      console: 'कंसोल',
      personnel: 'कार्मिक',
      security: 'सुरक्षा',
      core: 'कोर',
      nodes: 'नोड्स',
      ledger: 'लेजर',
      override: 'ओवरराइड',
    }
  },
  // Add other languages as needed
};

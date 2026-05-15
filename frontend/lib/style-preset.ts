export const STYLE_PRESET_STORAGE_KEY = 'teamflow-style-preset';

export const stylePresets = ['classic', 'graphite', 'focus'] as const;
export type StylePreset = (typeof stylePresets)[number];

export const isStylePreset = (value: string | null | undefined): value is StylePreset =>
  Boolean(value && stylePresets.includes(value as StylePreset));

export const getStoredStylePreset = (): StylePreset => {
  if (typeof window === 'undefined') {
    return 'classic';
  }

  const raw = window.localStorage.getItem(STYLE_PRESET_STORAGE_KEY);
  return isStylePreset(raw) ? raw : 'classic';
};

export const applyStylePreset = (preset: StylePreset): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-style-preset', preset);
};

export const saveStylePreset = (preset: StylePreset): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STYLE_PRESET_STORAGE_KEY, preset);
};

export const initializeStylePreset = (): StylePreset => {
  const preset = getStoredStylePreset();
  applyStylePreset(preset);
  return preset;
};

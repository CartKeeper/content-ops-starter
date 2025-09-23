import type { ThemeAccent, ThemeBackgroundPalette, ThemeOutlineLevel, ThemePreferences } from '../types/theme';

type AccentDefinition = {
    label: string;
    hex: string;
    soft: string;
    contrast: string;
};

type BackgroundTokens = {
    canvas: string;
    surface: string;
    elevated: string;
    border: string;
    mutedBorder: string;
};

type OutlineTokens = {
    alpha: string;
    blur: string;
    spread: string;
};

export const DEFAULT_THEME: ThemePreferences = {
    mode: 'light',
    accent: 'indigo',
    background: { light: 'slate', dark: 'zinc' },
    outline: { enabled: false, level: 'medium' },
};


export const ACCENT_DEFINITIONS: Record<ThemeAccent, AccentDefinition> = {
    slate: {
        label: 'Slate',
        hex: '#475569',
        soft: 'rgba(71, 85, 105, 0.18)',
        contrast: '#ffffff',
    },
    indigo: {
        label: 'Indigo',
        hex: '#6366f1',
        soft: 'rgba(99, 102, 241, 0.22)',
        contrast: '#ffffff',
    },
    emerald: {
        label: 'Emerald',
        hex: '#10b981',
        soft: 'rgba(16, 185, 129, 0.22)',
        contrast: '#ffffff',
    },
    violet: {
        label: 'Violet',
        hex: '#8b5cf6',
        soft: 'rgba(139, 92, 246, 0.22)',
        contrast: '#ffffff',
    },
    amber: {
        label: 'Amber',
        hex: '#f59e0b',
        soft: 'rgba(245, 158, 11, 0.28)',
        contrast: '#111827',
    },
    rose: {
        label: 'Rose',
        hex: '#f43f5e',
        soft: 'rgba(244, 63, 94, 0.22)',
        contrast: '#ffffff',
    },
    zinc: {
        label: 'Zinc',
        hex: '#71717a',
        soft: 'rgba(113, 113, 122, 0.2)',
        contrast: '#ffffff',
    },
};

export const LIGHT_BACKGROUND_TOKENS: Record<ThemeBackgroundPalette, BackgroundTokens> = {
    slate: {
        canvas: '#f8fafc',
        surface: '#f1f5f9',
        elevated: '#e2e8f0',
        border: 'rgba(15, 23, 42, 0.08)',
        mutedBorder: 'rgba(15, 23, 42, 0.12)',
    },
    zinc: {
        canvas: '#f9fafb',
        surface: '#f3f4f6',
        elevated: '#e5e7eb',
        border: 'rgba(15, 23, 42, 0.08)',
        mutedBorder: 'rgba(15, 23, 42, 0.1)',
    },
    indigo: {
        canvas: '#eef2ff',
        surface: '#e0e7ff',
        elevated: '#c7d2fe',
        border: 'rgba(79, 70, 229, 0.18)',
        mutedBorder: 'rgba(79, 70, 229, 0.24)',
    },
    emerald: {
        canvas: '#ecfdf5',
        surface: '#d1fae5',
        elevated: '#a7f3d0',
        border: 'rgba(5, 150, 105, 0.18)',
        mutedBorder: 'rgba(5, 150, 105, 0.24)',
    },
    violet: {
        canvas: '#f5f3ff',
        surface: '#ede9fe',
        elevated: '#ddd6fe',
        border: 'rgba(109, 40, 217, 0.18)',
        mutedBorder: 'rgba(109, 40, 217, 0.24)',
    },
    amber: {
        canvas: '#fffbeb',
        surface: '#fef3c7',
        elevated: '#fde68a',
        border: 'rgba(180, 83, 9, 0.2)',
        mutedBorder: 'rgba(180, 83, 9, 0.26)',
    },
    rose: {
        canvas: '#fff1f2',
        surface: '#ffe4e6',
        elevated: '#fecdd3',
        border: 'rgba(190, 24, 93, 0.18)',
        mutedBorder: 'rgba(190, 24, 93, 0.24)',
    },
    'dark-gray': {
        canvas: '#f5f5f5',
        surface: '#e5e5e5',
        elevated: '#d4d4d4',
        border: 'rgba(17, 24, 39, 0.08)',
        mutedBorder: 'rgba(17, 24, 39, 0.12)',
    },
};

export const DARK_BACKGROUND_TOKENS: Record<ThemeBackgroundPalette, BackgroundTokens> = {
    slate: {
        canvas: '#0f172a',
        surface: '#111827',
        elevated: '#1e293b',
        border: 'rgba(148, 163, 184, 0.18)',
        mutedBorder: 'rgba(148, 163, 184, 0.24)',
    },
    zinc: {
        canvas: '#101014',
        surface: '#151519',
        elevated: '#1d1d22',
        border: 'rgba(212, 212, 216, 0.12)',
        mutedBorder: 'rgba(212, 212, 216, 0.18)',
    },
    indigo: {
        canvas: '#0b1020',
        surface: '#11172a',
        elevated: '#18213a',
        border: 'rgba(165, 180, 252, 0.16)',
        mutedBorder: 'rgba(165, 180, 252, 0.22)',
    },
    emerald: {
        canvas: '#071410',
        surface: '#0c1c17',
        elevated: '#112820',
        border: 'rgba(110, 231, 183, 0.16)',
        mutedBorder: 'rgba(110, 231, 183, 0.22)',
    },
    violet: {
        canvas: '#150b24',
        surface: '#1f1233',
        elevated: '#2a1846',
        border: 'rgba(196, 181, 253, 0.16)',
        mutedBorder: 'rgba(196, 181, 253, 0.22)',
    },
    amber: {
        canvas: '#1a1204',
        surface: '#221809',
        elevated: '#2d1f0d',
        border: 'rgba(253, 230, 138, 0.18)',
        mutedBorder: 'rgba(253, 230, 138, 0.24)',
    },
    rose: {
        canvas: '#1a0b11',
        surface: '#220f16',
        elevated: '#321722',
        border: 'rgba(251, 113, 133, 0.18)',
        mutedBorder: 'rgba(251, 113, 133, 0.24)',
    },
    'dark-gray': {
        canvas: '#0c0c0f',
        surface: '#121215',
        elevated: '#18181c',
        border: 'rgba(229, 231, 235, 0.1)',
        mutedBorder: 'rgba(229, 231, 235, 0.16)',
    },
};

export const OUTLINE_LEVEL_TOKENS: Record<ThemeOutlineLevel, OutlineTokens> = {
    low: { alpha: '0.25', blur: '8px', spread: '1px' },
    medium: { alpha: '0.45', blur: '14px', spread: '2px' },
    high: { alpha: '0.7', blur: '22px', spread: '3px' },
};

export const THEME_ACCENT_OPTIONS = Object.keys(ACCENT_DEFINITIONS) as ThemeAccent[];
export const THEME_BACKGROUND_OPTIONS = Object.keys(LIGHT_BACKGROUND_TOKENS) as ThemeBackgroundPalette[];

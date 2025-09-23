import { z } from 'zod';

import type { ThemePreferences, ThemeSource } from '../../types/theme';
import {
    DEFAULT_THEME,
    THEME_ACCENT_OPTIONS,
    THEME_BACKGROUND_OPTIONS,
} from '../../utils/theme-constants';

export const ThemePreferencesSchema = z.object({
    mode: z.enum(['system', 'light', 'dark']).default(DEFAULT_THEME.mode),
    accent: z.enum(THEME_ACCENT_OPTIONS).default(DEFAULT_THEME.accent),
    background: z
        .object({
            light: z.enum(THEME_BACKGROUND_OPTIONS),
            dark: z.enum(THEME_BACKGROUND_OPTIONS),
        })
        .default({ ...DEFAULT_THEME.background }),
    outline: z
        .object({
            enabled: z.boolean().default(false),
            level: z.enum(['low', 'medium', 'high']).default('medium'),
        })
        .default({ enabled: false, level: 'medium' }),
});

export type ThemePreferencesInput = z.infer<typeof ThemePreferencesSchema>;

export function createDefaultTheme(): ThemePreferences {
    return { ...DEFAULT_THEME, background: { ...DEFAULT_THEME.background }, outline: { ...DEFAULT_THEME.outline } };
}

export function sanitizeTheme(value: unknown, fallback?: ThemePreferences): ThemePreferences {
    if (!value || typeof value !== 'object') {
        return fallback
            ? {
                  mode: fallback.mode,
                  accent: fallback.accent,
                  background: { ...fallback.background },
                  outline: { ...fallback.outline },
              }
            : createDefaultTheme();
    }

    const result = ThemePreferencesSchema.safeParse(value);
    if (result.success) {
        return result.data;
    }

    return fallback
        ? {
              mode: fallback.mode,
              accent: fallback.accent,
              background: { ...fallback.background },
              outline: { ...fallback.outline },
          }
        : createDefaultTheme();
}

export function mergeThemeValues(
    workspace: ThemePreferences,
    overrides: ThemePreferences | null | undefined,
): ThemePreferences {
    if (!overrides) {
        return workspace;
    }

    return {
        mode: overrides.mode ?? workspace.mode,
        accent: overrides.accent ?? workspace.accent,
        background: {
            light: overrides.background?.light ?? workspace.background.light,
            dark: overrides.background?.dark ?? workspace.background.dark,
        },
        outline: {
            enabled: overrides.outline?.enabled ?? workspace.outline.enabled,
            level: overrides.outline?.level ?? workspace.outline.level,
        },
    };
}

export type ThemeResponsePayload = {
    theme: ThemePreferences;
    workspaceTheme: ThemePreferences;
    userOverrides: ThemePreferences | null;
    source: ThemeSource;
};

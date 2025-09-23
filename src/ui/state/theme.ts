import { create } from 'zustand';

import type {
    ThemeBackgroundSettings,
    ThemeModeSetting,
    ThemeOutlineSettings,
    ThemePreferences,
    ThemeSource,
} from '../../types/theme';
import {
    ACCENT_DEFINITIONS,
    DARK_BACKGROUND_TOKENS,
    DEFAULT_THEME,
    LIGHT_BACKGROUND_TOKENS,
    OUTLINE_LEVEL_TOKENS,
} from '../../utils/theme-constants';
import { sanitizeTheme, type ThemeResponsePayload } from '../../server/theme/schema';

type ThemePartial = Partial<Omit<ThemePreferences, 'background' | 'outline'>> & {
    background?: Partial<ThemeBackgroundSettings>;
    outline?: Partial<ThemeOutlineSettings>;
};

type ThemeCachePayload = {
    current: ThemePreferences;
    workspace: ThemePreferences;
    userOverrides: ThemePreferences | null;
    source: ThemeSource;
};

type ThemeStoreState = {
    ready: boolean;
    current: ThemePreferences;
    workspace: ThemePreferences;
    userOverrides: ThemePreferences | null;
    source: ThemeSource;
    hydrate: () => Promise<void>;
    applyPayload: (payload: ThemeResponsePayload, ready?: boolean) => void;
    setUseWorkspaceDefault: (useDefault: boolean) => void;
    updateUserTheme: (partial: ThemePartial) => void;
    replaceWorkspaceTheme: (theme: ThemePreferences) => void;
    resetThemeToDefaults: () => void;
};

const STORAGE_KEY = 'crm-theme-cache';

let persistController: AbortController | null = null;
let hydratePromise: Promise<void> | null = null;
let systemMediaQuery: MediaQueryList | null = null;
let systemListener: ((event: MediaQueryListEvent) => void) | null = null;

function cloneTheme(theme: ThemePreferences): ThemePreferences {
    return {
        mode: theme.mode,
        accent: theme.accent,
        background: { ...theme.background },
        outline: { ...theme.outline },
    };
}

function hexToRgb(hex: string): [number, number, number] | null {
    const normalized = hex.replace('#', '').trim();
    if (normalized.length !== 3 && normalized.length !== 6) {
        return null;
    }

    const expanded = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
    const value = Number.parseInt(expanded, 16);
    if (Number.isNaN(value)) {
        return null;
    }

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
    const toHex = (component: number) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixRgb(base: [number, number, number], target: [number, number, number], amount: number): [number, number, number] {
    const clamp = (value: number) => Math.min(255, Math.max(0, value));
    return [
        Math.round(clamp(base[0] * (1 - amount) + target[0] * amount)),
        Math.round(clamp(base[1] * (1 - amount) + target[1] * amount)),
        Math.round(clamp(base[2] * (1 - amount) + target[2] * amount)),
    ];
}

function darken(color: [number, number, number], amount: number): [number, number, number] {
    return mixRgb(color, [0, 0, 0], amount);
}

function brighten(color: [number, number, number], amount: number): [number, number, number] {
    return mixRgb(color, [255, 255, 255], amount);
}

function hexToHslComponents(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return '0 0% 0%';
    }

    const [r, g, b] = rgb.map((value) => value / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;

    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        switch (max) {
            case r:
                hue = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                hue = (b - r) / delta + 2;
                break;
            case b:
                hue = (r - g) / delta + 4;
                break;
            default:
                break;
        }

        hue /= 6;
    }

    return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function resolveEffectiveMode(mode: ThemeModeSetting): 'light' | 'dark' {
    if (mode === 'light') {
        return 'light';
    }

    if (mode === 'dark') {
        return 'dark';
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
}

export function resolveThemeMode(preferences: ThemePreferences): 'light' | 'dark' {
    return resolveEffectiveMode(preferences.mode);
}

function configureSystemWatcher(mode: ThemeModeSetting) {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return;
    }

    if (mode === 'system') {
        if (!systemMediaQuery) {
            systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            systemListener = () => {
                const { current } = useThemeStoreBase.getState();
                applyThemeToDocument(current);
            };
            systemMediaQuery.addEventListener('change', systemListener);
        }
    } else if (systemMediaQuery && systemListener) {
        systemMediaQuery.removeEventListener('change', systemListener);
        systemMediaQuery = null;
        systemListener = null;
    }
}

function applyThemeToDocument(theme: ThemePreferences) {
    if (typeof document === 'undefined') {
        return;
    }

    const resolved = resolveEffectiveMode(theme.mode);
    configureSystemWatcher(theme.mode);

    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.themeMode = theme.mode;
    root.dataset.themeResolved = resolved;
    root.style.colorScheme = resolved;

    const accent = ACCENT_DEFINITIONS[theme.accent];
    const accentRgb = hexToRgb(accent.hex);
    root.style.setProperty('--crm-accent', accent.hex);
    root.style.setProperty('--crm-accent-soft', accent.soft);
    root.style.setProperty('--crm-accent-contrast', accent.contrast);

    if (accentRgb) {
        const hoverHex = rgbToHex(darken(accentRgb, 0.08));
        const activeHex = rgbToHex(darken(accentRgb, 0.16));
        const brightHex = rgbToHex(brighten(accentRgb, 0.2));
        const rgbValue = accentRgb.join(', ');
        root.style.setProperty('--crm-accent-hover', hoverHex);
        root.style.setProperty('--crm-accent-active', activeHex);
        root.style.setProperty('--crm-accent-bright', brightHex);
        root.style.setProperty('--crm-accent-rgb', rgbValue);
        root.style.setProperty('--crm-accent-glow', `rgba(${rgbValue}, 0.35)`);
        root.style.setProperty('--crm-accent-glow-strong', `rgba(${rgbValue}, 0.55)`);
    }

    const outlineTokens = OUTLINE_LEVEL_TOKENS[theme.outline.level];
    root.style.setProperty('--outline-alpha', outlineTokens.alpha);
    root.style.setProperty('--outline-blur', outlineTokens.blur);
    root.style.setProperty('--outline-spread', outlineTokens.spread);
    root.style.setProperty('--outline-color', hexToHslComponents(accent.hex));

    const backgroundTokens =
        resolved === 'dark'
            ? DARK_BACKGROUND_TOKENS[theme.background.dark]
            : LIGHT_BACKGROUND_TOKENS[theme.background.light];
    root.style.setProperty('--crm-bg-canvas', backgroundTokens.canvas);
    root.style.setProperty('--crm-bg-surface', backgroundTokens.surface);
    root.style.setProperty('--crm-bg-elevated', backgroundTokens.elevated);
    root.style.setProperty('--crm-border-card', backgroundTokens.border);
    root.style.setProperty('--crm-border-muted', backgroundTokens.mutedBorder);

    const body = document.body;
    if (body) {
        body.classList.toggle('theme-dark', resolved === 'dark');
        body.classList.toggle('theme-light', resolved === 'light');
        body.classList.toggle('crm-outline-mode', theme.outline.enabled);
        body.dataset.bsTheme = resolved;
        body.dataset.outlineLevel = theme.outline.level;
        body.style.backgroundColor = backgroundTokens.canvas;
    }
}

function mergeTheme(base: ThemePreferences, updates: ThemePartial): ThemePreferences {
    return {
        mode: updates.mode ?? base.mode,
        accent: updates.accent ?? base.accent,
        background: {
            light: updates.background?.light ?? base.background.light,
            dark: updates.background?.dark ?? base.background.dark,
        },
        outline: {
            enabled: updates.outline?.enabled ?? base.outline.enabled,
            level: updates.outline?.level ?? base.outline.level,
        },
    };
}

function saveCache(next: ThemeCachePayload) {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
        console.warn('Unable to persist theme cache', error);
    }
}

function loadCache(): ThemeCachePayload | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<ThemeCachePayload> | null;
        if (!parsed) {
            return null;
        }

        const workspace = sanitizeTheme(parsed.workspace ?? parsed.current ?? DEFAULT_THEME, DEFAULT_THEME);
        const current = sanitizeTheme(parsed.current ?? workspace, workspace);
        const userOverrides = parsed.userOverrides ? sanitizeTheme(parsed.userOverrides, workspace) : null;
        const source: ThemeSource = parsed.source === 'user' && userOverrides ? 'user' : 'workspace';

        return { current, workspace, userOverrides, source };
    } catch (error) {
        console.warn('Unable to restore cached theme', error);
        return null;
    }
}

const cached = typeof window !== 'undefined' ? loadCache() : null;

const initialWorkspace = cached?.workspace ? cloneTheme(cached.workspace) : cloneTheme(DEFAULT_THEME);
const initialUserOverrides = cached?.userOverrides ? cloneTheme(cached.userOverrides) : null;
const initialCurrent = cached?.current ? cloneTheme(cached.current) : cloneTheme(initialUserOverrides ?? initialWorkspace);
const initialSource: ThemeSource = cached?.source ?? 'workspace';

const useThemeStoreBase = create<ThemeStoreState>((set, get) => {
    const commit = (updater: (prev: ThemeStoreState) => ThemeStoreState) => {
        set((previous) => {
            const next = updater(previous);
            const normalized: ThemeStoreState = {
                ...next,
                current: cloneTheme(next.current),
                workspace: cloneTheme(next.workspace),
                userOverrides: next.userOverrides ? cloneTheme(next.userOverrides) : null,
            };

            applyThemeToDocument(normalized.current);
            saveCache({
                current: normalized.current,
                workspace: normalized.workspace,
                userOverrides: normalized.userOverrides,
                source: normalized.source,
            });

            return normalized;
        });
    };

    return {
        ready: false,
        current: initialCurrent,
        workspace: initialWorkspace,
        userOverrides: initialUserOverrides,
        source: initialSource,
        hydrate: async () => {
            if (typeof window === 'undefined') {
                return;
            }

            if (hydratePromise) {
                return hydratePromise;
            }

            hydratePromise = (async () => {
                try {
                    const response = await fetch('/api/theme', { credentials: 'include' });
                    const payload = (await response.json().catch(() => null)) as ThemeResponsePayload | null;
                    if (!response.ok || !payload) {
                        throw new Error(`Theme request failed: ${response.status}`);
                    }

                    get().applyPayload(payload, true);
                } catch (error) {
                    console.error('Failed to hydrate theme', error);
                    commit((prev) => ({
                        ...prev,
                        ready: true,
                    }));
                } finally {
                    hydratePromise = null;
                }
            })();

            return hydratePromise;
        },
        applyPayload: (payload, ready = true) => {
            const workspace = sanitizeTheme(payload.workspaceTheme, DEFAULT_THEME);
            const userOverrides = payload.userOverrides ? sanitizeTheme(payload.userOverrides, workspace) : null;
            const theme = sanitizeTheme(payload.theme, userOverrides ?? workspace);
            const source: ThemeSource = payload.source === 'user' && userOverrides ? 'user' : 'workspace';

            commit((prev) => ({
                ...prev,
                ready,
                current: theme,
                workspace,
                userOverrides,
                source,
            }));
        },
        setUseWorkspaceDefault: (useDefault: boolean) => {
            if (useDefault) {
                commit((prev) => ({
                    ...prev,
                    ready: true,
                    current: prev.workspace,
                    userOverrides: null,
                    source: 'workspace',
                }));
                void persistUserTheme(true, null);
                return;
            }

            const snapshot = get();
            const base = snapshot.userOverrides ?? snapshot.current ?? snapshot.workspace;
            const overrides = cloneTheme(base);
            commit((prev) => ({
                ...prev,
                ready: true,
                current: overrides,
                userOverrides: overrides,
                source: 'user',
            }));
            void persistUserTheme(false, overrides);
        },
        updateUserTheme: (partial: ThemePartial) => {
            const snapshot = get();
            const base = snapshot.userOverrides ?? snapshot.current ?? snapshot.workspace;
            const next = mergeTheme(base, partial);
            commit((prev) => ({
                ...prev,
                ready: true,
                current: next,
                userOverrides: next,
                source: 'user',
            }));
            void persistUserTheme(false, next);
        },
        replaceWorkspaceTheme: (theme: ThemePreferences) => {
            const workspace = cloneTheme(theme);
            commit((prev) => {
                const nextCurrent = prev.source === 'workspace' ? workspace : prev.current;
                return {
                    ...prev,
                    current: nextCurrent,
                    workspace,
                    source: prev.userOverrides ? 'user' : 'workspace',
                };
            });
        },
        resetThemeToDefaults: () => {
            commit((prev) => ({
                ...prev,
                ready: true,
                current: prev.workspace,
                userOverrides: null,
                source: 'workspace',
            }));
            void persistUserTheme(true, null);
        },
    };
});

function getPersistBody(useWorkspaceDefault: boolean, prefs: ThemePreferences | null) {
    if (useWorkspaceDefault) {
        return { useWorkspaceDefault: true };
    }

    return { useWorkspaceDefault: false, prefs: prefs ?? useThemeStoreBase.getState().current };
}

async function persistUserTheme(useWorkspaceDefault: boolean, prefs: ThemePreferences | null) {
    if (typeof window === 'undefined') {
        return;
    }

    if (persistController) {
        persistController.abort();
    }

    const controller = new AbortController();
    persistController = controller;

    try {
        const response = await fetch('/api/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(getPersistBody(useWorkspaceDefault, prefs)),
            signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as ThemeResponsePayload | null;
        if (!response.ok || !payload) {
            console.error('Failed to persist theme preferences', response.status, payload ?? null);
            return;
        }

        useThemeStoreBase.getState().applyPayload(payload, true);
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            return;
        }
        console.error('Failed to persist theme preferences', error);
    } finally {
        if (persistController === controller) {
            persistController = null;
        }
    }
}

if (typeof document !== 'undefined') {
    applyThemeToDocument(initialCurrent);
}

export const useThemeStore = useThemeStoreBase;

export function hydrateThemeFromServer(): Promise<void> {
    return useThemeStoreBase.getState().hydrate();
}

export function setUseWorkspaceDefault(useDefault: boolean) {
    useThemeStoreBase.getState().setUseWorkspaceDefault(useDefault);
}

export function updateUserTheme(partial: ThemePartial) {
    useThemeStoreBase.getState().updateUserTheme(partial);
}

export function replaceWorkspaceTheme(theme: ThemePreferences) {
    useThemeStoreBase.getState().replaceWorkspaceTheme(theme);
}

export function resetThemeToDefaults() {
    useThemeStoreBase.getState().resetThemeToDefaults();
}

export function getThemeState(): ThemeCachePayload {
    const snapshot = useThemeStoreBase.getState();
    return {
        current: cloneTheme(snapshot.current),
        workspace: cloneTheme(snapshot.workspace),
        userOverrides: snapshot.userOverrides ? cloneTheme(snapshot.userOverrides) : null,
        source: snapshot.source,
    };
}

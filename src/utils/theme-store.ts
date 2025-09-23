import { useSyncExternalStore } from 'react';

import type {
    ThemeBackgroundSettings,
    ThemeModeSetting,
    ThemeOutlineSettings,
    ThemePreferences,
    ThemeSource,
} from '../types/theme';
import {
    ACCENT_DEFINITIONS,
    DARK_BACKGROUND_TOKENS,
    DEFAULT_THEME,
    LIGHT_BACKGROUND_TOKENS,
    OUTLINE_LEVEL_TOKENS,
} from './theme-constants';
import { sanitizeTheme, type ThemeResponsePayload } from '../server/theme/schema';

const STORAGE_KEY = 'crm-theme-cache';

type ThemeState = {
    ready: boolean;
    current: ThemePreferences;
    workspace: ThemePreferences;
    userOverrides: ThemePreferences | null;
    source: ThemeSource;
};

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

const listeners = new Set<() => void>();

function cloneTheme(theme: ThemePreferences): ThemePreferences {
    return {
        mode: theme.mode,
        accent: theme.accent,
        background: { ...theme.background },
        outline: { ...theme.outline },
    };
}

let state: ThemeState = {
    ready: false,
    current: cloneTheme(DEFAULT_THEME),
    workspace: cloneTheme(DEFAULT_THEME),
    userOverrides: null,
    source: 'workspace',
};

let hydratePromise: Promise<void> | null = null;
let persistController: AbortController | null = null;

let systemMediaQuery: MediaQueryList | null = null;
let systemListener: ((event: MediaQueryListEvent) => void) | null = null;

function emit() {
    for (const listener of listeners) {
        listener();
    }
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

function configureSystemWatcher(mode: ThemeModeSetting) {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return;
    }

    if (mode === 'system') {
        if (!systemMediaQuery) {
            systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            systemListener = () => {
                applyTheme(state.current);
            };
            systemMediaQuery.addEventListener('change', systemListener);
        }
    } else if (systemMediaQuery && systemListener) {
        systemMediaQuery.removeEventListener('change', systemListener);
        systemMediaQuery = null;
        systemListener = null;
    }
}

function applyTheme(theme: ThemePreferences) {
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

function saveCache(next: ThemeState) {
    if (typeof window === 'undefined') {
        return;
    }
    const payload: ThemeCachePayload = {
        current: next.current,
        workspace: next.workspace,
        userOverrides: next.userOverrides,
        source: next.source,
    };
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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

function updateState(updater: (prev: ThemeState) => ThemeState) {
    const next = updater(state);
    state = {
        ready: next.ready,
        source: next.source,
        current: cloneTheme(next.current),
        workspace: cloneTheme(next.workspace),
        userOverrides: next.userOverrides ? cloneTheme(next.userOverrides) : null,
    };
    applyTheme(state.current);
    saveCache(state);
    emit();
}

function applyPayload(payload: ThemeResponsePayload, ready = true) {
    const workspace = sanitizeTheme(payload.workspaceTheme, DEFAULT_THEME);
    const userOverrides = payload.userOverrides ? sanitizeTheme(payload.userOverrides, workspace) : null;
    const theme = sanitizeTheme(payload.theme, userOverrides ?? workspace);
    const source: ThemeSource = payload.source === 'user' && userOverrides ? 'user' : 'workspace';
    updateState(() => ({
        ready,
        current: theme,
        workspace,
        userOverrides,
        source,
    }));
}

if (typeof window !== 'undefined') {
    const cached = loadCache();
    if (cached) {
        state = {
            ready: false,
            current: cloneTheme(cached.current),
            workspace: cloneTheme(cached.workspace),
            userOverrides: cached.userOverrides ? cloneTheme(cached.userOverrides) : null,
            source: cached.source,
        };
    }
    applyTheme(state.current);
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
        const body = useWorkspaceDefault
            ? { useWorkspaceDefault: true }
            : { useWorkspaceDefault: false, prefs: prefs ?? state.current };
        const response = await fetch('/api/theme', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as ThemeResponsePayload | null;

        if (!response.ok) {
            console.error('Failed to persist theme preferences', response.status, payload ?? null);
            return;
        }

        if (payload) {
            applyPayload(payload, true);
        }
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

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot(): ThemeState {
    return state;
}

function getServerSnapshot(): ThemeState {
    return state;
}

export function useThemeStore<T>(selector: (state: ThemeState) => T): T {
    return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getServerSnapshot()));
}

export function getThemeState(): ThemeState {
    return {
        ready: state.ready,
        current: cloneTheme(state.current),
        workspace: cloneTheme(state.workspace),
        userOverrides: state.userOverrides ? cloneTheme(state.userOverrides) : null,
        source: state.source,
    };
}

export async function hydrateThemeFromServer(): Promise<void> {
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
            applyPayload(payload, true);
        } catch (error) {
            console.error('Failed to hydrate theme', error);
            updateState((prev) => ({
                ready: true,
                current: prev.current,
                workspace: prev.workspace,
                userOverrides: prev.userOverrides,
                source: prev.source,
            }));
        } finally {
            hydratePromise = null;
        }
    })();

    return hydratePromise;
}

export function setUseWorkspaceDefault(useDefault: boolean) {
    if (useDefault) {
        const workspaceTheme = state.workspace;
        updateState(() => ({
            ready: true,
            current: workspaceTheme,
            workspace: workspaceTheme,
            userOverrides: null,
            source: 'workspace',
        }));
        void persistUserTheme(true, null);
        return;
    }

    const base = state.userOverrides ?? state.current ?? state.workspace;
    const overrides = cloneTheme(base);
    updateState(() => ({
        ready: true,
        current: overrides,
        workspace: state.workspace,
        userOverrides: overrides,
        source: 'user',
    }));
    void persistUserTheme(false, overrides);
}

export function updateUserTheme(partial: ThemePartial) {
    const base = state.userOverrides ?? state.current ?? state.workspace;
    const next = mergeTheme(base, partial);
    updateState(() => ({
        ready: true,
        current: next,
        workspace: state.workspace,
        userOverrides: next,
        source: 'user',
    }));
    void persistUserTheme(false, next);
}

export function replaceWorkspaceTheme(theme: ThemePreferences) {
    const workspace = cloneTheme(theme);
    const current = state.source === 'workspace' ? workspace : state.current;
    updateState(() => ({
        ready: state.ready,
        current,
        workspace,
        userOverrides: state.userOverrides,
        source: state.userOverrides ? 'user' : 'workspace',
    }));
}

export function resetThemeToDefaults() {
    const workspaceTheme = state.workspace;
    updateState(() => ({
        ready: true,
        current: workspaceTheme,
        workspace: workspaceTheme,
        userOverrides: null,
        source: 'workspace',
    }));
    void persistUserTheme(true, null);
}

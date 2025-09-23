'use client';

import * as React from 'react';
import classNames from 'classnames';

import type {
    ThemeAccent,
    ThemeBackgroundPalette,
    ThemeBackgroundSettings,
    ThemeModeSetting,
    ThemeOutlineLevel,
    ThemeOutlineSettings,
    ThemePreferences,
} from '../../types/theme';
import {
    ACCENT_DEFINITIONS,
    DARK_BACKGROUND_TOKENS,
    DEFAULT_THEME,
    LIGHT_BACKGROUND_TOKENS,
    THEME_ACCENT_OPTIONS,
    THEME_BACKGROUND_OPTIONS,
} from '../../utils/theme-constants';
import { resolveThemeMode, useThemeStore } from '../../utils/theme-store';
import type { ManagedUserRecord, UserPermissions, UserRole } from '../../types/user';
import { CheckIcon, MoonIcon, SunIcon } from '../crm/icons';

type UserManagementPanelProps = {
    currentUserId: string | null;
};

type ThemeSelectionState = {
    useWorkspaceDefault: boolean;
    prefs: ThemePreferences;
};

type CreationFormState = {
    name: string;
    email: string;
    role: UserRole;
    permissions: UserPermissions;
    theme: ThemeSelectionState;
};

type RoleFilterValue = 'all' | UserRole;
type StatusFilterValue = 'all' | 'active' | 'inactive';

type FilterState = {
    query: string;
    role: RoleFilterValue;
    status: StatusFilterValue;
};

type UserRowSnapshot = {
    role: UserRole;
    permissions: UserPermissions;
    status: string;
    active: boolean;
};

type Toast = {
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
};

type ToastInput = {
    type: Toast['type'];
    message: string;
};

type RowSaveHandler = (userId: string, payload: Record<string, unknown>) => Promise<ManagedUserRecord>;

type DirtyChangeHandler = (userId: string, dirty: boolean) => void;

type ToastHandler = (toast: ToastInput) => void;

type CreateUserPayload = {
    name: string;
    email: string;
    role: UserRole;
    permissions: UserPermissions;
    theme: { useWorkspaceDefault: boolean; prefs?: ThemePreferences };
};

type ThemePartial = Partial<Omit<ThemePreferences, 'background' | 'outline'>> & {
    background?: Partial<ThemeBackgroundSettings>;
    outline?: Partial<ThemeOutlineSettings>;
};

const BACKGROUND_LABELS: Record<ThemeBackgroundPalette, string> = {
    slate: 'Slate',
    zinc: 'Zinc',
    indigo: 'Indigo',
    emerald: 'Emerald',
    violet: 'Violet',
    amber: 'Amber',
    rose: 'Rose',
    'dark-gray': 'Dark Gray',
};

const OUTLINE_LABELS: Record<ThemeOutlineLevel, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
};

const MODE_LABELS: Record<ThemeModeSetting, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
};

const THEME_OUTLINE_OPTIONS: { id: ThemeOutlineLevel; label: string; description: string }[] = [
    { id: 'low', label: 'Low', description: 'Subtle glow' },
    { id: 'medium', label: 'Medium', description: 'Balanced glow' },
    { id: 'high', label: 'High', description: 'Maximum glow' },
];

function cloneThemePrefs(theme: ThemePreferences): ThemePreferences {
    return {
        mode: theme.mode,
        accent: theme.accent,
        background: { ...theme.background },
        outline: { ...theme.outline },
    };
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

function themesAreEqual(a: ThemePreferences, b: ThemePreferences): boolean {
    return (
        a.mode === b.mode &&
        a.accent === b.accent &&
        a.background.light === b.background.light &&
        a.background.dark === b.background.dark &&
        a.outline.enabled === b.outline.enabled &&
        a.outline.level === b.outline.level
    );
}

const STANDARD_DEFAULT_PERMISSIONS: UserPermissions = {
    canManageUsers: false,
    canEditSettings: false,
    canViewGalleries: true,
    canManageIntegrations: true,
    canManageCalendar: true,
};

const RESTRICTED_DEFAULT_PERMISSIONS: UserPermissions = {
    canManageUsers: false,
    canEditSettings: false,
    canViewGalleries: true,
    canManageIntegrations: false,
    canManageCalendar: true,
};

function createInitialCreationForm(workspaceTheme?: ThemePreferences): CreationFormState {
    const baseTheme = cloneThemePrefs(workspaceTheme ?? DEFAULT_THEME);
    return {
        name: '',
        email: '',
        role: 'standard',
        permissions: { ...STANDARD_DEFAULT_PERMISSIONS },
        theme: {
            useWorkspaceDefault: true,
            prefs: baseTheme,
        },
    };
}

function buildRowSnapshot(user: ManagedUserRecord): UserRowSnapshot {
    return {
        role: user.role,
        permissions: { ...user.permissions },
        status: user.status ? sanitizeStatus(user.status) : '',
        active: !user.deactivatedAt,
    };
}

function formatRole(role: UserRole): string {
    switch (role) {
        case 'admin':
            return 'Administrator';
        case 'restricted':
            return 'Restricted access';
        case 'standard':
        default:
            return 'Team member';
    }
}

function formatRelativeTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    try {
        const date = new Date(value);
        const diff = Date.now() - date.getTime();
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diff < minute) {
            return 'Just now';
        }

        if (diff < hour) {
            const minutes = Math.round(diff / minute);
            return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
        }

        if (diff < day) {
            const hours = Math.round(diff / hour);
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        }

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    } catch {
        return value;
    }
}

async function fetchUsers(): Promise<ManagedUserRecord[]> {
    const response = await fetch('/api/users', { credentials: 'include' });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const error = payload?.error ?? 'Unable to load users.';
        throw new Error(error);
    }

    return Array.isArray(payload?.users) ? payload.users : [];
}

async function createUser(payload: CreateUserPayload): Promise<ManagedUserRecord> {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error ?? 'Unable to create user.';
        throw new Error(message);
    }

    if (!body?.user) {
        throw new Error('User response was malformed.');
    }

    return body.user as ManagedUserRecord;
}

async function updateUser(userId: string, payload: Record<string, unknown>): Promise<ManagedUserRecord> {
    const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message = body?.error ?? 'Unable to update user.';
        throw new Error(message);
    }

    if (!body?.user) {
        throw new Error('User response was malformed.');
    }

    return body.user as ManagedUserRecord;
}

function sanitizeStatus(value: string): string {
    return value.trim().slice(0, 80);
}

function getInitials(name: string | null, email: string): string {
    const fallback = email?.trim().toUpperCase();
    if (name && name.trim().length > 0) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        const first = parts[0][0] ?? '';
        const last = parts[parts.length - 1][0] ?? '';
        const result = `${first}${last}`.trim();
        return result.length > 0 ? result.toUpperCase() : fallback.slice(0, 2);
    }

    return fallback.slice(0, 2);
}

type ThemeSelectionCardProps = {
    value: ThemePreferences;
    useWorkspaceDefault: boolean;
    workspaceTheme: ThemePreferences;
    onToggleWorkspaceDefault: (useDefault: boolean) => void;
    onChange: (partial: ThemePartial) => void;
    disabled?: boolean;
};

function ThemeSelectionCard({
    value,
    useWorkspaceDefault,
    workspaceTheme,
    onToggleWorkspaceDefault,
    onChange,
    disabled = false,
}: ThemeSelectionCardProps) {
    const resolvedMode = resolveThemeMode(value);
    const toggleId = React.useId();
    const outlineToggleId = React.useId();
    const controlsDisabled = disabled || useWorkspaceDefault;
    const workspaceOutlineSummary = workspaceTheme.outline.enabled
        ? `${OUTLINE_LABELS[workspaceTheme.outline.level]} glow`
        : 'Outline off';
    const workspaceSummary = `${ACCENT_DEFINITIONS[workspaceTheme.accent].label} accent · ${BACKGROUND_LABELS[workspaceTheme.background.light]} light / ${BACKGROUND_LABELS[workspaceTheme.background.dark]} dark · ${workspaceOutlineSummary}`;

    return (
        <fieldset className="space-y-4 rounded-[12px] border border-slate-800/80 bg-slate-900/60 p-4">
            <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Theme defaults
            </legend>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="text-xs text-slate-400">
                    Choose how this teammate will see the workspace on their first sign-in. They can personalize it
                    later from the theme menu.
                </div>
                <div className="form-check form-switch shrink-0">
                    <input
                        id={toggleId}
                        type="checkbox"
                        className="form-check-input"
                        role="switch"
                        checked={useWorkspaceDefault}
                        onChange={(event) => onToggleWorkspaceDefault(event.target.checked)}
                        disabled={disabled}
                    />
                    <label className="form-check-label text-xs text-slate-300" htmlFor={toggleId}>
                        Use workspace default
                    </label>
                </div>
            </div>
            <div className="rounded-[10px] border border-slate-800/70 bg-slate-950/40 p-3 text-[11px] text-slate-400">
                Workspace default: {workspaceSummary}
            </div>
            {!useWorkspaceDefault ? (
                <div className="space-y-4">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Mode</div>
                        <div className="crm-theme-mode-buttons mt-2" role="group" aria-label="Theme mode">
                            <button
                                type="button"
                                className={classNames('crm-theme-mode-button', { active: value.mode === 'system' })}
                                onClick={() => onChange({ mode: 'system' })}
                                disabled={controlsDisabled}
                                aria-pressed={value.mode === 'system'}
                            >
                                <span className="crm-theme-mode-icon" aria-hidden>
                                    {resolvedMode === 'dark' ? (
                                        <MoonIcon className="icon" />
                                    ) : (
                                        <SunIcon className="icon" />
                                    )}
                                </span>
                                System
                            </button>
                            <button
                                type="button"
                                className={classNames('crm-theme-mode-button', { active: value.mode === 'light' })}
                                onClick={() => onChange({ mode: 'light' })}
                                disabled={controlsDisabled}
                                aria-pressed={value.mode === 'light'}
                            >
                                <SunIcon className="icon" aria-hidden /> Light
                            </button>
                            <button
                                type="button"
                                className={classNames('crm-theme-mode-button', { active: value.mode === 'dark' })}
                                onClick={() => onChange({ mode: 'dark' })}
                                disabled={controlsDisabled}
                                aria-pressed={value.mode === 'dark'}
                            >
                                <MoonIcon className="icon" aria-hidden /> Dark
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Accent</div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {THEME_ACCENT_OPTIONS.map((accent) => {
                                const definition = ACCENT_DEFINITIONS[accent];
                                const isActive = value.accent === accent;
                                return (
                                    <button
                                        key={accent}
                                        type="button"
                                        className={classNames('crm-theme-accent', { active: isActive })}
                                        style={{
                                            backgroundColor: definition.hex,
                                            color: definition.contrast,
                                            boxShadow: isActive ? `0 0 0 3px ${definition.soft}` : undefined,
                                        }}
                                        onClick={() => onChange({ accent })}
                                        disabled={controlsDisabled}
                                        aria-pressed={isActive}
                                    >
                                        <span className="crm-theme-accent-label">{definition.label}</span>
                                        <span className="crm-theme-accent-check" aria-hidden>
                                            <CheckIcon className="icon" />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Light backgrounds
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {THEME_BACKGROUND_OPTIONS.map((palette) => {
                                    const tokens = LIGHT_BACKGROUND_TOKENS[palette];
                                    const isActive = value.background.light === palette;
                                    return (
                                        <button
                                            key={`light-${palette}`}
                                            type="button"
                                            className={classNames('crm-theme-background', { active: isActive })}
                                            onClick={() => onChange({ background: { light: palette } })}
                                            disabled={controlsDisabled}
                                            aria-pressed={isActive}
                                        >
                                            <span className="crm-theme-background-sample">
                                                <span style={{ backgroundColor: tokens.canvas }} />
                                                <span style={{ backgroundColor: tokens.surface }} />
                                                <span style={{ backgroundColor: tokens.elevated }} />
                                            </span>
                                            <span className="crm-theme-background-label">{BACKGROUND_LABELS[palette]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Dark backgrounds
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {THEME_BACKGROUND_OPTIONS.map((palette) => {
                                    const tokens = DARK_BACKGROUND_TOKENS[palette];
                                    const isActive = value.background.dark === palette;
                                    return (
                                        <button
                                            key={`dark-${palette}`}
                                            type="button"
                                            className={classNames('crm-theme-background', { active: isActive })}
                                            onClick={() => onChange({ background: { dark: palette } })}
                                            disabled={controlsDisabled}
                                            aria-pressed={isActive}
                                        >
                                            <span className="crm-theme-background-sample">
                                                <span style={{ backgroundColor: tokens.canvas }} />
                                                <span style={{ backgroundColor: tokens.surface }} />
                                                <span style={{ backgroundColor: tokens.elevated }} />
                                            </span>
                                            <span className="crm-theme-background-label">{BACKGROUND_LABELS[palette]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Outline glow
                        </div>
                        <div className="mt-2 space-y-3">
                            <div className="form-check form-switch">
                                <input
                                    id={outlineToggleId}
                                    type="checkbox"
                                    className="form-check-input"
                                    role="switch"
                                    checked={value.outline.enabled}
                                    onChange={(event) => onChange({ outline: { enabled: event.target.checked } })}
                                    disabled={controlsDisabled}
                                />
                                <label className="form-check-label text-xs text-slate-300" htmlFor={outlineToggleId}>
                                    Enable outline glow
                                </label>
                            </div>
                            <div className="crm-theme-outline-levels" role="group" aria-label="Outline brightness">
                                {THEME_OUTLINE_OPTIONS.map((option) => {
                                    const isActive = value.outline.level === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className={classNames('crm-theme-outline-level', { active: isActive })}
                                            onClick={() => onChange({ outline: { level: option.id } })}
                                            disabled={controlsDisabled || !value.outline.enabled}
                                            aria-pressed={isActive}
                                        >
                                            <span className="crm-theme-outline-level-label">{option.label}</span>
                                            <span className="crm-theme-outline-level-desc">{option.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[10px] border border-slate-800/70 bg-slate-950/40 p-3 text-[11px] text-slate-300">
                        Active selection: Mode{' '}
                        {value.mode === 'system' ? `System (${resolvedMode})` : MODE_LABELS[value.mode]} · Accent{' '}
                        {ACCENT_DEFINITIONS[value.accent].label} · Backgrounds{' '}
                        {BACKGROUND_LABELS[value.background.light]} light / {BACKGROUND_LABELS[value.background.dark]} dark · Outline{' '}
                        {value.outline.enabled ? `${OUTLINE_LABELS[value.outline.level]} glow` : 'Off'}
                    </div>
                </div>
            ) : null}
        </fieldset>
    );
}

export function UserManagementPanel({ currentUserId }: UserManagementPanelProps) {
    const workspaceTheme = useThemeStore((theme) => theme.workspace);
    const [users, setUsers] = React.useState<ManagedUserRecord[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [globalError, setGlobalError] = React.useState<string | null>(null);
    const [creation, setCreation] = React.useState<CreationFormState>(() => createInitialCreationForm(workspaceTheme));
    const [creationError, setCreationError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [toast, setToast] = React.useState<Toast | null>(null);
    const [filters, setFilters] = React.useState<FilterState>({ query: '', role: 'all', status: 'all' });
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());
    const [dirtyMap, setDirtyMap] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setGlobalError(null);

        fetchUsers()
            .then((fetched) => {
                if (!isMounted) {
                    return;
                }
                setUsers(fetched);
            })
            .catch((loadError) => {
                if (!isMounted) {
                    return;
                }
                const message = loadError instanceof Error ? loadError.message : 'Unable to load users.';
                setGlobalError(message);
            })
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        setCreation((previous) => {
            if (!previous.theme.useWorkspaceDefault) {
                return previous;
            }
            const nextPrefs = cloneThemePrefs(workspaceTheme);
            if (themesAreEqual(previous.theme.prefs, nextPrefs)) {
                return previous;
            }
            return {
                ...previous,
                theme: {
                    useWorkspaceDefault: true,
                    prefs: nextPrefs,
                },
            };
        });
    }, [workspaceTheme]);

    const pushToast = React.useCallback<ToastHandler>((nextToast) => {
        setToast({ id: Date.now(), ...nextToast });
    }, []);

    React.useEffect(() => {
        if (!toast) {
            return;
        }
        const timer = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const handleCreationFieldChange = React.useCallback(
        (key: 'name' | 'email' | 'role') => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;
            setCreation((previous) => {
                if (key === 'role') {
                    const nextRole = value as UserRole;
                    const nextPermissions =
                        nextRole === 'restricted'
                            ? { ...RESTRICTED_DEFAULT_PERMISSIONS }
                            : nextRole === 'admin'
                              ? { ...STANDARD_DEFAULT_PERMISSIONS, canManageUsers: true, canEditSettings: true }
                              : { ...STANDARD_DEFAULT_PERMISSIONS };
                    return { ...previous, role: nextRole, permissions: nextPermissions };
                }

                return { ...previous, [key]: value };
            });
            setCreationError(null);
        },
        [],
    );

    const handleCreationPermissionToggle = React.useCallback(
        (key: keyof UserPermissions) => (event: React.ChangeEvent<HTMLInputElement>) => {
            const checked = event.target.checked;
            setCreation((previous) => ({
                ...previous,
                permissions: { ...previous.permissions, [key]: checked },
            }));
        },
        [],
    );

    const handleThemeUseWorkspaceDefaultChange = React.useCallback(
        (useDefault: boolean) => {
            setCreationError(null);
            setCreation((previous) => {
                if (useDefault) {
                    return {
                        ...previous,
                        theme: {
                            useWorkspaceDefault: true,
                            prefs: cloneThemePrefs(workspaceTheme),
                        },
                    };
                }

                const startingPrefs = previous.theme.useWorkspaceDefault
                    ? cloneThemePrefs(workspaceTheme)
                    : cloneThemePrefs(previous.theme.prefs);

                return {
                    ...previous,
                    theme: {
                        useWorkspaceDefault: false,
                        prefs: startingPrefs,
                    },
                };
            });
        },
        [setCreationError, workspaceTheme],
    );

    const applyThemePartial = React.useCallback(
        (partial: ThemePartial) => {
            setCreationError(null);
            setCreation((previous) => {
                if (previous.theme.useWorkspaceDefault) {
                    return previous;
                }
                const nextPrefs = mergeTheme(previous.theme.prefs, partial);
                return {
                    ...previous,
                    theme: {
                        useWorkspaceDefault: false,
                        prefs: nextPrefs,
                    },
                };
            });
        },
        [setCreationError],
    );

    const handleCreateSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (submitting) {
                return;
            }

            if (creation.email.trim().length === 0) {
                setCreationError('Provide an email address for the invitation.');
                return;
            }

            setSubmitting(true);
            setCreationError(null);
            setGlobalError(null);

            try {
                const themePayload = creation.theme.useWorkspaceDefault
                    ? { useWorkspaceDefault: true as const }
                    : { useWorkspaceDefault: false as const, prefs: cloneThemePrefs(creation.theme.prefs) };
                const user = await createUser({
                    email: creation.email,
                    name: creation.name,
                    role: creation.role,
                    permissions: creation.permissions,
                    theme: themePayload,
                });

                setUsers((previous) => [user, ...previous]);
                setCreation(createInitialCreationForm(workspaceTheme));
                setExpandedIds((previous) => {
                    const next = new Set(previous);
                    next.add(user.id);
                    return next;
                });
                pushToast({ type: 'success', message: `Invitation sent to ${user.email}.` });
            } catch (createError) {
                const message = createError instanceof Error ? createError.message : 'Unable to create user.';
                setCreationError(message);
                pushToast({ type: 'error', message });
            } finally {
                setSubmitting(false);
            }
        },
        [creation, pushToast, submitting, workspaceTheme],
    );

    const filteredUsers = React.useMemo(() => {
        const normalizedQuery = filters.query.trim().toLowerCase();

        return users.filter((user) => {
            if (normalizedQuery.length > 0) {
                const name = (user.name ?? '').toLowerCase();
                const email = user.email.toLowerCase();
                if (!name.includes(normalizedQuery) && !email.includes(normalizedQuery)) {
                    return false;
                }
            }

            if (filters.role !== 'all' && user.role !== filters.role) {
                return false;
            }

            const isActive = !user.deactivatedAt;
            if (filters.status === 'active' && !isActive) {
                return false;
            }

            if (filters.status === 'inactive' && isActive) {
                return false;
            }

            return true;
        });
    }, [filters, users]);

    const totalUsers = users.length;
    const visibleCount = filteredUsers.length;

    const hasDirtyRows = React.useMemo(() => Object.keys(dirtyMap).length > 0, [dirtyMap]);

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasDirtyRows) {
                return;
            }
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasDirtyRows]);

    React.useEffect(() => {
        const existingIds = new Set(users.map((user) => user.id));
        setDirtyMap((previous) => {
            const next: Record<string, boolean> = {};
            Object.entries(previous).forEach(([key, value]) => {
                if (value && existingIds.has(key)) {
                    next[key] = value;
                }
            });
            return next;
        });
    }, [users]);

    const handleDirtyChange = React.useCallback<DirtyChangeHandler>((userId, dirty) => {
        setDirtyMap((previous) => {
            if (dirty) {
                if (previous[userId]) {
                    return previous;
                }
                return { ...previous, [userId]: true };
            }

            if (!previous[userId]) {
                return previous;
            }

            const next = { ...previous };
            delete next[userId];
            return next;
        });
    }, []);

    const handleToggleRow = React.useCallback((userId: string) => {
        setExpandedIds((previous) => {
            const next = new Set(previous);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    }, []);

    const handleExpandAll = React.useCallback(() => {
        setExpandedIds(new Set(filteredUsers.map((user) => user.id)));
    }, [filteredUsers]);

    const handleCollapseAll = React.useCallback(() => {
        setExpandedIds(new Set());
    }, []);

    const handleRowSave = React.useCallback<RowSaveHandler>(async (userId, payload) => {
        try {
            const updated = await updateUser(userId, payload);
            setUsers((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)));
            return updated;
        } catch (error) {
            throw error instanceof Error ? error : new Error('Unable to update user.');
        }
    }, []);

    return (
        <section className="mt-14 rounded-[16px] border border-slate-800 bg-slate-950/60 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)] md:p-10">
            {toast ? <ToastBanner toast={toast} onDismiss={() => setToast(null)} /> : null}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Team access</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">User management</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-300">
                        Invite teammates, assign the right level of access, and deactivate accounts when someone leaves the
                        studio. Permissions apply to both the dashboard and connected integrations.
                    </p>
                </div>
                {hasDirtyRows ? (
                    <span className="self-start rounded-full border border-[#4DE5FF]/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#4DE5FF]">
                        Unsaved changes
                    </span>
                ) : null}
            </div>
            {globalError ? (
                <div className="mt-6 rounded-[12px] border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                    {globalError}
                </div>
            ) : null}

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(260px,0.32fr)_minmax(0,1fr)]">
                <div className="rounded-[16px] border border-slate-800/80 bg-slate-950/40 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <h3 className="text-sm font-semibold text-slate-200">Invite a new teammate</h3>
                    <p className="mt-2 text-xs text-slate-400">
                        They&apos;ll receive an email with a verification link to finish setup.
                    </p>
                    <form className="mt-4 space-y-4" onSubmit={handleCreateSubmit}>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-name">
                                Name
                            </label>
                            <input
                                id="new-user-name"
                                type="text"
                                value={creation.name}
                                onChange={handleCreationFieldChange('name')}
                                className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                                placeholder="Avery Logan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-email">
                                Email
                            </label>
                            <input
                                id="new-user-email"
                                type="email"
                                required
                                value={creation.email}
                                onChange={handleCreationFieldChange('email')}
                                className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                                placeholder="teammate@studio.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300" htmlFor="new-user-role">
                                Role
                            </label>
                            <select
                                id="new-user-role"
                                value={creation.role}
                                onChange={handleCreationFieldChange('role')}
                                className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                            >
                                <option value="standard">Standard — calendars, contacts, integrations</option>
                                <option value="admin">Full admin — all settings and team management</option>
                                <option value="restricted">Restricted — limited access</option>
                            </select>
                        </div>
                        <fieldset className="space-y-2 rounded-[12px] border border-slate-800/80 bg-slate-900/60 p-4">
                            <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Permissions
                            </legend>
                            <PermissionToggle
                                id="create-can-manage-users"
                                label="Manage users"
                                description="Allow this teammate to invite, edit, or deactivate other accounts."
                                checked={creation.permissions.canManageUsers}
                                onChange={handleCreationPermissionToggle('canManageUsers')}
                                disabled={creation.role === 'admin'}
                            />
                            <PermissionToggle
                                id="create-can-edit-settings"
                                label="Edit workspace settings"
                                description="Access branding, billing, and integration settings."
                                checked={creation.permissions.canEditSettings}
                                onChange={handleCreationPermissionToggle('canEditSettings')}
                                disabled={creation.role === 'admin'}
                            />
                            <PermissionToggle
                                id="create-can-view-galleries"
                                label="View galleries"
                                description="Give access to client galleries and delivery history."
                                checked={creation.permissions.canViewGalleries}
                                onChange={handleCreationPermissionToggle('canViewGalleries')}
                            />
                            <PermissionToggle
                                id="create-can-manage-integrations"
                                label="Manage integrations"
                                description="Connect and disconnect integrations like Dropbox."
                                checked={creation.permissions.canManageIntegrations}
                                onChange={handleCreationPermissionToggle('canManageIntegrations')}
                                disabled={creation.role === 'restricted'}
                            />
                            <PermissionToggle
                                id="create-can-manage-calendar"
                                label="Manage shared calendar"
                                description="Create and edit calendar events across the studio."
                                checked={creation.permissions.canManageCalendar}
                                onChange={handleCreationPermissionToggle('canManageCalendar')}
                            />
                        </fieldset>
                        <ThemeSelectionCard
                            value={creation.theme.prefs}
                            useWorkspaceDefault={creation.theme.useWorkspaceDefault}
                            workspaceTheme={workspaceTheme}
                            onToggleWorkspaceDefault={handleThemeUseWorkspaceDefaultChange}
                            onChange={applyThemePartial}
                            disabled={submitting}
                        />
                        {creationError ? (
                            <div className="rounded-[12px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {creationError}
                            </div>
                        ) : null}
                        <button
                            type="submit"
                            className="w-full rounded-[12px] bg-[#4DE5FF] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={submitting}
                        >
                            {submitting ? 'Sending invite…' : 'Send invite'}
                        </button>
                    </form>
                </div>
                <div className="rounded-[16px] border border-slate-800/80 bg-slate-950/40 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-200">Team roster</h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Manage roles, permissions, and account status for every teammate.
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Showing {visibleCount} of {totalUsers} teammates
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="rounded-[12px] border border-slate-700 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-[#4DE5FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF] disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={handleExpandAll}
                                disabled={filteredUsers.length === 0}
                            >
                                Expand all
                            </button>
                            <button
                                type="button"
                                className="rounded-[12px] border border-slate-700 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-[#4DE5FF] hover:text-[#4DE5FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF] disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={handleCollapseAll}
                                disabled={filteredUsers.length === 0}
                            >
                                Collapse all
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end">
                        <div className="lg:flex-1">
                            <label className="block text-xs font-medium text-slate-300" htmlFor="roster-search">
                                Search roster
                            </label>
                            <input
                                id="roster-search"
                                type="search"
                                value={filters.query}
                                onChange={(event) =>
                                    setFilters((previous) => ({ ...previous, query: event.target.value }))
                                }
                                placeholder="Search by name or email"
                                className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:w-auto">
                            <div>
                                <label className="block text-xs font-medium text-slate-300" htmlFor="roster-role-filter">
                                    Role
                                </label>
                                <select
                                    id="roster-role-filter"
                                    value={filters.role}
                                    onChange={(event) =>
                                        setFilters((previous) => ({
                                            ...previous,
                                            role: event.target.value as RoleFilterValue,
                                        }))
                                    }
                                    className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                                >
                                    <option value="all">All roles</option>
                                    <option value="admin">Administrator</option>
                                    <option value="standard">Team member</option>
                                    <option value="restricted">Restricted access</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300" htmlFor="roster-status-filter">
                                    Status
                                </label>
                                <select
                                    id="roster-status-filter"
                                    value={filters.status}
                                    onChange={(event) =>
                                        setFilters((previous) => ({
                                            ...previous,
                                            status: event.target.value as StatusFilterValue,
                                        }))
                                    }
                                    className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {loading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={index}
                                        className="animate-pulse rounded-[12px] border border-slate-800/80 bg-slate-900/40 p-6"
                                    >
                                        <div className="h-4 w-1/3 rounded bg-slate-800/80" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="rounded-[12px] border border-dashed border-slate-800/80 bg-slate-950/40 p-10 text-center text-sm text-slate-400">
                                <p className="font-semibold text-slate-200">No teammates match your filters.</p>
                                <p className="mt-2">
                                    Invite someone new or adjust your filters to see more teammates.
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <UserAccordionRow
                                    key={user.id}
                                    user={user}
                                    currentUserId={currentUserId}
                                    expanded={expandedIds.has(user.id)}
                                    onToggle={handleToggleRow}
                                    onSave={handleRowSave}
                                    onDirtyChange={handleDirtyChange}
                                    onRequestToast={pushToast}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
type UserAccordionRowProps = {
    user: ManagedUserRecord;
    currentUserId: string | null;
    expanded: boolean;
    onToggle: (userId: string) => void;
    onSave: RowSaveHandler;
    onDirtyChange: DirtyChangeHandler;
    onRequestToast: ToastHandler;
};

type InlineMessage = {
    type: 'success' | 'error';
    text: string;
};

function UserAccordionRow({
    user,
    currentUserId,
    expanded,
    onToggle,
    onSave,
    onDirtyChange,
    onRequestToast,
}: UserAccordionRowProps) {
    const baseId = React.useId();
    const headerId = `${baseId}-header`;
    const regionId = `${baseId}-panel`;
    const activeLabelId = `${baseId}-active`;

    const [form, setForm] = React.useState<UserRowSnapshot>(() => buildRowSnapshot(user));
    const [baseline, setBaseline] = React.useState<UserRowSnapshot>(() => buildRowSnapshot(user));
    const [saving, setSaving] = React.useState(false);
    const [inlineMessage, setInlineMessage] = React.useState<InlineMessage | null>(null);

    React.useEffect(() => {
        const snapshot = buildRowSnapshot(user);
        setForm(snapshot);
        setBaseline(snapshot);
        setInlineMessage(null);
    }, [user]);

    const dirty = React.useMemo(() => hasSnapshotDiff(form, baseline), [form, baseline]);

    React.useEffect(() => {
        onDirtyChange(user.id, dirty);
    }, [dirty, onDirtyChange, user.id]);

    const displayName = user.name ?? user.email;
    const avatarUrl = typeof user.avatarUrl === 'string' ? user.avatarUrl.trim() : '';
    const statusLabel = form.active ? 'Active' : 'Inactive';

    const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextRole = event.target.value as UserRole;
        setForm((previous) => {
            let nextPermissions: UserPermissions;
            if (nextRole === 'restricted') {
                nextPermissions = { ...RESTRICTED_DEFAULT_PERMISSIONS };
            } else if (nextRole === 'admin') {
                nextPermissions = {
                    canManageUsers: true,
                    canEditSettings: true,
                    canViewGalleries: true,
                    canManageIntegrations: true,
                    canManageCalendar: true,
                };
            } else {
                nextPermissions = {
                    ...STANDARD_DEFAULT_PERMISSIONS,
                    canViewGalleries: previous.permissions.canViewGalleries,
                    canManageIntegrations: previous.permissions.canManageIntegrations,
                    canManageCalendar: previous.permissions.canManageCalendar,
                };
            }
            return { ...previous, role: nextRole, permissions: nextPermissions };
        });
    };

    const handlePermissionToggle = (key: keyof UserPermissions) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setForm((previous) => ({
            ...previous,
            permissions: { ...previous.permissions, [key]: checked },
        }));
    };

    const handleStatusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeStatus(event.target.value);
        setForm((previous) => ({ ...previous, status: sanitized }));
    };

    const handleActiveToggle = () => {
        if (currentUserId === user.id || saving) {
            return;
        }

        const nextValue = !form.active;
        if (!nextValue) {
            const confirmed = window.confirm(
                'Deactivate this account? They will immediately lose access until you reactivate them.',
            );
            if (!confirmed) {
                return;
            }
        }

        setForm((previous) => ({ ...previous, active: nextValue }));
    };

    const handleReset = () => {
        setForm({
            role: baseline.role,
            permissions: { ...baseline.permissions },
            status: baseline.status,
            active: baseline.active,
        });
        setInlineMessage(null);
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!dirty || saving) {
            return;
        }

        const payload: Record<string, unknown> = {};
        if (form.role !== baseline.role) {
            payload.role = form.role;
        }
        if (!permissionsEqual(form.permissions, baseline.permissions)) {
            payload.permissions = form.permissions;
        }
        if (form.status !== baseline.status) {
            payload.status = form.status;
        }
        if (form.active !== baseline.active) {
            payload.active = form.active;
        }

        if (Object.keys(payload).length === 0) {
            return;
        }

        setSaving(true);
        setInlineMessage(null);
        const previousBaseline = baseline;

        try {
            const updated = await onSave(user.id, payload);
            const snapshot = buildRowSnapshot(updated);
            setBaseline(snapshot);
            setForm(snapshot);
            setInlineMessage({ type: 'success', text: 'Changes saved.' });
            onRequestToast({ type: 'success', message: `Saved changes for ${displayName}.` });
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Unable to update user.';
            setForm({
                role: previousBaseline.role,
                permissions: { ...previousBaseline.permissions },
                status: previousBaseline.status,
                active: previousBaseline.active,
            });
            setInlineMessage({ type: 'error', text: message });
            onRequestToast({ type: 'error', message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-[12px] border border-slate-800/80 bg-slate-950/40">
            <button
                type="button"
                onClick={() => onToggle(user.id)}
                className="flex w-full items-center gap-4 rounded-[12px] px-4 py-4 text-left transition hover:bg-slate-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF]"
                aria-expanded={expanded}
                aria-controls={regionId}
                id={headerId}
            >
                <div className="flex flex-1 items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-slate-800">
                        {avatarUrl.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-200">
                                {getInitials(user.name, user.email)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-semibold text-white">
                            <span className="truncate">{displayName}</span>
                            {currentUserId === user.id ? (
                                <span className="flex-shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                    You
                                </span>
                            ) : null}
                            {dirty ? (
                                <span className="ml-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-[#4DE5FF]" aria-hidden="true" />
                            ) : null}
                        </p>
                        <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                </div>
                <div className="hidden flex-col items-end text-right text-xs text-slate-400 sm:flex">
                    <span className="rounded-full bg-slate-900/70 px-2 py-1 font-semibold text-slate-200">
                        {formatRole(form.role)}
                    </span>
                    <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-1 font-semibold ${
                            form.active ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'
                        }`}
                    >
                        {statusLabel}
                    </span>
                    <span className="mt-2 text-[10px] uppercase tracking-wide">
                        Updated {formatRelativeTime(user.updatedAt)}
                    </span>
                </div>
                <svg
                    className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                >
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {expanded ? (
                <div id={regionId} role="region" aria-labelledby={headerId} className="border-t border-slate-800/80 bg-slate-950/60">
                    <form className="space-y-4 px-4 py-4 sm:px-6 sm:py-6" onSubmit={handleSave}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-300" htmlFor={`${baseId}-role`}>
                                    Role
                                </label>
                                <select
                                    id={`${baseId}-role`}
                                    value={form.role}
                                    onChange={handleRoleChange}
                                    disabled={saving || currentUserId === user.id}
                                    className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="standard">Standard — calendars, contacts, integrations</option>
                                    <option value="admin">Full admin — all settings and team management</option>
                                    <option value="restricted">Restricted — limited access</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300" htmlFor={`${baseId}-status`}>
                                    Status label
                                </label>
                                <input
                                    id={`${baseId}-status`}
                                    type="text"
                                    value={form.status}
                                    onChange={handleStatusChange}
                                    disabled={saving}
                                    placeholder="Active, Onboarding, External"
                                    className="mt-1 w-full rounded-[12px] border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus-visible:border-[#4DE5FF] focus-visible:ring-2 focus-visible:ring-[#4DE5FF]/60 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <fieldset className="space-y-2 rounded-[12px] border border-slate-800/80 bg-slate-900/40 p-4">
                            <legend className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Permissions
                            </legend>
                            <PermissionToggle
                                id={`${baseId}-can-manage-users`}
                                label="Manage users"
                                description="Allow this teammate to invite, edit, or deactivate other accounts."
                                checked={form.permissions.canManageUsers}
                                onChange={handlePermissionToggle('canManageUsers')}
                                disabled={form.role === 'admin' || currentUserId === user.id || saving}
                            />
                            <PermissionToggle
                                id={`${baseId}-can-edit-settings`}
                                label="Edit workspace settings"
                                description="Access branding, billing, and integration settings."
                                checked={form.permissions.canEditSettings}
                                onChange={handlePermissionToggle('canEditSettings')}
                                disabled={form.role === 'admin' || saving}
                            />
                            <PermissionToggle
                                id={`${baseId}-can-view-galleries`}
                                label="View galleries"
                                description="Give access to client galleries and delivery history."
                                checked={form.permissions.canViewGalleries}
                                onChange={handlePermissionToggle('canViewGalleries')}
                                disabled={saving}
                            />
                            <PermissionToggle
                                id={`${baseId}-can-manage-integrations`}
                                label="Manage integrations"
                                description="Connect and disconnect integrations like Dropbox."
                                checked={form.permissions.canManageIntegrations}
                                onChange={handlePermissionToggle('canManageIntegrations')}
                                disabled={form.role === 'restricted' || saving}
                            />
                            <PermissionToggle
                                id={`${baseId}-can-manage-calendar`}
                                label="Manage shared calendar"
                                description="Create and edit calendar events across the studio."
                                checked={form.permissions.canManageCalendar}
                                onChange={handlePermissionToggle('canManageCalendar')}
                                disabled={saving}
                            />
                        </fieldset>
                        <div className="rounded-[12px] border border-slate-800/80 bg-slate-900/40 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p id={activeLabelId} className="text-sm font-semibold text-slate-200">
                                        Account status
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {form.active
                                            ? 'Active accounts can sign in immediately.'
                                            : 'Inactive teammates retain their data but cannot sign in.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300">{form.active ? 'Active' : 'Inactive'}</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={form.active}
                                        aria-labelledby={activeLabelId}
                                        onClick={handleActiveToggle}
                                        disabled={currentUserId === user.id || saving}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                            form.active ? 'bg-emerald-500' : 'bg-slate-700'
                                        } ${currentUserId === user.id || saving ? 'cursor-not-allowed opacity-50' : 'hover:bg-emerald-400/80'}`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 rounded-full bg-slate-950 transition-transform ${
                                                form.active ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {inlineMessage ? (
                            <div
                                className={`rounded-[12px] border px-4 py-3 text-sm ${
                                    inlineMessage.type === 'error'
                                        ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                }`}
                                role={inlineMessage.type === 'error' ? 'alert' : 'status'}
                            >
                                {inlineMessage.text}
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {dirty ? (
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4DE5FF]">
                                    Unsaved changes
                                </span>
                            ) : (
                                <span className="text-xs text-slate-500">All changes saved</span>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={!dirty || saving}
                                    className="text-sm font-semibold text-slate-400 underline-offset-4 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-[12px] bg-[#4DE5FF] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#86f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF] disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!dirty || saving}
                                >
                                    {saving ? (
                                        <>
                                            <span
                                                className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-900/40 border-t-slate-900"
                                                aria-hidden="true"
                                            />
                                            Saving…
                                        </>
                                    ) : (
                                        'Save changes'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
type PermissionToggleProps = {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
};

function PermissionToggle({ id, label, description, checked, onChange, disabled }: PermissionToggleProps) {
    return (
        <label
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-[12px] border border-transparent px-3 py-3 transition focus-within:border-[#4DE5FF] focus-within:ring-1 focus-within:ring-[#4DE5FF]/40 ${
                disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-slate-700'
            }`}
        >
            <input
                id={id}
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-950 text-[#4DE5FF] focus:ring-[#4DE5FF]"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />
            <span className="text-xs text-slate-300">
                <span className="block font-semibold text-slate-100">{label}</span>
                <span className="text-slate-400">{description}</span>
            </span>
        </label>
    );
}
type ToastBannerProps = {
    toast: Toast;
    onDismiss: () => void;
};

function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
    return (
        <div className="pointer-events-none fixed right-6 top-6 z-50 flex max-w-sm items-start gap-3 rounded-[12px] border border-slate-700 bg-slate-900/95 px-5 py-4 text-sm text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <span
                className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    toast.type === 'error'
                        ? 'bg-red-400'
                        : toast.type === 'success'
                          ? 'bg-emerald-400'
                          : 'bg-sky-400'
                }`}
                aria-hidden="true"
            />
            <div className="flex-1" role={toast.type === 'error' ? 'alert' : 'status'}>
                {toast.message}
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="pointer-events-auto rounded-full p-1 text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4DE5FF]"
                aria-label="Dismiss notification"
            >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}
function permissionsEqual(a: UserPermissions, b: UserPermissions): boolean {
    return (
        a.canManageUsers === b.canManageUsers &&
        a.canEditSettings === b.canEditSettings &&
        a.canViewGalleries === b.canViewGalleries &&
        a.canManageIntegrations === b.canManageIntegrations &&
        a.canManageCalendar === b.canManageCalendar
    );
}

function hasSnapshotDiff(a: UserRowSnapshot, b: UserRowSnapshot): boolean {
    return (
        a.role !== b.role ||
        a.status !== b.status ||
        a.active !== b.active ||
        !permissionsEqual(a.permissions, b.permissions)
    );
}


import * as React from 'react';
import classNames from 'classnames';

import type {
    ThemeAccent,
    ThemeBackgroundPalette,
    ThemeModeSetting,
    ThemeOutlineLevel,
} from '../../types/theme';
import {
    ACCENT_DEFINITIONS,
    DARK_BACKGROUND_TOKENS,
    LIGHT_BACKGROUND_TOKENS,
    THEME_ACCENT_OPTIONS,
    THEME_BACKGROUND_OPTIONS,
} from '../../utils/theme-constants';
import {
    resolveThemeMode,
    setUseWorkspaceDefault,
    updateUserTheme,
    useThemeStore,
} from '../../utils/theme-store';
import { CheckIcon, MoonIcon, SunIcon } from './icons';

type BackgroundSample = {
    id: ThemeBackgroundPalette;
    label: string;
};

type OutlineOption = {
    id: ThemeOutlineLevel;
    label: string;
    description: string;
};

const backgroundLabels: Record<ThemeBackgroundPalette, string> = {
    slate: 'Slate',
    zinc: 'Zinc',
    indigo: 'Indigo',
    emerald: 'Emerald',
    violet: 'Violet',
    amber: 'Amber',
    rose: 'Rose',
    'dark-gray': 'Dark Gray',
};

const outlineOptions: OutlineOption[] = [
    { id: 'low', label: 'Low', description: 'Subtle glow' },
    { id: 'medium', label: 'Medium', description: 'Balanced glow' },
    { id: 'high', label: 'High', description: 'Maximum glow' },
];

const accentOptions = THEME_ACCENT_OPTIONS.map((accent) => ({
    id: accent,
    label: ACCENT_DEFINITIONS[accent].label,
}));

const backgroundOptions: BackgroundSample[] = THEME_BACKGROUND_OPTIONS.map((id) => ({
    id,
    label: backgroundLabels[id],
}));

function BackgroundPaletteButton({
    palette,
    mode,
    isActive,
    disabled,
    onSelect,
}: {
    palette: ThemeBackgroundPalette;
    mode: 'light' | 'dark';
    isActive: boolean;
    disabled?: boolean;
    onSelect: (palette: ThemeBackgroundPalette) => void;
}) {
    const tokens = mode === 'dark' ? DARK_BACKGROUND_TOKENS[palette] : LIGHT_BACKGROUND_TOKENS[palette];
    return (
        <button
            type="button"
            className={classNames('crm-theme-background', { active: isActive })}
            onClick={() => onSelect(palette)}
            disabled={disabled}
            aria-pressed={isActive}
        >
            <span className="crm-theme-background-sample">
                <span style={{ backgroundColor: tokens.canvas }} />
                <span style={{ backgroundColor: tokens.surface }} />
                <span style={{ backgroundColor: tokens.elevated }} />
            </span>
            <span className="crm-theme-background-label">{backgroundLabels[palette]}</span>
        </button>
    );
}

function AccentButton({ accent, isActive, disabled, onSelect }: {
    accent: ThemeAccent;
    isActive: boolean;
    disabled?: boolean;
    onSelect: (accent: ThemeAccent) => void;
}) {
    const definition = ACCENT_DEFINITIONS[accent];
    return (
        <button
            type="button"
            className={classNames('crm-theme-accent', { active: isActive })}
            style={{
                backgroundColor: definition.hex,
                color: definition.contrast,
                boxShadow: isActive ? `0 0 0 3px ${definition.soft}` : undefined,
            }}
            onClick={() => onSelect(accent)}
            disabled={disabled}
            aria-pressed={isActive}
        >
            <span className="crm-theme-accent-label">{definition.label}</span>
            <span className="crm-theme-accent-check" aria-hidden>
                <CheckIcon className="icon" />
            </span>
        </button>
    );
}

function OutlineBrightnessControl({ enabled, level, disabled }: {
    enabled: boolean;
    level: ThemeOutlineLevel;
    disabled?: boolean;
}) {
    return (
        <div className="crm-theme-outline-levels" role="group" aria-label="Outline brightness">
            {outlineOptions.map((option) => {
                const isActive = level === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        className={classNames('crm-theme-outline-level', { active: isActive })}
                        onClick={() => updateUserTheme({ outline: { level: option.id } })}
                        disabled={!enabled || disabled}
                        aria-pressed={isActive}
                    >
                        <span className="crm-theme-outline-level-label">{option.label}</span>
                        <span className="crm-theme-outline-level-desc">{option.description}</span>
                    </button>
                );
            })}
        </div>
    );
}

function ThemePreview() {
    const { current } = useThemeStore((theme) => ({ current: theme.current }));
    const lightTokens = LIGHT_BACKGROUND_TOKENS[current.background.light];
    const darkTokens = DARK_BACKGROUND_TOKENS[current.background.dark];
    const outlineEnabled = current.outline.enabled;

    return (
        <div className="crm-theme-preview-grid">
            <div className="crm-theme-preview-card" data-mode="light">
                <div
                    className={classNames('crm-theme-preview-inner', {
                        'outline-on': outlineEnabled,
                    })}
                    style={{
                        backgroundColor: lightTokens.surface,
                        borderColor: lightTokens.border,
                    }}
                >
                    <span className="crm-theme-preview-title">Light canvas</span>
                    <span className="crm-theme-preview-text">Cards and dashboards match your light palette.</span>
                </div>
            </div>
            <div className="crm-theme-preview-card" data-mode="dark">
                <div
                    className={classNames('crm-theme-preview-inner', {
                        'outline-on': outlineEnabled,
                    })}
                    style={{
                        backgroundColor: darkTokens.surface,
                        borderColor: darkTokens.border,
                    }}
                >
                    <span className="crm-theme-preview-title">Dark canvas</span>
                    <span className="crm-theme-preview-text">Dark mode surfaces inherit your selections.</span>
                </div>
            </div>
        </div>
    );
}

export function ThemeMenu() {
    const { ready, current, workspace, source } = useThemeStore((theme) => ({
        ready: theme.ready,
        current: theme.current,
        workspace: theme.workspace,
        source: theme.source,
    }));

    const resolvedMode = React.useMemo(() => resolveThemeMode(current), [current]);
    const isWorkspaceDefault = source === 'workspace';

    const handleToggleWorkspaceDefault = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setUseWorkspaceDefault(event.target.checked);
        },
        [],
    );

    const handleSelectMode = React.useCallback((mode: ThemeModeSetting) => {
        updateUserTheme({ mode });
    }, []);

    const handleSelectAccent = React.useCallback((accent: ThemeAccent) => {
        updateUserTheme({ accent });
    }, []);

    const handleSelectBackground = React.useCallback((key: 'light' | 'dark', palette: ThemeBackgroundPalette) => {
        updateUserTheme({ background: { [key]: palette } });
    }, []);

    const handleToggleOutline = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            updateUserTheme({ outline: { enabled: event.target.checked } });
        },
        [],
    );

    return (
        <div className="card crm-theme-menu">
            <div className="card-header crm-theme-menu-header">
                <div>
                    <h4 className="card-title mb-1">Theme settings</h4>
                    <p className="text-secondary mb-0">Personalize your workspace without affecting other members.</p>
                </div>
                <div className="form-check form-switch">
                    <input
                        id="use-workspace-default"
                        type="checkbox"
                        className="form-check-input"
                        role="switch"
                        checked={isWorkspaceDefault}
                        onChange={handleToggleWorkspaceDefault}
                        disabled={!ready}
                    />
                    <label className="form-check-label" htmlFor="use-workspace-default">
                        Use workspace default
                    </label>
                </div>
            </div>
            <div className="card-body crm-theme-menu-body">
                <div className="crm-theme-section">
                    <div className="crm-theme-section-heading">Mode</div>
                    <div className="crm-theme-mode-buttons" role="group" aria-label="Color mode">
                        <button
                            type="button"
                            className={classNames('crm-theme-mode-button', { active: current.mode === 'system' })}
                            onClick={() => handleSelectMode('system')}
                            disabled={!ready}
                            aria-pressed={current.mode === 'system'}
                        >
                            <span className="crm-theme-mode-icon" aria-hidden>
                                {resolvedMode === 'dark' ? <MoonIcon className="icon" /> : <SunIcon className="icon" />}
                            </span>
                            System
                        </button>
                        <button
                            type="button"
                            className={classNames('crm-theme-mode-button', { active: current.mode === 'light' })}
                            onClick={() => handleSelectMode('light')}
                            disabled={!ready}
                            aria-pressed={current.mode === 'light'}
                        >
                            <SunIcon className="icon" aria-hidden /> Light
                        </button>
                        <button
                            type="button"
                            className={classNames('crm-theme-mode-button', { active: current.mode === 'dark' })}
                            onClick={() => handleSelectMode('dark')}
                            disabled={!ready}
                            aria-pressed={current.mode === 'dark'}
                        >
                            <MoonIcon className="icon" aria-hidden /> Dark
                        </button>
                    </div>
                </div>

                <div className="crm-theme-section">
                    <div className="crm-theme-section-heading">Accent</div>
                    <div className="crm-theme-accent-grid">
                        {accentOptions.map((option) => (
                            <AccentButton
                                key={option.id}
                                accent={option.id as ThemeAccent}
                                isActive={current.accent === option.id}
                                disabled={!ready}
                                onSelect={handleSelectAccent}
                            />
                        ))}
                    </div>
                </div>

                <div className="crm-theme-section">
                    <div className="crm-theme-section-heading">Backgrounds</div>
                    <div className="crm-theme-background-groups">
                        <div>
                            <div className="crm-theme-background-title">Light mode</div>
                            <div className="crm-theme-background-grid">
                                {backgroundOptions.map((option) => (
                                    <BackgroundPaletteButton
                                        key={`light-${option.id}`}
                                        mode="light"
                                        palette={option.id}
                                        isActive={current.background.light === option.id}
                                        disabled={!ready}
                                        onSelect={(palette) => handleSelectBackground('light', palette)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="crm-theme-background-title">Dark mode</div>
                            <div className="crm-theme-background-grid">
                                {backgroundOptions.map((option) => (
                                    <BackgroundPaletteButton
                                        key={`dark-${option.id}`}
                                        mode="dark"
                                        palette={option.id}
                                        isActive={current.background.dark === option.id}
                                        disabled={!ready}
                                        onSelect={(palette) => handleSelectBackground('dark', palette)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="crm-theme-section">
                    <div className="crm-theme-section-heading">Outline glow</div>
                    <div className="crm-theme-outline-row">
                        <div className="form-check form-switch">
                            <input
                                id="toggle-outline"
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                checked={current.outline.enabled}
                                onChange={handleToggleOutline}
                                disabled={!ready}
                            />
                            <label className="form-check-label" htmlFor="toggle-outline">
                                Enable outline mode
                            </label>
                        </div>
                        <OutlineBrightnessControl
                            enabled={current.outline.enabled}
                            level={current.outline.level}
                            disabled={!ready}
                        />
                    </div>
                </div>

                <div className="crm-theme-section">
                    <div className="crm-theme-section-heading">Preview</div>
                    <ThemePreview />
                </div>

                <div className="crm-theme-footer">
                    <div>
                        <div className="crm-theme-footer-title">Active selection</div>
                        <div className="crm-theme-footer-details">
                            <span>Mode: {current.mode === 'system' ? `System (${resolvedMode})` : current.mode}</span>
                            <span>Accent: {ACCENT_DEFINITIONS[current.accent].label}</span>
                            <span>Outline: {current.outline.enabled ? current.outline.level : 'Off'}</span>
                        </div>
                    </div>
                    <span
                        className={classNames('badge text-uppercase fw-semibold', {
                            'bg-success-lt text-success': source === 'user',
                            'bg-primary-lt text-primary': source === 'workspace',
                        })}
                    >
                        {source === 'user' ? 'Custom' : 'Workspace default'}
                    </span>
                </div>
                <div className="crm-theme-note text-secondary">
                    Workspace defaults currently set to {ACCENT_DEFINITIONS[workspace.accent].label.toLowerCase()} accent with
                    {` ${backgroundLabels[workspace.background.light].toLowerCase()} / ${backgroundLabels[workspace.background.dark].toLowerCase()} backgrounds.`}
                </div>
            </div>
        </div>
    );
}

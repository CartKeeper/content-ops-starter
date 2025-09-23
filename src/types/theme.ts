export type ThemeModeSetting = 'system' | 'light' | 'dark';

export type ThemeAccent = 'indigo' | 'slate' | 'emerald' | 'violet' | 'amber' | 'rose' | 'zinc';

export type ThemeBackgroundPalette =
    | 'slate'
    | 'zinc'
    | 'indigo'
    | 'emerald'
    | 'violet'
    | 'amber'
    | 'rose'
    | 'dark-gray';

export type ThemeOutlineLevel = 'low' | 'medium' | 'high';

export type ThemeOutlineSettings = {
    enabled: boolean;
    level: ThemeOutlineLevel;
};

export type ThemeBackgroundSettings = {
    light: ThemeBackgroundPalette;
    dark: ThemeBackgroundPalette;
};

export type ThemePreferences = {
    mode: ThemeModeSetting;
    accent: ThemeAccent;
    background: ThemeBackgroundSettings;
    outline: ThemeOutlineSettings;
};

export type ThemeSource = 'workspace' | 'user';

export type ThemePayload = {
    theme: ThemePreferences;
    workspaceTheme: ThemePreferences;
    userOverrides: ThemePreferences | null;
    source: ThemeSource;
};

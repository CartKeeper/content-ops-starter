export const SETTINGS_SECTIONS = [
    'general',
    'team',
    'billing',
    'integrations',
    'notifications',
    'security',
    'api'
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export type SettingsTab = {
    id: SettingsSection;
    href: string;
    label: string;
};

export const SETTINGS_TABS: SettingsTab[] = [
    { id: 'general', href: '/settings/general', label: 'General' },
    { id: 'team', href: '/settings/team', label: 'Team' },
    { id: 'billing', href: '/settings/billing', label: 'Billing' },
    { id: 'integrations', href: '/settings/integrations', label: 'Integrations' },
    { id: 'notifications', href: '/settings/notifications', label: 'Notifications' },
    { id: 'security', href: '/settings/security', label: 'Security' },
    { id: 'api', href: '/settings/api', label: 'API' }
];

export function isValidSettingsSection(value: string | null | undefined): value is SettingsSection {
    if (!value) {
        return false;
    }
    return SETTINGS_SECTIONS.includes(value as SettingsSection);
}

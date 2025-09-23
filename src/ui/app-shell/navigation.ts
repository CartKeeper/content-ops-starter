import type { IconKey } from '../icons';

export type SecondaryNavItem = {
    key: string;
    label: string;
    href: string;
    icon?: IconKey;
    badge?: string;
};

export type PrimaryNavItem = {
    key: string;
    label: string;
    href: string;
    icon: IconKey;
    badge?: string;
    children?: SecondaryNavItem[];
};

export const APP_NAVIGATION: PrimaryNavItem[] = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'home',
        children: [
            { key: 'overview', label: 'Overview', href: '/dashboard', icon: 'stats' },
            { key: 'studio-calendar', label: 'Studio calendar', href: '/studio/calendars', icon: 'calendar' },
            { key: 'quick-actions', label: 'Quick actions', href: '/bookings', icon: 'tasks' }
        ]
    },
    {
        key: 'contacts',
        label: 'Contacts',
        href: '/contacts',
        icon: 'users',
        children: [
            { key: 'contacts-index', label: 'Directory', href: '/contacts', icon: 'list' },
            { key: 'contacts-segments', label: 'Segments', href: '/contacts/segments', icon: 'chip' }
        ]
    },
    {
        key: 'clients',
        label: 'Clients',
        href: '/clients',
        icon: 'clients',
        children: [
            { key: 'clients-index', label: 'Accounts', href: '/clients', icon: 'users' },
            { key: 'clients-invoices', label: 'Invoices', href: '/invoices', icon: 'invoices' }
        ]
    },
    {
        key: 'galleries',
        label: 'Galleries',
        href: '/galleries',
        icon: 'photo',
        children: [
            { key: 'galleries-overview', label: 'Overview', href: '/galleries', icon: 'photo' },
            { key: 'galleries-portal', label: 'Portal', href: '/gallery-portal', icon: 'sparkles' }
        ]
    },
    {
        key: 'projects',
        label: 'Projects',
        href: '/projects',
        icon: 'projects',
        children: [
            { key: 'projects-overview', label: 'Active projects', href: '/projects', icon: 'projects' },
            { key: 'projects-tasks', label: 'Tasks', href: '/projects/tasks', icon: 'tasks' }
        ]
    },
    {
        key: 'accounts-payable',
        label: 'Accounts payable',
        href: '/accounts-payable',
        icon: 'invoices',
        children: [
            { key: 'accounts-index', label: 'Payables', href: '/accounts-payable', icon: 'dollar' },
            { key: 'accounts-expenses', label: 'Expenses', href: '/accounts-payable/expenses', icon: 'list' }
        ]
    },
    {
        key: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: 'settings',
        children: [
            { key: 'settings-profile', label: 'Profile', href: '/settings', icon: 'user' },
            { key: 'settings-integrations', label: 'Integrations', href: '/settings/integrations', icon: 'integrations' }
        ]
    }
];

export function matchPath(currentPath: string, target: string): boolean {
    if (!currentPath) {
        return false;
    }

    if (currentPath === target) {
        return true;
    }

    if (target === '/' && (currentPath === '/' || currentPath === '/dashboard' || currentPath === '/crm')) {
        return true;
    }

    return currentPath.startsWith(target) && target !== '/';
}

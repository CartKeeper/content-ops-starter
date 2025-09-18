import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { adminUser } from '../../data/crm';
import { useThemeMode } from '../../utils/use-theme-mode';
import { ApertureMark } from './ApertureMark';
import {
    AddressBookIcon,
    AppsIcon,
    BellIcon,
    CalendarIcon,
    CheckIcon,
    ChevronDownIcon,
    FolderIcon,
    MoonIcon,
    PhotoIcon,
    ReceiptIcon,
    SettingsIcon,
    SparklesIcon,
    SunIcon,
    UsersIcon
} from './icons';

type WorkspaceLayoutProps = {
    children: React.ReactNode;
};

type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type AccentOption = {
    id: string;
    label: string;
    swatch: string;
    soft: string;
    contrast?: string;
};

type QuickAccessApp = {
    id: string;
    name: string;
    href: string;
    initials: string;
    description: string;
    color: string;
    textColor?: string;
};

type AppCollection = {
    id: string;
    label: string;
    apps: QuickAccessApp[];
};

type NotificationTone = 'success' | 'warning' | 'info';

type NotificationItem = {
    id: string;
    title: string;
    description: string;
    time: string;
    tone: NotificationTone;
};

const navItems: NavItem[] = [
    { href: '/crm', label: 'Home', icon: SparklesIcon },
    { href: '/bookings', label: 'Calendar', icon: CalendarIcon },
    { href: '/contacts', label: 'Contacts', icon: AddressBookIcon },
    { href: '/clients', label: 'Clients', icon: UsersIcon },
    { href: '/galleries', label: 'Galleries', icon: PhotoIcon },
    { href: '/projects', label: 'Projects', icon: FolderIcon },
    { href: '/accounts-payable', label: 'Accounts Payable', icon: ReceiptIcon },
    { href: '/settings', label: 'Settings', icon: SettingsIcon }
];

const ACCENT_STORAGE_KEY = 'crm-accent-preference';
const DEFAULT_ACCENT_ID = 'indigo';

const accentOptions: AccentOption[] = [
    { id: 'slate', label: 'Slate', swatch: '#475569', soft: 'rgba(71, 85, 105, 0.18)' },
    { id: 'indigo', label: 'Indigo', swatch: '#6366f1', soft: 'rgba(99, 102, 241, 0.22)' },
    { id: 'violet', label: 'Violet', swatch: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.22)' },
    { id: 'emerald', label: 'Emerald', swatch: '#10b981', soft: 'rgba(16, 185, 129, 0.2)' },
    { id: 'amber', label: 'Amber', swatch: '#f59e0b', soft: 'rgba(245, 158, 11, 0.25)', contrast: '#111827' },
    { id: 'rose', label: 'Rose', swatch: '#f43f5e', soft: 'rgba(244, 63, 94, 0.2)' }
];

const appCollections: AppCollection[] = [
    {
        id: 'google',
        label: 'Google Workspace',
        apps: [
            {
                id: 'analytics',
                name: 'Google Analytics',
                initials: 'GA',
                description: 'Monitor marketing funnels and site traffic.',
                href: 'https://analytics.google.com',
                color: '#6366f1'
            },
            {
                id: 'drive',
                name: 'Google Drive',
                initials: 'GD',
                description: 'Browse shared folders and deliverables.',
                href: 'https://drive.google.com',
                color: '#10b981'
            },
            {
                id: 'meet',
                name: 'Google Meet',
                initials: 'GM',
                description: 'Launch virtual consultations and reviews.',
                href: 'https://meet.google.com',
                color: '#f59e0b',
                textColor: '#111827'
            },
            {
                id: 'photos',
                name: 'Google Photos',
                initials: 'GP',
                description: 'Reference archived shoots and mood boards.',
                href: 'https://photos.google.com',
                color: '#ec4899'
            }
        ]
    },
    {
        id: 'social',
        label: 'Social Launchpad',
        apps: [
            {
                id: 'instagram',
                name: 'Instagram',
                initials: 'IG',
                description: 'Share teasers and behind-the-scenes reels.',
                href: 'https://www.instagram.com',
                color: '#f472b6'
            },
            {
                id: 'facebook',
                name: 'Facebook',
                initials: 'FB',
                description: 'Connect with leads and publish announcements.',
                href: 'https://www.facebook.com',
                color: '#3b82f6'
            },
            {
                id: 'pinterest',
                name: 'Pinterest',
                initials: 'PN',
                description: 'Curate inspiration boards for upcoming shoots.',
                href: 'https://www.pinterest.com',
                color: '#ef4444'
            },
            {
                id: 'tiktok',
                name: 'TikTok',
                initials: 'TT',
                description: 'Publish highlight reels and client testimonials.',
                href: 'https://www.tiktok.com',
                color: '#0ea5e9'
            }
        ]
    }
];

const notifications: NotificationItem[] = [
    {
        id: 'notif-1',
        title: 'Payment received',
        description: 'Invoice 032 was paid by Evergreen Architects.',
        time: '5 minutes ago',
        tone: 'success'
    },
    {
        id: 'notif-2',
        title: 'Gallery ready for review',
        description: 'Fern & Pine Studio uploaded final selects.',
        time: '32 minutes ago',
        tone: 'info'
    },
    {
        id: 'notif-3',
        title: 'Signature requested',
        description: 'Contract for Atlas Fitness renewal is waiting.',
        time: '2 hours ago',
        tone: 'warning'
    }
];

const notificationToneBadge: Record<NotificationTone, string> = {
    success: 'bg-success-lt text-success',
    info: 'bg-primary-lt text-primary',
    warning: 'bg-warning-lt text-warning'
};

function matchPath(currentPath: string, target: string) {
    if (currentPath === target) {
        return true;
    }
    if (target === '/crm' && currentPath === '/') {
        return true;
    }
    return currentPath.startsWith(target) && target !== '/';
}

function useDropdown<T extends HTMLElement>() {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<T | null>(null);

    const close = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggle = React.useCallback(() => {
        setIsOpen((previous) => !previous);
    }, []);

    React.useEffect(() => {
        function handlePointer(event: MouseEvent | TouchEvent) {
            if (!containerRef.current) {
                return;
            }
            if (containerRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        }

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('touchstart', handlePointer);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
        };
    }, []);

    return { isOpen, close, toggle, containerRef } as const;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();
    const { theme, setTheme, toggleTheme } = useThemeMode();
    const [isNavOpen, setIsNavOpen] = React.useState(false);

    const {
        isOpen: isAppsOpen,
        close: closeApps,
        toggle: toggleApps,
        containerRef: appsDropdownRef
    } = useDropdown<HTMLDivElement>();
    const {
        isOpen: isThemeMenuOpen,
        close: closeThemeMenu,
        toggle: toggleThemeMenu,
        containerRef: themeDropdownRef
    } = useDropdown<HTMLDivElement>();
    const {
        isOpen: isNotificationsOpen,
        close: closeNotifications,
        toggle: toggleNotifications,
        containerRef: notificationsDropdownRef
    } = useDropdown<HTMLDivElement>();
    const {
        isOpen: isProfileOpen,
        close: closeProfile,
        toggle: toggleProfile,
        containerRef: profileDropdownRef
    } = useDropdown<HTMLDivElement>();

    const [accent, setAccent] = React.useState<string>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_ACCENT_ID;
        }
        try {
            const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
            if (stored && accentOptions.some((option) => option.id === stored)) {
                return stored;
            }
        } catch (error) {
            console.warn('Unable to read stored accent preference', error);
        }
        return DEFAULT_ACCENT_ID;
    });

    const activeItem = React.useMemo(() => {
        const path = router.pathname;
        return navItems.find((item) => matchPath(path, item.href)) ?? null;
    }, [router.pathname]);

    React.useEffect(() => {
        setIsNavOpen(false);
        closeApps();
        closeThemeMenu();
        closeNotifications();
        closeProfile();
    }, [router.asPath, closeApps, closeThemeMenu, closeNotifications, closeProfile]);

    React.useEffect(() => {
        function handleKeydown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsNavOpen(false);
                closeApps();
                closeThemeMenu();
                closeNotifications();
                closeProfile();
            }
        }

        document.addEventListener('keydown', handleKeydown);
        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [closeApps, closeThemeMenu, closeNotifications, closeProfile]);

    React.useEffect(() => {
        const selectedAccent = accentOptions.find((option) => option.id === accent) ?? accentOptions[0];

        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.style.setProperty('--crm-accent', selectedAccent.swatch);
            root.style.setProperty('--crm-accent-soft', selectedAccent.soft);
            root.style.setProperty('--crm-accent-contrast', selectedAccent.contrast ?? '#ffffff');

            const body = document.body;
            if (body) {
                body.dataset.crmAccent = selectedAccent.id;
            }
        }

        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
            }
        } catch (error) {
            console.warn('Unable to persist accent preference', error);
        }
    }, [accent]);

    const activeAccent = accentOptions.find((option) => option.id === accent) ?? accentOptions[0];

    const handleSelectAccent = React.useCallback((nextAccent: string) => {
        setAccent(nextAccent);
    }, []);

    const headingLabel = activeItem ? activeItem.label : 'Workspace';

    return (
        <div className={classNames('page', theme === 'dark' ? 'theme-dark' : 'theme-light')}>
            <header className="navbar navbar-expand-md shadow-sm border-bottom crm-top-nav" data-bs-theme={theme}>
                <div className="container-xl">
                    <Link href="/crm" className="navbar-brand d-flex align-items-center gap-2">
                        <span className="avatar avatar-sm bg-primary-lt text-primary">
                            <ApertureMark className="icon" aria-hidden />
                        </span>
                        <span className="crm-brand-name">
                            <span className="crm-brand-accent">APERTURE</span>{' '}
                            <span className="text-secondary">Studio CRM</span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        className="navbar-toggler"
                        aria-label="Toggle navigation"
                        aria-expanded={isNavOpen}
                        onClick={() => setIsNavOpen((previous) => !previous)}
                    >
                        <span className="navbar-toggler-icon" />
                    </button>
                    <div className={classNames('collapse navbar-collapse', { show: isNavOpen })}>
                        <ul className="navbar-nav">
                            {navItems.map((item) => {
                                const isActive = matchPath(router.pathname, item.href);
                                return (
                                    <li key={item.href} className="nav-item">
                                        <Link
                                            href={item.href}
                                            className={classNames('nav-link', { active: isActive })}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            <span className="nav-link-icon d-md-none d-lg-inline-block">
                                                <item.icon className="icon" aria-hidden />
                                            </span>
                                            <span className="nav-link-title">{item.label}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <form className="navbar-search ms-md-4 mt-3 mt-md-0" role="search">
                            <div className="input-icon">
                                <span className="input-icon-addon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="icon"
                                        aria-hidden
                                    >
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m20 20-2.6-2.6" />
                                    </svg>
                                </span>
                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Search clients, projects, invoices"
                                    aria-label="Search workspace"
                                />
                            </div>
                        </form>
                    </div>
                    <div className="navbar-nav flex-row order-md-last align-items-center gap-2 ms-3">
                        <div
                            className={classNames('nav-item dropdown', { show: isAppsOpen })}
                            ref={appsDropdownRef}
                        >
                            <button
                                type="button"
                                className="btn btn-icon"
                                aria-label="Open quick launch"
                                aria-expanded={isAppsOpen}
                                onClick={toggleApps}
                            >
                                <AppsIcon className="icon" aria-hidden />
                            </button>
                            <div
                                className={classNames(
                                    'dropdown-menu dropdown-menu-end dropdown-menu-card dropdown-menu-xl',
                                    { show: isAppsOpen }
                                )}
                            >
                                <div className="card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <h4 className="card-title mb-0">Quick launch</h4>
                                        <span className="text-secondary">Stay connected</span>
                                    </div>
                                    <div className="card-body">
                                        {appCollections.map((collection, index) => (
                                            <div
                                                key={collection.id}
                                                className={classNames('mb-4', { 'mb-0': index === appCollections.length - 1 })}
                                            >
                                                <div className="crm-dropdown-label">{collection.label}</div>
                                                <div className="crm-app-grid">
                                                    {collection.apps.map((app) => (
                                                        <a
                                                            key={app.id}
                                                            href={app.href}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="crm-app-tile"
                                                        >
                                                            <span
                                                                className="crm-app-icon"
                                                                style={{
                                                                    backgroundColor: app.color,
                                                                    color: app.textColor ?? '#ffffff'
                                                                }}
                                                                aria-hidden
                                                            >
                                                                {app.initials}
                                                            </span>
                                                            <span className="crm-app-label">{app.name}</span>
                                                            <span className="crm-app-description">{app.description}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className={classNames('nav-item dropdown', { show: isNotificationsOpen })}
                            ref={notificationsDropdownRef}
                        >
                            <button
                                type="button"
                                className="btn btn-icon position-relative"
                                aria-label="View notifications"
                                aria-expanded={isNotificationsOpen}
                                onClick={toggleNotifications}
                            >
                                <BellIcon className="icon" aria-hidden />
                                <span className="crm-notification-indicator" aria-hidden />
                            </button>
                            <div
                                className={classNames(
                                    'dropdown-menu dropdown-menu-end dropdown-menu-card dropdown-menu-md',
                                    { show: isNotificationsOpen }
                                )}
                            >
                                <div className="card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <h4 className="card-title mb-0">Notifications</h4>
                                        <button type="button" className="btn btn-link p-0" onClick={closeNotifications}>
                                            Mark all as read
                                        </button>
                                    </div>
                                    <div className="list-group list-group-flush">
                                        {notifications.map((item) => (
                                            <div key={item.id} className="list-group-item">
                                                <div className="d-flex align-items-start gap-3">
                                                    <span className={classNames('badge rounded-pill', notificationToneBadge[item.tone])}>
                                                        {item.tone === 'success' && 'Success'}
                                                        {item.tone === 'info' && 'Update'}
                                                        {item.tone === 'warning' && 'Action'}
                                                    </span>
                                                    <div>
                                                        <div className="fw-semibold">{item.title}</div>
                                                        <div className="text-secondary">{item.description}</div>
                                                        <div className="text-secondary small mt-1">{item.time}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <div className="page-wrapper" data-bs-theme={theme}>
                <section className="crm-page-header">
                    <div className="container-xl">
                        <div className="crm-page-heading">
                            <div className="crm-page-heading-text">
                                <span className="crm-page-pretitle">{headingLabel}</span>
                                <h1 className="crm-page-title">Command center</h1>
                            </div>
                            <div className="crm-page-heading-actions">
                                <div className="crm-page-action-row">
                                    <Link
                                        href="/bookings"
                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                    >
                                        <CalendarIcon className="icon" aria-hidden />
                                        New booking
                                    </Link>
                                    <div
                                        className={classNames('dropdown crm-action-dropdown', { show: isThemeMenuOpen })}
                                        ref={themeDropdownRef}
                                    >
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                                            onClick={toggleThemeMenu}
                                            aria-expanded={isThemeMenuOpen}
                                        >
                                            <SparklesIcon className="icon" aria-hidden />
                                            Theme Settings
                                            <span className="badge bg-green-lt text-green fw-semibold text-uppercase">New</span>
                                        </button>
                                        <div
                                            className={classNames(
                                                'dropdown-menu dropdown-menu-end dropdown-menu-card dropdown-menu-lg',
                                                { show: isThemeMenuOpen }
                                            )}
                                        >
                                            <div className="card crm-theme-menu">
                                                <div className="card-header">
                                                    <h4 className="card-title mb-0">Theme settings</h4>
                                                    <div className="text-secondary">Fine-tune your control center.</div>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-4">
                                                        <div className="crm-dropdown-label">Color mode</div>
                                                        <div className="btn-list">
                                                            <button
                                                                type="button"
                                                                className={classNames('btn', {
                                                                    'btn-primary': theme === 'light',
                                                                    'btn-outline-secondary': theme !== 'light'
                                                                })}
                                                                onClick={() => setTheme('light')}
                                                            >
                                                                <SunIcon className="icon" aria-hidden /> Light
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={classNames('btn', {
                                                                    'btn-primary': theme === 'dark',
                                                                    'btn-outline-secondary': theme !== 'dark'
                                                                })}
                                                                onClick={() => setTheme('dark')}
                                                            >
                                                                <MoonIcon className="icon" aria-hidden /> Dark
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={toggleTheme}
                                                            >
                                                                Auto toggle
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="mb-4">
                                                        <div className="crm-dropdown-label">Accent color</div>
                                                        <div className="row g-2">
                                                            {accentOptions.map((option) => {
                                                                const isActive = option.id === accent;
                                                                return (
                                                                    <div className="col-4" key={option.id}>
                                                                        <button
                                                                            type="button"
                                                                            className={classNames('crm-color-choice w-100', {
                                                                                active: isActive
                                                                            })}
                                                                            style={{
                                                                                backgroundColor: option.swatch,
                                                                                boxShadow: isActive
                                                                                    ? `0 0 0 4px ${option.soft}`
                                                                                    : undefined,
                                                                                color: option.contrast ?? '#ffffff'
                                                                            }}
                                                                            onClick={() => handleSelectAccent(option.id)}
                                                                            aria-pressed={isActive}
                                                                        >
                                                                            <span className="crm-color-check" aria-hidden>
                                                                                <CheckIcon className="icon" />
                                                                            </span>
                                                                            <span className="crm-color-label">{option.label}</span>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="crm-dropdown-label">Current selection</div>
                                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                                            <div>
                                                                <div className="fw-semibold">
                                                                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                                                                </div>
                                                                <div className="text-secondary">Accent: {activeAccent.label}</div>
                                                            </div>
                                                            <span
                                                                className="badge text-uppercase fw-semibold"
                                                                style={{
                                                                    backgroundColor: activeAccent.soft,
                                                                    color: activeAccent.swatch
                                                                }}
                                                            >
                                                                Saved
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className={classNames('dropdown crm-action-dropdown', { show: isProfileOpen })}
                                        ref={profileDropdownRef}
                                    >
                                        <button
                                            type="button"
                                            className="btn d-flex align-items-center gap-2"
                                            aria-expanded={isProfileOpen}
                                            onClick={toggleProfile}
                                        >
                                            <span className="crm-avatar-wrapper">
                                                <span
                                                    className="avatar avatar-sm"
                                                    style={{ backgroundImage: `url(${adminUser.avatar})` }}
                                                />
                                                {adminUser.status ? <span className="crm-avatar-status" aria-hidden /> : null}
                                            </span>
                                            <span className="d-flex flex-column align-items-start">
                                                <span className="fw-semibold">{adminUser.name}</span>
                                                <span className="text-secondary small">{adminUser.role}</span>
                                            </span>
                                            <ChevronDownIcon className="icon" aria-hidden />
                                        </button>
                                        <div
                                            className={classNames(
                                                'dropdown-menu dropdown-menu-end dropdown-menu-arrow dropdown-menu-card dropdown-menu-md',
                                                { show: isProfileOpen }
                                            )}
                                        >
                                            <div className="card">
                                                <div className="card-body">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <span
                                                            className="avatar avatar-lg"
                                                            style={{ backgroundImage: `url(${adminUser.avatar})` }}
                                                        />
                                                        <div>
                                                            <div className="fw-semibold">{adminUser.name}</div>
                                                            <div className="text-secondary">{adminUser.email}</div>
                                                            {adminUser.status ? (
                                                                <span className="badge bg-success-lt text-success mt-2">
                                                                    {adminUser.status}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 d-grid gap-2">
                                                        <Link href="/settings" className="btn btn-outline-secondary">
                                                            Manage profile
                                                        </Link>
                                                        <Link href="/" className="btn btn-outline-secondary">
                                                            View public site
                                                        </Link>
                                                        <button type="button" className="btn btn-primary">
                                                            Sign out
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="crm-page-action-row">
                                    <div className="crm-status-pill">
                                        <span className="crm-dot" aria-hidden />
                                        {adminUser.status ?? 'Operational'}
                                    </div>
                                    <Link
                                        href="/bookings"
                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                    >
                                        <CalendarIcon className="icon" aria-hidden />
                                        Quick schedule
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <main className="page-body">
                    <div className="container-xl">{children}</div>
                </main>
            </div>
        </div>
    );
}

export default WorkspaceLayout;

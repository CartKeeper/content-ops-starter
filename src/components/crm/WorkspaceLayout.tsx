import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { IconType } from 'react-icons';
import {
    SiGoogleanalytics,
    SiGoogledrive,
    SiGooglemeet,
    SiGooglephotos,
    SiTiktok
} from 'react-icons/si';
import { FaFacebookF, FaInstagram, FaPinterestP } from 'react-icons/fa6';

import { adminUser } from '../../data/crm';
import { useThemeMode } from '../../utils/use-theme-mode';
import { ApertureMark } from './ApertureMark';
import {
    AddressBookIcon,
    AppsIcon,
    BellIcon,
    CalendarIcon,
    CheckIcon,
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

type RgbTuple = [number, number, number];

function hexToRgbTuple(hex: string): RgbTuple | null {
    const value = hex.replace('#', '').trim();
    if (value.length !== 3 && value.length !== 6) {
        return null;
    }

    const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;

    const numeric = Number.parseInt(normalized, 16);
    if (Number.isNaN(numeric)) {
        return null;
    }

    return [
        (numeric >> 16) & 255,
        (numeric >> 8) & 255,
        numeric & 255
    ];
}

function rgbTupleToHex([r, g, b]: RgbTuple) {
    const toHex = (value: number) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixRgb(color: RgbTuple, target: RgbTuple, amount: number): RgbTuple {
    const clamp = (value: number) => Math.min(255, Math.max(0, value));
    return [
        Math.round(clamp(color[0] * (1 - amount) + target[0] * amount)),
        Math.round(clamp(color[1] * (1 - amount) + target[1] * amount)),
        Math.round(clamp(color[2] * (1 - amount) + target[2] * amount))
    ];
}

function darkenRgb(color: RgbTuple, amount: number): RgbTuple {
    return mixRgb(color, [0, 0, 0], amount);
}

function brightenRgb(color: RgbTuple, amount: number): RgbTuple {
    return mixRgb(color, [255, 255, 255], amount);
}

type QuickAccessApp = {
    id: string;
    name: string;
    href: string;
    description: string;
    icon: IconType;
    background: string;
    iconColor?: string;
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
const OUTLINE_MODE_STORAGE_KEY = 'crm-outline-mode';
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
                description: 'Monitor marketing funnels and site traffic.',
                href: 'https://analytics.google.com',
                icon: SiGoogleanalytics,
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                iconColor: '#c2410c'
            },
            {
                id: 'drive',
                name: 'Google Drive',
                description: 'Browse shared folders and deliverables.',
                href: 'https://drive.google.com',
                icon: SiGoogledrive,
                background: 'linear-gradient(135deg, #e0f2f1 0%, #e0f7fa 100%)',
                iconColor: '#0f9d58'
            },
            {
                id: 'meet',
                name: 'Google Meet',
                description: 'Launch virtual consultations and reviews.',
                href: 'https://meet.google.com',
                icon: SiGooglemeet,
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                iconColor: '#047857'
            },
            {
                id: 'photos',
                name: 'Google Photos',
                description: 'Reference archived shoots and mood boards.',
                href: 'https://photos.google.com',
                icon: SiGooglephotos,
                background: 'linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%)',
                iconColor: '#db2777'
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
                description: 'Share teasers and behind-the-scenes reels.',
                href: 'https://www.instagram.com',
                icon: FaInstagram,
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #6366f1 100%)',
                iconColor: '#ffffff'
            },
            {
                id: 'facebook',
                name: 'Facebook',
                description: 'Connect with leads and publish announcements.',
                href: 'https://www.facebook.com',
                icon: FaFacebookF,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                iconColor: '#ffffff'
            },
            {
                id: 'pinterest',
                name: 'Pinterest',
                description: 'Curate inspiration boards for upcoming shoots.',
                href: 'https://www.pinterest.com',
                icon: FaPinterestP,
                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                iconColor: '#ffffff'
            },
            {
                id: 'tiktok',
                name: 'TikTok',
                description: 'Publish highlight reels and client testimonials.',
                href: 'https://www.tiktok.com',
                icon: SiTiktok,
                background: 'linear-gradient(135deg, #0ea5e9 0%, #f43f5e 100%)',
                iconColor: '#0f172a'
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

    const [isOutlineMode, setIsOutlineMode] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            const stored = window.localStorage.getItem(OUTLINE_MODE_STORAGE_KEY);
            return stored === 'true';
        } catch (error) {
            console.warn('Unable to read stored outline preference', error);
        }
        return false;
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
            const accentRgb = hexToRgbTuple(selectedAccent.swatch);

            root.style.setProperty('--crm-accent', selectedAccent.swatch);
            root.style.setProperty('--crm-accent-soft', selectedAccent.soft);
            root.style.setProperty('--crm-accent-contrast', selectedAccent.contrast ?? '#ffffff');

            if (accentRgb) {
                const hoverHex = rgbTupleToHex(darkenRgb(accentRgb, 0.08));
                const activeHex = rgbTupleToHex(darkenRgb(accentRgb, 0.16));
                const brightHex = rgbTupleToHex(brightenRgb(accentRgb, 0.2));
                const rgbValue = accentRgb.join(', ');

                root.style.setProperty('--crm-accent-rgb', rgbValue);
                root.style.setProperty('--crm-accent-hover', hoverHex);
                root.style.setProperty('--crm-accent-active', activeHex);
                root.style.setProperty('--crm-accent-bright', brightHex);
                root.style.setProperty('--crm-accent-glow', `rgba(${rgbValue}, 0.35)`);
                root.style.setProperty('--crm-accent-glow-strong', `rgba(${rgbValue}, 0.55)`);

                root.style.setProperty('--tblr-primary', selectedAccent.swatch);
                root.style.setProperty('--tblr-primary-rgb', rgbValue);
                root.style.setProperty('--tblr-link-color', selectedAccent.swatch);
                root.style.setProperty('--tblr-link-hover-color', hoverHex);
                root.style.setProperty('--tblr-primary-hover', hoverHex);
                root.style.setProperty('--tblr-primary-fg', selectedAccent.contrast ?? '#ffffff');
            }

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

    React.useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const body = document.body;
        if (!body) {
            return;
        }

        body.classList.toggle('crm-outline-mode', isOutlineMode);

        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(OUTLINE_MODE_STORAGE_KEY, isOutlineMode ? 'true' : 'false');
            }
        } catch (error) {
            console.warn('Unable to persist outline preference', error);
        }
    }, [isOutlineMode]);

    const activeAccent = accentOptions.find((option) => option.id === accent) ?? accentOptions[0];

    const handleSelectAccent = React.useCallback((nextAccent: string) => {
        setAccent(nextAccent);
    }, []);

    const toggleOutlineMode = React.useCallback(() => {
        setIsOutlineMode((previous) => !previous);
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
                                <div className="card crm-quick-launch-card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <h4 className="card-title mb-0">Quick launch</h4>
                                        <span className="text-secondary">Stay connected</span>
                                    </div>
                                    <div className="card-body crm-quick-launch-body">
                                        {appCollections.map((collection) => (
                                            <div key={collection.id} className="crm-quick-launch-group">
                                                <div className="crm-dropdown-label">{collection.label}</div>
                                                <div className="crm-app-grid">
                                                    {collection.apps.map((app) => {
                                                        const Icon = app.icon;
                                                        const buttonStyle: React.CSSProperties = {
                                                            background: app.background
                                                        };
                                                        if (app.iconColor) {
                                                            buttonStyle.color = app.iconColor;
                                                        }

                                                        return (
                                                            <a
                                                                key={app.id}
                                                                href={app.href}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="crm-app-button"
                                                                style={buttonStyle}
                                                                aria-label={app.name}
                                                                title={`${app.name} – ${app.description}`}
                                                            >
                                                                <Icon
                                                                    className="crm-app-button-icon"
                                                                    size={20}
                                                                    aria-hidden="true"
                                                                    focusable="false"
                                                                />
                                                                <span className="visually-hidden">{app.name}</span>
                                                            </a>
                                                        );
                                                    })}
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
                        <div
                            className={classNames('nav-item dropdown crm-action-dropdown', { show: isThemeMenuOpen })}
                            ref={themeDropdownRef}
                        >
                            <button
                                type="button"
                                className="btn btn-icon"
                                aria-label="Open theme settings"
                                aria-expanded={isThemeMenuOpen}
                                onClick={toggleThemeMenu}
                            >
                                {theme === 'dark' ? (
                                    <MoonIcon className="icon" aria-hidden />
                                ) : (
                                    <SunIcon className="icon" aria-hidden />
                                )}
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
                                        <div className="mb-4">
                                            <div className="d-flex align-items-start justify-content-between gap-3">
                                                <div>
                                                    <div className="crm-dropdown-label mb-1">Outline mode</div>
                                                    <div className="text-secondary small">
                                                        Add neon outlines to dashboard cards and controls.
                                                    </div>
                                                </div>
                                                <div className="form-check form-switch mb-0">
                                                    <input
                                                        id="outline-mode-toggle"
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        role="switch"
                                                        checked={isOutlineMode}
                                                        onChange={toggleOutlineMode}
                                                    />
                                                    <label className="visually-hidden" htmlFor="outline-mode-toggle">
                                                        Toggle outline mode
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="crm-dropdown-label">Current selection</div>
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div>
                                                    <div className="fw-semibold">
                                                        {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                                                    </div>
                                                    <div className="text-secondary">
                                                        <div>Accent: {activeAccent.label}</div>
                                                        <div>Outline: {isOutlineMode ? 'Enabled' : 'Off'}</div>
                                                    </div>
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
                            className={classNames('nav-item dropdown crm-action-dropdown', { show: isProfileOpen })}
                            ref={profileDropdownRef}
                        >
                            <button
                                type="button"
                                className="btn p-0 border-0 bg-transparent crm-profile-trigger"
                                aria-label="Open profile menu"
                                aria-expanded={isProfileOpen}
                                onClick={toggleProfile}
                            >
                                <span className="crm-profile-card">
                                    <span className="crm-avatar-wrapper">
                                        <span
                                            className="avatar avatar-sm"
                                            style={{ backgroundImage: `url(${adminUser.avatar})` }}
                                        />
                                        {adminUser.status ? <span className="crm-avatar-status" aria-hidden /> : null}
                                    </span>
                                    <span className="crm-profile-card-details">
                                        <span className="crm-profile-card-name">{adminUser.name}</span>
                                        {adminUser.status ? (
                                            <span className="crm-profile-card-status">
                                                <span className="crm-dot" aria-hidden />
                                                {adminUser.status}
                                            </span>
                                        ) : null}
                                    </span>
                                </span>
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
                </div>
            </header>
            <div className="page-wrapper" data-bs-theme={theme}>
                <section className="crm-page-header">
                    <div className="container-xl">
                        <div className="crm-page-heading">
                            <div className="crm-page-heading-text">
                                <span className="crm-page-pretitle">{headingLabel}</span>
                                <h1 className="crm-page-title">Command center</h1>
                                <nav className="crm-page-nav" aria-label="Workspace pages">
                                    {navItems.map((item) => {
                                        const isActive = matchPath(router.pathname, item.href);
                                        return (
                                            <Link
                                                key={`page-nav-${item.href}`}
                                                href={item.href}
                                                className={classNames('crm-page-nav-link', { active: isActive })}
                                                aria-current={isActive ? 'page' : undefined}
                                            >
                                                <span className="crm-page-nav-icon" aria-hidden>
                                                    <item.icon className="icon" />
                                                </span>
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>
                            <div className="crm-page-heading-actions">
                                <div className="crm-page-action-grid">
                                    <Link
                                        href="/bookings"
                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                    >
                                        <CalendarIcon className="icon" aria-hidden />
                                        New booking
                                    </Link>
                                    <Link
                                        href="/bookings"
                                        className="btn btn-primary d-inline-flex align-items-center gap-2"
                                    >
                                        <CalendarIcon className="icon" aria-hidden />
                                        Quick schedule
                                    </Link>
                                    <Link
                                        href="/bookings"
                                        className="btn btn-primary d-inline-flex align-items-center justify-content-center"
                                    >
                                        Plan a shoot
                                    </Link>
                                    <Link
                                        href="/invoices"
                                        className="btn btn-outline-primary d-inline-flex align-items-center justify-content-center"
                                    >
                                        Review billing
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

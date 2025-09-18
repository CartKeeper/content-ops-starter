import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { IconType } from 'react-icons';

import { adminUser } from '../../data/crm';
import { INTEGRATION_CATEGORIES } from '../../data/integrations';
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
import { useIntegrations } from './integration-context';

type WorkspaceLayoutProps = {
    children: React.ReactNode;
};

type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type QuickAction = {
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

const quickActions: QuickAction[] = [
    { href: '/bookings', label: 'New booking', icon: CalendarIcon },
    { href: '/bookings', label: 'Quick set up', icon: CheckIcon },
    { href: '/bookings', label: 'Plan a shoot', icon: PhotoIcon },
    { href: '/invoices', label: 'Review billing', icon: ReceiptIcon }
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

type DropdownPlacement = 'top' | 'bottom';
type DropdownAlignment = 'start' | 'end';

type UseDropdownOptions = {
    defaultAlignment?: DropdownAlignment;
    offset?: number;
    boundaryPadding?: number;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

function matchPath(currentPath: string, target: string) {
    if (currentPath === target) {
        return true;
    }
    if (target === '/crm' && currentPath === '/') {
        return true;
    }
    return currentPath.startsWith(target) && target !== '/';
}

function useDropdown<T extends HTMLElement>({
    defaultAlignment = 'start',
    offset = 8,
    boundaryPadding = 8
}: UseDropdownOptions = {}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [placement, setPlacement] = React.useState<DropdownPlacement>('bottom');
    const [alignment, setAlignment] = React.useState<DropdownAlignment>(defaultAlignment);
    const containerRef = React.useRef<T | null>(null);

    const close = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggle = React.useCallback(() => {
        setIsOpen((previous) => !previous);
    }, []);

    const updatePlacement = React.useCallback(() => {
        if (!isOpen || typeof window === 'undefined') {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const menu = container.querySelector<HTMLElement>('.dropdown-menu');
        if (!menu) {
            return;
        }

        const toggleElement =
            container.querySelector<HTMLElement>('[data-dropdown-toggle]') ??
            container.querySelector<HTMLElement>('.dropdown-toggle') ??
            (container.firstElementChild instanceof HTMLElement &&
            !container.firstElementChild.classList.contains('dropdown-menu')
                ? container.firstElementChild
                : null);

        if (!toggleElement) {
            return;
        }

        const menuRect = menu.getBoundingClientRect();
        const toggleRect = toggleElement.getBoundingClientRect();

        if (menuRect.width === 0 && menuRect.height === 0) {
            return;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const spaceAbove = toggleRect.top - boundaryPadding;
        const spaceBelow = viewportHeight - toggleRect.bottom - boundaryPadding;

        let nextPlacement: DropdownPlacement = 'bottom';
        if (spaceBelow < menuRect.height + offset && spaceAbove > spaceBelow) {
            nextPlacement = 'top';
        }

        const paddedLeft = boundaryPadding;
        const paddedRight = viewportWidth - boundaryPadding;

        const startLeft = toggleRect.left;
        const startRight = startLeft + menuRect.width;
        const endLeft = toggleRect.right - menuRect.width;
        const endRight = endLeft + menuRect.width;

        const fitsStart = startLeft >= paddedLeft && startRight <= paddedRight;
        const fitsEnd = endLeft >= paddedLeft && endRight <= paddedRight;

        let nextAlignment: DropdownAlignment = defaultAlignment;

        const calculateOverflow = (left: number, right: number) =>
            Math.max(0, paddedLeft - left) + Math.max(0, right - paddedRight);

        if (defaultAlignment === 'end') {
            if (fitsEnd || (!fitsStart && endLeft >= paddedLeft)) {
                nextAlignment = 'end';
            } else if (fitsStart) {
                nextAlignment = 'start';
            } else {
                const startOverflow = calculateOverflow(startLeft, startRight);
                const endOverflow = calculateOverflow(endLeft, endRight);
                nextAlignment = startOverflow <= endOverflow ? 'start' : 'end';
            }
        } else {
            if (fitsStart || (!fitsEnd && startRight <= paddedRight)) {
                nextAlignment = 'start';
            } else if (fitsEnd) {
                nextAlignment = 'end';
            } else {
                const startOverflow = calculateOverflow(startLeft, startRight);
                const endOverflow = calculateOverflow(endLeft, endRight);
                nextAlignment = startOverflow <= endOverflow ? 'start' : 'end';
            }
        }

        setPlacement(nextPlacement);
        setAlignment(nextAlignment);

        if (nextPlacement === 'bottom') {
            menu.style.top = `calc(100% + ${offset}px)`;
            menu.style.bottom = 'auto';
        } else {
            menu.style.bottom = `calc(100% + ${offset}px)`;
            menu.style.top = 'auto';
        }

        if (nextAlignment === 'end') {
            menu.style.right = '0';
            menu.style.left = 'auto';
        } else {
            menu.style.left = '0';
            menu.style.right = 'auto';
        }
    }, [boundaryPadding, defaultAlignment, isOpen, offset]);

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

    useIsomorphicLayoutEffect(() => {
        if (!isOpen) {
            const container = containerRef.current;
            if (!container) {
                return;
            }
            const menu = container.querySelector<HTMLElement>('.dropdown-menu');
            if (menu) {
                menu.style.removeProperty('top');
                menu.style.removeProperty('bottom');
                menu.style.removeProperty('left');
                menu.style.removeProperty('right');
            }
            return;
        }

        updatePlacement();
    }, [isOpen, updatePlacement]);

    React.useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleWindowChange() {
            updatePlacement();
        }

        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);

        return () => {
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [isOpen, updatePlacement]);

    return { isOpen, close, toggle, containerRef, placement, alignment } as const;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();
    const { theme, setTheme, toggleTheme } = useThemeMode();
    const [isNavOpen, setIsNavOpen] = React.useState(false);
    const { connectedIntegrations } = useIntegrations();

    const {
        isOpen: isAppsOpen,
        close: closeApps,
        toggle: toggleApps,
        containerRef: appsDropdownRef,
        placement: appsPlacement,
        alignment: appsAlignment
    } = useDropdown<HTMLDivElement>({ defaultAlignment: 'end' });
    const {
        isOpen: isThemeMenuOpen,
        close: closeThemeMenu,
        toggle: toggleThemeMenu,
        containerRef: themeDropdownRef,
        placement: themePlacement,
        alignment: themeAlignment
    } = useDropdown<HTMLDivElement>({ defaultAlignment: 'end' });
    const {
        isOpen: isNotificationsOpen,
        close: closeNotifications,
        toggle: toggleNotifications,
        containerRef: notificationsDropdownRef,
        placement: notificationsPlacement,
        alignment: notificationsAlignment
    } = useDropdown<HTMLDivElement>({ defaultAlignment: 'end' });
    const {
        isOpen: isProfileOpen,
        close: closeProfile,
        toggle: toggleProfile,
        containerRef: profileDropdownRef,
        placement: profilePlacement,
        alignment: profileAlignment
    } = useDropdown<HTMLDivElement>({ defaultAlignment: 'end' });

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

    const quickLaunchCollections = React.useMemo<AppCollection[]>(() => {
        const grouped = new Map<string, QuickAccessApp[]>();

        connectedIntegrations.forEach((entry) => {
            const { definition } = entry;
            if (!definition.href) {
                return;
            }

            const quickApp: QuickAccessApp = {
                id: definition.id,
                name: definition.name,
                description: definition.description,
                href: definition.href,
                icon: definition.icon,
                background: definition.background,
                iconColor: definition.iconColor
            };

            const existing = grouped.get(definition.categoryId);
            if (existing) {
                existing.push(quickApp);
            } else {
                grouped.set(definition.categoryId, [quickApp]);
            }
        });

        return INTEGRATION_CATEGORIES.map<AppCollection>((category) => {
            const apps = grouped.get(category.id) ?? [];
            const ordered = [...apps].sort((a, b) => a.name.localeCompare(b.name));
            return {
                id: category.id,
                label: category.label,
                apps: ordered
            };
        }).filter((collection) => collection.apps.length > 0);
    }, [connectedIntegrations]);

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
                    <div className="navbar-nav flex-row order-md-last align-items-center gap-2 ms-3 crm-top-nav-actions">
                        <div
                            className={classNames('nav-item dropdown', { show: isAppsOpen })}
                            ref={appsDropdownRef}
                            data-dropdown-placement={isAppsOpen ? appsPlacement : undefined}
                            data-dropdown-alignment={isAppsOpen ? appsAlignment : undefined}
                        >
                            <button
                                type="button"
                                className="btn btn-icon"
                                aria-label="Open quick launch"
                                aria-expanded={isAppsOpen}
                                onClick={toggleApps}
                                data-dropdown-toggle
                            >
                                <AppsIcon className="icon" aria-hidden />
                            </button>
                            <div
                                className={classNames(
                                    'dropdown-menu dropdown-menu-card dropdown-menu-xl',
                                    {
                                        'dropdown-menu-end': appsAlignment === 'end',
                                        'dropdown-menu-start': appsAlignment === 'start',
                                        show: isAppsOpen
                                    }
                                )}
                            >
                                <div className="card crm-quick-launch-card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <h4 className="card-title mb-0">Quick launch</h4>
                                        <span className="text-secondary">Stay connected</span>
                                    </div>
                                    <div className="card-body crm-quick-launch-body">
                                        {quickLaunchCollections.length > 0 ? (
                                            quickLaunchCollections.map((collection) => (
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
                                            ))
                                        ) : (
                                            <div className="crm-quick-launch-empty text-center text-secondary">
                                                <p className="mb-2">No integrations are connected yet.</p>
                                                <p className="mb-3">Add them from settings to build your quick launch palette.</p>
                                                <Link href="/settings" className="btn btn-sm btn-primary">
                                                    Add integrations
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className={classNames('nav-item dropdown', { show: isNotificationsOpen })}
                            ref={notificationsDropdownRef}
                            data-dropdown-placement={isNotificationsOpen ? notificationsPlacement : undefined}
                            data-dropdown-alignment={
                                isNotificationsOpen ? notificationsAlignment : undefined
                            }
                        >
                            <button
                                type="button"
                                className="btn btn-icon position-relative"
                                aria-label="View notifications"
                                aria-expanded={isNotificationsOpen}
                                onClick={toggleNotifications}
                                data-dropdown-toggle
                            >
                                <BellIcon className="icon" aria-hidden />
                                <span className="crm-notification-indicator" aria-hidden />
                            </button>
                            <div
                                className={classNames(
                                    'dropdown-menu dropdown-menu-card dropdown-menu-md',
                                    {
                                        'dropdown-menu-end': notificationsAlignment === 'end',
                                        'dropdown-menu-start': notificationsAlignment === 'start',
                                        show: isNotificationsOpen
                                    }
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
                            data-dropdown-placement={isThemeMenuOpen ? themePlacement : undefined}
                            data-dropdown-alignment={isThemeMenuOpen ? themeAlignment : undefined}
                        >
                            <button
                                type="button"
                                className="btn btn-icon"
                                aria-label="Open theme settings"
                                aria-expanded={isThemeMenuOpen}
                                onClick={toggleThemeMenu}
                                data-dropdown-toggle
                            >
                                {theme === 'dark' ? (
                                    <MoonIcon className="icon" aria-hidden />
                                ) : (
                                    <SunIcon className="icon" aria-hidden />
                                )}
                            </button>
                            <div
                                className={classNames(
                                    'dropdown-menu dropdown-menu-card dropdown-menu-lg',
                                    {
                                        'dropdown-menu-end': themeAlignment === 'end',
                                        'dropdown-menu-start': themeAlignment === 'start',
                                        show: isThemeMenuOpen
                                    }
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
                            data-dropdown-placement={isProfileOpen ? profilePlacement : undefined}
                            data-dropdown-alignment={isProfileOpen ? profileAlignment : undefined}
                        >
                            <button
                                type="button"
                                className="btn p-0 border-0 bg-transparent crm-profile-trigger"
                                aria-label="Open profile menu"
                                aria-expanded={isProfileOpen}
                                onClick={toggleProfile}
                                data-dropdown-toggle
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
                                    'dropdown-menu dropdown-menu-arrow dropdown-menu-card dropdown-menu-md',
                                    {
                                        'dropdown-menu-end': profileAlignment === 'end',
                                        'dropdown-menu-start': profileAlignment === 'start',
                                        show: isProfileOpen
                                    }
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
                                <nav className="crm-page-nav" aria-label="Workspace pages and quick actions">
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
                                    {quickActions.map((action) => {
                                        const ActionIcon = action.icon;
                                        return (
                                            <Link
                                                key={`quick-action-${action.href}-${action.label}`}
                                                href={action.href}
                                                className="crm-page-nav-link"
                                            >
                                                <span className="crm-page-nav-icon" aria-hidden>
                                                    <ActionIcon className="icon" />
                                                </span>
                                                <span>{action.label}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
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

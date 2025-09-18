import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ApertureMark } from './ApertureMark';
import {
    AddressBookIcon,
    CalendarIcon,
    MenuIcon,
    MoonIcon,
    PhotoIcon,
    ReceiptIcon,
    SettingsIcon,
    SparklesIcon,
    SunIcon,
    UsersIcon
} from './icons';
import { useThemeMode } from '../../utils/use-theme-mode';

const navItems = [
    { href: '/crm', label: 'Dashboard', icon: SparklesIcon },
    { href: '/bookings', label: 'Calendar', icon: CalendarIcon },
    { href: '/contacts', label: 'Contacts', icon: AddressBookIcon },
    { href: '/clients', label: 'Clients', icon: UsersIcon },
    { href: '/galleries', label: 'Galleries', icon: PhotoIcon },
    { href: '/invoices', label: 'Invoices', icon: ReceiptIcon },
    { href: '/crm/sidebar', label: 'Sidebar modules', icon: SettingsIcon }
] as const;

type WorkspaceLayoutContextValue = {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
};

const WorkspaceLayoutContext = React.createContext<WorkspaceLayoutContextValue | null>(null);

export function useWorkspaceLayout(): WorkspaceLayoutContextValue {
    const context = React.useContext(WorkspaceLayoutContext);
    if (!context) {
        throw new Error('useWorkspaceLayout must be used within a WorkspaceLayout');
    }
    return context;
}

type WorkspaceLayoutProps = {
    children: React.ReactNode;
    onSidebarChange?: (isOpen: boolean) => void;
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

export function WorkspaceLayout({ children, onSidebarChange }: WorkspaceLayoutProps) {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const { theme, toggleTheme } = useThemeMode();

    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [router.asPath]);

    React.useEffect(() => {
        onSidebarChange?.(isSidebarOpen);
    }, [isSidebarOpen, onSidebarChange]);

    const contextValue = React.useMemo<WorkspaceLayoutContextValue>(() => ({
        isSidebarOpen,
        toggleSidebar: () => setIsSidebarOpen((previous) => !previous),
        closeSidebar: () => setIsSidebarOpen(false)
    }), [isSidebarOpen]);

    const activeItem = React.useMemo(() => {
        const path = router.pathname;
        return navItems.find((item) => matchPath(path, item.href)) ?? null;
    }, [router.pathname]);

    const sidebarClassName = classNames('navbar navbar-vertical navbar-expand-lg', 'navbar-dark bg-body-tertiary', {
        show: isSidebarOpen
    });

    return (
        <WorkspaceLayoutContext.Provider value={contextValue}>
            <div className={classNames('page', theme === 'dark' ? 'theme-dark' : 'theme-light')}>
                <aside className={sidebarClassName} data-bs-theme={theme}>
                    <div className="container-fluid">
                        <button
                            type="button"
                            className="navbar-toggler"
                            aria-label="Toggle navigation"
                            onClick={() => setIsSidebarOpen((previous) => !previous)}
                        >
                            <span className="navbar-toggler-icon" />
                        </button>
                        <Link href="/crm" className="navbar-brand navbar-brand-autodark d-flex align-items-center gap-2">
                            <span className="avatar avatar-sm bg-primary-lt text-primary">
                                <ApertureMark className="icon" aria-hidden />
                            </span>
                            <span className="fw-semibold">Codex Studio CRM</span>
                        </Link>
                        <div className={classNames('collapse navbar-collapse', { show: isSidebarOpen })}>
                            <ul className="navbar-nav pt-lg-3" role="navigation" aria-label="Workspace navigation">
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
                            <div className="mt-auto pt-4">
                                <div className="alert alert-primary" role="status">
                                    <div className="fw-semibold text-uppercase small text-primary mb-1">Workspace tips</div>
                                    <div className="text-secondary">
                                        Collapse the navigation on smaller screens or pin your favourite modules for a focused review.
                                    </div>
                                </div>
                                <button type="button" className="btn w-100 btn-outline-primary" onClick={toggleTheme}>
                                    {theme === 'dark' ? <SunIcon className="icon" aria-hidden /> : <MoonIcon className="icon" aria-hidden />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>
                {isSidebarOpen ? (
                    <div
                        className="navbar-backdrop d-lg-none"
                        role="presentation"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                ) : null}
                <div className="page-wrapper">
                    <header className="navbar navbar-expand-md d-print-none" data-bs-theme={theme}>
                        <div className="container-xl">
                            <div className="d-flex align-items-center">
                                <button
                                    type="button"
                                    className="btn btn-icon me-2 d-lg-none"
                                    aria-label="Open navigation"
                                    onClick={() => setIsSidebarOpen(true)}
                                >
                                    <MenuIcon className="icon" aria-hidden />
                                </button>
                                <div className="d-none d-md-flex flex-column">
                                    <span className="page-pretitle text-uppercase text-secondary fw-semibold">
                                        {activeItem ? activeItem.label : 'Workspace'}
                                    </span>
                                    <span className="page-title fw-semibold">Command center</span>
                                </div>
                            </div>
                            <div className="navbar-nav flex-row order-md-last gap-2 align-items-center ms-auto">
                                <Link href="/bookings" className="btn btn-primary d-none d-md-inline-flex align-items-center gap-2">
                                    <CalendarIcon className="icon" aria-hidden />
                                    New booking
                                </Link>
                                <button type="button" className="btn btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
                                    {theme === 'dark' ? <SunIcon className="icon" aria-hidden /> : <MoonIcon className="icon" aria-hidden />}
                                </button>
                            </div>
                            <div className="collapse navbar-collapse" id="crm-navbar">
                                <form className="navbar-search d-none d-md-flex ms-md-4" role="search">
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
                                            placeholder="Search clients, invoices, tasks"
                                            aria-label="Search workspace"
                                        />
                                    </div>
                                </form>
                            </div>
                        </div>
                    </header>
                    <main className="page-body">
                        <div className="container-xl">{children}</div>
                    </main>
                </div>
            </div>
        </WorkspaceLayoutContext.Provider>
    );
}

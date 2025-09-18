import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ApertureMark } from './ApertureMark';
import {
    AddressBookIcon,
    CalendarIcon,
    CloseIcon,
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

    const sidebar = (
        <aside
            className={classNames(
                'fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-8 border-r border-white/10 bg-slate-950/95 px-6 py-7 text-slate-200 shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none lg:transition-none',
                { '-translate-x-full': !isSidebarOpen, 'translate-x-0': isSidebarOpen }
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/40">
                        <ApertureMark className="h-6 w-6" />
                    </span>
                    <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-indigo-200/80">Codex</p>
                        <p className="text-sm font-semibold text-white">Studio CRM</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 lg:hidden"
                >
                    <CloseIcon className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Close navigation</span>
                </button>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
                {navItems.map((item) => {
                    const isActive = matchPath(router.pathname, item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={classNames(
                                'group inline-flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                                isActive
                                    ? 'bg-white/10 text-white shadow-lg shadow-indigo-500/15'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            )}
                        >
                            <span
                                className={classNames(
                                    'flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-indigo-200 transition group-hover:border-white/20 group-hover:bg-white/10',
                                    isActive && 'border-transparent bg-white text-slate-900 shadow-sm'
                                )}
                            >
                                <item.icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 shadow-inner">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-indigo-200/70">Workspace tips</p>
                    <p className="mt-2 leading-relaxed text-slate-200">
                        Collapse the navigation on smaller screens or pin your favorite modules for a focused review.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                    {theme === 'dark' ? <SunIcon className="h-4 w-4" aria-hidden /> : <MoonIcon className="h-4 w-4" aria-hidden />}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
            </div>
        </aside>
    );

    return (
        <WorkspaceLayoutContext.Provider value={contextValue}>
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.12),_transparent_55%)] bg-slate-100/80 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
                <div className="relative flex min-h-screen">
                    {isSidebarOpen ? (
                        <button
                            type="button"
                            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
                            aria-label="Close navigation overlay"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    ) : null}
                    {sidebar}
                    <div className="flex min-h-screen flex-1 flex-col bg-transparent">
                        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/70 sm:px-6 lg:px-8">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950 lg:hidden"
                                >
                                    <MenuIcon className="h-5 w-5" aria-hidden />
                                    <span className="sr-only">Open navigation</span>
                                </button>
                                <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
                                        {activeItem ? activeItem.label : 'Workspace'}
                                    </p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">Command center</p>
                                </div>
                            </div>
                            <div className="flex flex-1 items-center justify-end gap-3">
                                <label className="hidden w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus-within:border-indigo-400 dark:focus-within:ring-indigo-500/40 dark:focus-within:ring-offset-slate-900 md:flex">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4 text-slate-400 dark:text-slate-500"
                                        aria-hidden
                                    >
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m20 20-2.6-2.6" />
                                    </svg>
                                    <span className="sr-only">Search workspace</span>
                                    <input
                                        type="search"
                                        placeholder="Search clients, invoices, tasks"
                                        className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                                    />
                                </label>
                                <Link
                                    href="/bookings"
                                    className="hidden items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 md:inline-flex"
                                >
                                    <CalendarIcon className="h-4 w-4" aria-hidden />
                                    New booking
                                </Link>
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                                >
                                    {theme === 'dark' ? <SunIcon className="h-5 w-5" aria-hidden /> : <MoonIcon className="h-5 w-5" aria-hidden />}
                                    <span className="sr-only">Toggle dark mode</span>
                                </button>
                            </div>
                        </header>
                        <main className="flex-1 overflow-y-auto">{children}</main>
                    </div>
                </div>
            </div>
        </WorkspaceLayoutContext.Provider>
    );
}

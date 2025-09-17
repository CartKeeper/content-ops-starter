import * as React from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ApertureMark } from './ApertureMark';
import {
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
                'fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-8 border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 lg:shadow-none lg:transition-none',
                { '-translate-x-full': !isSidebarOpen, 'translate-x-0': isSidebarOpen }
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/40">
                        <ApertureMark className="h-6 w-6" />
                    </span>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-indigo-400">Codex</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Studio workspace</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950 lg:hidden"
                >
                    <CloseIcon className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Close navigation</span>
                </button>
            </div>
            <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const isActive = matchPath(router.pathname, item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={classNames(
                                'group inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:bg-indigo-500 dark:shadow-indigo-900/40'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            )}
                        >
                            <span
                                className={classNames(
                                    'flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-indigo-100/70 text-indigo-600 group-hover:bg-indigo-200/80 dark:bg-slate-800 dark:text-indigo-300 dark:group-hover:bg-slate-700'
                                )}
                            >
                                <item.icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
                <div className="rounded-2xl border border-slate-200 bg-indigo-50/70 p-4 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-indigo-500/10 dark:text-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.36em] text-indigo-500 dark:text-indigo-300">Workspace tips</p>
                    <p className="mt-2 text-sm">
                        Collapse the navigation on smaller screens to focus on your active workflow.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950"
                >
                    {theme === 'dark' ? <SunIcon className="h-4 w-4" aria-hidden /> : <MoonIcon className="h-4 w-4" aria-hidden />}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
            </div>
        </aside>
    );

    return (
        <WorkspaceLayoutContext.Provider value={contextValue}>
            <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
                <div className="relative flex min-h-screen">
                    {isSidebarOpen ? (
                        <button
                            type="button"
                            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                            aria-label="Close navigation overlay"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    ) : null}
                    {sidebar}
                    <div className="flex min-h-screen flex-1 flex-col bg-slate-50 transition-colors dark:bg-slate-950">
                        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6 lg:px-8">
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
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-300">
                                        {activeItem ? activeItem.label : 'Workspace'}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage bookings, clients, and delivery from one hub.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950 lg:hidden"
                            >
                                {theme === 'dark' ? <SunIcon className="h-5 w-5" aria-hidden /> : <MoonIcon className="h-5 w-5" aria-hidden />}
                                <span className="sr-only">Toggle dark mode</span>
                            </button>
                        </header>
                        <main className="flex-1 overflow-y-auto">{children}</main>
                    </div>
                </div>
            </div>
        </WorkspaceLayoutContext.Provider>
    );
}

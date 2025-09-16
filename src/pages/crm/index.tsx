import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import {
    BookingList,
    ClientTable,
    DashboardCard,
    InvoiceTable,
    SectionCard,
    TaskList,
    type BookingRecord,
    type ClientRecord,
    type InvoiceRecord,
    type TaskRecord
} from '../../components/crm';

const metrics = [
    {
        id: 'revenue',
        title: 'Monthly Revenue',
        value: '$18,450',
        trend: {
            value: '+12%',
            label: 'vs last month'
        }
    },
    {
        id: 'bookings',
        title: 'Upcoming Shoots',
        value: '14',
        trend: {
            value: '6 confirmed',
            label: 'next 30 days'
        }
    },
    {
        id: 'galleries',
        title: 'Galleries to Deliver',
        value: '5',
        trend: {
            value: '3 due this week'
        }
    },
    {
        id: 'invoices',
        title: 'Outstanding Invoices',
        value: '$4,300',
        trend: {
            value: '2 overdue',
            isPositive: false
        }
    }
];

const bookings: BookingRecord[] = [
    {
        id: 'bk-01',
        client: 'Evelyn Sanders',
        shootType: 'Engagement Session',
        date: '2024-05-11',
        startTime: '3:00 PM',
        endTime: '5:00 PM',
        location: 'Golden Gate Park',
        status: 'Confirmed'
    },
    {
        id: 'bk-02',
        client: 'Harrison & June',
        shootType: 'Wedding',
        date: '2024-05-18',
        startTime: '11:00 AM',
        endTime: '8:00 PM',
        location: 'Terranea Resort',
        status: 'Pending'
    },
    {
        id: 'bk-03',
        client: 'Sona Patel',
        shootType: 'Brand Lifestyle',
        date: '2024-05-21',
        startTime: '9:00 AM',
        endTime: '12:00 PM',
        location: 'Downtown Studio',
        status: 'Editing'
    }
];

const clients: ClientRecord[] = [
    {
        id: 'cl-01',
        name: 'Evelyn Sanders',
        email: 'evelyn@wanderlust.com',
        phone: '(415) 555-0108',
        shoots: 6,
        lastShoot: '2024-04-22',
        upcomingShoot: '2024-05-11',
        status: 'Active'
    },
    {
        id: 'cl-02',
        name: 'Harrison & June',
        email: 'hello@harrisonandjune.com',
        phone: '(424) 555-0145',
        shoots: 2,
        lastShoot: '2023-11-18',
        upcomingShoot: '2024-05-18',
        status: 'Lead'
    },
    {
        id: 'cl-03',
        name: 'Sona Patel',
        email: 'sona@patelcreative.co',
        phone: '(415) 555-0121',
        shoots: 3,
        lastShoot: '2024-04-02',
        upcomingShoot: '2024-05-21',
        status: 'Active'
    },
    {
        id: 'cl-04',
        name: 'Fern & Pine Studio',
        email: 'contact@fernandpine.com',
        phone: '(510) 555-0186',
        shoots: 4,
        lastShoot: '2023-12-14',
        status: 'Archived'
    }
];

const invoices: InvoiceRecord[] = [
    {
        id: '1024',
        client: 'Evelyn Sanders',
        project: 'Engagement Session',
        amount: 1150,
        dueDate: '2024-05-05',
        status: 'Sent'
    },
    {
        id: '1023',
        client: 'Harrison & June',
        project: 'Wedding Collection',
        amount: 3800,
        dueDate: '2024-04-28',
        status: 'Overdue'
    },
    {
        id: '1022',
        client: 'Sona Patel',
        project: 'Brand Lifestyle',
        amount: 1450,
        dueDate: '2024-04-15',
        status: 'Paid'
    }
];

const tasks: TaskRecord[] = [
    {
        id: 'task-01',
        title: 'Send Harrison & June final timeline',
        dueDate: '2024-05-07',
        assignee: 'You',
        completed: false
    },
    {
        id: 'task-02',
        title: 'Cull and edit Sona Patel preview set',
        dueDate: '2024-05-06',
        assignee: 'Retouch Team',
        completed: false
    },
    {
        id: 'task-03',
        title: 'Email Evelyn gallery delivery details',
        dueDate: '2024-05-03',
        assignee: 'You',
        completed: true
    }
];

const quickActions = [
    { id: 'new-booking', label: 'Schedule shoot' },
    { id: 'new-invoice', label: 'Create invoice' },
    { id: 'upload-gallery', label: 'Upload gallery' }
];

const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/crm', isActive: true },
    { id: 'calendar', label: 'Calendar', href: '#' },
    { id: 'clients', label: 'Clients', href: '#' },
    { id: 'invoices', label: 'Invoices', href: '#' },
    { id: 'galleries', label: 'Galleries', href: '#' },
    { id: 'projects', label: 'Projects', href: '#' },
    { id: 'settings', label: 'Settings', href: '#' }
];

export default function PhotographyCrmDashboard() {
    const [isDarkMode, setIsDarkMode] = React.useState<boolean | null>(null);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const userMenuRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const storedTheme = window.localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldEnableDark = storedTheme ? storedTheme === 'dark' : prefersDark;
        setIsDarkMode(shouldEnableDark);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined' || isDarkMode === null) {
            return;
        }
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            window.localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            window.localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const handleClick = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        window.document.addEventListener('mousedown', handleClick);
        return () => window.document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode((previous) => (previous === null ? true : !previous));
    };

    return (
        <>
            <Head>
                <title>Photography CRM Dashboard</title>
                <meta name="description" content="Command center for managing photography clients, shoots and invoices." />
            </Head>
            <div className="min-h-screen bg-slate-100 transition-colors dark:bg-slate-950">
                <div className="flex min-h-screen">
                    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-slate-950 text-slate-100 shadow-lg lg:flex dark:border-slate-900">
                        <div className="flex h-16 items-center px-6">
                            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Navigation</span>
                        </div>
                        <nav className="flex flex-1 flex-col gap-1 px-4 py-4">
                            {navigationItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={[
                                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                                        item.isActive
                                            ? 'bg-slate-900/80 text-white shadow-inner'
                                            : 'text-slate-300 hover:bg-slate-900/60 hover:text-white'
                                    ].join(' ')}
                                >
                                    <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="px-6 pb-8 text-xs text-slate-500">
                            <p className="font-semibold text-slate-200">Codex Environment</p>
                            <p className="mt-1 text-slate-400">Organize every shoot, deliverable, and client moment.</p>
                        </div>
                    </aside>
                    <div className="flex min-h-screen flex-1 flex-col">
                        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/80">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white shadow-sm">
                                    CE
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600 dark:text-indigo-400">
                                        Codex Environment
                                    </p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">Studio CRM</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={toggleDarkMode}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                    aria-label={isDarkMode ? 'Activate light mode' : 'Activate dark mode'}
                                >
                                    {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                </button>
                                <button
                                    type="button"
                                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                    aria-label="Open notifications"
                                >
                                    <BellIcon className="h-5 w-5" />
                                    <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
                                </button>
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsUserMenuOpen((open) => !open)}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 pl-1 pr-3 text-sm font-medium text-slate-700 shadow-sm transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-white"
                                        aria-haspopup="menu"
                                        aria-expanded={isUserMenuOpen}
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                                            AL
                                        </span>
                                        <span className="hidden text-left sm:block">
                                            <span className="block text-xs text-slate-500 dark:text-slate-400">Photographer</span>
                                            <span className="block font-semibold">Avery Logan</span>
                                        </span>
                                        <ChevronDownIcon className={`h-4 w-4 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                            <button className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                                                Profile
                                            </button>
                                            <button className="block w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>
                        <main className="flex-1 bg-slate-50 pb-16 transition-colors dark:bg-slate-950">
                            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pt-10">
                                <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                            Studio Command Center
                                        </p>
                                        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                            Photography CRM Dashboard
                                        </h1>
                                        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
                                            Track client relationships, keep shoots on schedule, and stay ahead of deliverables—all from a
                                            single workspace designed for busy photographers.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {quickActions.map((action) => (
                                            <button
                                                key={action.id}
                                                className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-slate-900/60 dark:text-indigo-300 dark:hover:bg-slate-800/60"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </header>

                                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                                    {metrics.map((metric) => (
                                        <DashboardCard key={metric.id} title={metric.title} value={metric.value} trend={metric.trend} />
                                    ))}
                                </section>

                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="space-y-6 lg:col-span-2">
                                        <SectionCard
                                            title="Upcoming Shoots"
                                            description="Stay ready for every session with a quick view of the week ahead."
                                            action={
                                                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                    Open calendar
                                                </button>
                                            }
                                        >
                                            <BookingList bookings={bookings} />
                                        </SectionCard>

                                        <SectionCard
                                            title="Active Clients"
                                            description="From loyal regulars to new leads, see who needs attention next."
                                            action={
                                                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                    View all clients
                                                </button>
                                            }
                                        >
                                            <ClientTable clients={clients} />
                                        </SectionCard>
                                    </div>
                                    <div className="space-y-6">
                                        <SectionCard
                                            title="Open Invoices"
                                            description="Collect payments faster with a focused list of outstanding balances."
                                        >
                                            <InvoiceTable invoices={invoices} />
                                        </SectionCard>

                                        <SectionCard
                                            title="Studio Tasks"
                                            description="Keep production moving with next actions across your team."
                                            action={
                                                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                    Create task
                                                </button>
                                            }
                                        >
                                            <TaskList tasks={tasks} />
                                        </SectionCard>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </>
    );
}

type IconProps = React.SVGProps<SVGSVGElement>;

function MoonIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
        </svg>
    );
}

function SunIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l1.41-1.41M16.24 7.76l1.41-1.41" />
        </svg>
    );
}

function BellIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function ChevronDownIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

import * as React from 'react';
import fs from 'fs/promises';
import path from 'path';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';

import {
    BookingList,
    ClientTable,
    InvoiceTable,
    OverviewChart,
    SectionCard,
    StatCard,
    TaskList,
    type BookingRecord,
    type BookingStatus,
    type ClientRecord,
    type InvoiceRecord,
    type TaskRecord,
    type ChartPoint
} from '../../components/crm';

type GalleryStatus = 'Delivered' | 'Pending';

type GalleryRecord = {
    id: string;
    client: string;
    shootType: string;
    deliveredAt?: string;
    status: GalleryStatus;
};


type CmsCollection<T> = {
    items?: T[];
};

type PhotographyCrmDashboardProps = {
    bookings: BookingRecord[];
    invoices: InvoiceRecord[];
};


const clients: ClientRecord[] = [
    {
        id: 'cl-01',
        name: 'Evelyn Sanders',
        email: 'evelyn@wanderlust.com',
        phone: '(415) 555-0108',
        shoots: 7,
        lastShoot: '2025-03-29',
        upcomingShoot: '2025-05-11',
        status: 'Active'
    },
    {
        id: 'cl-02',
        name: 'Harrison & June',
        email: 'hello@harrisonandjune.com',
        phone: '(424) 555-0145',
        shoots: 3,
        lastShoot: '2024-11-18',
        upcomingShoot: '2025-05-18',
        status: 'Lead'
    },
    {
        id: 'cl-03',
        name: 'Sona Patel',
        email: 'sona@patelcreative.co',
        phone: '(415) 555-0121',
        shoots: 4,
        lastShoot: '2025-04-02',
        upcomingShoot: '2025-05-21',
        status: 'Active'
    },
    {
        id: 'cl-04',
        name: 'Fern & Pine Studio',
        email: 'contact@fernandpine.com',
        phone: '(510) 555-0186',
        shoots: 5,
        lastShoot: '2025-04-04',
        upcomingShoot: '2025-06-08',
        status: 'Active'
    },
    {
        id: 'cl-05',
        name: 'Evergreen Architects',
        email: 'team@evergreenarchitects.com',
        phone: '(628) 555-0163',
        shoots: 2,
        lastShoot: '2025-03-18',
        upcomingShoot: '2025-05-29',
        status: 'Lead'
    },
    {
        id: 'cl-06',
        name: 'Atlas Fitness',
        email: 'hello@atlasfitness.co',
        phone: '(415) 555-0194',
        shoots: 3,
        lastShoot: '2025-01-22',
        status: 'Active'
    }
];


const galleryCollection: GalleryRecord[] = [
    {
        id: 'gal-01',
        client: 'Evelyn Sanders',
        shootType: 'Engagement Session',
        status: 'Pending'
    },
    {
        id: 'gal-02',
        client: 'Harrison & June',
        shootType: 'Wedding Weekend',
        status: 'Pending'
    },
    {
        id: 'gal-03',
        client: 'Sona Patel',
        shootType: 'Brand Lifestyle Campaign',
        deliveredAt: '2025-04-28',
        status: 'Delivered'
    },
    {
        id: 'gal-04',
        client: 'Fern & Pine Studio',
        shootType: 'Lookbook Launch',
        deliveredAt: '2025-04-10',
        status: 'Delivered'
    },
    {
        id: 'gal-05',
        client: 'Evergreen Architects',
        shootType: 'Team Headshots',
        deliveredAt: '2025-03-23',
        status: 'Delivered'
    },
    {
        id: 'gal-06',
        client: 'Violet & Thread',
        shootType: 'Spring Collection',
        deliveredAt: '2025-02-24',
        status: 'Delivered'
    },
    {
        id: 'gal-07',
        client: 'Atlas Fitness',
        shootType: 'Brand Campaign',
        deliveredAt: '2025-02-02',
        status: 'Delivered'
    },
    {
        id: 'gal-08',
        client: 'Harbor & Co',
        shootType: 'Product Launch',
        deliveredAt: '2024-12-18',
        status: 'Delivered'
    },
    {
        id: 'gal-09',
        client: 'Lumen Studio',
        shootType: 'Agency Portfolio',
        deliveredAt: '2024-11-23',
        status: 'Delivered'
    },
    {
        id: 'gal-10',
        client: 'Beacon Realty',
        shootType: 'Property Showcase',
        deliveredAt: '2024-10-12',
        status: 'Delivered'
    }
];

const tasks: TaskRecord[] = [
    {
        id: 'task-01',
        title: 'Send Harrison & June final timeline',
        dueDate: '2025-05-07',
        assignee: 'You',
        completed: false
    },
    {
        id: 'task-02',
        title: 'Cull and edit Sona Patel preview set',
        dueDate: '2025-05-06',
        assignee: 'Retouch Team',
        completed: false
    },
    {
        id: 'task-03',
        title: 'Email Evelyn gallery delivery details',
        dueDate: '2025-05-03',
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

export default function PhotographyCrmDashboard({ bookings, invoices }: PhotographyCrmDashboardProps) {
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

    const bookingList = React.useMemo(() => (Array.isArray(bookings) ? bookings : []), [bookings]);
    const invoiceList = React.useMemo(() => (Array.isArray(invoices) ? invoices : []), [invoices]);

    const sortedInvoices = React.useMemo(
        () =>
            invoiceList
                .slice()
                .sort((first, second) => dayjs(first.dueDate).valueOf() - dayjs(second.dueDate).valueOf()),
        [invoiceList]
    );

    const currentMonth = sortedInvoices.length
        ? dayjs(sortedInvoices[sortedInvoices.length - 1].dueDate).startOf('month')
        : dayjs().startOf('month');
    const previousMonth = currentMonth.subtract(1, 'month');

    const revenueThisMonth = sumInvoicesForMonth(invoiceList, currentMonth);
    const revenuePreviousMonth = sumInvoicesForMonth(invoiceList, previousMonth);
    const revenueChange = calculatePercentChange(revenueThisMonth, revenuePreviousMonth);

    const activeBookingStatuses: BookingStatus[] = ['Confirmed', 'Pending'];

    const upcomingShootsCurrent = bookingList.filter(
        (booking) => activeBookingStatuses.includes(booking.status) && dayjs(booking.date).isSame(currentMonth, 'month')
    ).length;
    const upcomingShootsPrevious = bookingList.filter(
        (booking) => activeBookingStatuses.includes(booking.status) && dayjs(booking.date).isSame(previousMonth, 'month')
    ).length;
    const upcomingChange = calculatePercentChange(upcomingShootsCurrent, upcomingShootsPrevious);

    const outstandingAmountCurrent = invoiceList
        .filter((invoice) => invoice.status !== 'Paid' && dayjs(invoice.dueDate).isSame(currentMonth, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
    const outstandingAmountPrevious = invoiceList
        .filter((invoice) => invoice.status !== 'Paid' && dayjs(invoice.dueDate).isSame(previousMonth, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
    const outstandingChange = calculatePercentChange(outstandingAmountCurrent, outstandingAmountPrevious);

    const statCards = [
        {
            id: 'revenue',
            title: 'Revenue This Month',
            value: formatCurrency(revenueThisMonth),
            change: revenueChange,
            changeLabel: 'vs previous month',
            icon: <InvoiceIcon className="h-5 w-5" />
        },
        {
            id: 'shoots',
            title: 'Upcoming Shoots',
            value: `${upcomingShootsCurrent}`,
            change: upcomingChange,
            changeLabel: 'vs previous month',
            icon: <CalendarIcon className="h-5 w-5" />
        },
        {
            id: 'outstanding',
            title: 'Outstanding Invoices',
            value: formatCurrency(outstandingAmountCurrent),
            change: outstandingChange,
            changeLabel: 'vs previous month',
            icon: <GalleryIcon className="h-5 w-5" />
        }
    ];

    const upcomingBookings = React.useMemo(
        () =>
            bookingList
                .filter(
                    (booking) =>
                        activeBookingStatuses.includes(booking.status) &&
                        (dayjs(booking.date).isSame(currentMonth, 'month') || dayjs(booking.date).isAfter(currentMonth))
                )
                .sort((first, second) => dayjs(first.date).valueOf() - dayjs(second.date).valueOf())
                .slice(0, 5),
        [bookingList, currentMonth]
    );

    const openInvoices = React.useMemo(
        () =>
            invoiceList
                .filter((invoice) => invoice.status !== 'Paid')
                .sort((first, second) => dayjs(first.dueDate).valueOf() - dayjs(second.dueDate).valueOf()),
        [invoiceList]
    );

    const analyticsData = React.useMemo(
        () => buildAnalytics(currentMonth, bookingList, invoiceList),
        [bookingList, currentMonth, invoiceList]
    );

    const deliveredGalleries = galleryCollection.filter((gallery) => gallery.status === 'Delivered').length;
    const pendingGalleries = galleryCollection.length - deliveredGalleries;
    const galleryCompletion = galleryCollection.length
        ? Math.round((deliveredGalleries / galleryCollection.length) * 100)
        : 0;
    const pendingGalleryClients = galleryCollection
        .filter((gallery) => gallery.status === 'Pending')
        .map((gallery) => gallery.client);

    const totalClients = clients.filter((client) => client.status !== 'Archived').length;
    const shootsThisYear = bookingList.filter((booking) => dayjs(booking.date).year() === currentMonth.year()).length;
    const outstandingInvoiceCount = openInvoices.length;

    const paidRevenue = invoiceList
        .filter((invoice) => invoice.status === 'Paid')
        .reduce((total, invoice) => total + invoice.amount, 0);
    const earningsGoal = 85000;
    const earningsProgress = Math.min(paidRevenue / earningsGoal, 1);
    const earningsPercentage = Math.round(earningsProgress * 100);
    const earningsRemaining = Math.max(earningsGoal - paidRevenue, 0);

    const profileStats = [
        { id: 'clients', label: 'Active clients', value: totalClients.toString() },
        { id: 'shoots', label: 'Shoots this year', value: shootsThisYear.toString() },
        { id: 'invoices', label: 'Outstanding invoices', value: outstandingInvoiceCount.toString() }
    ];

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

                                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                    {statCards.map((card) => (
                                        <StatCard
                                            key={card.id}
                                            title={card.title}
                                            value={card.value}
                                            change={card.change}
                                            changeLabel={card.changeLabel}
                                            icon={card.icon}
                                        />
                                    ))}
                                </section>

                                <div className="grid gap-6 xl:grid-cols-[2fr_minmax(0,1fr)]">
                                    <OverviewChart data={analyticsData} />
                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-center gap-4">
                                            <Image
                                                src="/images/avatar4.svg"
                                                alt="Avery Logan"
                                                width={64}
                                                height={64}
                                                className="h-16 w-16 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700"
                                            />
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600 dark:text-indigo-400">
                                                    Lead Photographer
                                                </p>
                                                <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Avery Logan</h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">San Francisco Bay Area</p>
                                            </div>
                                        </div>
                                        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                                            {profileStats.map((stat) => (
                                                <div
                                                    key={stat.id}
                                                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40"
                                                >
                                                    <dt className="font-medium text-slate-500 dark:text-slate-400">{stat.label}</dt>
                                                    <dd className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <div className="mt-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/40">
                                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                                <EarningsProgress percentage={earningsPercentage} />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Earnings goal</p>
                                                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                                                        {formatCurrency(paidRevenue)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        Target {formatCurrency(earningsGoal)} · {formatCurrency(earningsRemaining)} to go
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600 dark:text-indigo-400">Galleries</h3>
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                {deliveredGalleries} delivered · {pendingGalleries} pending ({galleryCompletion}% complete)
                                            </p>
                                            <div className="mt-4 flex items-center gap-3">
                                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-500"
                                                        style={{ width: `${galleryCompletion}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{galleryCompletion}%</span>
                                            </div>
                                            {pendingGalleryClients.length > 0 && (
                                                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                                                    Pending: {pendingGalleryClients.join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    </section>
                                </div>

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
                                            <BookingList bookings={upcomingBookings} />
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
                                            <InvoiceTable invoices={openInvoices} />
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

async function readCmsCollection<T>(fileName: string): Promise<T[]> {
    const filePath = path.join(process.cwd(), 'content', 'data', fileName);

    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as CmsCollection<T> | T[];

        if (Array.isArray(parsed)) {
            return parsed as T[];
        }

        if (parsed && typeof parsed === 'object') {
            const items = (parsed as CmsCollection<T>).items;
            if (Array.isArray(items)) {
                return items as T[];
            }
        }
    } catch (error) {
        return [];
    }

    return [];
}

export const getStaticProps: GetStaticProps<PhotographyCrmDashboardProps> = async () => {
    const [bookings, invoices] = await Promise.all([
        readCmsCollection<BookingRecord>('crm-bookings.json'),
        readCmsCollection<InvoiceRecord>('crm-invoices.json')
    ]);

    return {
        props: {
            bookings,
            invoices
        }
    };
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
}

function sumInvoicesForMonth(invoices: InvoiceRecord[], month: dayjs.Dayjs): number {
    return invoices
        .filter((invoice) => dayjs(invoice.dueDate).isSame(month, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);
}

function startOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return value.subtract(value.day(), 'day').startOf('day');
}

function endOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return startOfWeek(value).add(6, 'day').endOf('day');
}

function isWithinRange(value: dayjs.Dayjs, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
    return (value.isAfter(start) || value.isSame(start)) && (value.isBefore(end) || value.isSame(end));
}

function buildAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): Record<'weekly' | 'monthly' | 'yearly', ChartPoint[]> {
    return {
        weekly: buildWeeklyAnalytics(referenceMonth, bookings, invoices),
        monthly: buildMonthlyAnalytics(referenceMonth, bookings, invoices),
        yearly: buildYearlyAnalytics(referenceMonth, bookings, invoices)
    };
}

function buildWeeklyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const weeksToDisplay = 6;
    const result: ChartPoint[] = [];
    const referenceEnd = referenceMonth.endOf('month');

    for (let offset = weeksToDisplay - 1; offset >= 0; offset -= 1) {
        const anchor = referenceEnd.subtract(offset, 'week');
        const weekStart = startOfWeek(anchor);
        const weekEnd = endOfWeek(anchor);

        const shoots = bookings.filter((booking) => isWithinRange(dayjs(booking.date), weekStart, weekEnd)).length;
        const revenue = invoices
            .filter((invoice) => isWithinRange(dayjs(invoice.dueDate), weekStart, weekEnd))
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: weekStart.format('MMM D'),
            shoots,
            revenue
        });
    }

    return result;
}

function buildMonthlyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const monthsToDisplay = 6;
    const result: ChartPoint[] = [];

    for (let offset = monthsToDisplay - 1; offset >= 0; offset -= 1) {
        const month = referenceMonth.subtract(offset, 'month');
        const shoots = bookings.filter((booking) => dayjs(booking.date).isSame(month, 'month')).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).isSame(month, 'month'))
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: month.format('MMM'),
            shoots,
            revenue
        });
    }

    return result;
}

function buildYearlyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[]
): ChartPoint[] {
    const yearsToDisplay = 3;
    const result: ChartPoint[] = [];
    const latestYear = referenceMonth.year();

    for (let offset = yearsToDisplay - 1; offset >= 0; offset -= 1) {
        const year = latestYear - offset;
        const shoots = bookings.filter((booking) => dayjs(booking.date).year() === year).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).year() === year)
            .reduce((total, invoice) => total + invoice.amount, 0);

        result.push({
            label: year.toString(),
            shoots,
            revenue
        });
    }

    return result;
}

type EarningsProgressProps = {
    percentage: number;
};

function EarningsProgress({ percentage }: EarningsProgressProps) {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(percentage, 0), 100);
    const offset = circumference * (1 - clamped / 100);

    return (
        <div className="relative h-32 w-32">
            <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden="true">
                <circle cx="70" cy="70" r={radius} stroke="rgba(148, 163, 184, 0.35)" strokeWidth="12" fill="none" />
                <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#6366F1"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 70 70)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white">{clamped}%</span>
                <span className="text-xs font-medium uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">to goal</span>
            </div>
        </div>
    );
}

type IconProps = React.SVGProps<SVGSVGElement>;

function CalendarIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function InvoiceIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 2h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-2V4a2 2 0 0 1 2-2z" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

function GalleryIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M3 17.5 7.5 13l3 3 3.5-4.5 5 5.5" />
        </svg>
    );
}

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

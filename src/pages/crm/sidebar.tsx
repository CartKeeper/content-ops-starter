import * as React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { EventContentArg, EventInput, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import {
    ClientTable,
    StatusPill,
    WorkspaceLayout,
    type BookingRecord,
    type BookingStatus,
    type ClientRecord,
    type InvoiceRecord,
    type InvoiceStatus
} from '../../components/crm';
import {
    CalendarIcon,
    UsersIcon,
    ReceiptIcon,
    PhotoIcon,
    FolderIcon,
    SettingsIcon,
    SparklesIcon,
    LightningIcon
} from '../../components/crm/icons';
import { galleryCollection, clients, projectPipeline } from '../../data/crm';
import { readCmsCollection } from '../../utils/read-cms-collection';
import { useQuickActionSettings } from '../../components/crm/quick-action-settings';

import type { ProjectRecord, ProjectMilestone, GalleryRecord } from '../../data/crm';

const FullCalendar = dynamic(async () => {
    const mod = await import('@fullcalendar/react');
    return mod.default;
}, { ssr: false });

dayjs.extend(customParseFormat);

type SidebarModuleId = 'calendar' | 'clients' | 'invoices' | 'galleries' | 'projects' | 'settings';

type SidebarModuleDefinition = {
    id: SidebarModuleId;
    label: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    render: () => React.ReactNode;
};

type PhotographySidebarProps = {
    bookings: BookingRecord[];
    invoices: InvoiceRecord[];
};

type CalendarEventExtendedProps = {
    status: BookingStatus;
    location: string;
};

type CalendarEvent = EventInput & {
    id: string;
    title: string;
    start: Date;
    end: Date;
    extendedProps: CalendarEventExtendedProps;
    classNames: string[];
};

const invoiceStatusTone: Record<InvoiceStatus, React.ComponentProps<typeof StatusPill>['tone']> = {
    Draft: 'neutral',
    Sent: 'info',
    Paid: 'success',
    Overdue: 'danger'
};

const SIDEBAR_STATUS_COLORS: Record<BookingStatus, { background: string; border: string }> = {
    Confirmed: { background: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
    Pending: { background: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
    Editing: { background: '#6366f1', border: 'rgba(99, 102, 241, 0.25)' }
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const parseDateTime = (date: string, time: string) => dayjs(`${date} ${time}`, 'YYYY-MM-DD h:mm A');

export default function SidebarWorkspace({ bookings, invoices }: PhotographySidebarProps) {
    const [activeModule, setActiveModule] = React.useState<SidebarModuleId>('calendar');
    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(() =>
        Array.isArray(invoices) ? invoices : []
    );

    const handleUpdateInvoiceStatus = React.useCallback(
        async (id: string, status: InvoiceStatus) => {
            const original = invoiceList.find((invoice) => invoice.id === id);
            if (!original) {
                return;
            }

            setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? { ...invoice, status } : invoice)));

            try {
                const response = await fetch(`/api/crm/invoices?id=${encodeURIComponent(id)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });

                if (!response.ok) {
                    throw new Error('Unable to update invoice status.');
                }

                const payload = (await response.json()) as { data?: InvoiceRecord } | undefined;
                if (payload?.data) {
                    setInvoiceList((previous) =>
                        previous.map((invoice) => (invoice.id === id ? { ...invoice, ...payload.data } : invoice))
                    );
                }
            } catch (error) {
                console.error('Invoice status update failed', error);
                setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? original : invoice)));
            }
        },
        [invoiceList]
    );

    const modules = React.useMemo<SidebarModuleDefinition[]>(
        () => [
            {
                id: 'calendar',
                label: 'Calendar',
                description: 'Plan every shoot with a visual calendar tailored for production schedules.',
                icon: CalendarIcon,
                render: () => <CalendarModule bookings={bookings} />
            },
            {
                id: 'clients',
                label: 'Clients',
                description: 'Search, segment, and add new relationships without leaving your workflow.',
                icon: UsersIcon,
                render: () => <ClientsModule clients={clients} />
            },
            {
                id: 'invoices',
                label: 'Invoices',
                description: 'Track invoice statuses and trigger reminders when payments stall.',
                icon: ReceiptIcon,
                render: () => <InvoicesModule invoices={invoiceList} onUpdateStatus={handleUpdateInvoiceStatus} />
            },
            {
                id: 'galleries',
                label: 'Galleries',
                description: 'Preview delivery-ready galleries and upload new collections in seconds.',
                icon: PhotoIcon,
                render: () => <GalleriesModule galleries={galleryCollection} />
            },
            {
                id: 'projects',
                label: 'Projects',
                description: 'Group multi-day shoots, deliverables, and billing into cohesive project timelines.',
                icon: FolderIcon,
                render: () => <ProjectsModule projects={projectPipeline} />
            },
            {
                id: 'settings',
                label: 'Settings',
                description: 'Update studio branding, availability, and modal presets for every engagement.',
                icon: SettingsIcon,
                render: () => <SettingsModule />
            }
        ],
        [bookings, handleUpdateInvoiceStatus, invoiceList]
    );

    const currentModule = modules.find((module) => module.id === activeModule) ?? modules[0];

    return (
        <>
            <Head>
                <title>Studio Sidebar Modules · Photography CRM</title>
            </Head>
            <WorkspaceLayout>
                <div className="mx-auto flex w-full max-w-7xl flex-col">
                    <header className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-500 dark:text-indigo-300">
                                    Sidebar modules
                                </p>
                                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    Studio Control Center
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    Switch between booking, billing, and delivery workflows without losing the context of your day.
                                </p>
                            </div>
                            <Link
                                href="/crm"
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                Return to dashboard
                            </Link>
                        </div>
                    </header>
                    <div className="flex flex-1 overflow-hidden">
                        <aside className="flex w-20 flex-col border-r border-slate-200 bg-white px-2 py-6 transition-[width] duration-300 ease-out dark:border-slate-800 dark:bg-slate-900 sm:w-24 lg:w-72 lg:px-4">
                            <nav className="flex flex-col gap-2">
                                {modules.map((module) => {
                                    const isActive = module.id === currentModule.id;
                                    return (
                                        <motion.button
                                            key={module.id}
                                            type="button"
                                            onClick={() => setActiveModule(module.id)}
                                            aria-label={module.label}
                                            aria-pressed={isActive}
                                            className={[
                                                'group relative flex w-full items-center justify-center gap-3 rounded-2xl px-2 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                                                'lg:justify-start lg:px-4',
                                                isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-900/40'
                                                    : 'text-slate-600 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800'
                                            ].join(' ')}
                                            initial={false}
                                            whileHover="hover"
                                            whileTap="pressed"
                                        >
                                            <motion.span
                                                className={[
                                                    'flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors',
                                                    isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-indigo-100/70 text-indigo-600 group-hover:bg-indigo-200/90 dark:bg-slate-800 dark:text-indigo-300 dark:group-hover:bg-slate-700'
                                                ].join(' ')}
                                                variants={{
                                                    rest: { scale: 1, rotate: 0 },
                                                    hover: { scale: 1.1, rotate: 5 },
                                                    pressed: { scale: 0.95 },
                                                    active: { scale: 1.05 }
                                                }}
                                                animate={isActive ? 'active' : 'rest'}
                                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                            >
                                                <module.icon className="h-5 w-5" />
                                            </motion.span>
                                            <span className="hidden lg:block">{module.label}</span>
                                            <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-slate-700 lg:hidden">
                                                {module.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </nav>
                        </aside>
                        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6">
                            <div className="mx-auto w-full max-w-5xl">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentModule.id}
                                        initial={{ opacity: 0, y: 24 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -16 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="flex flex-col gap-8"
                                    >
                                        <header className="space-y-2">
                                            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                                <currentModule.icon className="h-4 w-4" />
                                                {currentModule.label}
                                            </div>
                                            <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">{currentModule.label}</h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{currentModule.description}</p>
                                        </header>
                                        {currentModule.render()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </main>
                    </div>
                </div>
            </WorkspaceLayout>
        </>
    );
}

type CalendarModuleProps = {
    bookings: BookingRecord[];
};

function CalendarModule({ bookings }: CalendarModuleProps) {
    const events = React.useMemo<CalendarEvent[]>(
        () =>
            bookings.map((booking) => {
                const start = parseDateTime(booking.date, booking.startTime);
                const endRaw = booking.endTime ? parseDateTime(booking.date, booking.endTime) : start.add(2, 'hour');
                const end = endRaw.isAfter(start) ? endRaw : start.add(2, 'hour');
                const tone = SIDEBAR_STATUS_COLORS[booking.status];

                return {
                    id: booking.id,
                    title: `${booking.client} · ${booking.shootType}`,
                    start: start.toDate(),
                    end: end.toDate(),
                    backgroundColor: tone.background,
                    borderColor: tone.border,
                    textColor: '#fff',
                    display: 'block',
                    classNames: ['crm-event', `crm-event--${booking.status.toLowerCase()}`],
                    extendedProps: {
                        status: booking.status,
                        location: booking.location
                    }
                };
            }),
        [bookings]
    );

    const renderEventContent = React.useCallback((eventInfo: EventContentArg) => {
        const extendedProps = eventInfo.event.extendedProps as CalendarEventExtendedProps | undefined;
        return (
            <div className="crm-event-content">
                <span className="crm-event-title">{eventInfo.event.title}</span>
                {extendedProps?.location ? (
                    <span className="crm-event-location">{extendedProps.location}</span>
                ) : null}
            </div>
        );
    }, []);

    const handleEventDidMount = React.useCallback((info: EventMountArg) => {
        const extendedProps = info.event.extendedProps as CalendarEventExtendedProps | undefined;
        if (!extendedProps) {
            return;
        }

        const tone = SIDEBAR_STATUS_COLORS[extendedProps.status];
        if (info.view.type.startsWith('list')) {
            const dot = info.el.querySelector('.fc-list-event-dot');
            if (dot instanceof HTMLElement) {
                dot.style.borderColor = tone.background;
                dot.style.backgroundColor = tone.background;
            }
        }
    }, []);

    return (
        <section className="space-y-6">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Production schedule</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Confirmed shoots are highlighted so you can spot critical days instantly.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <LegendDot color="bg-emerald-500">Confirmed</LegendDot>
                        <LegendDot color="bg-amber-500">Pending</LegendDot>
                        <LegendDot color="bg-indigo-500">Editing</LegendDot>
                    </div>
                </div>
                <div className="crm-calendar h-[580px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            start: 'prev,next today',
                            center: 'title',
                            end: 'dayGridMonth,timeGridWeek,listWeek'
                        }}
                        buttonText={{
                            today: 'Today',
                            dayGridMonth: 'Month',
                            timeGridWeek: 'Week',
                            listWeek: 'Agenda'
                        }}
                        height="100%"
                        events={events}
                        eventContent={renderEventContent}
                        eventDidMount={handleEventDidMount}
                        nowIndicator
                        dayMaxEventRows={3}
                        slotDuration="00:30:00"
                        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
                        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                        displayEventTime
                    />
                </div>
            </div>
            <UpcomingShoots bookings={bookings} />
        </section>
    );
}

function UpcomingShoots({ bookings }: { bookings: BookingRecord[] }) {
    const upcoming = React.useMemo(() => {
        const today = dayjs();
        return bookings
            .filter((booking) => dayjs(booking.date).isSame(today, 'day') || dayjs(booking.date).isAfter(today))
            .sort((first, second) => dayjs(first.date).valueOf() - dayjs(second.date).valueOf())
            .slice(0, 4);
    }, [bookings]);

    if (upcoming.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Next up</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your next confirmed sessions and in-progress edits.</p>
            <ul className="mt-4 space-y-4">
                {upcoming.map((booking) => (
                    <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{booking.client}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{booking.shootType}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                            <p>{dayjs(booking.date).format('ddd, MMM D')}</p>
                            <p>
                                {booking.startTime}
                                {booking.endTime ? ` – ${booking.endTime}` : ''}
                            </p>
                        </div>
                        <StatusPill tone={statusToneForBooking(booking.status)}>{booking.status}</StatusPill>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function statusToneForBooking(status: BookingStatus): React.ComponentProps<typeof StatusPill>['tone'] {
    if (status === 'Confirmed') {
        return 'success';
    }

    if (status === 'Pending') {
        return 'warning';
    }

    return 'info';
}

type ClientsModuleProps = {
    clients: ClientRecord[];
};

function ClientsModule({ clients }: ClientsModuleProps) {
    const [query, setQuery] = React.useState('');

    const filteredClients = React.useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return clients;
        }
        return clients.filter((client) => {
            const haystack = [client.name, client.email, client.phone, client.status].join(' ').toLowerCase();
            return haystack.includes(normalized);
        });
    }, [clients, query]);

    const summary = React.useMemo(() => {
        const total = clients.length;
        const active = clients.filter((client) => client.status === 'Active').length;
        const leads = clients.filter((client) => client.status === 'Lead').length;
        return { total, active, leads };
    }, [clients]);

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Client directory</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Search by name or email. Capture new leads with a single click.
                    </p>
                </div>
                <button className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <SparklesIcon className="h-4 w-4" /> Quick add client
                </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search clients..."
                        className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                </div>
                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/60 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                        Active {summary.active}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                        Leads {summary.leads}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-200/70 px-3 py-1 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                        Total {summary.total}
                    </span>
                </div>
            </div>
            {filteredClients.length > 0 ? (
                <ClientTable clients={filteredClients} />
            ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                    <UsersIcon className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                    <p className="text-base font-semibold text-slate-900 dark:text-white">No clients found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Try a different search or add a new profile to keep momentum going.
                    </p>
                    <button className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        <LightningIcon className="h-4 w-4" /> Add client
                    </button>
                </div>
            )}
        </section>
    );
}

type InvoicesModuleProps = {
    invoices: InvoiceRecord[];
    onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
};

const invoiceStatuses: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

function InvoicesModule({ invoices, onUpdateStatus }: InvoicesModuleProps) {
    const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus>('Sent');

    const grouped = React.useMemo(() => {
        return invoiceStatuses.reduce<Record<InvoiceStatus, InvoiceRecord[]>>((accumulator, status) => {
            accumulator[status] = invoices.filter((invoice) => invoice.status === status);
            return accumulator;
        }, { Draft: [], Sent: [], Paid: [], Overdue: [] });
    }, [invoices]);

    const filteredInvoices = React.useMemo(() => grouped[statusFilter] ?? [], [grouped, statusFilter]);

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Invoice status board</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Follow up on overdue balances or send drafts with a single click.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {invoiceStatuses.map((status) => (
                        <span key={status} className="inline-flex items-center gap-1 rounded-full bg-slate-200/60 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                            {status} {grouped[status]?.length ?? 0}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {invoiceStatuses.map((status) => {
                    const isActive = status === statusFilter;
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setStatusFilter(status)}
                            className={[
                                'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition',
                                isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            ].join(' ')}
                        >
                            {status}
                        </button>
                    );
                })}
            </div>
            <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                    <InvoiceActionCard key={invoice.id} invoice={invoice} onUpdateStatus={onUpdateStatus} />
                ))}
                {filteredInvoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                        <ReceiptIcon className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                        <p className="text-base font-semibold text-slate-900 dark:text-white">No invoices in this status</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Create a new invoice or revisit another status tab to keep cashflow moving.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

function InvoiceActionCard({
    invoice,
    onUpdateStatus
}: {
    invoice: InvoiceRecord;
    onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
}) {
    const handleStatusChange = (status: InvoiceStatus) => {
        onUpdateStatus?.(invoice.id, status);
    };

    const showMarkSent = invoice.status === 'Draft' || invoice.status === 'Overdue';
    const showMarkOverdue = invoice.status === 'Sent';
    const showMarkPaid = invoice.status === 'Sent' || invoice.status === 'Overdue';

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                        Invoice {invoice.id}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{invoice.client}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.project}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Due {dayjs(invoice.dueDate).format('MMM D, YYYY')}</p>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <StatusPill tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusPill>
                <div className="ml-auto flex flex-wrap gap-3 text-sm font-semibold">
                    {showMarkSent ? (
                        <button
                            type="button"
                            onClick={() => handleStatusChange('Sent')}
                            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                            Mark sent
                        </button>
                    ) : null}
                    {showMarkOverdue ? (
                        <button
                            type="button"
                            onClick={() => handleStatusChange('Overdue')}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        >
                            Mark overdue
                        </button>
                    ) : null}
                    {showMarkPaid ? (
                        <button
                            type="button"
                            onClick={() => handleStatusChange('Paid')}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        >
                            Mark paid
                        </button>
                    ) : null}
                    {invoice.pdfUrl ? (
                        <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Download PDF
                        </a>
                    ) : null}
                    {invoice.paymentLink ? (
                        <a
                            href={invoice.paymentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                        >
                            Pay online
                        </a>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

type GalleriesModuleProps = {
    galleries: GalleryRecord[];
};

function GalleriesModule({ galleries }: GalleriesModuleProps) {
    const delivered = galleries.filter((gallery) => gallery.status === 'Delivered').length;
    const pending = galleries.filter((gallery) => gallery.status === 'Pending').length;
    const completion = galleries.length ? Math.round((delivered / galleries.length) * 100) : 0;
    const today = dayjs().startOf('day');
    const expirationWarningThreshold = 30;

    const expiringSoon = galleries.filter((gallery) => {
        if (gallery.status !== 'Delivered' || !gallery.expiresAt) {
            return false;
        }

        const expiresAt = dayjs(gallery.expiresAt);
        if (!expiresAt.isValid()) {
            return false;
        }

        const daysRemaining = expiresAt.startOf('day').diff(today, 'day');
        return daysRemaining >= 0 && daysRemaining <= expirationWarningThreshold;
    }).length;

    const expired = galleries.filter((gallery) => {
        if (gallery.status !== 'Delivered' || !gallery.expiresAt) {
            return false;
        }

        const expiresAt = dayjs(gallery.expiresAt);
        return expiresAt.isValid() && expiresAt.startOf('day').isBefore(today);
    }).length;

    return (
        <section className="relative space-y-6 pb-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Gallery pipeline</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Keep tabs on gallery delivery progress and respond before deadlines slip.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                            Delivered {delivered}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-200/70 px-3 py-1 font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                            Pending {pending}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-200/70 px-3 py-1 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                            {completion}% complete
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-3 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                            Expiring soon {expiringSoon}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-200/70 px-3 py-1 font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                            Expired {expired}
                        </span>
                    </div>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {galleries.map((gallery) => (
                        <article
                            key={gallery.id}
                            className={[
                                'overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900',
                                (() => {
                                    if (gallery.status === 'Delivered' && gallery.expiresAt) {
                                        const expiresAt = dayjs(gallery.expiresAt);
                                        if (expiresAt.isValid()) {
                                            const daysRemaining = expiresAt.startOf('day').diff(today, 'day');
                                            if (daysRemaining < 0) {
                                                return 'border-rose-300/80 dark:border-rose-500/50';
                                            }
                                            if (daysRemaining <= expirationWarningThreshold) {
                                                return 'border-amber-300/80 dark:border-amber-400/50';
                                            }
                                        }
                                    }

                                    return 'border-slate-200 dark:border-slate-800';
                                })()
                            ].join(' ')}
                        >
                            <div className="relative h-44 overflow-hidden">
                                <Image
                                    src={gallery.coverImage ?? '/images/img-placeholder.svg'}
                                    alt={gallery.client}
                                    fill
                                    sizes="(min-width: 1280px) 320px, (min-width: 640px) 50vw, 100vw"
                                    className="object-cover"
                                />
                                <div
                                    className={[
                                        'absolute left-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur',
                                        (() => {
                                            if (gallery.status === 'Delivered' && gallery.expiresAt) {
                                                const expiresAt = dayjs(gallery.expiresAt);
                                                if (expiresAt.isValid()) {
                                                    const daysRemaining = expiresAt.startOf('day').diff(today, 'day');
                                                    if (daysRemaining < 0) {
                                                        return 'bg-[#FFE6F5]/90 text-[#D61B7B] dark:bg-[#4D1331]/80 dark:text-[#FF9FD8]';
                                                    }
                                                    if (daysRemaining <= expirationWarningThreshold) {
                                                        return 'bg-amber-100/90 text-amber-700 dark:bg-amber-500/30 dark:text-amber-100';
                                                    }
                                                }
                                            }

                                            return 'bg-white/80 text-slate-700 dark:bg-slate-900/80 dark:text-slate-200';
                                        })()
                                    ].join(' ')}
                                >
                                    {(() => {
                                        if (gallery.status === 'Delivered' && gallery.expiresAt) {
                                            const expiresAt = dayjs(gallery.expiresAt);
                                            if (expiresAt.isValid()) {
                                                const daysRemaining = expiresAt.startOf('day').diff(today, 'day');
                                                if (daysRemaining < 0) {
                                                    return 'Expired';
                                                }
                                                if (daysRemaining <= expirationWarningThreshold) {
                                                    return 'Expires soon';
                                                }
                                            }
                                        }

                                        return gallery.status;
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-2 px-5 py-4">
                                <h4 className="text-base font-semibold text-slate-900 dark:text-white">{gallery.client}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{gallery.shootType}</p>
                                {gallery.projectId ? (
                                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                        {gallery.projectId}
                                    </p>
                                ) : null}
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {(() => {
                                        if (gallery.status === 'Delivered') {
                                            const deliveredAt = gallery.deliveredAt ? dayjs(gallery.deliveredAt) : null;
                                            const expiresAt = gallery.expiresAt ? dayjs(gallery.expiresAt) : null;

                                            if (expiresAt && expiresAt.isValid()) {
                                                return expiresAt.startOf('day').diff(today, 'day') < 0
                                                    ? `Expired ${expiresAt.format('MMM D, YYYY')}`
                                                    : `Expires ${expiresAt.format('MMM D, YYYY')}`;
                                            }

                                            if (deliveredAt && deliveredAt.isValid()) {
                                                return `Delivered ${deliveredAt.format('MMM D, YYYY')}`;
                                            }

                                            return 'Delivered';
                                        }

                                        const dueDate = gallery.deliveryDueDate ? dayjs(gallery.deliveryDueDate) : null;
                                        return dueDate && dueDate.isValid()
                                            ? `Due ${dueDate.format('MMM D, YYYY')}`
                                            : 'Delivery date pending';
                                    })()}
                                </p>
                                {(() => {
                                    if (gallery.status !== 'Delivered' || !gallery.expiresAt) {
                                        return null;
                                    }

                                    const expiresAt = dayjs(gallery.expiresAt);
                                    if (!expiresAt.isValid()) {
                                        return null;
                                    }

                                    const daysRemaining = expiresAt.startOf('day').diff(today, 'day');
                                    const toneClass =
                                        daysRemaining < 0
                                            ? 'text-[#D61B7B] dark:text-[#FF9FD8]'
                                            : daysRemaining <= expirationWarningThreshold
                                              ? 'text-amber-600 dark:text-amber-300'
                                              : 'text-slate-500 dark:text-slate-400';

                                    const label =
                                        daysRemaining < 0
                                            ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
                                            : daysRemaining === 0
                                              ? 'Expires today'
                                              : daysRemaining === 1
                                                ? 'Expires tomorrow'
                                                : `Expires in ${daysRemaining} days`;

                                    return <p className={['text-xs font-semibold', toneClass].join(' ')}>{label}</p>;
                                })()}
                                {gallery.reminderSentAt ? (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                        Reminder sent {dayjs(gallery.reminderSentAt).format('MMM D, YYYY')}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
            <button className="group absolute bottom-0 right-4 inline-flex -translate-y-4 items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-indigo-600">
                <PhotoIcon className="h-5 w-5" /> Upload gallery
            </button>
        </section>
    );
}

type ProjectsModuleProps = {
    projects: ProjectRecord[];
};

function ProjectsModule({ projects }: ProjectsModuleProps) {
    return (
        <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Project pipeline</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Multi-day shoots, approvals, and billing checkpoints organised into a single view.
                </p>
                <div className="mt-6 space-y-6">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function ProjectCard({ project }: { project: ProjectRecord }) {
    const dateRange = `${dayjs(project.startDate).format('MMM D')} – ${dayjs(project.endDate).format('MMM D')}`;
    const progressPercent = Math.round(project.progress * 100);
    const upcoming = nextShoot(project.shoots);

    return (
        <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-500 dark:text-indigo-300">
                        {project.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-indigo-100/70 px-3 py-1 font-semibold dark:bg-indigo-500/20">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{project.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{project.client} · {dateRange}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Progress</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{progressPercent}%</p>
                </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{project.description}</p>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Shoots</p>
                    <ul className="mt-2 space-y-2">
                        {project.shoots.map((shoot) => (
                            <li key={shoot.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{shoot.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {dayjs(shoot.date).format('MMM D')} · {shoot.location}
                                    </p>
                                </div>
                                <StatusPill tone={statusToneForBooking(shoot.status)}>{shoot.status}</StatusPill>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Next step</p>
                    {upcoming ? (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                            <p className="font-semibold text-slate-900 dark:text-white">{upcoming.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {dayjs(upcoming.date).format('ddd, MMM D')} · {upcoming.location}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                            All project shoots are complete.
                        </div>
                    )}
                    <div className="mt-4 space-y-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Invoices</p>
                        {project.invoices.map((invoice) => (
                            <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Invoice {invoice.id}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {dayjs(invoice.dueDate).format('MMM D, YYYY')} · {formatCurrency(invoice.amount)}
                                    </p>
                                </div>
                                <StatusPill tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusPill>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
}

function nextShoot(shoots: ProjectMilestone[]): ProjectMilestone | undefined {
    const today = dayjs();
    return shoots
        .filter((shoot) => dayjs(shoot.date).isSame(today, 'day') || dayjs(shoot.date).isAfter(today))
        .sort((first, second) => dayjs(first.date).valueOf() - dayjs(second.date).valueOf())[0];
}

function SettingsModule() {
    const { fields, activeFields, setFieldActive } = useQuickActionSettings();

    return (
        <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Profile & availability</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Update photographer details that power your proposals, contracts, and client-facing touchpoints.
                    </p>
                    <form className="mt-4 space-y-4 text-sm">
                        <div>
                            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="studio-name">
                                Studio name
                            </label>
                            <input
                                id="studio-name"
                                defaultValue="Avery Logan Studio"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="studio-email">
                                    Contact email
                                </label>
                                <input
                                    id="studio-email"
                                    type="email"
                                    defaultValue="hello@averylogan.studio"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="studio-timezone">
                                    Timezone
                                </label>
                                <select
                                    id="studio-timezone"
                                    defaultValue="America/Los_Angeles"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                >
                                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                    <option value="America/Denver">Mountain Time (MT)</option>
                                    <option value="America/Chicago">Central Time (CT)</option>
                                    <option value="America/New_York">Eastern Time (ET)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="studio-signature">
                                Email signature
                            </label>
                            <textarea
                                id="studio-signature"
                                rows={3}
                                defaultValue={`Warmly,\nAvery Logan\nLead Photographer`}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                        </div>
                    </form>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Branding & experience</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tailor gallery aesthetics and proposal details to match your studio identity.
                    </p>
                    <form className="mt-4 space-y-4 text-sm">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="brand-color">
                                    Primary color
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="brand-color"
                                        type="color"
                                        defaultValue="#6366F1"
                                        className="h-10 w-16 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                    />
                                    <input
                                        defaultValue="#6366F1"
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="accent-color">
                                    Accent color
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="accent-color"
                                        type="color"
                                        defaultValue="#F59E0B"
                                        className="h-10 w-16 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                    />
                                    <input
                                        defaultValue="#F59E0B"
                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="brand-font">
                                Typeface presets
                            </label>
                            <select
                                id="brand-font"
                                defaultValue="Playfair Display & Inter"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                <option value="Playfair Display & Inter">Playfair Display & Inter</option>
                                <option value="Manrope & Source Sans">Manrope & Source Sans</option>
                                <option value="DM Serif & Rubik">DM Serif & Rubik</option>
                            </select>
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700">
                            <p className="font-semibold text-slate-900 dark:text-white">Gallery watermark</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upload a transparent PNG to brand gallery previews.</p>
                            <button className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                                Upload watermark
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Custom modal fields</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Configure the quick fields that appear in booking, invoice, and gallery modals.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => {
                        const isActive = activeFields[field.id] !== false;
                        return (
                            <label
                                key={field.id}
                                className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-500/40"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <span className="font-semibold text-slate-900 dark:text-white">{field.label}</span>
                                        <div className="mt-1 flex flex-wrap gap-1 text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-indigo-500 dark:text-indigo-300">
                                            {field.modalTypes.map((type) => (
                                                <span
                                                    key={type}
                                                    className="rounded-full bg-indigo-100/60 px-2 py-0.5 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200"
                                                >
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(event) => setFieldActive(field.id, event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                                    />
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{field.description}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

type LegendDotProps = {
    color: string;
    children: React.ReactNode;
};

function LegendDot({ color, children }: LegendDotProps) {
    return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
            {children}
        </span>
    );
}

export const getStaticProps: GetStaticProps<PhotographySidebarProps> = async () => {
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


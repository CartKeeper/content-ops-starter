import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';

import {
    BookingList,
    ClientTable,
    DashboardCard,
    InvoiceTable,
    SectionCard,
    TaskList,
    type BookingRecord,
    type ClientRecord,
    type ClientStatus,
    type InvoiceRecord,
    type TaskRecord
} from '../../components/crm';

export type CRMPageProps = {
    clients?: ClientRecord[];
    isSupabaseConnected?: boolean;
    supabaseError?: string | null;
};

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

const sampleClients: ClientRecord[] = [
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

type SupabaseClientRow = Record<string, unknown>;

const parseString = (value: unknown): string => {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return '';
};

const parseNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    }

    return 0;
};

const parseDate = (value: unknown): string => {
    if (!value) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }

    return '';
};

const normalizeStatus = (value: unknown): ClientStatus => {
    if (typeof value !== 'string') {
        return 'Active';
    }

    const normalized = value.trim().toLowerCase();

    if (['lead', 'prospect', 'new', 'potential'].includes(normalized)) {
        return 'Lead';
    }

    if (['archived', 'inactive', 'former', 'lost', 'closed'].includes(normalized)) {
        return 'Archived';
    }

    return 'Active';
};

const resolveId = (row: SupabaseClientRow, index: number): string => {
    const candidates = [row.id, row.uuid, row.client_id, row.external_id, row.email];

    for (const candidate of candidates) {
        const stringCandidate = parseString(candidate);
        if (stringCandidate) {
            return stringCandidate;
        }
    }

    const name = parseString(row.name);

    if (name) {
        return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
    }

    return `client-${index}`;
};

const combineName = (row: SupabaseClientRow): string => {
    const directName = parseString(row.name);

    if (directName) {
        return directName;
    }

    const firstName = parseString(row.first_name ?? row.firstName);
    const lastName = parseString(row.last_name ?? row.lastName);
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim();

    return combined || 'Unnamed Client';
};

const normalizeClients = (rows: SupabaseClientRow[]): ClientRecord[] =>
    rows.map((row, index) => {
        const lastShoot = parseDate(
            row.lastShoot ??
                row.last_shoot ??
                row.last_session ??
                row.lastSession ??
                row.last_shoot_date ??
                row.lastSessionAt
        );
        const upcoming = parseDate(
            row.upcomingShoot ??
                row.upcoming_shoot ??
                row.next_session ??
                row.nextShoot ??
                row.next_shoot_date ??
                row.nextSessionAt
        );
        const phone = parseString(
            row.phone ??
                row.phone_number ??
                row.phoneNumber ??
                row.mobile ??
                row.mobile_number ??
                row.telephone
        );

        return {
            id: resolveId(row, index),
            name: combineName(row),
            email: parseString(row.email) || '—',
            phone: phone || undefined,
            shoots:
                parseNumber(
                    row.shoots ??
                        row.sessions ??
                        row.session_count ??
                        row.total_shoots ??
                        row.bookings_count ??
                        row.projects_count
                ) || 0,
            lastShoot: lastShoot || '',
            upcomingShoot: upcoming || undefined,
            status: normalizeStatus(row.status ?? row.client_status ?? row.stage ?? row.state)
        };
    });

export default function PhotographyCrmDashboard({
    clients = sampleClients,
    isSupabaseConnected = false,
    supabaseError = null
}: CRMPageProps) {
    const hasSupabaseClients = isSupabaseConnected && (clients?.length ?? 0) > 0;
    const showEmptyState = isSupabaseConnected && (clients?.length ?? 0) === 0;
    const displayedClients = hasSupabaseClients ? (clients as ClientRecord[]) : sampleClients;

    return (
        <>
            <Head>
                <title>Photography CRM Dashboard</title>
                <meta
                    name="description"
                    content="Command center for managing photography clients, shoots and invoices."
                />
            </Head>
            <main className="min-h-screen bg-slate-50 pb-16">
                <div className="mx-auto max-w-7xl px-6 pt-12">
                    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                                Studio Command Center
                            </p>
                            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
                                Photography CRM Dashboard
                            </h1>
                            <p className="mt-3 max-w-2xl text-base text-slate-600">
                                Track client relationships, keep shoots on schedule, and stay ahead of deliverables—all from a
                                single workspace designed for busy photographers.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </header>

                    <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric) => (
                            <DashboardCard key={metric.id} title={metric.title} value={metric.value} trend={metric.trend} />
                        ))}
                    </section>

                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <SectionCard
                                title="Upcoming Shoots"
                                description="Stay ready for every session with a quick view of the week ahead."
                                action={<button className="text-sm font-semibold text-indigo-600">Open calendar</button>}
                            >
                                <BookingList bookings={bookings} />
                            </SectionCard>

                            <SectionCard
                                title="Active Clients"
                                description="From loyal regulars to new leads, see who needs attention next."
                                action={<button className="text-sm font-semibold text-indigo-600">View all clients</button>}
                            >
                                {!isSupabaseConnected && (
                                    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        {supabaseError ||
                                            'Connect your Supabase project to replace these sample contacts with live CRM data.'}
                                    </div>
                                )}

                                {isSupabaseConnected && hasSupabaseClients && (
                                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                        Synced {clients.length} contact{clients.length === 1 ? '' : 's'} from Supabase.
                                    </div>
                                )}

                                {showEmptyState ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                        You haven't added any contacts to Supabase yet. Add a record to the{' '}
                                        <code className="font-mono text-xs">clients</code> table to see it here.
                                    </div>
                                ) : (
                                    <ClientTable clients={displayedClients} />
                                )}
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
                                action={<button className="text-sm font-semibold text-indigo-600">Create task</button>}
                            >
                                <TaskList tasks={tasks} />
                            </SectionCard>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export const getServerSideProps: GetServerSideProps<CRMPageProps> = async () => {
    try {
        const { getSupabaseClient } = await import('../../utils/supabase-client');
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.from('clients').select('*');

        if (error) {
            throw error;
        }

        const rows = Array.isArray(data) ? data : [];
        const normalizedClients = normalizeClients(rows);

        return {
            props: {
                clients: normalizedClients,
                isSupabaseConnected: true,
                supabaseError: null
            }
        };
    } catch (error) {
        console.error('Failed to load clients from Supabase', error);
        return {
            props: {
                clients: sampleClients,
                isSupabaseConnected: false,
                supabaseError:
                    'We could not connect to Supabase, so sample contacts are shown instead. Double-check your SUPABASE_URL and key environment variables.'
            }
        };
    }
};

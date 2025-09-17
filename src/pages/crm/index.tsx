import * as React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import fs from 'fs/promises';
import path from 'path';

import {
    BookingList,
    ClientTable,
    CrmAuthGuard,
    DashboardCard,
    InvoiceTable,
    OverviewChart,
    SectionCard,
    StatCard,
    TaskList,
    WorkspaceLayout,
    useCrmAuth,
    type BookingRecord,
    type BookingStatus,
    type ChartPoint,
    type ClientRecord,
    type InvoiceRecord,
    type TaskRecord,
    type Timeframe
} from '../../components/crm';
import { useNetlifyIdentity } from '../../components/auth';
import { adminUser, tasks as defaultTasks, type AdminUser } from '../../data/crm';
import type { InvoiceStatus } from '../../types/invoice';
import { readCmsCollection } from '../../utils/read-cms-collection';
import { useAutoDismiss } from '../../utils/use-auto-dismiss';

dayjs.extend(isBetween);

type CmsBookingEntry = {
    client?: string;
    date?: string;
    time?: string;
    location?: string;
    shoot_type?: string;
    status?: string;
};

type CmsClientEntry = {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    related_projects?: string[];
};

type CmsInvoiceEntry = {
    client?: string;
    amount?: number;
    due_date?: string;
    status?: string;
    pdf_url?: string;
};

type CmsSettings = {
    brand_logo?: string;
    brand_colors?: string[];
    notification_prefs?: Record<string, string>;
    custom_fields?: Array<{ label?: string; value?: string }>;
};

type SecondaryPanelVisibility = {
    upcomingShoots?: boolean;
    activeClients?: boolean;
    openInvoices?: boolean;
    studioTasks?: boolean;
};

type DashboardMetrics = {
    scheduledThisWeek: number;
    scheduledChange: number;
    paidThisMonth: number;
    revenueChange: number;
    outstandingBalance: number;
    outstandingChange: number;
    retentionRate: number;
    retentionChange: number;
    activeClientCount: number;
};

type CrmPageProps = {
    bookings: BookingRecord[];
    upcomingBookings: BookingRecord[];
    clients: ClientRecord[];
    invoices: InvoiceRecord[];
    tasks: TaskRecord[];
    chartData: Record<Timeframe, ChartPoint[]>;
    metrics: DashboardMetrics;
    studioName: string;
    settings: CmsSettings | null;
    secondaryPanelVisibility: SecondaryPanelVisibility;
};

type FeedbackNotice = {
    id: string;
    type: 'success' | 'error';
    message: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const preciseCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Editing'];
const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

function formatCurrency(value: number): string {
    return currencyFormatter.format(Math.round(value));
}

function formatCurrencyExact(value: number): string {
    return preciseCurrencyFormatter.format(value);
}

function normalizeBookingStatus(value: string | undefined): BookingStatus {
    if (!value) {
        return 'Pending';
    }

    const normalized = value.trim();
    const match = BOOKING_STATUSES.find((status) => status.toLowerCase() === normalized.toLowerCase());
    return match ?? 'Pending';
}

function normalizeInvoiceStatus(value: string | undefined): InvoiceStatus {
    if (!value) {
        return 'Draft';
    }

    const normalized = value.trim();
    const match = INVOICE_STATUSES.find((status) => status.toLowerCase() === normalized.toLowerCase());
    return match ?? 'Draft';
}

function parseTimeRange(value: string | undefined): { start: string; end?: string } {
    if (!value) {
        return { start: '09:00 AM', end: undefined };
    }

    const separator = value.includes('–') ? '–' : value.includes('-') ? '-' : null;
    if (!separator) {
        return { start: value.trim() };
    }

    const [start, end] = value.split(separator).map((part) => part.trim());
    return { start: start || '09:00 AM', end: end || undefined };
}

function getInvoiceTotal(invoice: InvoiceRecord): number {
    if (invoice.totals && Number.isFinite(invoice.totals.total)) {
        return invoice.totals.total;
    }

    if (Number.isFinite(invoice.amount)) {
        return invoice.amount;
    }

    return 0;
}

function computePercentChange(previous: number, current: number): number {
    if (!Number.isFinite(previous) || previous === 0) {
        if (!Number.isFinite(current) || current === 0) {
            return 0;
        }
        return 100;
    }

    return ((current - previous) / previous) * 100;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
        return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }
    return defaultValue;
}

function resolveEnvBoolean(keys: string[], defaultValue: boolean): boolean | undefined {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined) {
            return parseBoolean(value, defaultValue);
        }
    }
    return undefined;
}

function resolvePanelVisibility(settings: CmsSettings | null): SecondaryPanelVisibility {
    const defaults: SecondaryPanelVisibility = {
        upcomingShoots: true,
        activeClients: true,
        openInvoices: true,
        studioTasks: true
    };

    const resolved: SecondaryPanelVisibility = { ...defaults };

    if (settings?.custom_fields) {
        const labelMap: Record<string, keyof SecondaryPanelVisibility> = {
            'show upcoming shoots': 'upcomingShoots',
            'show active clients': 'activeClients',
            'show open invoices': 'openInvoices',
            'show studio tasks': 'studioTasks'
        };

        settings.custom_fields.forEach((field) => {
            if (!field?.label) {
                return;
            }
            const normalized = field.label.trim().toLowerCase();
            const key = labelMap[normalized];
            if (!key) {
                return;
            }
            resolved[key] = parseBoolean(field.value, resolved[key] ?? true);
        });
    }

    const envKeys: Record<keyof SecondaryPanelVisibility, string[]> = {
        upcomingShoots: ['NEXT_PUBLIC_CRM_SHOW_UPCOMING_SHOOTS', 'CRM_SHOW_UPCOMING_SHOOTS'],
        activeClients: ['NEXT_PUBLIC_CRM_SHOW_ACTIVE_CLIENTS', 'CRM_SHOW_ACTIVE_CLIENTS'],
        openInvoices: ['NEXT_PUBLIC_CRM_SHOW_OPEN_INVOICES', 'CRM_SHOW_OPEN_INVOICES'],
        studioTasks: ['NEXT_PUBLIC_CRM_SHOW_STUDIO_TASKS', 'CRM_SHOW_STUDIO_TASKS']
    };

    (Object.keys(envKeys) as Array<keyof SecondaryPanelVisibility>).forEach((key) => {
        const override = resolveEnvBoolean(envKeys[key], resolved[key] ?? true);
        if (override !== undefined) {
            resolved[key] = override;
        }
    });

    return resolved;
}

function createBookingRecords(entries: CmsBookingEntry[]): BookingRecord[] {
    return entries.map((entry, index) => {
        const name = entry.client?.trim() || `Client ${index + 1}`;
        const shootType = entry.shoot_type?.trim() || 'Custom session';
        const location = entry.location?.trim() || 'Studio TBA';
        const normalizedDate = dayjs(entry.date).isValid()
            ? dayjs(entry.date).format('YYYY-MM-DD')
            : dayjs().add(index, 'day').format('YYYY-MM-DD');
        const { start, end } = parseTimeRange(entry.time);

        const baseRecord: BookingRecord = {
            id: `booking-${index + 1}`,
            client: name,
            shootType,
            date: normalizedDate,
            startTime: start,
            endTime: end,
            location,
            status: normalizeBookingStatus(entry.status)
        };

        return entry.time ? { ...baseRecord, customFields: { timeframe: entry.time } } : baseRecord;
    });
}

type ClientAggregationResult = {
    clients: ClientRecord[];
    activeClientCount: number;
    retentionRate: number;
    previousRetentionRate: number;
};

function buildClientRecords(cmsClients: CmsClientEntry[], bookings: BookingRecord[]): ClientAggregationResult {
    const now = dayjs();
    const ninetyDaysAgo = now.subtract(90, 'day');
    const oneEightyDaysAgo = now.subtract(180, 'day');

    type ClientStats = {
        total: number;
        lastShoot?: dayjs.Dayjs;
        nextShoot?: dayjs.Dayjs;
        bookings: dayjs.Dayjs[];
        phone?: string;
        email?: string;
    };

    const statsMap = new Map<string, ClientStats>();

    function getStats(clientName: string): ClientStats {
        const existing = statsMap.get(clientName);
        if (existing) {
            return existing;
        }
        const created: ClientStats = { total: 0, bookings: [] };
        statsMap.set(clientName, created);
        return created;
    }

    bookings.forEach((booking) => {
        const stats = getStats(booking.client);
        const bookingDate = dayjs(booking.date);
        stats.total += 1;
        stats.bookings.push(bookingDate);

        if (!stats.lastShoot || bookingDate.isAfter(stats.lastShoot)) {
            stats.lastShoot = bookingDate;
        }

        if (bookingDate.isAfter(now)) {
            if (!stats.nextShoot || bookingDate.isBefore(stats.nextShoot)) {
                stats.nextShoot = bookingDate;
            }
        }
    });

    cmsClients.forEach((client) => {
        const name = client.name?.trim();
        if (!name) {
            return;
        }
        const stats = getStats(name);
        stats.phone = client.phone ?? stats.phone;
        stats.email = client.email ?? stats.email;
    });

    const currentActive = new Set<string>();
    const previousActive = new Set<string>();

    const buildRecord = (name: string, stats: ClientStats): ClientRecord => {
        const lastShoot = stats.lastShoot?.format('YYYY-MM-DD') ?? undefined;
        const upcoming = stats.nextShoot?.format('YYYY-MM-DD') ?? undefined;
        const hasRecent = stats.bookings.some((bookingDate) => bookingDate.isAfter(ninetyDaysAgo));
        const hadPriorRecent = stats.bookings.some((bookingDate) =>
            bookingDate.isBetween(oneEightyDaysAgo, ninetyDaysAgo, 'day', '[]')
        );

        let status: ClientRecord['status'] = 'Archived';
        if (hasRecent || upcoming) {
            status = 'Active';
            currentActive.add(name);
        } else if (stats.total > 0) {
            status = 'Lead';
        }

        if (hadPriorRecent) {
            previousActive.add(name);
        }

        const record: ClientRecord = {
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `client-${statsMap.size}`,
            name,
            email: stats.email ?? 'hello@example.com',
            shoots: stats.total,
            lastShoot: lastShoot ?? now.format('YYYY-MM-DD'),
            status
        };

        if (stats.phone) {
            record.phone = stats.phone;
        }

        if (upcoming) {
            record.upcomingShoot = upcoming;
        }

        return record;
    };

    const clientRecords: ClientRecord[] = [];

    cmsClients.forEach((client, index) => {
        const name = client.name?.trim();
        if (!name) {
            return;
        }
        const stats = getStats(name);
        clientRecords.push(buildRecord(name, stats));
    });

    statsMap.forEach((stats, name) => {
        const alreadyIncluded = clientRecords.some((record) => record.name === name);
        if (!alreadyIncluded) {
            clientRecords.push(buildRecord(name, stats));
        }
    });

    const totalClients = clientRecords.length || 1;
    const retentionRate = (currentActive.size / totalClients) * 100;
    const previousRetentionRate = (previousActive.size / totalClients) * 100;

    clientRecords.sort((a, b) => a.name.localeCompare(b.name));

    return {
        clients: clientRecords,
        activeClientCount: currentActive.size,
        retentionRate,
        previousRetentionRate
    };
}

function createInvoiceRecords(entries: CmsInvoiceEntry[]): InvoiceRecord[] {
    return entries.map((entry, index) => {
        const client = entry.client?.trim() || `Client ${index + 1}`;
        const amount = Number.isFinite(entry.amount) ? Number(entry.amount) : 0;
        const dueDate = dayjs(entry.due_date).isValid()
            ? dayjs(entry.due_date).format('YYYY-MM-DD')
            : dayjs().add(index, 'week').format('YYYY-MM-DD');

        const pdfUrl = entry.pdf_url?.trim();

        const record: InvoiceRecord = {
            id: `invoice-${index + 1}`,
            client,
            project: `${client} photography`,
            issueDate: dayjs(dueDate).subtract(14, 'day').format('YYYY-MM-DD'),
            dueDate,
            status: normalizeInvoiceStatus(entry.status),
            currency: 'USD',
            amount,
            taxRate: 0,
            lineItems: [],
            totals: {
                subtotal: amount,
                taxTotal: 0,
                total: amount
            },
            template: 'classic'
        };

        if (pdfUrl) {
            record.pdfUrl = pdfUrl;
        }

        return record;
    });
}

function buildOverviewChart(bookings: BookingRecord[], invoices: InvoiceRecord[]): Record<Timeframe, ChartPoint[]> {
    const now = dayjs();

    const weekly: ChartPoint[] = [];
    const startOfWeek = now.startOf('week');
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        const day = startOfWeek.add(dayOffset, 'day');
        const shoots = bookings.filter((booking) => dayjs(booking.date).isSame(day, 'day')).length;
        const revenue = invoices
            .filter((invoice) => invoice.status === 'Paid' && dayjs(invoice.dueDate).isSame(day, 'day'))
            .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);
        weekly.push({ label: day.format('ddd'), shoots, revenue });
    }

    const monthly: ChartPoint[] = [];
    const startOfMonth = now.startOf('month');
    for (let week = 0; week < 5; week += 1) {
        const periodStart = startOfMonth.add(week * 7, 'day');
        const periodEnd = periodStart.add(6, 'day');
        const shoots = bookings.filter((booking) =>
            dayjs(booking.date).isBetween(periodStart, periodEnd, 'day', '[]')
        ).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).isBetween(periodStart, periodEnd, 'day', '[]'))
            .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);
        monthly.push({ label: `Week ${week + 1}`, shoots, revenue });
    }

    const yearly: ChartPoint[] = [];
    const startOfYear = now.startOf('year');
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const periodStart = startOfYear.add(monthIndex, 'month');
        const shoots = bookings.filter((booking) => dayjs(booking.date).isSame(periodStart, 'month')).length;
        const revenue = invoices
            .filter((invoice) => dayjs(invoice.dueDate).isSame(periodStart, 'month'))
            .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);
        yearly.push({ label: periodStart.format('MMM'), shoots, revenue });
    }

    return { weekly, monthly, yearly } satisfies Record<Timeframe, ChartPoint[]>;
}

function buildDashboardMetrics(
    bookings: BookingRecord[],
    invoices: InvoiceRecord[],
    clientAggregation: ClientAggregationResult
): DashboardMetrics {
    const now = dayjs();

    const startOfWeek = now.startOf('week');
    const endOfWeek = startOfWeek.endOf('week');
    const previousWeekStart = startOfWeek.subtract(1, 'week');
    const previousWeekEnd = startOfWeek.subtract(1, 'day');

    const scheduledThisWeek = bookings.filter((booking) =>
        dayjs(booking.date).isBetween(startOfWeek, endOfWeek, 'day', '[]')
    ).length;
    const scheduledLastWeek = bookings.filter((booking) =>
        dayjs(booking.date).isBetween(previousWeekStart, previousWeekEnd, 'day', '[]')
    ).length;
    const scheduledChange = computePercentChange(scheduledLastWeek, scheduledThisWeek);

    const startOfMonth = now.startOf('month');
    const previousMonthStart = startOfMonth.subtract(1, 'month');
    const previousMonthEnd = startOfMonth.subtract(1, 'day');

    const paidThisMonth = invoices
        .filter(
            (invoice) =>
                invoice.status === 'Paid' &&
                dayjs(invoice.dueDate).isBetween(startOfMonth, now, 'day', '[]')
        )
        .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);

    const paidLastMonth = invoices
        .filter((invoice) =>
            invoice.status === 'Paid' &&
            dayjs(invoice.dueDate).isBetween(previousMonthStart, previousMonthEnd, 'day', '[]')
        )
        .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);

    const revenueChange = computePercentChange(paidLastMonth, paidThisMonth);

    const outstandingBalance = invoices
        .filter((invoice) => invoice.status !== 'Paid')
        .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);

    const previousOutstanding = invoices
        .filter(
            (invoice) =>
                invoice.status !== 'Paid' && dayjs(invoice.dueDate).isBefore(startOfMonth, 'day')
        )
        .reduce((total, invoice) => total + getInvoiceTotal(invoice), 0);

    const outstandingChange = computePercentChange(previousOutstanding, outstandingBalance);

    const retentionRate = clientAggregation.retentionRate;
    const retentionChange = retentionRate - clientAggregation.previousRetentionRate;

    return {
        scheduledThisWeek,
        scheduledChange,
        paidThisMonth,
        revenueChange,
        outstandingBalance,
        outstandingChange,
        retentionRate,
        retentionChange,
        activeClientCount: clientAggregation.activeClientCount
    } satisfies DashboardMetrics;
}

async function readCmsSettings(fileName: string): Promise<CmsSettings | null> {
    const filePath = path.join(process.cwd(), 'content', 'data', fileName);

    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as CmsSettings;
        return parsed;
    } catch (error) {
        return null;
    }
}

type CrmWorkspaceProps = CrmPageProps;

function CrmDashboardWorkspace({
    bookings,
    upcomingBookings,
    clients,
    invoices,
    tasks,
    chartData,
    metrics,
    studioName,
    settings,
    secondaryPanelVisibility
}: CrmWorkspaceProps) {
    const identity = useNetlifyIdentity();
    const { signOut, guardEnabled } = useCrmAuth();

    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(invoices);
    const [pdfInvoiceId, setPdfInvoiceId] = React.useState<string | null>(null);
    const [checkoutInvoiceId, setCheckoutInvoiceId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);

    useAutoDismiss(feedback, () => setFeedback(null));

    const notify = React.useCallback((type: FeedbackNotice['type'], message: string) => {
        setFeedback({ id: `${Date.now()}`, type, message });
    }, []);

    const openInvoices = React.useMemo(
        () => invoiceList.filter((invoice) => invoice.status !== 'Paid'),
        [invoiceList]
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

                notify('success', `Invoice ${id} marked ${status}.`);
            } catch (error) {
                console.error('Invoice status update failed', error);
                setInvoiceList((previous) => previous.map((invoice) => (invoice.id === id ? original : invoice)));
                notify('error', error instanceof Error ? error.message : 'Unable to update invoice status.');
            }
        },
        [invoiceList, notify]
    );

    const handleGenerateInvoicePdf = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            setPdfInvoiceId(invoice.id);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to generate invoices.');
                }

                const response = await fetch('/.netlify/functions/generate-invoice-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        invoice,
                        studio: {
                            name: studioName,
                            email: 'billing@codex.studio',
                            phone: '+1 (555) 123-4567',
                            website: 'https://codex.studio'
                        }
                    })
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => null);
                    throw new Error(payload?.error ?? 'Failed to generate the invoice PDF.');
                }

                if (typeof window !== 'undefined') {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = window.document.createElement('a');
                    link.href = url;
                    link.download = `invoice-${invoice.id}.pdf`;
                    window.document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                }

                notify('success', `Invoice ${invoice.id} PDF generated.`);
            } catch (error) {
                console.error('Invoice PDF generation failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to generate the PDF invoice.');
            } finally {
                setPdfInvoiceId(null);
            }
        },
        [identity, notify, studioName]
    );

    const handleCreateCheckoutSession = React.useCallback(
        async (invoice: InvoiceRecord) => {
            if (!invoice) {
                return;
            }

            setCheckoutInvoiceId(invoice.id);

            try {
                const token = await identity.getToken();
                if (!token) {
                    throw new Error('Authentication expired. Sign in again to create payment links.');
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codex.studio';
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        invoice,
                        successUrl: `${origin}/crm?checkout=success`,
                        cancelUrl: `${origin}/crm?checkout=cancel`
                    })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Unable to start a Stripe checkout session.');
                }

                const checkoutUrl = payload?.url;
                if (!checkoutUrl) {
                    throw new Error('Stripe did not return a checkout URL.');
                }

                if (typeof window !== 'undefined') {
                    window.open(checkoutUrl, '_blank', 'noopener');
                }

                setInvoiceList((previous) =>
                    previous.map((record) => (record.id === invoice.id ? { ...record, paymentLink: checkoutUrl } : record))
                );

                notify('success', `Payment link created for invoice ${invoice.id}.`);
            } catch (error) {
                console.error('Stripe checkout session failed', error);
                notify('error', error instanceof Error ? error.message : 'Unable to start a Stripe checkout session.');
            } finally {
                setCheckoutInvoiceId(null);
            }
        },
        [identity, notify]
    );

    return (
        <>
            <Head>
                <title>{studioName} · Photography CRM</title>
            </Head>
            <WorkspaceLayout>
                <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-6 border-b border-slate-200 pb-8 dark:border-slate-800">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-300">
                                    Studio workspace
                                </p>
                                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                    {studioName} CRM overview
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    Monitor shoots, nurture clients, and keep cash flow moving without leaving your control center.
                                </p>
                            </div>
                            <AdminProfileCard user={adminUser} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/bookings"
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#4534FF] transition hover:border-[#4534FF] hover:text-[#2D1EAF] dark:border-slate-700 dark:bg-slate-900 dark:text-[#9DAAFF] dark:hover:border-[#9DAAFF]"
                            >
                                Open calendar
                            </Link>
                            <Link
                                href="/clients"
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                Manage clients
                            </Link>
                            {guardEnabled ? (
                                <button
                                    type="button"
                                    onClick={signOut}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300"
                                >
                                    Sign out
                                </button>
                            ) : null}
                        </div>
                    </header>

                    {feedback ? (
                        <div
                            className={`mt-8 rounded-2xl border px-4 py-3 text-sm font-medium ${
                                feedback.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                            }`}
                        >
                            {feedback.message}
                        </div>
                    ) : null}

                    <section className="mt-10 grid gap-6 lg:grid-cols-4">
                        <StatCard
                            title="Shoots scheduled"
                            value={`${metrics.scheduledThisWeek}`}
                            change={metrics.scheduledChange}
                            changeLabel="vs last week"
                            icon={<CalendarGlyph />}
                        />
                        <StatCard
                            title="Invoices paid"
                            value={formatCurrency(metrics.paidThisMonth)}
                            change={metrics.revenueChange}
                            changeLabel="vs last month"
                            icon={<RevenueGlyph />}
                        />
                        <StatCard
                            title="Outstanding balance"
                            value={formatCurrency(metrics.outstandingBalance)}
                            change={metrics.outstandingChange}
                            changeLabel="vs prior month"
                            icon={<BalanceGlyph />}
                        />
                        <StatCard
                            title="Active clients"
                            value={`${metrics.activeClientCount}`}
                            change={metrics.retentionChange}
                            changeLabel="retention delta"
                            icon={<ClientsGlyph />}
                        />
                    </section>

                    <section className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
                        <OverviewChart data={chartData} />
                        <DashboardCard
                            title="Studio signal"
                            value={formatCurrencyExact(metrics.paidThisMonth + metrics.outstandingBalance)}
                            trend={{
                                value: `${metrics.scheduledThisWeek} sessions in pipeline`,
                                label: 'Combined revenue potential',
                                isPositive: metrics.scheduledChange >= 0
                            }}
                        >
                            <p>
                                {metrics.activeClientCount} active clients and {upcomingBookings.length} upcoming shoots are keeping the
                                studio humming. The support team is tracking {openInvoices.length} outstanding invoices.
                            </p>
                            {settings?.custom_fields && settings.custom_fields.length > 0 ? (
                                <ul className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-300">
                                    {settings.custom_fields.map((field, index) => (
                                        <li key={index}>
                                            <span className="font-semibold text-slate-600 dark:text-slate-200">{field.label}:</span>{' '}
                                            {field.value ?? '—'}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </DashboardCard>
                    </section>

                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            {secondaryPanelVisibility.upcomingShoots !== false ? (
                                <SectionCard
                                    title="Upcoming Shoots"
                                    description="Stay ready for every session with a quick view of the week ahead."
                                    action={
                                        <Link
                                            href="/bookings"
                                            className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                        >
                                            Open calendar
                                        </Link>
                                    }
                                >
                                    <BookingList bookings={upcomingBookings} />
                                </SectionCard>
                            ) : null}

                            {secondaryPanelVisibility.activeClients !== false ? (
                                <SectionCard
                                    title="Active Clients"
                                    description="From loyal regulars to new leads, see who needs attention next."
                                    action={
                                        <Link
                                            href="/clients"
                                            className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                        >
                                            View all clients
                                        </Link>
                                    }
                                >
                                    <ClientTable clients={clients} />
                                </SectionCard>
                            ) : null}
                        </div>

                        <div className="space-y-6">
                            {secondaryPanelVisibility.openInvoices !== false ? (
                                <SectionCard
                                    title="Open Invoices"
                                    description="Collect payments faster with a focused list of outstanding balances."
                                    action={
                                        <Link
                                            href="/invoices"
                                            className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]"
                                        >
                                            View all invoices
                                        </Link>
                                    }
                                >
                                    <InvoiceTable
                                        invoices={openInvoices}
                                        onUpdateStatus={handleUpdateInvoiceStatus}
                                        onGeneratePdf={handleGenerateInvoicePdf}
                                        onCreateCheckout={handleCreateCheckoutSession}
                                        generatingInvoiceId={pdfInvoiceId}
                                        checkoutInvoiceId={checkoutInvoiceId}
                                    />
                                </SectionCard>
                            ) : null}

                            {secondaryPanelVisibility.studioTasks !== false ? (
                                <SectionCard
                                    title="Studio Tasks"
                                    description="Keep production moving with next actions across your team."
                                    action={
                                        <button className="text-sm font-semibold text-[#4534FF] transition hover:text-[#5E6CFF] dark:text-[#9DAAFF] dark:hover:text-[#B8C5FF]">
                                            Create task
                                        </button>
                                    }
                                >
                                    <TaskList tasks={tasks} />
                                </SectionCard>
                            ) : null}
                        </div>
                    </div>
                </div>
            </WorkspaceLayout>
        </>
    );
}

type AdminProfileCardProps = {
    user: AdminUser;
};

function AdminProfileCard({ user }: AdminProfileCardProps) {
    return (
        <div className="flex w-full max-w-sm items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Image
                src={user.avatar}
                alt={`${user.name} avatar`}
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl bg-slate-100 object-cover dark:bg-slate-800"
            />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
                <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                {user.phone ? (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{user.phone}</p>
                ) : null}
            </div>
            {user.status ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {user.status}
                </span>
            ) : null}
        </div>
    );
}

function CalendarGlyph() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function RevenueGlyph() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}

function BalanceGlyph() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 3H7" />
            <path d="M7 7h14" />
            <path d="M3 3v18" />
            <path d="m3 7 5 5-5 5" />
        </svg>
    );
}

function ClientsGlyph() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

export default function CrmDashboardPage(props: CrmPageProps) {
    return (
        <CrmAuthGuard
            title="Access the studio CRM"
            description="Use the studio passcode or Netlify Identity credentials to access client data."
        >
            <CrmDashboardWorkspace {...props} />
        </CrmAuthGuard>
    );
}

export const getStaticProps: GetStaticProps<CrmPageProps> = async () => {
    const [bookingEntries, invoiceEntries, clientEntries, settings] = await Promise.all([
        readCmsCollection<CmsBookingEntry>('crm-bookings.json'),
        readCmsCollection<CmsInvoiceEntry>('crm-invoices.json'),
        readCmsCollection<CmsClientEntry>('crm-clients.json'),
        readCmsSettings('crm-settings.json')
    ]);

    const bookings = createBookingRecords(bookingEntries).sort((a, b) =>
        dayjs(a.date).diff(dayjs(b.date)) || a.client.localeCompare(b.client)
    );

    const upcomingBookings = bookings
        .filter((booking) => !dayjs(booking.date).isBefore(dayjs(), 'day'))
        .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
        .slice(0, 6);

    const invoiceRecords = createInvoiceRecords(invoiceEntries);
    const clientAggregation = buildClientRecords(clientEntries, bookings);
    const chartData = buildOverviewChart(bookings, invoiceRecords);
    const metrics = buildDashboardMetrics(bookings, invoiceRecords, clientAggregation);
    const tasks = defaultTasks;
    const studioName = settings?.custom_fields?.find((field) => field.label?.toLowerCase() === 'studio name')?.value?.trim() ??
        'Codex Studio';
    const secondaryPanelVisibility = resolvePanelVisibility(settings);

    return {
        props: {
            bookings,
            upcomingBookings,
            clients: clientAggregation.clients,
            invoices: invoiceRecords,
            tasks,
            chartData,
            metrics,
            studioName,
            settings,
            secondaryPanelVisibility
        }
    };
};

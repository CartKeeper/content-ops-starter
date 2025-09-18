import * as React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
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
import { tasks as defaultTasks } from '../../data/crm';
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
    owner?: string;
};

type CmsClientEntry = {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    related_projects?: string[];
    owner?: string;
};

type CmsInvoiceEntry = {
    client?: string;
    amount?: number;
    due_date?: string;
    status?: string;
    pdf_url?: string;
    owner?: string;
};

type CmsUserEntry = {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
};

type StudioUser = {
    id: string;
    name: string;
    email?: string;
    role: string;
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

type MetricSnapshot = {
    userId: string | null;
    label: string;
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

type DashboardMetricsCollection = {
    overall: MetricSnapshot;
    perUser: MetricSnapshot[];
};

type CrmPageProps = {
    bookings: BookingRecord[];
    upcomingBookings: BookingRecord[];
    clients: ClientRecord[];
    invoices: InvoiceRecord[];
    tasks: TaskRecord[];
    chartData: Record<Timeframe, ChartPoint[]>;
    metrics: DashboardMetricsCollection;
    users: StudioUser[];
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

type UserResolutionContext = {
    lookup: Map<string, StudioUser>;
    byId: Map<string, StudioUser>;
    defaultUser: StudioUser | null;
};

function normalizeUserKey(value: string | undefined | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    return trimmed.toLowerCase();
}

function createStudioUsers(entries: CmsUserEntry[]): StudioUser[] {
    return entries
        .map((entry, index) => {
            const name = entry.name?.trim() || `Team member ${index + 1}`;
            const rawId = entry.id?.trim();
            const normalizedId = rawId?.length
                ? rawId
                : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const email = entry.email?.trim();
            const role = entry.role?.trim().toLowerCase() || 'member';

            return {
                id: normalizedId || `user-${index + 1}`,
                name,
                email,
                role
            } satisfies StudioUser;
        })
        .filter((user, index, array) => array.findIndex((candidate) => candidate.id === user.id) === index);
}

function buildUserResolutionContext(users: StudioUser[]): UserResolutionContext {
    const lookup = new Map<string, StudioUser>();
    const byId = new Map<string, StudioUser>();

    users.forEach((user) => {
        const normalizedId = normalizeUserKey(user.id) ?? user.id;
        lookup.set(normalizedId, user);
        byId.set(user.id, user);
        byId.set(normalizedId, user);

        if (user.email) {
            const normalizedEmail = normalizeUserKey(user.email);
            if (normalizedEmail) {
                lookup.set(normalizedEmail, user);
            }
        }
    });

    const defaultUser = users.find((user) => user.role === 'admin') ?? users[0] ?? null;

    return { lookup, byId, defaultUser } satisfies UserResolutionContext;
}

function resolveOwner(
    reference: string | undefined,
    context: UserResolutionContext,
    preferredUserId?: string | null
): StudioUser | null {
    const key = normalizeUserKey(reference);
    if (key) {
        const match = context.lookup.get(key);
        if (match) {
            return match;
        }
    }

    if (preferredUserId) {
        const normalizedPreferred = normalizeUserKey(preferredUserId) ?? preferredUserId;
        const preferred = context.byId.get(preferredUserId) ?? context.byId.get(normalizedPreferred);
        if (preferred) {
            return preferred;
        }
    }

    return context.defaultUser;
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

function createBookingRecords(entries: CmsBookingEntry[], context: UserResolutionContext): BookingRecord[] {
    return entries.map((entry, index) => {
        const name = entry.client?.trim() || `Client ${index + 1}`;
        const shootType = entry.shoot_type?.trim() || 'Custom session';
        const location = entry.location?.trim() || 'Studio TBA';
        const normalizedDate = dayjs(entry.date).isValid()
            ? dayjs(entry.date).format('YYYY-MM-DD')
            : dayjs().add(index, 'day').format('YYYY-MM-DD');
        const { start, end } = parseTimeRange(entry.time);

        const record: BookingRecord = {
            id: `booking-${index + 1}`,
            client: name,
            shootType,
            date: normalizedDate,
            startTime: start,
            endTime: end,
            location,
            status: normalizeBookingStatus(entry.status)
        };

        if (entry.time) {
            record.customFields = { timeframe: entry.time };
        }

        const owner = resolveOwner(entry.owner, context);
        if (owner) {
            record.ownerId = owner.id;
            record.ownerName = owner.name;
        }

        return record;
    });
}

type ClientAggregationResult = {
    clients: ClientRecord[];
    activeClientCount: number;
    retentionRate: number;
    previousRetentionRate: number;
};

function buildClientRecords(
    cmsClients: CmsClientEntry[],
    bookings: BookingRecord[],
    context: UserResolutionContext,
    ownerFilter?: string | null
): ClientAggregationResult {
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
        ownerId?: string;
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

    const normalizedFilter = ownerFilter ? normalizeUserKey(ownerFilter) : null;
    const relevantBookings = normalizedFilter
        ? bookings.filter((booking) => normalizeUserKey(booking.ownerId) === normalizedFilter)
        : bookings;

    relevantBookings.forEach((booking) => {
        const stats = getStats(booking.client);
        const bookingDate = dayjs(booking.date);
        stats.total += 1;
        stats.bookings.push(bookingDate);

        if (booking.ownerId && !stats.ownerId) {
            stats.ownerId = booking.ownerId;
        }

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
        const existingStats = statsMap.get(name);

        const owner = resolveOwner(client.owner, context, ownerFilter);

        if (normalizedFilter && !existingStats) {
            const ownerMatches = owner && normalizeUserKey(owner.id) === normalizedFilter;
            if (!ownerMatches) {
                return;
            }
        }

        const stats = existingStats ?? getStats(name);
        stats.phone = client.phone ?? stats.phone;
        stats.email = client.email ?? stats.email;
        if (owner) {
            stats.ownerId = owner.id;
        } else if (!stats.ownerId && ownerFilter) {
            stats.ownerId = ownerFilter;
        }
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

        const ownerId = stats.ownerId ?? ownerFilter ?? context.defaultUser?.id;
        if (ownerId) {
            const owner = context.byId.get(ownerId) ?? context.byId.get(normalizeUserKey(ownerId) ?? ownerId);
            if (owner) {
                record.ownerId = owner.id;
                record.ownerName = owner.name;
            }
        }

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

function createInvoiceRecords(entries: CmsInvoiceEntry[], context: UserResolutionContext): InvoiceRecord[] {
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

        const owner = resolveOwner(entry.owner, context);
        if (owner) {
            record.ownerId = owner.id;
            record.ownerName = owner.name;
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

function buildMetricSnapshot(
    label: string,
    bookings: BookingRecord[],
    invoices: InvoiceRecord[],
    clientAggregation: ClientAggregationResult,
    userId: string | null
): MetricSnapshot {
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

    const retentionRate = clientAggregation.retentionRate || 0;
    const retentionChange = retentionRate - (clientAggregation.previousRetentionRate || 0);

    return {
        userId,
        label,
        scheduledThisWeek,
        scheduledChange,
        paidThisMonth,
        revenueChange,
        outstandingBalance,
        outstandingChange,
        retentionRate,
        retentionChange,
        activeClientCount: clientAggregation.activeClientCount
    } satisfies MetricSnapshot;
}

function buildMetricsCollection(
    bookings: BookingRecord[],
    invoices: InvoiceRecord[],
    cmsClients: CmsClientEntry[],
    context: UserResolutionContext,
    users: StudioUser[]
): DashboardMetricsCollection {
    const overallClients = buildClientRecords(cmsClients, bookings, context);
    const overall = buildMetricSnapshot('Studio totals', bookings, invoices, overallClients, null);

    const perUser = users.map((user) => {
        const userClients = buildClientRecords(cmsClients, bookings, context, user.id);
        const userBookings = bookings.filter((booking) => booking.ownerId === user.id);
        const userInvoices = invoices.filter((invoice) => invoice.ownerId === user.id);
        return buildMetricSnapshot(user.name, userBookings, userInvoices, userClients, user.id);
    });

    return { overall, perUser } satisfies DashboardMetricsCollection;
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
    users,
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

    const normalizedIdentityEmail = React.useMemo(() => {
        const email = identity.user?.email;
        return typeof email === 'string' ? email.trim().toLowerCase() : null;
    }, [identity.user?.email]);

    const currentUser = React.useMemo(() => {
        if (!normalizedIdentityEmail) {
            return null;
        }

        return (
            users.find((user) => user.email && user.email.toLowerCase() === normalizedIdentityEmail) ?? null
        );
    }, [normalizedIdentityEmail, users]);

    const isAdmin = identity.isAdmin;

    const summaryMetrics = React.useMemo(() => {
        if (isAdmin) {
            return metrics.overall;
        }

        if (currentUser) {
            const snapshot = metrics.perUser.find((entry) => entry.userId === currentUser.id);
            if (snapshot) {
                return snapshot;
            }
        }

        return metrics.overall;
    }, [currentUser, isAdmin, metrics.overall, metrics.perUser]);

    const summaryOwnerName = summaryMetrics.userId ? summaryMetrics.label : studioName;

    const orderedUserMetrics = React.useMemo(
        () =>
            metrics.perUser
                .slice()
                .sort(
                    (first, second) =>
                        second.paidThisMonth - first.paidThisMonth || first.label.localeCompare(second.label)
                ),
        [metrics.perUser]
    );

    const canManageStudio = isAdmin;

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
                <div className="page-header d-print-none">
                    <div className="row align-items-center">
                        <div className="col">
                            <div className="page-pretitle">Workspace snapshot</div>
                            <h2 className="page-title">{studioName} dashboard</h2>
                            <div className="text-secondary mt-2">
                                Monitor bookings, revenue momentum, and client health with a refreshed Tabler-inspired layout.
                            </div>
                            {guardEnabled ? (
                                <div className="mt-3 d-flex flex-wrap gap-2">
                                    <button type="button" onClick={signOut} className="btn btn-outline-secondary">
                                        Sign out
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {feedback ? (
                    <div
                        className={`alert mt-3 ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}
                        role="status"
                    >
                        {feedback.message}
                    </div>
                ) : null}

                <div className="mt-4 text-secondary text-uppercase fw-semibold small">
                    Metrics · {summaryMetrics.label}
                </div>
                {summaryMetrics.userId ? (
                    <div className="text-secondary small mt-1">
                        Viewing activity attributed to {summaryMetrics.label}.
                    </div>
                ) : isAdmin ? (
                    <div className="text-secondary small mt-1">
                        Aggregated totals across the studio team.
                    </div>
                ) : null}

                <div className="row row-cards mt-2">
                    <div className="col-sm-6 col-xl-3">
                        <StatCard
                            title="Shoots scheduled"
                            value={`${summaryMetrics.scheduledThisWeek}`}
                            change={summaryMetrics.scheduledChange}
                            changeLabel="vs last week"
                            icon={<CalendarGlyph />}
                        />
                    </div>
                    <div className="col-sm-6 col-xl-3">
                        <StatCard
                            title="Invoices paid"
                            value={formatCurrency(summaryMetrics.paidThisMonth)}
                            change={summaryMetrics.revenueChange}
                            changeLabel="vs last month"
                            icon={<RevenueGlyph />}
                        />
                    </div>
                    <div className="col-sm-6 col-xl-3">
                        <StatCard
                            title="Outstanding balance"
                            value={formatCurrency(summaryMetrics.outstandingBalance)}
                            change={summaryMetrics.outstandingChange}
                            changeLabel="vs prior month"
                            icon={<BalanceGlyph />}
                        />
                    </div>
                    <div className="col-sm-6 col-xl-3">
                        <StatCard
                            title="Active clients"
                            value={`${summaryMetrics.activeClientCount}`}
                            change={summaryMetrics.retentionChange}
                            changeLabel="retention delta"
                            icon={<ClientsGlyph />}
                        />
                    </div>
                </div>

                {isAdmin && orderedUserMetrics.length > 0 ? (
                    <div className="row row-cards mt-3">
                        <div className="col-12">
                            <SectionCard
                                title="Team performance"
                                description="Break down shoots and revenue momentum by photographer."
                            >
                                <div className="table-responsive">
                                    <table className="table card-table table-vcenter">
                                        <thead>
                                            <tr>
                                                <th>Team member</th>
                                                <th>Scheduled</th>
                                                <th>Paid this month</th>
                                                <th>Outstanding</th>
                                                <th>Active clients</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderedUserMetrics.map((entry) => (
                                                <tr key={entry.userId ?? entry.label}>
                                                    <td>
                                                        <div className="fw-semibold">{entry.label}</div>
                                                        <div className="text-secondary small">
                                                            {entry.scheduledThisWeek} shoots scheduled ·{' '}
                                                            {formatCurrencyExact(entry.paidThisMonth)} collected
                                                        </div>
                                                    </td>
                                                    <td>{entry.scheduledThisWeek}</td>
                                                    <td>{formatCurrencyExact(entry.paidThisMonth)}</td>
                                                    <td>{formatCurrencyExact(entry.outstandingBalance)}</td>
                                                    <td>{entry.activeClientCount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                ) : null}

                <div className="row row-cards mt-3">
                    <div className="col-lg-7">
                        <OverviewChart data={chartData} />
                    </div>
                    <div className="col-lg-5">
                        <DashboardCard
                            title="Studio signal"
                            value={formatCurrencyExact(
                                summaryMetrics.paidThisMonth + summaryMetrics.outstandingBalance
                            )}
                            trend={{
                                value: `${summaryMetrics.scheduledThisWeek} sessions in pipeline`,
                                label: 'Combined revenue potential',
                                isPositive: summaryMetrics.scheduledChange >= 0
                            }}
                        >
                            <div className="mb-2">
                                {summaryOwnerName} is tracking {summaryMetrics.activeClientCount} active clients with{' '}
                                {upcomingBookings.length} upcoming shoots on the calendar. Finance is watching{' '}
                                {openInvoices.length} open invoices this cycle.
                            </div>
                            {settings?.custom_fields && settings.custom_fields.length > 0 ? (
                                <ul className="list-unstyled small mb-0">
                                    {settings.custom_fields.map((field, index) => (
                                        <li key={index}>
                                            <span className="fw-semibold">{field.label}:</span> {field.value ?? '—'}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </DashboardCard>
                    </div>
                </div>

                <div className="row row-cards mt-3">
                    <div className="col-lg-8">
                        <div className="row row-cards">
                            {secondaryPanelVisibility.upcomingShoots !== false ? (
                                <div className="col-12">
                                    <SectionCard
                                        title="Upcoming Shoots"
                                        description="Stay ready for every session with a quick view of the week ahead."
                                        action={
                                            <Link href="/bookings" className="btn btn-sm btn-outline-primary">
                                                Open calendar
                                            </Link>
                                        }
                                    >
                                        <BookingList bookings={upcomingBookings} />
                                    </SectionCard>
                                </div>
                            ) : null}

                            {secondaryPanelVisibility.activeClients !== false ? (
                                <div className="col-12">
                                    <SectionCard
                                        title="Active Clients"
                                        description="From loyal regulars to new leads, see who needs attention next."
                                        action={
                                            <Link href="/clients" className="btn btn-sm btn-outline-primary">
                                                View all clients
                                            </Link>
                                        }
                                    >
                                        <ClientTable clients={clients} />
                                    </SectionCard>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="row row-cards">
                            {secondaryPanelVisibility.openInvoices !== false ? (
                                <div className="col-12">
                                    <SectionCard
                                        title="Open Invoices"
                                        description="Collect payments faster with a focused list of outstanding balances."
                                        action={
                                            <Link href="/invoices" className="btn btn-sm btn-outline-primary">
                                                View all invoices
                                            </Link>
                                        }
                                    >
                                        <InvoiceTable
                                            invoices={openInvoices}
                                            onUpdateStatus={
                                                canManageStudio ? handleUpdateInvoiceStatus : undefined
                                            }
                                            onGeneratePdf={canManageStudio ? handleGenerateInvoicePdf : undefined}
                                            onCreateCheckout={
                                                canManageStudio ? handleCreateCheckoutSession : undefined
                                            }
                                            generatingInvoiceId={pdfInvoiceId}
                                            checkoutInvoiceId={checkoutInvoiceId}
                                        />
                                    </SectionCard>
                                </div>
                            ) : null}

                            {secondaryPanelVisibility.studioTasks !== false ? (
                                <div className="col-12">
                                    <SectionCard
                                        title="Studio Tasks"
                                        description="Keep production moving with next actions across your team."
                                        action={
                                            canManageStudio ? (
                                                <button className="btn btn-sm btn-outline-primary">Create task</button>
                                            ) : undefined
                                        }
                                    >
                                        <TaskList tasks={tasks} />
                                    </SectionCard>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </WorkspaceLayout>
        </>
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
    const [bookingEntries, invoiceEntries, clientEntries, userEntries, settings] = await Promise.all([
        readCmsCollection<CmsBookingEntry>('crm-bookings.json'),
        readCmsCollection<CmsInvoiceEntry>('crm-invoices.json'),
        readCmsCollection<CmsClientEntry>('crm-clients.json'),
        readCmsCollection<CmsUserEntry>('crm-users.json'),
        readCmsSettings('crm-settings.json')
    ]);

    const users = createStudioUsers(userEntries);
    const userContext = buildUserResolutionContext(users);

    const bookings = createBookingRecords(bookingEntries, userContext).sort((a, b) =>
        dayjs(a.date).diff(dayjs(b.date)) || a.client.localeCompare(b.client)
    );

    const upcomingBookings = bookings
        .filter((booking) => !dayjs(booking.date).isBefore(dayjs(), 'day'))
        .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
        .slice(0, 6);

    const invoiceRecords = createInvoiceRecords(invoiceEntries, userContext);
    const clientAggregation = buildClientRecords(clientEntries, bookings, userContext);
    const chartData = buildOverviewChart(bookings, invoiceRecords);
    const metrics = buildMetricsCollection(bookings, invoiceRecords, clientEntries, userContext, users);
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
            users,
            studioName,
            settings,
            secondaryPanelVisibility
        }
    };
};

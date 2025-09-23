import * as React from 'react';
import type { GetStaticProps } from 'next';
import clsx from 'classnames';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import fs from 'fs/promises';
import path from 'path';

import {
    BookingList,
    ClientTable,
    CrmAuthGuard,
    InvoiceTable,
    OverviewChart,
    TaskList,
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
import {
    AppShell,
    Card,
    CardBody,
    CardHeader,
    PageHeader,
    Stat,
    type StatTrend,
} from '../../ui';
import type { IconKey } from '../../ui/icons';
import { DashboardGrid, type DashboardCardKey, type DashboardViewMode } from '../../ui/dashboard/DashboardGrid';
import { DashboardViewToggle } from '../../ui/dashboard/DashboardViewToggle';
import { useDashboardView } from '../../ui/hooks/useDashboardView';
import { BILLING_ENABLED } from '../../utils/feature-flags';

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
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    related_projects?: string[];
    owner?: string;
    defaultPackageIds?: string[];
    defaultItemIds?: string[];
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

type CmsGalleryEntry = {
    client?: string;
    project?: string;
    status?: string;
};

type GalleryStatus = 'Pending' | 'Delivered' | 'In Review';

type GalleryRecord = {
    id: string;
    client: string;
    project: string;
    status: GalleryStatus;
};

type SecondaryPanelVisibility = {
    upcomingShoots?: boolean;
    activeClients?: boolean;
    openInvoices?: boolean;
    studioTasks?: boolean;
    galleriesToDeliver?: boolean;
};

type DashboardMetricKey = 'shootsScheduled' | 'invoicesPaid' | 'outstandingBalance' | 'activeClients';

const DASHBOARD_VIEWS: DashboardViewMode[] = ['overview', 'revenue', 'client'];

const METRIC_ORDER: Record<DashboardViewMode, DashboardMetricKey[]> = {
    overview: ['shootsScheduled', 'invoicesPaid', 'outstandingBalance', 'activeClients'],
    revenue: ['invoicesPaid', 'outstandingBalance', 'shootsScheduled', 'activeClients'],
    client: ['activeClients', 'shootsScheduled', 'invoicesPaid', 'outstandingBalance']
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
    galleries: GalleryRecord[];
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

const integerFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
});

const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Editing'];
const INVOICE_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];
const GALLERY_STATUSES: GalleryStatus[] = ['Pending', 'Delivered', 'In Review'];

function formatCurrency(value: number): string {
    return currencyFormatter.format(Math.round(value));
}

function formatCurrencyExact(value: number): string {
    return preciseCurrencyFormatter.format(value);
}

function formatPercentDelta(value: number): string {
    if (!Number.isFinite(value)) {
        return '0%';
    }

    if (Math.abs(value) < 0.01) {
        return '0%';
    }

    const absolute = Math.abs(value);
    const precision = absolute >= 10 ? 0 : 1;
    const formatted = absolute.toFixed(precision).replace(/\.0$/, '');
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${formatted}%`;
}

function resolveTrend(value: number): StatTrend {
    if (!Number.isFinite(value) || Math.abs(value) < 0.01) {
        return 'neutral';
    }

    return value > 0 ? 'up' : 'down';
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

function normalizeGalleryStatus(value: string | undefined): GalleryStatus {
    if (!value) {
        return 'Pending';
    }

    const normalized = value.trim();
    const match = GALLERY_STATUSES.find((status) => status.toLowerCase() === normalized.toLowerCase());
    return match ?? 'Pending';
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

function createGalleryRecords(entries: CmsGalleryEntry[]): GalleryRecord[] {
    return entries.map((entry, index) => {
        const client = entry.client?.trim() ?? 'Untitled client';
        const project = entry.project?.trim() ?? 'Untitled project';
        const status = normalizeGalleryStatus(entry.status);
        const baseId = `${client}-${project}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        return {
            id: baseId ? `${baseId}-${index}` : `gallery-${index}`,
            client,
            project,
            status
        } satisfies GalleryRecord;
    });
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

function toUserSlug(value: string | undefined | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || null;
}

function createStudioUsers(
    entries: CmsUserEntry[],
    ownerReferences: Array<string | undefined | null> = []
): StudioUser[] {
    const users: StudioUser[] = [];
    const lookup = new Map<string, StudioUser>();

    const registerKeys = (user: StudioUser, keys: Array<string | null | undefined>) => {
        keys.forEach((key) => {
            if (!key) {
                return;
            }
            lookup.set(key, user);
        });
    };

    const registerUser = (user: StudioUser) => {
        const keys = new Set<string>();

        keys.add(user.id);

        const normalizedId = normalizeUserKey(user.id);
        if (normalizedId) {
            keys.add(normalizedId);
            const compactId = normalizedId.replace(/[^a-z0-9]/g, '');
            if (compactId) {
                keys.add(compactId);
            }
        }

        const slugId = toUserSlug(user.id);
        if (slugId) {
            keys.add(slugId);
        }

        const normalizedName = normalizeUserKey(user.name);
        if (normalizedName) {
            keys.add(normalizedName);
            const compactName = normalizedName.replace(/[^a-z0-9]/g, '');
            if (compactName) {
                keys.add(compactName);
            }
        }

        const slugName = toUserSlug(user.name);
        if (slugName) {
            keys.add(slugName);
        }

        if (user.email) {
            keys.add(user.email);
            const normalizedEmail = normalizeUserKey(user.email);
            if (normalizedEmail) {
                keys.add(normalizedEmail);
            }
        }

        for (const key of keys) {
            if (lookup.has(key)) {
                return;
            }
        }

        users.push(user);
        registerKeys(user, Array.from(keys));
    };

    entries.forEach((entry, index) => {
        const name = entry.name?.trim() || `Team member ${index + 1}`;
        const rawId = entry.id?.trim();
        const normalizedId = rawId?.length
            ? rawId
            : toUserSlug(name) ?? name.toLowerCase().replace(/\s+/g, '-');
        const email = entry.email?.trim();
        const role = entry.role?.trim().toLowerCase() || 'member';

        registerUser({
            id: normalizedId || `user-${index + 1}`,
            name,
            email,
            role
        });
    });

    ownerReferences.forEach((reference) => {
        if (!reference) {
            return;
        }

        const trimmed = reference.trim();
        if (!trimmed) {
            return;
        }

        const normalizedRef = normalizeUserKey(trimmed);
        const slugRef = toUserSlug(trimmed);
        const compactRef = normalizedRef?.replace(/[^a-z0-9]/g, '');

        const hasExistingUser = [trimmed, normalizedRef, slugRef, compactRef].some(
            (key) => key && lookup.has(key)
        );
        if (hasExistingUser) {
            return;
        }

        const isEmail = trimmed.includes('@') && !trimmed.includes(' ');
        const email = isEmail ? trimmed.toLowerCase() : undefined;
        const labelSource = isEmail ? trimmed.split('@')[0] : trimmed;

        const displayName = labelSource
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');

        const fallbackIndex = users.length + 1;
        const id = slugRef || normalizedRef || `user-${fallbackIndex}`;

        registerUser({
            id,
            name: displayName || `Team member ${fallbackIndex}`,
            email,
            role: 'member'
        });
    });

    return users;
}

function buildUserResolutionContext(users: StudioUser[]): UserResolutionContext {
    const lookup = new Map<string, StudioUser>();
    const byId = new Map<string, StudioUser>();

    const registerLookup = (key: string | null | undefined, user: StudioUser) => {
        if (!key) {
            return;
        }
        lookup.set(key, user);
    };

    users.forEach((user) => {
        const normalizedId = normalizeUserKey(user.id) ?? user.id;
        const slugId = toUserSlug(user.id);
        const normalizedName = normalizeUserKey(user.name);
        const slugName = toUserSlug(user.name);

        registerLookup(user.id, user);
        registerLookup(normalizedId, user);
        registerLookup(slugId, user);
        registerLookup(normalizedName, user);
        registerLookup(slugName, user);

        if (user.email) {
            registerLookup(user.email, user);
            registerLookup(normalizeUserKey(user.email), user);
        }

        byId.set(user.id, user);
        byId.set(normalizedId, user);

        if (slugId) {
            byId.set(slugId, user);
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
        studioTasks: true,
        galleriesToDeliver: true
    };

    const resolved: SecondaryPanelVisibility = { ...defaults };

    if (settings?.custom_fields) {
        const labelMap: Record<string, keyof SecondaryPanelVisibility> = {
            'show upcoming shoots': 'upcomingShoots',
            'show active clients': 'activeClients',
            'show open invoices': 'openInvoices',
            'show studio tasks': 'studioTasks',
            'show galleries to deliver': 'galleriesToDeliver'
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
        studioTasks: ['NEXT_PUBLIC_CRM_SHOW_STUDIO_TASKS', 'CRM_SHOW_STUDIO_TASKS'],
        galleriesToDeliver: ['NEXT_PUBLIC_CRM_SHOW_GALLERIES_TO_DELIVER', 'CRM_SHOW_GALLERIES_TO_DELIVER']
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
    secondaryPanelVisibility,
    galleries
}: CrmWorkspaceProps) {
    const identity = useNetlifyIdentity();
    const router = useRouter();

    const [invoiceList, setInvoiceList] = React.useState<InvoiceRecord[]>(invoices);
    const [pdfInvoiceId, setPdfInvoiceId] = React.useState<string | null>(null);
    const [checkoutInvoiceId, setCheckoutInvoiceId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<FeedbackNotice | null>(null);
    const billingEnabled = BILLING_ENABLED;
    const { view, setView, availableViews } = useDashboardView<DashboardViewMode>({
        availableViews: DASHBOARD_VIEWS,
        defaultView: 'overview',
    });

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

    React.useEffect(() => {
        const combo = {
            lastKey: null as string | null,
            timer: null as number | null
        };

        function resetCombo() {
            if (combo.timer !== null) {
                window.clearTimeout(combo.timer);
                combo.timer = null;
            }
            combo.lastKey = null;
        }

        function handleKeydown(event: KeyboardEvent) {
            if (event.defaultPrevented) {
                return;
            }

            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            const key = event.key.toLowerCase();

            if (combo.lastKey === 'g') {
                if (key === 'r') {
                    event.preventDefault();
                    setView(view === 'revenue' ? 'overview' : 'revenue');
                } else if (key === 'c') {
                    event.preventDefault();
                    setView(view === 'client' ? 'overview' : 'client');
                } else if (key === 'o') {
                    event.preventDefault();
                    setView('overview');
                }

                resetCombo();
                return;
            }

            if (key === 'g') {
                combo.lastKey = 'g';
                if (combo.timer !== null) {
                    window.clearTimeout(combo.timer);
                }
                combo.timer = window.setTimeout(() => {
                    combo.lastKey = null;
                    combo.timer = null;
                }, 800);
            }
        }

        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            resetCombo();
        };
    }, [setView, view]);

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

    const pendingGalleries = React.useMemo(
        () => galleries.filter((gallery) => gallery.status === 'Pending'),
        [galleries]
    );
    const deliveredGalleryCount = galleries.length - pendingGalleries.length;

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
                if (!identity.isAuthenticated) {
                    throw new Error('Authentication expired. Sign in again to generate invoices.');
                }

                const response = await fetch('/.netlify/functions/generate-invoice-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
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

            if (!billingEnabled) {
                notify('error', 'Online payment links are disabled in this environment.');
                return;
            }

            setCheckoutInvoiceId(invoice.id);

            try {
                if (!identity.isAuthenticated) {
                    throw new Error('Authentication expired. Sign in again to create payment links.');
                }

                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://codex.studio';
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
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
        [billingEnabled, identity, notify]
    );

    const metricStats = React.useMemo(
        () =>
            ({
                shootsScheduled: {
                    icon: 'calendar',
                    label: 'Shoots scheduled',
                    value: integerFormatter.format(summaryMetrics.scheduledThisWeek),
                    helper: 'Sessions booked this week.',
                    delta: {
                        value: formatPercentDelta(summaryMetrics.scheduledChange),
                        trend: resolveTrend(summaryMetrics.scheduledChange),
                        srLabel: 'Change vs last week',
                    },
                },
                invoicesPaid: {
                    icon: 'dollar',
                    label: 'Invoices paid',
                    value: formatCurrency(summaryMetrics.paidThisMonth),
                    helper: 'Collected this month.',
                    delta: {
                        value: formatPercentDelta(summaryMetrics.revenueChange),
                        trend: resolveTrend(summaryMetrics.revenueChange),
                        srLabel: 'Change vs last month',
                    },
                },
                outstandingBalance: {
                    icon: 'invoices',
                    label: 'Outstanding balance',
                    value: formatCurrency(summaryMetrics.outstandingBalance),
                    helper: 'Awaiting payment.',
                    delta: {
                        value: formatPercentDelta(summaryMetrics.outstandingChange),
                        trend: resolveTrend(summaryMetrics.outstandingChange),
                        srLabel: 'Change vs prior month',
                    },
                },
                activeClients: {
                    icon: 'users',
                    label: 'Active clients',
                    value: integerFormatter.format(summaryMetrics.activeClientCount),
                    helper: Number.isFinite(summaryMetrics.retentionRate)
                        ? `${Math.round(summaryMetrics.retentionRate)}% retention rate`
                        : 'Retention rate tracking unavailable.',
                    delta: {
                        value: formatPercentDelta(summaryMetrics.retentionChange),
                        trend: resolveTrend(summaryMetrics.retentionChange),
                        srLabel: 'Retention delta',
                    },
                },
            }) satisfies Record<
                DashboardMetricKey,
                {
                    icon: IconKey;
                    label: string;
                    value: string;
                    helper: string;
                    delta: { value: string; trend: StatTrend; srLabel: string };
                }
            >,
        [summaryMetrics],
    );

    const metricOrder = METRIC_ORDER[view];
    const metricSubtitle = summaryMetrics.userId
        ? `Viewing activity attributed to ${summaryMetrics.label}.`
        : isAdmin
        ? 'Aggregated totals across the studio team.'
        : undefined;

    const revenuePotential = summaryMetrics.paidThisMonth + summaryMetrics.outstandingBalance;
    const pillButtonClassName =
        'inline-flex items-center gap-2 rounded-pill border border-border-subtle bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bright focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

    const showUpcomingShoots = secondaryPanelVisibility.upcomingShoots !== false;
    const showActiveClients = secondaryPanelVisibility.activeClients !== false;
    const showOpenInvoices = secondaryPanelVisibility.openInvoices !== false;
    const showStudioTasks = secondaryPanelVisibility.studioTasks !== false;
    const showGalleries = secondaryPanelVisibility.galleriesToDeliver !== false;
    const openInvoicesCount = openInvoices.length;

    const dashboardCards: Partial<Record<DashboardCardKey, React.ReactNode>> = {
        'overview-chart': (
            <Card variant="chart" className="h-full">
                <CardHeader
                    title="Studio overview"
                    description="Shoots scheduled and revenue performance across time horizons."
                />
                <CardBody padding={false} className="px-6 pb-6 pt-0">
                    <OverviewChart data={chartData} />
                </CardBody>
            </Card>
        ),
        'studio-signal': (
            <Card className="h-full">
                <CardHeader title="Studio signal" description="Combined revenue potential." />
                <CardBody className="space-y-4">
                    <div className="rounded-card bg-surface-muted px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                            Revenue potential
                        </p>
                        <p className="text-2xl font-semibold text-text-primary">
                            {formatCurrencyExact(revenuePotential)}
                        </p>
                        <p className="text-sm text-text-subtle">
                            {integerFormatter.format(summaryMetrics.scheduledThisWeek)} sessions in pipeline
                        </p>
                    </div>
                    <p className="text-sm leading-6 text-text-subtle">
                        {`${summaryOwnerName} is tracking ${summaryMetrics.activeClientCount} active clients with ${upcomingBookings.length} upcoming shoots on the calendar. Finance is watching ${openInvoicesCount} open invoices this cycle.`}
                    </p>
                    {settings?.custom_fields && settings.custom_fields.length > 0 ? (
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            {settings.custom_fields.map((field, index) => (
                                <div key={index} className="flex flex-col gap-1">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                                        {field.label}
                                    </dt>
                                    <dd className="text-text-primary">{field.value ?? '—'}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}
                </CardBody>
            </Card>
        ),
    };

    if (showUpcomingShoots) {
        dashboardCards['upcoming-shoots'] = (
            <Card className="h-full">
                <CardHeader
                    title="Upcoming shoots"
                    description="Stay ready for every session with a quick view of the week ahead."
                    actions={
                        <Link href="/studio/calendars" className={pillButtonClassName}>
                            Open calendar
                        </Link>
                    }
                />
                <CardBody padding={false} className="px-6 py-5">
                    <BookingList bookings={upcomingBookings} />
                </CardBody>
            </Card>
        );
    }

    if (showActiveClients) {
        dashboardCards['active-clients'] = (
            <Card className="h-full">
                <CardHeader
                    title="Active clients"
                    description="From loyal regulars to new leads, see who needs attention next."
                    actions={
                        <Link href="/clients" className={pillButtonClassName}>
                            View all clients
                        </Link>
                    }
                />
                <CardBody padding={false} className="px-6 py-5">
                    <ClientTable clients={clients} />
                </CardBody>
            </Card>
        );
    }

    if (showOpenInvoices) {
        dashboardCards['open-invoices'] = (
            <Card className="h-full">
                <CardHeader
                    title="Open invoices"
                    description="Collect payments faster with a focused list of outstanding balances."
                    actions={
                        <Link href="/invoices" className={pillButtonClassName}>
                            View all invoices
                        </Link>
                    }
                />
                <CardBody padding={false} className="px-6 py-5">
                    <InvoiceTable
                        invoices={openInvoices}
                        onUpdateStatus={canManageStudio ? handleUpdateInvoiceStatus : undefined}
                        onGeneratePdf={canManageStudio ? handleGenerateInvoicePdf : undefined}
                        onCreateCheckout={
                            canManageStudio && billingEnabled ? handleCreateCheckoutSession : undefined
                        }
                        generatingInvoiceId={pdfInvoiceId}
                        checkoutInvoiceId={checkoutInvoiceId}
                        allowCheckout={billingEnabled}
                    />
                </CardBody>
            </Card>
        );
    }

    if (showStudioTasks) {
        dashboardCards['studio-tasks'] = (
            <Card className="h-full">
                <CardHeader
                    title="Studio tasks"
                    description="Keep production moving with next actions across your team."
                    actions={
                        canManageStudio ? (
                            <button type="button" className={pillButtonClassName}>
                                Create task
                            </button>
                        ) : undefined
                    }
                />
                <CardBody padding={false} className="px-6 py-5">
                    <TaskList tasks={tasks} />
                </CardBody>
            </Card>
        );
    }

    if (showGalleries) {
        dashboardCards.galleries = (
            <Card className="h-full">
                <CardHeader
                    title="Galleries to deliver"
                    description="Deliver polished galleries to keep clients delighted and informed."
                    actions={
                        <Link href="/galleries" className={pillButtonClassName}>
                            Review galleries
                        </Link>
                    }
                />
                <CardBody className="space-y-4">
                    {pendingGalleries.length > 0 ? (
                        <ul className="space-y-3">
                            {pendingGalleries.slice(0, 4).map((gallery) => (
                                <li key={gallery.id} className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">{gallery.client}</p>
                                        <p className="text-xs text-text-subtle">{gallery.project}</p>
                                    </div>
                                    <span className="inline-flex items-center rounded-pill bg-surface-muted px-3 py-1 text-xs font-semibold text-text-subtle">
                                        Pending
                                    </span>
                                </li>
                            ))}
                            {pendingGalleries.length > 4 ? (
                                <li className="text-xs text-text-subtle">
                                    +{pendingGalleries.length - 4} more awaiting delivery
                                </li>
                            ) : null}
                        </ul>
                    ) : (
                        <p className="text-sm text-text-subtle">All galleries are delivered. Nice work!</p>
                    )}
                    {deliveredGalleryCount > 0 ? (
                        <p className="text-xs text-text-subtle">
                            <span className="font-semibold text-text-primary">{deliveredGalleryCount}</span> recently delivered for review.
                        </p>
                    ) : null}
                </CardBody>
            </Card>
        );
    }

    if (isAdmin && orderedUserMetrics.length > 0) {
        dashboardCards['team-performance'] = (
            <Card className="h-full">
                <CardHeader
                    title="Team performance"
                    description="Break down shoots and revenue momentum by photographer."
                />
                <CardBody padding={false} className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-subtle text-sm">
                            <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-text-subtle">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">
                                        Team member
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-semibold">
                                        Scheduled
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-semibold">
                                        Paid this month
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-semibold">
                                        Outstanding
                                    </th>
                                    <th scope="col" className="px-6 py-3 font-semibold">
                                        Active clients
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle bg-surface">
                                {orderedUserMetrics.map((entry) => (
                                    <tr key={entry.userId ?? entry.label}>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-medium text-text-primary">{entry.label}</div>
                                            <div className="mt-1 text-xs text-text-subtle">
                                                {integerFormatter.format(entry.scheduledThisWeek)} shoots scheduled ·{' '}
                                                {formatCurrencyExact(entry.paidThisMonth)} collected
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top text-text-primary">
                                            {integerFormatter.format(entry.scheduledThisWeek)}
                                        </td>
                                        <td className="px-6 py-4 align-top text-text-primary">
                                            {formatCurrencyExact(entry.paidThisMonth)}
                                        </td>
                                        <td className="px-6 py-4 align-top text-text-primary">
                                            {formatCurrencyExact(entry.outstandingBalance)}
                                        </td>
                                        <td className="px-6 py-4 align-top text-text-primary">
                                            {integerFormatter.format(entry.activeClientCount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
        );
    }

    return (
        <>
            <Head>
                <title>{studioName} · Photography CRM</title>
            </Head>
            <AppShell currentPath={router.asPath}>
                <div className="space-y-10">
                    <div className="relative">
                        <PageHeader
                            pretitle="Workspace snapshot"
                            title={`${studioName} dashboard`}
                            description="Monitor bookings, revenue momentum, and client health in one workspace snapshot."
                            className="pb-16"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-4">
                            <div className="mx-auto flex w-full max-w-7xl justify-end px-4">
                                <DashboardViewToggle value={view} views={availableViews} onChange={setView} />
                            </div>
                        </div>
                    </div>
                    {feedback ? (
                        <div className="mx-auto w-full max-w-7xl px-4">
                            <div
                                className={clsx(
                                    'rounded-card border px-4 py-3 text-sm font-medium',
                                    feedback.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-rose-200 bg-rose-50 text-rose-700',
                                )}
                                role="status"
                            >
                                {feedback.message}
                            </div>
                        </div>
                    ) : null}
                    <section className="mx-auto w-full max-w-7xl px-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                                Metrics · {summaryMetrics.label}
                            </span>
                            {metricSubtitle ? <p className="text-sm text-text-subtle">{metricSubtitle}</p> : null}
                        </div>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {metricOrder.map((key) => {
                                const stat = metricStats[key];
                                if (!stat) {
                                    return null;
                                }
                                return (
                                    <Stat
                                        key={key}
                                        icon={stat.icon}
                                        label={stat.label}
                                        value={stat.value}
                                        helper={stat.helper}
                                        delta={stat.delta}
                                    />
                                );
                            })}
                        </div>
                    </section>
                    <section className="mx-auto w-full max-w-7xl px-4">
                        <DashboardGrid view={view} cards={dashboardCards} />
                    </section>
                </div>
            </AppShell>
        </>
    );
}

export default function CrmDashboardPage(props: CrmPageProps) {
    return (
        <CrmAuthGuard>
            <CrmDashboardWorkspace {...props} />
        </CrmAuthGuard>
    );
}

export const getStaticProps: GetStaticProps<CrmPageProps> = async () => {
    const [bookingEntries, invoiceEntries, clientEntries, userEntries, galleryEntries, settings] = await Promise.all([
        readCmsCollection<CmsBookingEntry>('crm-bookings.json'),
        readCmsCollection<CmsInvoiceEntry>('crm-invoices.json'),
        readCmsCollection<CmsClientEntry>('crm-clients.json'),
        readCmsCollection<CmsUserEntry>('crm-users.json'),
        readCmsCollection<CmsGalleryEntry>('crm-galleries.json'),
        readCmsSettings('crm-settings.json')
    ]);

    const ownerReferences = [
        ...bookingEntries.map((entry) => entry.owner),
        ...invoiceEntries.map((entry) => entry.owner),
        ...clientEntries.map((entry) => entry.owner)
    ];

    const users = createStudioUsers(userEntries, ownerReferences);
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
    const galleryRecords = createGalleryRecords(galleryEntries);

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
            secondaryPanelVisibility,
            galleries: galleryRecords
        }
    };
};

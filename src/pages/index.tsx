import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import type { IncomingMessage } from 'http';
import dayjs from 'dayjs';

import { DashboardCard, OverviewChart, type ChartPoint } from 'src/components/crm';

type CodexBookingRecord = {
    id?: string;
    client?: string;
    date?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    start_time?: string;
    end_time?: string;
    shoot_type?: string;
    shootType?: string;
    status?: string;
};

type CodexInvoiceRecord = {
    id?: string;
    client?: string;
    amount?: number | string;
    due_date?: string;
    dueDate?: string;
    status?: string;
};

type DashboardBooking = {
    id: string;
    client: string;
    date: string;
    status: string;
    shootType: string;
    startTime?: string;
    endTime?: string;
};

type DashboardInvoice = {
    id: string;
    client: string;
    amount: number;
    dueDate: string;
    status: string;
};

type ChartData = Record<'weekly' | 'monthly' | 'yearly', ChartPoint[]>;

type DashboardMetrics = {
    monthlyRevenue: number;
    upcomingShoots: number;
    outstandingInvoices: number;
    outstandingAmount: number;
    currentMonthLabel: string;
};

type DashboardPageProps = {
    metrics: DashboardMetrics;
    chartData: ChartData;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

const ACTIVE_BOOKING_STATUSES = new Set(['confirmed', 'pending']);

function CodexDashboardPage({ metrics, chartData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { monthlyRevenue, upcomingShoots, outstandingInvoices, outstandingAmount, currentMonthLabel } = metrics;

    return (
        <>
            <Head>
                <title>Codex Studio Dashboard</title>
                <meta
                    name="description"
                    content="Studio performance insights sourced from Codex CRM collections."
                />
            </Head>
            <main className="min-h-screen bg-slate-50 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6">
                    <header className="space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                            Codex Studio
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight">Operations dashboard</h1>
                        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                            Live KPIs sourced from Codex CRM bookings and invoices keep the studio team aligned on revenue
                            goals and production workload.
                        </p>
                    </header>

                    <section className="grid gap-6 md:grid-cols-3">
                        <DashboardCard title="Monthly Revenue" value={formatCurrency(monthlyRevenue)}>
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                Sum of paid invoices collected in {currentMonthLabel}.
                            </p>
                        </DashboardCard>
                        <DashboardCard title="Upcoming Shoots" value={upcomingShoots.toString()}>
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                Confirmed or pending sessions happening in the next 30 days.
                            </p>
                        </DashboardCard>
                        <DashboardCard title="Outstanding Invoices" value={outstandingInvoices.toString()}>
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {outstandingInvoices === 0 ? 'All invoices are current.' : null}
                                {outstandingInvoices > 0 ? `Open balance totals ${formatCurrency(outstandingAmount)}.` : null}
                            </p>
                        </DashboardCard>
                    </section>

                    <section>
                        <OverviewChart data={chartData} />
                    </section>
                </div>
            </main>
        </>
    );
}

export default CodexDashboardPage;

export const getServerSideProps: GetServerSideProps<DashboardPageProps> = async ({ req }) => {
    const baseUrl = resolveBaseUrl(req);

    const [bookingPayload, invoicePayload] = await Promise.all([
        fetchCodexCollection<CodexBookingRecord>(baseUrl, 'bookings'),
        fetchCodexCollection<CodexInvoiceRecord>(baseUrl, 'invoices')
    ]);

    const bookings = normalizeBookings(bookingPayload);
    const invoices = normalizeInvoices(invoicePayload);

    const today = dayjs();
    const startOfToday = today.startOf('day');
    const currentMonth = today.startOf('month');
    const endOfWindow = startOfToday.add(30, 'day').endOf('day');

    const monthlyRevenue = invoices
        .filter((invoice) => invoice.status === 'Paid' && dayjs(invoice.dueDate).isSame(currentMonth, 'month'))
        .reduce((total, invoice) => total + invoice.amount, 0);

    const upcomingShoots = bookings.filter((booking) => {
        const date = dayjs(booking.date);
        if (!date.isValid()) {
            return false;
        }
        const normalizedStatus = booking.status.toLowerCase();
        if (!ACTIVE_BOOKING_STATUSES.has(normalizedStatus)) {
            return false;
        }
        return (
            (date.isSame(startOfToday, 'day') || date.isAfter(startOfToday)) &&
            (date.isBefore(endOfWindow) || date.isSame(endOfWindow))
        );
    }).length;

    const outstandingInvoices = invoices.filter((invoice) => invoice.status !== 'Paid').length;
    const outstandingAmount = invoices
        .filter((invoice) => invoice.status !== 'Paid')
        .reduce((total, invoice) => total + invoice.amount, 0);

    const chartData = buildAnalytics(currentMonth, bookings, invoices);

    return {
        props: {
            metrics: {
                monthlyRevenue,
                upcomingShoots,
                outstandingInvoices,
                outstandingAmount,
                currentMonthLabel: currentMonth.format('MMMM YYYY')
            },
            chartData
        }
    };
};

async function fetchCodexCollection<T>(baseUrl: string, resource: 'bookings' | 'invoices'): Promise<T[]> {
    try {
        const url = new URL(`/api/crm/${resource}`, baseUrl);
        const response = await fetch(url.toString(), { headers: { accept: 'application/json' } });
        if (!response.ok) {
            return [];
        }
        const raw = await response.text();
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw) as { data?: unknown };
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.data)) {
            return [];
        }
        return parsed.data as T[];
    } catch (error) {
        console.warn('Unable to fetch Codex collection', error);
        return [];
    }
}

function resolveBaseUrl(req: IncomingMessage): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = forwardedHost ?? req.headers.host ?? process.env.NEXT_PUBLIC_SITE_URL;

    let host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (!host) {
        return 'http://localhost:3000';
    }

    if (host.startsWith('http://') || host.startsWith('https://')) {
        return host;
    }

    const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    const protocol = protoHeader ?? (host.includes('localhost') ? 'http' : 'https');
    return `${protocol}://${host}`;
}

function normalizeBookings(records: CodexBookingRecord[]): DashboardBooking[] {
    return records
        .map((record, index) => {
            if (!isPlainObject(record)) {
                return null;
            }

            const date = parseDate(record.date);
            if (!date) {
                return null;
            }

            const status = toTitleCase(record.status ?? 'Pending');
            const shootType = parseString(record.shoot_type ?? record.shootType, 'Session');
            const client = parseString(record.client, 'Client');
            const id = parseString(record.id, `booking-${index}`);
            const { startTime, endTime } = parseTimeRange(record);

            return {
                id,
                client,
                date,
                status,
                shootType,
                startTime,
                endTime
            } as DashboardBooking;
        })
        .filter((booking): booking is DashboardBooking => booking !== null && dayjs(booking.date).isValid());
}

function normalizeInvoices(records: CodexInvoiceRecord[]): DashboardInvoice[] {
    return records
        .map((record, index) => {
            if (!isPlainObject(record)) {
                return null;
            }

            const dueDate = parseDate(record.due_date ?? record.dueDate);
            const amount = parseAmount(record.amount);

            if (!dueDate || amount === null) {
                return null;
            }

            const status = toTitleCase(record.status ?? 'Draft');
            const client = parseString(record.client, 'Client');
            const id = parseString(record.id, `invoice-${index}`);

            return {
                id,
                client,
                amount,
                dueDate,
                status
            } as DashboardInvoice;
        })
        .filter((invoice): invoice is DashboardInvoice => invoice !== null && dayjs(invoice.dueDate).isValid());
}

function buildAnalytics(referenceMonth: dayjs.Dayjs, bookings: DashboardBooking[], invoices: DashboardInvoice[]): ChartData {
    const safeBookings = bookings.filter((booking) => dayjs(booking.date).isValid());
    const safeInvoices = invoices.filter((invoice) => dayjs(invoice.dueDate).isValid());

    return {
        weekly: buildWeeklyAnalytics(referenceMonth, safeBookings, safeInvoices),
        monthly: buildMonthlyAnalytics(referenceMonth, safeBookings, safeInvoices),
        yearly: buildYearlyAnalytics(referenceMonth, safeBookings, safeInvoices)
    };
}

function buildWeeklyAnalytics(
    referenceMonth: dayjs.Dayjs,
    bookings: DashboardBooking[],
    invoices: DashboardInvoice[]
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
    bookings: DashboardBooking[],
    invoices: DashboardInvoice[]
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
    bookings: DashboardBooking[],
    invoices: DashboardInvoice[]
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

function startOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return value.subtract(value.day(), 'day').startOf('day');
}

function endOfWeek(value: dayjs.Dayjs): dayjs.Dayjs {
    return startOfWeek(value).add(6, 'day').endOf('day');
}

function isWithinRange(value: dayjs.Dayjs, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
    return (value.isAfter(start) || value.isSame(start)) && (value.isBefore(end) || value.isSame(end));
}

function parseTimeRange(record: CodexBookingRecord): { startTime?: string; endTime?: string } {
    const start = parseString(record.startTime ?? record.start_time, '');
    const end = parseString(record.endTime ?? record.end_time, '');

    if (start || end) {
        return {
            startTime: start || undefined,
            endTime: end || undefined
        };
    }

    const timeValue = parseString(record.time, '');
    if (!timeValue) {
        return {};
    }

    const [startPart, endPart] = splitTimeRange(timeValue);
    return {
        startTime: startPart,
        endTime: endPart
    };
}

function splitTimeRange(value: string): [string | undefined, string | undefined] {
    const parts = value
        .split(/[\u2013\u2014-]/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return [undefined, undefined];
    }

    if (parts.length === 1) {
        return [parts[0], undefined];
    }

    return [parts[0], parts[1]];
}

function parseAmount(value: CodexInvoiceRecord['amount']): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
        if (!cleaned) {
            return null;
        }
        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function parseDate(value: string | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed;
}

function parseString(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return fallback;
}

function toTitleCase(value: string): string {
    if (!value) {
        return '';
    }
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

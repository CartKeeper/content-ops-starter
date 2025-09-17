import * as React from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type {
    Payload,
    ValueType,
    NameType
} from 'recharts/types/component/DefaultTooltipContent';

export type Timeframe = 'weekly' | 'monthly' | 'yearly';

export type ChartPoint = {
    label: string;
    shoots: number;
    revenue: number;
};

type OverviewChartProps = {
    data: Record<Timeframe, ChartPoint[]>;
};

const timeframeOptions: Array<{ id: Timeframe; label: string }> = [
    { id: 'weekly', label: 'This week' },
    { id: 'monthly', label: 'This month' },
    { id: 'yearly', label: 'This year' }
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatCurrencyCompact = (value: number) => compactCurrencyFormatter.format(value);

type ChartDataKey = 'shoots' | 'revenue';
type ChartTooltipProps = TooltipContentProps<ValueType, NameType>;
type ChartTooltipPayload = Payload<ValueType, NameType> & { dataKey?: ChartDataKey };

function findChartEntry(entries: ChartTooltipPayload[], key: ChartDataKey) {
    return entries.find((entry) => entry.dataKey === key);
}

function toNumericValue(value: ValueType | undefined): number {
    if (typeof value === 'number') {
        return value;
    }
    if (Array.isArray(value)) {
        const [first] = value;
        if (typeof first === 'number') {
            return first;
        }
        const parsedArrayValue = Number(first ?? 0);
        return Number.isFinite(parsedArrayValue) ? parsedArrayValue : 0;
    }
    if (value === undefined || value === null) {
        return 0;
    }
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const entries = payload as ChartTooltipPayload[];
    const shootsEntry = findChartEntry(entries, 'shoots');
    const revenueEntry = findChartEntry(entries, 'revenue');

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{label}</p>
            <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                {shootsEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#5D3BFF]" aria-hidden="true" />
                            Shoots
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{toNumericValue(shootsEntry.value)}</span>
                    </div>
                )}
                {revenueEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2">
                            <span
                                className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-[#F45DC8]"
                                aria-hidden="true"
                            />
                            Revenue
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(toNumericValue(revenueEntry.value))}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function OverviewChart({ data }: OverviewChartProps) {
    const [timeframe, setTimeframe] = React.useState<Timeframe>('monthly');
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeData = data[timeframe] ?? [];
    const hasData = activeData.length > 0;
    const totalShoots = activeData.reduce((total, point) => total + point.shoots, 0);
    const totalRevenue = activeData.reduce((total, point) => total + point.revenue, 0);

    return (
        <section className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-transparent p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:shadow-[0_45px_110px_-50px_rgba(2,8,20,0.85)]">
            <div
                className="pointer-events-none absolute inset-0 rounded-3xl bg-white/85 backdrop-blur-sm transition duration-500 group-hover:bg-white/95 dark:hidden"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-95 transition duration-500 dark:block"
                aria-hidden="true"
                style={{ background: 'radial-gradient(circle at top, rgba(63, 76, 204, 0.24), rgba(7, 11, 23, 0.92))' }}
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-35 transition duration-500 group-hover:opacity-60 dark:block"
                aria-hidden="true"
                style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(148, 163, 184, 0) 55%)' }}
            />
            <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Studio overview</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            Shoots scheduled and revenue performance across time horizons.
                        </p>
                    </div>
                    <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50/80 p-1 text-sm font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        {timeframeOptions.map((option) => {
                            const isActive = option.id === timeframe;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTimeframe(option.id)}
                                    aria-pressed={isActive}
                                    className={[
                                        'rounded-full px-3 py-1 transition',
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900/80 dark:text-white'
                                            : 'hover:text-slate-900 dark:hover:text-white'
                                    ].join(' ')}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-6 space-y-6">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#5D3BFF]" aria-hidden="true" />
                            Shoots
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-[#F45DC8]" aria-hidden="true" />
                            Revenue
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {!hasData ? (
                            <p className="rounded-xl bg-slate-50/80 p-6 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                No analytics available for this timeframe yet.
                            </p>
                        ) : (
                            <div className="h-72 min-w-[560px] text-slate-400 dark:text-slate-500">
                                {!isMounted ? (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                                        Loading chart…
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart
                                            data={activeData}
                                            margin={{ top: 24, right: 16, bottom: 12, left: 0 }}
                                            role="img"
                                            aria-label="Chart showing booked shoots and revenue performance"
                                        >
                                            <defs>
                                                <linearGradient id="shootsGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(93, 59, 255, 0.68)" />
                                                    <stop offset="100%" stopColor="rgba(77, 229, 255, 0.18)" />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="4 6" />
                                            <XAxis
                                                dataKey="label"
                                                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tickLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tick={{ fill: 'currentColor', fontSize: 12 }}
                                            />
                                            <YAxis
                                                yAxisId="shoots"
                                                allowDecimals={false}
                                                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tickLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tick={{ fill: 'currentColor', fontSize: 12 }}
                                                domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.2) : 1)]}
                                            />
                                            <YAxis
                                                yAxisId="revenue"
                                                orientation="right"
                                                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tickLine={{ stroke: 'currentColor', strokeOpacity: 0.18 }}
                                                tick={{ fill: 'currentColor', fontSize: 12 }}
                                                tickFormatter={(value: number) => formatCurrencyCompact(value)}
                                                domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 1)]}
                                            />
                                            <Tooltip
                                                content={(tooltipProps) => <ChartTooltip {...tooltipProps} />}
                                                cursor={{ fill: 'rgba(93, 59, 255, 0.08)' }}
                                            />
                                            <Bar yAxisId="shoots" dataKey="shoots" fill="url(#shootsGradient)" radius={[10, 10, 0, 0]} maxBarSize={40} />
                                            <Line
                                                yAxisId="revenue"
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#F45DC8"
                                                strokeWidth={3}
                                                dot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: '#F45DC8' }}
                                                activeDot={{ r: 6, fill: '#F45DC8' }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                        <dt className="font-medium text-slate-500 dark:text-slate-300">Total shoots</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{totalShoots}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                        <dt className="font-medium text-slate-500 dark:text-slate-300">Revenue booked</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default OverviewChart;

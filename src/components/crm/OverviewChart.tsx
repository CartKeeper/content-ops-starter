import * as React from 'react';
import classNames from 'classnames';
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
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 opacity-60"
                aria-hidden="true"
            />
            <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Studio overview</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            Shoots scheduled and revenue performance across time horizons.
                        </p>
                    </div>
                    <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1 py-1 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {timeframeOptions.map((option) => {
                            const isActive = option.id === timeframe;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTimeframe(option.id)}
                                    aria-pressed={isActive}
                                    className={classNames(
                                        'rounded-full px-3 py-1 transition',
                                        isActive
                                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700/80 dark:text-white'
                                            : 'hover:text-slate-900 dark:hover:text-white'
                                    )}
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
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden="true" />
                            Shoots
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-rose-300" aria-hidden="true" />
                            Revenue
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {!hasData ? (
                            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
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
                                                    <stop offset="0%" stopColor="rgba(79, 70, 229, 0.68)" />
                                                    <stop offset="100%" stopColor="rgba(14, 165, 233, 0.18)" />
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
                                                cursor={{ fill: 'rgba(79, 70, 229, 0.08)' }}
                                            />
                                            <Bar yAxisId="shoots" dataKey="shoots" fill="url(#shootsGradient)" radius={[10, 10, 0, 0]} maxBarSize={40} />
                                            <Line
                                                yAxisId="revenue"
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#FB7185"
                                                strokeWidth={3}
                                                dot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: '#FB7185' }}
                                                activeDot={{ r: 6, fill: '#FB7185' }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
                        <dt className="font-medium text-slate-500 dark:text-slate-300">Total shoots</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{totalShoots}</dd>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
                        <dt className="font-medium text-slate-500 dark:text-slate-300">Revenue booked</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default OverviewChart;

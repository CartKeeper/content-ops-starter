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

type ChartValueType = number | string | Array<number | string>;
type ChartNameType = string | number;
type ChartTooltipProps = Partial<TooltipContentProps<ChartValueType, ChartNameType>>;

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const shootsEntry = payload.find((entry) => entry.dataKey === 'shoots');
    const revenueEntry = payload.find((entry) => entry.dataKey === 'revenue');

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
                        <span className="font-semibold text-slate-900 dark:text-white">{shootsEntry.value}</span>
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
                            {formatCurrency(Number(revenueEntry.value))}
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Studio overview</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        Shoots scheduled and revenue performance across time horizons.
                    </p>
                </div>
                <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
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
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
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
                        <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
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
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                        <dt className="font-medium text-slate-500 dark:text-slate-400">Total shoots</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{totalShoots}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                        <dt className="font-medium text-slate-500 dark:text-slate-400">Revenue booked</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default OverviewChart;

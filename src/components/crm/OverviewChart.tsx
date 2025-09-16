import * as React from 'react';
import classNames from 'classnames';
import * as Recharts from 'recharts';

import {
    CRM_BRAND_ACCENT,
    CRM_BRAND_ACCENT_EMPHASIS,
    CRM_BRAND_ACCENT_GLOW,
    CRM_BRAND_ACCENT_GLOW_SOFT,
    GLASS_PANEL_CLASSNAME
} from './theme';

export type Timeframe = 'weekly' | 'monthly' | 'yearly';

export type ChartPoint = {
    label: string;
    shoots: number;
    revenue: number;
};

type OverviewChartProps = {
    data: Record<Timeframe, ChartPoint[]>;
    isDarkMode?: boolean;
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

type RechartsModule = typeof import('recharts') & {
    Bar: React.ComponentType<Record<string, unknown>>;
    CartesianGrid: React.ComponentType<Record<string, unknown>>;
    ComposedChart: React.ComponentType<Record<string, unknown>>;
    Line: React.ComponentType<Record<string, unknown>>;
    ResponsiveContainer: React.ComponentType<Record<string, unknown>>;
    Tooltip: React.ComponentType<Record<string, unknown>>;
    XAxis: React.ComponentType<Record<string, unknown>>;
    YAxis: React.ComponentType<Record<string, unknown>>;
};

const { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } = Recharts as RechartsModule;

type ChartTooltipProps = {
    isDarkMode?: boolean;
    active?: boolean;
    payload?: Array<{ value?: number; name?: string; dataKey?: string }>;
    label?: string;
};

function ChartTooltip({ active, payload, label, isDarkMode }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const shootsEntry = payload.find((entry) => entry.dataKey === 'shoots');
    const revenueEntry = payload.find((entry) => entry.dataKey === 'revenue');

    const accentColor = isDarkMode ? CRM_BRAND_ACCENT : CRM_BRAND_ACCENT_EMPHASIS;
    const surfaceClass = isDarkMode
        ? 'border-white/10 bg-[#0b162c]/90 text-slate-200'
        : 'border-white/40 bg-white/95 text-slate-600';

    return (
        <div className={classNames('rounded-xl border p-3 text-sm shadow-xl backdrop-blur', surfaceClass)}>
            <p
                className="text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
            >
                {label}
            </p>
            <div className="mt-2 space-y-1">
                {shootsEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span
                                className="inline-flex h-2.5 w-2.5 rounded-full"
                                aria-hidden="true"
                                style={{ backgroundColor: accentColor }}
                            />
                            Shoots
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">{shootsEntry.value}</span>
                    </div>
                )}
                {revenueEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span
                                className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2"
                                aria-hidden="true"
                                style={{ borderColor: accentColor }}
                            />
                            Revenue
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                            {formatCurrency(Number(revenueEntry.value))}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function OverviewChart({ data, isDarkMode = false }: OverviewChartProps) {
    const [timeframe, setTimeframe] = React.useState<Timeframe>('monthly');
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeData = data[timeframe] ?? [];
    const hasData = activeData.length > 0;
    const totalShoots = activeData.reduce((total, point) => total + point.shoots, 0);
    const totalRevenue = activeData.reduce((total, point) => total + point.revenue, 0);

    const chartColors = React.useMemo(() => {
        const accentTone = isDarkMode ? CRM_BRAND_ACCENT : CRM_BRAND_ACCENT_EMPHASIS;

        return {
            axis: isDarkMode ? 'rgba(203, 213, 225, 0.65)' : 'rgba(71, 85, 105, 0.65)',
            grid: isDarkMode ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.18)',
            cursor: isDarkMode ? 'rgba(45, 212, 191, 0.12)' : 'rgba(45, 212, 191, 0.08)',
            barStart: 'rgba(45, 212, 191, 0.55)',
            barEnd: isDarkMode ? 'rgba(15, 118, 110, 0.25)' : 'rgba(45, 212, 191, 0.12)',
            lineStroke: accentTone,
            dotStroke: isDarkMode ? '#030a16' : '#ecfeff',
            legendAccent: accentTone,
            legendRing: isDarkMode ? 'rgba(45, 212, 191, 0.4)' : 'rgba(45, 212, 191, 0.35)',
            legendTextClass: isDarkMode ? 'text-slate-400' : 'text-slate-500'
        };
    }, [isDarkMode]);

    const activeToggleStyles = React.useMemo(
        () =>
            isDarkMode
                ? {
                      backgroundColor: 'rgba(45, 212, 191, 0.18)',
                      color: CRM_BRAND_ACCENT,
                      boxShadow: '0 0 0 1px rgba(45, 212, 191, 0.4)'
                  }
                : {
                      backgroundColor: 'rgba(20, 184, 166, 0.18)',
                      color: CRM_BRAND_ACCENT_EMPHASIS,
                      boxShadow: '0 0 0 1px rgba(20, 184, 166, 0.3)'
                  },
        [isDarkMode]
    );

    return (
        <section className={classNames(GLASS_PANEL_CLASSNAME, 'p-6')}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-24 h-72 w-72 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 65%)` }}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 left-12 h-72 w-72 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
            />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Studio overview</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Shoots scheduled and revenue performance across time horizons.
                    </p>
                </div>
                <div className="inline-flex shrink-0 rounded-full border border-white/30 bg-white/50 p-1 text-sm font-medium text-slate-600 backdrop-blur dark:border-white/10 dark:bg-[#0d1c33]/70 dark:text-slate-300">
                    {timeframeOptions.map((option) => {
                        const isActive = option.id === timeframe;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setTimeframe(option.id)}
                                aria-pressed={isActive}
                                className={classNames(
                                    'rounded-full px-3 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[rgba(45,212,191,0.35)]',
                                    isActive ? 'shadow-sm' : 'hover:text-slate-900 dark:hover:text-slate-100'
                                )}
                                style={isActive ? activeToggleStyles : undefined}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="relative z-10 mt-6 space-y-6">
                <div
                    className={classNames(
                        'flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em]',
                        chartColors.legendTextClass
                    )}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            aria-hidden="true"
                            style={{ backgroundColor: chartColors.legendAccent }}
                        />
                        Shoots
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2"
                            aria-hidden="true"
                            style={{ borderColor: chartColors.legendRing }}
                        />
                        Revenue
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {!hasData ? (
                        <p className="rounded-xl border border-white/30 bg-white/70 p-6 text-sm text-slate-600 backdrop-blur-md dark:border-white/10 dark:bg-[#0d1c33]/70 dark:text-slate-300">
                            No analytics available for this timeframe yet.
                        </p>
                    ) : (
                        <div className="h-72 min-w-[560px]">
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
                                                <stop offset="0%" stopColor={chartColors.barStart} />
                                                <stop offset="100%" stopColor={chartColors.barEnd} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="4 6" />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={{ stroke: chartColors.axis }}
                                            tickLine={{ stroke: chartColors.axis }}
                                            tick={{ fill: chartColors.axis, fontSize: 12 }}
                                        />
                                        <YAxis
                                            yAxisId="shoots"
                                            allowDecimals={false}
                                            axisLine={{ stroke: chartColors.axis }}
                                            tickLine={{ stroke: chartColors.axis }}
                                            tick={{ fill: chartColors.axis, fontSize: 12 }}
                                            domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.2) : 1)]}
                                        />
                                        <YAxis
                                            yAxisId="revenue"
                                            orientation="right"
                                            axisLine={{ stroke: chartColors.axis }}
                                            tickLine={{ stroke: chartColors.axis }}
                                            tick={{ fill: chartColors.axis, fontSize: 12 }}
                                            tickFormatter={(value: number) => formatCurrencyCompact(value)}
                                            domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 1)]}
                                        />
                                        <Tooltip
                                            content={(tooltipProps) => <ChartTooltip {...tooltipProps} isDarkMode={isDarkMode} />}
                                            cursor={{ fill: chartColors.cursor }}
                                        />
                                        <Bar yAxisId="shoots" dataKey="shoots" fill="url(#shootsGradient)" radius={[10, 10, 0, 0]} maxBarSize={40} />
                                        <Line
                                            yAxisId="revenue"
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke={chartColors.lineStroke}
                                            strokeWidth={3}
                                            dot={{ r: 5, strokeWidth: 2, stroke: chartColors.dotStroke, fill: chartColors.lineStroke }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    )}
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/30 bg-white/70 p-4 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0d1c33]/70">
                        <dt className="font-medium text-slate-600 dark:text-slate-400">Total shoots</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{totalShoots}</dd>
                    </div>
                    <div className="rounded-xl border border-white/30 bg-white/70 p-4 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0d1c33]/70">
                        <dt className="font-medium text-slate-600 dark:text-slate-400">Revenue booked</dt>
                        <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(totalRevenue)}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default OverviewChart;

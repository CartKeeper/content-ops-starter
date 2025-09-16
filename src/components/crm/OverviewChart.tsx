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

type ChartValueType = number | string | Array<number | string>;
type ChartNameType = string | number;
type ChartTooltipProps = Partial<TooltipContentProps<ChartValueType, ChartNameType>> & {
    isDarkMode?: boolean;
};

function ChartTooltip({ active, payload, label, isDarkMode }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const shootsEntry = payload.find((entry) => entry?.dataKey === 'shoots');
    const revenueEntry = payload.find((entry) => entry?.dataKey === 'revenue');

    const wrapperClassName = classNames(
        'min-w-[12rem] rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur',
        isDarkMode
            ? 'border-white/10 bg-slate-950/80 text-slate-200 shadow-[0_35px_90px_rgba(8,17,37,0.65)]'
            : 'border-white/60 bg-white/90 text-slate-600 shadow-[0_25px_60px_rgba(15,23,42,0.15)]'
    );

    const labelClassName = classNames(
        'text-xs font-semibold uppercase tracking-[0.32em]',
        isDarkMode ? 'text-slate-300/80' : 'text-slate-500/80'
    );

    const valueClassName = classNames('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900');

    return (
        <div
            className={wrapperClassName}
            style={{
                backgroundImage: isDarkMode
                    ? `linear-gradient(160deg, rgba(15,23,42,0.92), rgba(15,23,42,0.72))`
                    : `linear-gradient(160deg, rgba(255,255,255,0.95), rgba(241,245,249,0.78))`,
                boxShadow: isDarkMode
                    ? `0 24px 60px -30px ${CRM_BRAND_ACCENT_GLOW}`
                    : `0 20px 45px -28px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
            }}
        >
            <p className={labelClassName}>{label != null ? String(label) : ''}</p>
            <div className="mt-3 space-y-2">
                {shootsEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2">
                            <span
                                className="inline-flex h-2.5 w-2.5 rounded-full"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT}, ${CRM_BRAND_ACCENT_EMPHASIS})`,
                                    boxShadow: `0 0 0 4px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                                }}
                                aria-hidden="true"
                            />
                            Shoots
                        </span>
                        <span className={valueClassName}>{shootsEntry.value}</span>
                    </div>
                )}
                {revenueEntry && (
                    <div className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2">
                            <span
                                className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border"
                                style={{
                                    borderColor: CRM_BRAND_ACCENT_EMPHASIS,
                                    boxShadow: `0 0 0 4px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                                }}
                                aria-hidden="true"
                            />
                            Revenue
                        </span>
                        <span className={valueClassName}>{formatCurrency(Number(revenueEntry.value ?? 0))}</span>
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

    const accentGradientId = React.useId();
    const activeData = data[timeframe] ?? [];
    const hasData = activeData.length > 0;
    const totalShoots = activeData.reduce((total, point) => total + point.shoots, 0);
    const totalRevenue = activeData.reduce((total, point) => total + point.revenue, 0);

    const palette = React.useMemo(
        () => ({
            axis: isDarkMode ? 'rgba(226, 232, 240, 0.28)' : 'rgba(71, 85, 105, 0.18)',
            grid: isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(99, 102, 241, 0.12)',
            tick: isDarkMode ? 'rgba(226, 232, 240, 0.78)' : 'rgba(71, 85, 105, 0.78)',
            cursor: isDarkMode ? 'rgba(99, 102, 241, 0.16)' : 'rgba(99, 102, 241, 0.1)',
            line: isDarkMode ? CRM_BRAND_ACCENT_EMPHASIS : CRM_BRAND_ACCENT,
            dotStroke: isDarkMode ? '#0b1220' : '#e2e8f0',
            panelShadow: isDarkMode
                ? `0 45px 120px -60px ${CRM_BRAND_ACCENT_GLOW}`
                : `0 38px 90px -55px ${CRM_BRAND_ACCENT_GLOW_SOFT}`,
            panelBackground: isDarkMode
                ? `linear-gradient(145deg, rgba(8, 15, 40, 0.92), rgba(10, 18, 42, 0.68))`
                : `linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(241, 245, 249, 0.82))`,
            panelOverlay: isDarkMode
                ? `radial-gradient(120% 120% at 0% 0%, ${CRM_BRAND_ACCENT_GLOW} 0%, transparent 65%)`
                : `radial-gradient(120% 120% at 0% 0%, ${CRM_BRAND_ACCENT_GLOW_SOFT} 0%, transparent 65%)`
        }),
        [isDarkMode]
    );

    return (
        <section
            className={classNames(
                GLASS_PANEL_CLASSNAME,
                'flex flex-col gap-6 overflow-hidden text-slate-600 transition-colors duration-500 dark:text-slate-300'
            )}
            style={{
                backgroundImage: `${palette.panelOverlay}, ${palette.panelBackground}`,
                boxShadow: palette.panelShadow
            }}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                        <span
                            className="bg-clip-text text-transparent"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT} 0%, ${CRM_BRAND_ACCENT_EMPHASIS} 42%, ${
                                    isDarkMode ? '#f8fafc' : '#0f172a'
                                } 100%)`
                            }}
                        >
                            Studio overview
                        </span>
                    </h2>
                    <p className="mt-2 text-sm text-slate-500/80 dark:text-slate-300/80">
                        Shoots scheduled and revenue performance across time horizons.
                    </p>
                </div>
                <div
                    className={classNames(
                        'inline-flex shrink-0 items-center gap-1 rounded-full border p-1 text-sm font-medium transition',
                        isDarkMode
                            ? 'border-white/10 bg-white/5 text-slate-300'
                            : 'border-white/60 bg-white/70 text-slate-600'
                    )}
                >
                    {timeframeOptions.map((option) => {
                        const isActive = option.id === timeframe;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setTimeframe(option.id)}
                                aria-pressed={isActive}
                                className={classNames(
                                    'rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    isDarkMode
                                        ? 'focus-visible:ring-white/20 focus-visible:ring-offset-slate-900'
                                        : 'focus-visible:ring-slate-900/10 focus-visible:ring-offset-white',
                                    isActive
                                        ? 'text-slate-900'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                                )}
                                style={
                                    isActive
                                        ? {
                                              backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT} 0%, ${CRM_BRAND_ACCENT_EMPHASIS} 100%)`,
                                              color: '#0b1220',
                                              boxShadow: isDarkMode
                                                  ? `0 18px 48px -22px ${CRM_BRAND_ACCENT_GLOW}`
                                                  : `0 14px 32px -20px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                                          }
                                        : undefined
                                }
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mt-4 space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500/80 dark:text-slate-300/80">
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT}, ${CRM_BRAND_ACCENT_EMPHASIS})`,
                                boxShadow: `0 0 0 4px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                            }}
                            aria-hidden="true"
                        />
                        Shoots
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border"
                            style={{
                                borderColor: CRM_BRAND_ACCENT_EMPHASIS,
                                boxShadow: `0 0 0 4px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                            }}
                            aria-hidden="true"
                        />
                        Revenue
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {!hasData ? (
                        <p
                            className={classNames(
                                'rounded-2xl border p-6 text-sm transition',
                                isDarkMode
                                    ? 'border-white/10 bg-white/5 text-slate-300/80'
                                    : 'border-white/60 bg-white/80 text-slate-500'
                            )}
                            style={{
                                boxShadow: isDarkMode
                                    ? `0 18px 48px -30px ${CRM_BRAND_ACCENT_GLOW}`
                                    : `0 14px 36px -28px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                            }}
                        >
                            No analytics available for this timeframe yet.
                        </p>
                    ) : (
                        <div className="h-72 min-w-[560px] text-slate-500/80 dark:text-slate-400/80">
                            {!isMounted ? (
                                <div className="flex h-full items-center justify-center text-sm">Loading chart…</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={activeData}
                                        margin={{ top: 24, right: 16, bottom: 12, left: 0 }}
                                        role="img"
                                        aria-label="Chart showing booked shoots and revenue performance"
                                    >
                                        <defs>
                                            <linearGradient id={`${accentGradientId}-shoots`} x1="0" y1="0" x2="0" y2="1">
                                                <stop
                                                    offset="0%"
                                                    stopColor={CRM_BRAND_ACCENT}
                                                    stopOpacity={isDarkMode ? 0.85 : 0.75}
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor={CRM_BRAND_ACCENT_EMPHASIS}
                                                    stopOpacity={0.05}
                                                />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke={palette.grid} strokeDasharray="4 6" />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={{ stroke: palette.axis }}
                                            tickLine={{ stroke: palette.axis }}
                                            tick={{ fill: palette.tick, fontSize: 12, fontWeight: 500 }}
                                        />
                                        <YAxis
                                            yAxisId="shoots"
                                            allowDecimals={false}
                                            axisLine={{ stroke: palette.axis }}
                                            tickLine={{ stroke: palette.axis }}
                                            tick={{ fill: palette.tick, fontSize: 12, fontWeight: 500 }}
                                            domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.2) : 1)]}
                                        />
                                        <YAxis
                                            yAxisId="revenue"
                                            orientation="right"
                                            axisLine={{ stroke: palette.axis }}
                                            tickLine={{ stroke: palette.axis }}
                                            tick={{ fill: palette.tick, fontSize: 12, fontWeight: 500 }}
                                            tickFormatter={(value: number) => formatCurrencyCompact(value)}
                                            domain={[0, (dataMax: number) => (dataMax ? Math.ceil(dataMax * 1.15) : 1)]}
                                        />
                                        <Tooltip
                                            content={(tooltipProps) => (
                                                <ChartTooltip {...tooltipProps} isDarkMode={isDarkMode} />
                                            )}
                                            cursor={{ fill: palette.cursor }}
                                            wrapperStyle={{ outline: 'none' }}
                                        />
                                        <Bar
                                            yAxisId="shoots"
                                            dataKey="shoots"
                                            fill={`url(#${accentGradientId}-shoots)`}
                                            radius={[12, 12, 0, 0]}
                                            maxBarSize={40}
                                        />
                                        <Line
                                            yAxisId="revenue"
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke={palette.line}
                                            strokeWidth={3}
                                            dot={{ r: 5, strokeWidth: 2, stroke: palette.dotStroke, fill: palette.line }}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: palette.line }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    )}
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                    <div
                        className={classNames(
                            'rounded-2xl border px-4 py-4 text-sm transition',
                            isDarkMode
                                ? 'border-white/10 bg-white/5 text-slate-200'
                                : 'border-white/60 bg-white/80 text-slate-600'
                        )}
                        style={{
                            boxShadow: isDarkMode
                                ? `0 18px 48px -26px ${CRM_BRAND_ACCENT_GLOW}`
                                : `0 16px 36px -24px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                        }}
                    >
                        <dt className="font-medium">Total shoots</dt>
                        <dd
                            className="mt-2 text-2xl font-semibold"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT} 0%, ${CRM_BRAND_ACCENT_EMPHASIS} 90%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent'
                            }}
                        >
                            {totalShoots}
                        </dd>
                    </div>
                    <div
                        className={classNames(
                            'rounded-2xl border px-4 py-4 text-sm transition',
                            isDarkMode
                                ? 'border-white/10 bg-white/5 text-slate-200'
                                : 'border-white/60 bg-white/80 text-slate-600'
                        )}
                        style={{
                            boxShadow: isDarkMode
                                ? `0 18px 48px -26px ${CRM_BRAND_ACCENT_GLOW}`
                                : `0 16px 36px -24px ${CRM_BRAND_ACCENT_GLOW_SOFT}`
                        }}
                    >
                        <dt className="font-medium">Revenue booked</dt>
                        <dd
                            className="mt-2 text-2xl font-semibold"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${CRM_BRAND_ACCENT} 0%, ${CRM_BRAND_ACCENT_EMPHASIS} 90%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent'
                            }}
                        >
                            {formatCurrency(totalRevenue)}
                        </dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}

export default OverviewChart;

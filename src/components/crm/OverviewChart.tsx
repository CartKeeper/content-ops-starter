import * as React from 'react';

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
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function OverviewChart({ data }: OverviewChartProps) {
    const [timeframe, setTimeframe] = React.useState<Timeframe>('monthly');

    const activeData = data[timeframe] ?? [];
    const maxRevenue = Math.max(0, ...activeData.map((item) => item.revenue));
    const maxShoots = Math.max(0, ...activeData.map((item) => item.shoots));

    const chartHeight = 220;
    const chartPadding = 24;
    const barWidth = 28;
    const gap = 32;
    const datasetLength = activeData.length;
    const svgWidth =
        datasetLength > 0
            ? chartPadding * 2 + datasetLength * barWidth + Math.max(datasetLength - 1, 0) * gap
            : chartPadding * 2 + barWidth;
    const svgHeight = chartHeight + chartPadding * 2;
    const baselineY = svgHeight - chartPadding;

    const revenuePoints = activeData.map((point, index) => {
        const x = chartPadding + index * (barWidth + gap) + barWidth / 2;
        const ratio = maxRevenue > 0 ? point.revenue / maxRevenue : 0;
        const y = baselineY - ratio * chartHeight;
        return { x, y };
    });

    const revenuePath = revenuePoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
        .join(' ');

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
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" aria-hidden="true" />
                        Shoots
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-emerald-400" aria-hidden="true" />
                        Revenue
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {datasetLength === 0 ? (
                        <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                            No analytics available for this timeframe yet.
                        </p>
                    ) : (
                        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-64 w-full min-w-[540px]" role="img">
                            <title>Chart showing booked shoots and revenue performance</title>
                            <defs>
                                <linearGradient id="chartBarGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.55)" />
                                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0.15)" />
                                </linearGradient>
                            </defs>
                            {Array.from({ length: 5 }).map((_, index) => {
                                const y = chartPadding + (chartHeight / 4) * index;
                                return (
                                    <line
                                        key={`grid-${index}`}
                                        x1={chartPadding - 12}
                                        x2={svgWidth - chartPadding + 12}
                                        y1={y}
                                        y2={y}
                                        stroke="currentColor"
                                        strokeWidth={1}
                                        className="text-slate-100 dark:text-slate-800"
                                    />
                                );
                            })}
                            {activeData.map((point, index) => {
                                const barHeight = maxShoots > 0 ? (point.shoots / maxShoots) * chartHeight : 0;
                                const x = chartPadding + index * (barWidth + gap);
                                const y = baselineY - barHeight;

                                return (
                                    <g key={point.label}>
                                        <rect x={x} y={y} width={barWidth} height={barHeight} rx={8} fill="url(#chartBarGradient)" />
                                        <text
                                            x={x + barWidth / 2}
                                            y={baselineY + 20}
                                            textAnchor="middle"
                                            className="fill-slate-500 text-xs dark:fill-slate-400"
                                        >
                                            {point.label}
                                        </text>
                                    </g>
                                );
                            })}
                            {revenuePath && (
                                <path
                                    d={revenuePath}
                                    fill="none"
                                    stroke="rgba(16, 185, 129, 0.85)"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            {revenuePoints.map((point, index) => (
                                <circle
                                    key={`point-${index}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={5}
                                    fill="#0f172a"
                                    stroke="rgba(16, 185, 129, 0.95)"
                                    strokeWidth={3}
                                />
                            ))}
                        </svg>
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

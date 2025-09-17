import * as React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { ChartPoint } from './OverviewChart';

type EarningsSummaryCardProps = {
    data: ChartPoint[];
    monthlyRevenue: number;
    revenueChange: number;
    yearToDateRevenue: number;
    annualGoal: number;
};

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

const numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1
});

const positiveChangeClass = 'text-emerald-500 dark:text-emerald-300';
const negativeChangeClass = 'text-rose-500 dark:text-rose-300';

function formatCurrency(value: number) {
    return currencyFormatter.format(Math.round(value));
}

function formatCompactCurrency(value: number) {
    return compactCurrencyFormatter.format(Math.round(value));
}

function formatPercent(value: number) {
    return `${numberFormatter.format(Math.abs(value))}%`;
}

function resolveChangeTone(change: number) {
    if (change === 0) {
        return 'text-slate-500 dark:text-slate-400';
    }
    return change > 0 ? positiveChangeClass : negativeChangeClass;
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ value?: number }> }) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const [entry] = payload;
    const value = typeof entry?.value === 'number' ? entry.value : 0;

    return (
        <div className="rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
            <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(value)}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Monthly revenue</p>
        </div>
    );
}

export function EarningsSummaryCard({
    data,
    monthlyRevenue,
    revenueChange,
    yearToDateRevenue,
    annualGoal
}: EarningsSummaryCardProps) {
    const projectedAnnual = React.useMemo(() => {
        if (data.length === 0) {
            return 0;
        }

        const total = data.reduce((sum, point) => sum + point.revenue, 0);
        return total;
    }, [data]);

    const remainingToGoal = Math.max(annualGoal - yearToDateRevenue, 0);
    const goalProgress = annualGoal > 0 ? Math.min((yearToDateRevenue / annualGoal) * 100, 100) : 0;

    const changeTone = resolveChangeTone(revenueChange);
    const changePrefix = revenueChange >= 0 ? '▲' : '▼';

    return (
        <section className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#11004A] via-[#1B1F5C] to-[#061018] p-6 text-white shadow-xl shadow-slate-900/30 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10">
            <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
                <div className="absolute -top-10 -left-24 h-56 w-56 rounded-full bg-[#5D3BFF] blur-3xl" />
                <div className="absolute -bottom-12 right-0 h-56 w-56 rounded-full bg-[#4DE5FF] blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-1 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.48em] text-[#9DAAFF]">Earnings metrics</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Revenue pulse</h2>
                        <p className="mt-2 max-w-sm text-sm text-slate-200/80">
                            Spotlight the cashflow momentum across the last six months with a dedicated earnings view.
                        </p>
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
                        Aperture Studio
                    </div>
                </div>
                <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <dt className="text-xs font-medium uppercase tracking-[0.28em] text-white/60">Monthly revenue</dt>
                        <dd className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyRevenue)}</dd>
                        <dd className="mt-1 text-xs font-semibold">
                            <span className={changeTone}>
                                {changePrefix} {formatPercent(revenueChange)}
                            </span>{' '}
                            <span className="text-white/60">vs. prior month</span>
                        </dd>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <dt className="text-xs font-medium uppercase tracking-[0.28em] text-white/60">Year-to-date revenue</dt>
                        <dd className="mt-2 text-2xl font-semibold">{formatCurrency(yearToDateRevenue)}</dd>
                        <dd className="mt-1 text-xs font-semibold text-white/70">
                            Goal progress {numberFormatter.format(goalProgress)}%
                        </dd>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <dt className="text-xs font-medium uppercase tracking-[0.28em] text-white/60">Remaining to goal</dt>
                        <dd className="mt-2 text-2xl font-semibold">{formatCurrency(remainingToGoal)}</dd>
                        <dd className="mt-1 text-xs font-semibold text-white/70">
                            Trailing revenue {formatCompactCurrency(projectedAnnual)}
                        </dd>
                    </div>
                </dl>
                <div className="mt-6 flex-1">
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, left: -20, right: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(77, 229, 255, 0.8)" />
                                        <stop offset="100%" stopColor="rgba(77, 229, 255, 0.05)" />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" tickLine={false} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} />
                                <YAxis stroke="rgba(255,255,255,0.2)" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 12 }} width={60} />
                                <Tooltip content={<TooltipContent />} cursor={{ stroke: 'rgba(148, 163, 184, 0.35)', strokeDasharray: '4 6' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#4DE5FF" strokeWidth={3} fill="url(#earningsGradient)" activeDot={{ r: 5, fill: '#4DE5FF', strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EarningsSummaryCard;

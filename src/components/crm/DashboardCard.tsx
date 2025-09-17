import * as React from 'react';
import classNames from 'classnames';

type DashboardCardProps = {
    title: string;
    value: string;
    trend?: {
        value: string;
        label?: string;
        isPositive?: boolean;
    };
    className?: string;
    children?: React.ReactNode;
};

const trendBadgeClassNames = (isPositive?: boolean) =>
    classNames(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em]',
        isPositive === false
            ? 'bg-rose-100 text-rose-600 dark:bg-[rgba(255,159,216,0.18)] dark:text-[#FF9FD8]'
            : 'bg-emerald-100 text-emerald-600 dark:bg-[rgba(99,232,255,0.18)] dark:text-[#63E8FF]'
    );

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <article
            className={classNames(
                'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-transparent p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:shadow-[0_45px_110px_-50px_rgba(2,8,20,0.85)]',
                className
            )}
        >
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
            <div className="relative z-10 flex h-full flex-col">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
                {trend && (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <span className={trendBadgeClassNames(trend.isPositive)}>{trend.value}</span>
                        {trend.label ? (
                            <span className="ml-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                                {trend.label}
                            </span>
                        ) : null}
                    </p>
                )}
                {children && (
                    <div className="mt-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
                )}
            </div>
        </article>
    );
}

export default DashboardCard;

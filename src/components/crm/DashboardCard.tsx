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
        isPositive === false ? 'bg-white/15 text-rose-100' : 'bg-white/20 text-emerald-100'
    );

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <article
            className={classNames(
                'relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-indigo-900/30',
                className
            )}
        >
            <div
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
                aria-hidden="true"
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                    <p className="text-sm font-medium text-white/80">{title}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{value}</p>
                    {trend && (
                        <p className="mt-4 text-sm text-white/80">
                            <span className={trendBadgeClassNames(trend.isPositive)}>{trend.value}</span>
                            {trend.label ? (
                                <span className="ml-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                                    {trend.label}
                                </span>
                            ) : null}
                        </p>
                    )}
                </div>
                {children && (
                    <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed text-white/85 backdrop-blur-sm">
                        {children}
                    </div>
                )}
            </div>
        </article>
    );
}

export default DashboardCard;

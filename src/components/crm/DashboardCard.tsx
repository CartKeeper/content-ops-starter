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

const trendClassNames = (isPositive?: boolean) =>
    classNames('text-sm font-medium', {
        'text-[#0F9BD7] dark:text-[#63E8FF]': isPositive !== false,
        'text-[#D61B7B] dark:text-[#FF9FD8]': isPositive === false
    });

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <div
            className={classNames(
                'flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
                className
            )}
        >
            <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
            {trend && (
                <p className={classNames('mt-2 flex items-center gap-2', trendClassNames(trend.isPositive))}>
                    <span>{trend.value}</span>
                    {trend.label && <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>}
                </p>
            )}
            {children && <div className="mt-4 flex-grow text-sm text-slate-500 dark:text-slate-300">{children}</div>}
        </div>
    );
}

export default DashboardCard;

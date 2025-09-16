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
        'text-emerald-600': isPositive !== false,
        'text-rose-600': isPositive === false
    });

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <div
            className={classNames(
                'flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md',
                className
            )}
        >
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
            {trend && (
                <p className={classNames('mt-2 flex items-center gap-2', trendClassNames(trend.isPositive))}>
                    <span>{trend.value}</span>
                    {trend.label && <span className="text-slate-500">{trend.label}</span>}
                </p>
            )}
            {children && <div className="mt-4 flex-grow text-sm text-slate-500">{children}</div>}
        </div>
    );
}

export default DashboardCard;

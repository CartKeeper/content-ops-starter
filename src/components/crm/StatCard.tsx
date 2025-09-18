import * as React from 'react';
import classNames from 'classnames';

type StatCardProps = {
    title: string;
    value: string;
    change: number;
    changeLabel: string;
    icon: React.ReactNode;
};

const formatChange = (change: number) => {
    const rounded = Number.isFinite(change) ? Math.abs(change).toFixed(1) : '0.0';
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${rounded}%`;
};

export function StatCard({ title, value, change, changeLabel, icon }: StatCardProps) {
    const isPositive = change >= 0;
    const TrendIcon = isPositive ? TrendUpIcon : TrendDownIcon;

    const changeToneClass = isPositive
        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
        : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200';

    return (
        <article className="relative flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-200">
                    <span className="block h-5 w-5" aria-hidden="true">
                        {icon}
                    </span>
                </div>
            </div>
            <div className="mt-8">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{title}</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                    <span
                        className={classNames(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em]',
                            changeToneClass
                        )}
                    >
                        <TrendIcon className="h-3.5 w-3.5" />
                        {formatChange(change)}
                    </span>
                    <span className="ml-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                        {changeLabel}
                    </span>
                </p>
            </div>
        </article>
    );
}

type IconProps = React.SVGProps<SVGSVGElement>;

function TrendUpIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M4 14 10 8 14 12 20 6" />
            <path d="M20 10V6h-4" />
        </svg>
    );
}

function TrendDownIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M20 10 14 16 10 12 4 18" />
            <path d="M4 14v4h4" />
        </svg>
    );
}

export default StatCard;

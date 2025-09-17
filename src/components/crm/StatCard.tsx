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
        ? 'bg-emerald-100 text-emerald-600 dark:bg-[rgba(99,232,255,0.18)] dark:text-[#63E8FF]'
        : 'bg-rose-100 text-rose-600 dark:bg-[rgba(255,159,216,0.18)] dark:text-[#FF9FD8]';

    return (
        <article
            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/70 bg-transparent p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-white/10 dark:shadow-[0_45px_110px_-50px_rgba(2,8,20,0.85)]"
        >
            <div
                className="pointer-events-none absolute inset-0 rounded-3xl bg-white/80 backdrop-blur-sm transition duration-500 group-hover:bg-white/90 dark:hidden"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-95 transition duration-500 dark:block"
                aria-hidden="true"
                style={{ background: 'radial-gradient(circle at top, rgba(93, 59, 255, 0.32), rgba(7, 11, 23, 0.92))' }}
            />
            <div
                className="pointer-events-none absolute inset-0 hidden rounded-3xl opacity-40 transition duration-500 group-hover:opacity-65 dark:block"
                aria-hidden="true"
                style={{ background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.14) 0%, rgba(148, 163, 184, 0) 55%)' }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div className="rounded-full bg-gradient-to-tr from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] p-3 text-white shadow-lg shadow-[#5D3BFF]/30 dark:shadow-[0_20px_40px_-25px_rgba(77,229,255,0.7)]">
                        <span className="block h-5 w-5 text-white [filter:drop-shadow(0_2px_8px_rgba(77,229,255,0.55))]" aria-hidden="true">
                            {icon}
                        </span>
                    </div>
                </div>
                <div className="mt-10">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
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

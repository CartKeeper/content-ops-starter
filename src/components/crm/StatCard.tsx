import * as React from 'react';

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

    return (
        <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <div className="rounded-full bg-[#E9E7FF] p-3 text-[#4534FF] dark:bg-[#2A1F67] dark:text-[#AEB1FF]">
                    <span className="block h-5 w-5" aria-hidden="true">
                        {icon}
                    </span>
                </div>
            </div>
            <div className="mt-10">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{title}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    <span
                        className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                            isPositive
                                ? 'bg-[#E5F6FF] text-[#0F9BD7] dark:bg-[#123F58] dark:text-[#63E8FF]'
                                : 'bg-[#FFE6F5] text-[#D61B7B] dark:bg-[#4D1331] dark:text-[#FF9FD8]'
                        ].join(' ')}
                    >
                        <TrendIcon className="h-3.5 w-3.5" />
                        {formatChange(change)}
                    </span>
                    <span className="ml-2">{changeLabel}</span>
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

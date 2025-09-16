import * as React from 'react';
import classNames from 'classnames';

import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT, GLASS_PANEL_CLASSNAME } from './theme';

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
        <article className={classNames(GLASS_PANEL_CLASSNAME, 'flex h-full flex-col justify-between p-6')}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-12 h-40 w-40 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 65%)` }}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 left-6 h-48 w-48 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
            />
            <div className="relative z-10">
                <div className="flex items-center justify-between">
                    <div className="rounded-full bg-[#2DD4BF]/10 p-3 text-[#0F766E] shadow-sm dark:bg-[#2DD4BF]/20 dark:text-[#5EEAD4]">
                        <span className="block h-5 w-5" aria-hidden="true">
                            {icon}
                        </span>
                    </div>
                </div>
                <div className="mt-10">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        <span
                            className={[
                                'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                                isPositive
                                    ? 'bg-[#2DD4BF]/15 text-[#0F766E] dark:bg-[#2DD4BF]/20 dark:text-[#5EEAD4]'
                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                            ].join(' ')}
                        >
                            <TrendIcon className="h-3.5 w-3.5" />
                            {formatChange(change)}
                        </span>
                        <span className="ml-2">{changeLabel}</span>
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

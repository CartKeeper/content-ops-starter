import * as React from 'react';
import classNames from 'classnames';

import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT, GLASS_PANEL_CLASSNAME } from './theme';

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
        'text-[#0F766E] dark:text-[#5EEAD4]': isPositive !== false,
        'text-rose-600 dark:text-rose-400': isPositive === false
    });

export function DashboardCard({ title, value, trend, className, children }: DashboardCardProps) {
    return (
        <div className={classNames(GLASS_PANEL_CLASSNAME, 'flex h-full flex-col p-5', className)}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 70%)` }}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 left-4 h-36 w-36 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
            />
            <div className="relative z-10">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
                {trend && (
                    <p className={classNames('mt-2 flex items-center gap-2', trendClassNames(trend.isPositive))}>
                        <span>{trend.value}</span>
                        {trend.label && <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>}
                    </p>
                )}
                {children && <div className="mt-4 flex-grow text-sm text-slate-500 dark:text-slate-300">{children}</div>}
            </div>
        </div>
    );
}

export default DashboardCard;

import type { ReactNode } from 'react';
import clsx from 'classnames';

import { Icon, type IconKey } from '../icons';

export type StatTrend = 'up' | 'down' | 'neutral';

export type StatProps = {
    icon?: IconKey;
    label: ReactNode;
    value: ReactNode;
    helper?: ReactNode;
    delta?: {
        value: ReactNode;
        trend?: StatTrend;
        srLabel?: string;
    };
    className?: string;
};

const TREND_ICON: Record<StatTrend, IconKey> = {
    up: 'arrowUpRight',
    down: 'arrowDownRight',
    neutral: 'minus'
};

const TREND_COLOR: Record<StatTrend, string> = {
    up: 'text-emerald-600',
    down: 'text-rose-600',
    neutral: 'text-text-subtle'
};

export function Stat({ icon, label, value, helper, delta, className }: StatProps) {
    const trend = delta?.trend ?? 'neutral';

    return (
        <div className={clsx('rounded-card border border-border-subtle bg-surface px-5 py-4 shadow-card', className)}>
            <div className="flex items-center gap-3">
                {icon ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-card bg-surface-muted text-accent-indigo">
                        <Icon name={icon} className="h-5 w-5" />
                    </span>
                ) : null}
                <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{label}</span>
                    <span className="text-2xl font-semibold text-text-primary">{value}</span>
                </div>
                {delta ? (
                    <div className="flex items-center gap-2 rounded-pill bg-surface-muted px-3 py-1 text-sm font-medium">
                        <Icon name={TREND_ICON[trend]} className={clsx('h-4 w-4', TREND_COLOR[trend])} />
                        <span className={TREND_COLOR[trend]}>{delta.value}</span>
                        {delta.srLabel ? <span className="sr-only">{delta.srLabel}</span> : null}
                    </div>
                ) : null}
            </div>
            {helper ? <p className="mt-3 text-sm text-text-subtle">{helper}</p> : null}
        </div>
    );
}

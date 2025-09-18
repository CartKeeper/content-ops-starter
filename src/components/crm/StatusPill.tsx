import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
    tone?: StatusTone;
    children: React.ReactNode;
};

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
    warning: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
    danger: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30',
    info: 'bg-indigo-100 text-indigo-600 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600/40'
};

export function StatusPill({ tone = 'neutral', children }: StatusPillProps) {
    return (
        <span
            className={classNames(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                toneStyles[tone]
            )}
        >
            {children}
        </span>
    );
}

export default StatusPill;

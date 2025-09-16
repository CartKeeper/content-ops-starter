import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
    tone?: StatusTone;
    children: React.ReactNode;
};

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/40',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/40',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/40',
    info: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/40',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600'
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

import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
    tone?: StatusTone;
    children: React.ReactNode;
};

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200',
    info: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200'
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

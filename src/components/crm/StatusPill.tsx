import type { ReactNode } from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'info' | 'neutral' | 'warning' | 'danger';

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    neutral: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
};

const baseClasses = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-none';

type StatusPillProps = {
    tone?: StatusTone;
    children: ReactNode;
    className?: string;
};

export default function StatusPill({ tone = 'neutral', children, className }: StatusPillProps) {
    return <span className={classNames(baseClasses, toneStyles[tone], className)}>{children}</span>;
}

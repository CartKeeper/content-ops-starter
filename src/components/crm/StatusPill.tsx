import * as React from 'react';

export type StatusTone = 'success' | 'info' | 'neutral' | 'warning' | 'danger';

type StatusPillProps = React.PropsWithChildren<{
    tone?: StatusTone;
    className?: string;
}> &
    React.HTMLAttributes<HTMLSpanElement>;

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    info: 'bg-sky-100 text-sky-700 ring-sky-600/20',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    warning: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    danger: 'bg-rose-100 text-rose-700 ring-rose-600/20'
};

export default function StatusPill({ tone = 'neutral', className = '', children, ...rest }: StatusPillProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${toneStyles[tone]} ${className}`.trim()}
            {...rest}
        >
            {children}
        </span>
    );
}

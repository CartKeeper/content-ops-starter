import * as React from 'react';

import { cn } from '../../lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'neutral';
}

const badgeStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-slate-800/80 text-slate-200 border border-slate-700/80',
    success: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60',
    warning: 'bg-amber-500/20 text-amber-100 border border-amber-400/60',
    neutral: 'bg-slate-700/40 text-slate-300 border border-slate-600/50'
};

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
    <span
        className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', badgeStyles[variant], className)}
        {...props}
    />
);

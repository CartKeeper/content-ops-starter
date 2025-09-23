import type { HTMLAttributes } from 'react';
import clsx from 'classnames';

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    tone?: BadgeTone;
    pill?: boolean;
};

const TONE_CLASS: Record<BadgeTone, string> = {
    neutral: 'bg-surface-muted text-text-subtle',
    success: 'bg-emerald-50 text-emerald-700',
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700'
};

export function Badge({ tone = 'neutral', pill = false, className, ...props }: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
                pill ? 'rounded-pill' : 'rounded-md',
                TONE_CLASS[tone],
                className
            )}
            {...props}
        />
    );
}

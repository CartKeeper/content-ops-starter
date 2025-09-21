import * as React from 'react';

import { cn } from '../../lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'neutral';
}

const badgeStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-primary-lt text-primary',
    success: 'bg-success-lt text-success',
    warning: 'bg-warning-lt text-warning',
    neutral: 'bg-secondary-lt text-secondary'
};

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => (
    <span
        className={cn('badge text-uppercase fw-semibold', badgeStyles[variant], className)}
        {...props}
    />
);

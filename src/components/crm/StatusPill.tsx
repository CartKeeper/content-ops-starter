import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
    tone?: StatusTone;
    children: React.ReactNode;
};

const toneStyles: Record<StatusTone, string> = {
    success: 'badge bg-success-lt text-success',
    warning: 'badge bg-warning-lt text-warning',
    danger: 'badge bg-danger-lt text-danger',
    info: 'badge bg-info-lt text-info',
    neutral: 'badge bg-secondary-lt text-secondary'
};

export function StatusPill({ tone = 'neutral', children }: StatusPillProps) {
    return (
        <span
            className={classNames(
                'text-uppercase fw-semibold',
                toneStyles[tone]
            )}
        >
            {children}
        </span>
    );
}

export default StatusPill;

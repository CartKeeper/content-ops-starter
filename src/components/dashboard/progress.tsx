import * as React from 'react';

import { cn } from '../../lib/cn';

type ProgressProps = {
    value: number;
    className?: string;
};

export function Progress({ value, className }: ProgressProps) {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    return (
        <div className={cn('progress', className)}>
            <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${clamped}%` }}
                aria-valuenow={clamped}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <span className="visually-hidden">{clamped}% complete</span>
            </div>
        </div>
    );
}

export default Progress;

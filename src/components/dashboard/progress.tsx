import * as React from 'react';

import { cn } from '../../lib/cn';

type ProgressProps = {
    value: number;
    className?: string;
};

export function Progress({ value, className }: ProgressProps) {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    return (
        <div className={cn('h-2 w-full rounded-full bg-slate-800/80', className)}>
            <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${clamped}%` }}
                aria-hidden
            />
            <span className="sr-only">{clamped}% complete</span>
        </div>
    );
}

export default Progress;

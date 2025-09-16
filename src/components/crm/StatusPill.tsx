import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'info' | 'neutral';

type StatusPillProps = React.PropsWithChildren<{
    tone: StatusTone;
}>;

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-sky-100 text-sky-700',
    neutral: 'bg-slate-200 text-slate-600'
};

function StatusPill({ tone, children }: StatusPillProps) {
    return (
        <span
            className={classNames(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                toneStyles[tone]
            )}
        >
            {children}
        </span>
    );
}

export default StatusPill;

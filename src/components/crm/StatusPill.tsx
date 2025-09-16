import * as React from 'react';
import classNames from 'classnames';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type StatusPillProps = {
    tone?: StatusTone;
    children: React.ReactNode;
};

const toneStyles: Record<StatusTone, string> = {
    success: 'bg-[#E5F6FF] text-[#0F9BD7] ring-[#A4E9FF] dark:bg-[#123F58] dark:text-[#63E8FF] dark:ring-[#2F8BB8]',
    warning: 'bg-[#FFF4E8] text-[#C97200] ring-[#FFD8A8] dark:bg-[#4D2C16] dark:text-[#FFC99C] dark:ring-[#C97200]',
    danger: 'bg-[#FFE6F5] text-[#D61B7B] ring-[#FF9CD5] dark:bg-[#4D1331] dark:text-[#FF9FD8] dark:ring-[#7A1D4C]',
    info: 'bg-[#E9E7FF] text-[#4534FF] ring-[#C5C0FF] dark:bg-[#2A1F67] dark:text-[#AEB1FF] dark:ring-[#4E46C8]',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600'
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

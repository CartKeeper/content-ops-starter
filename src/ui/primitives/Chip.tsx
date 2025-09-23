import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'classnames';

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
    leading?: ReactNode;
    trailing?: ReactNode;
    tone?: 'neutral' | 'accent';
};

const CHIP_TONE: Record<'neutral' | 'accent', string> = {
    neutral: 'bg-surface-muted text-text-subtle',
    accent: 'bg-accent-indigo/10 text-accent-indigo'
};

export function Chip({ leading, trailing, tone = 'neutral', className, children, ...props }: ChipProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-medium',
                CHIP_TONE[tone],
                className
            )}
            {...props}
        >
            {leading ? <span className="flex items-center text-base">{leading}</span> : null}
            <span>{children}</span>
            {trailing ? <span className="flex items-center text-base">{trailing}</span> : null}
        </span>
    );
}

import clsx from 'classnames';

export type SkeletonVariant = 'card' | 'table-row' | 'stat';

export type SkeletonProps = {
    variant?: SkeletonVariant;
    className?: string;
};

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
    card: 'h-48 rounded-card',
    'table-row': 'h-12 rounded-md',
    stat: 'h-20 rounded-card'
};

export function Skeleton({ variant = 'card', className }: SkeletonProps) {
    return (
        <div
            className={clsx(
                'animate-pulse bg-surface-muted/70',
                VARIANT_CLASS[variant],
                className
            )}
        />
    );
}

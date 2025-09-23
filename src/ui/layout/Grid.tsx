import type { ReactNode } from 'react';
import clsx from 'classnames';

export type GridBreakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';

export type GridProps = {
    children: ReactNode;
    columns?: Partial<Record<GridBreakpoint, number>>;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
};

const GAP_CLASS: Record<NonNullable<GridProps['gap']>, string> = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
};

const BREAKPOINT_CLASS: Record<GridBreakpoint, string> = {
    base: 'grid-cols',
    sm: 'sm:grid-cols',
    md: 'md:grid-cols',
    lg: 'lg:grid-cols',
    xl: 'xl:grid-cols'
};

function getColumnClasses(columns: GridProps['columns']) {
    if (!columns) {
        return 'grid-cols-1';
    }

    return Object.entries(columns)
        .filter(([, value]) => typeof value === 'number' && value > 0)
        .map(([breakpoint, value]) => `${BREAKPOINT_CLASS[breakpoint as GridBreakpoint]}-${value}`)
        .join(' ');
}

export function Grid({ children, columns, gap = 'md', className }: GridProps) {
    return (
        <div className={clsx('grid', GAP_CLASS[gap], getColumnClasses(columns), className)}>{children}</div>
    );
}

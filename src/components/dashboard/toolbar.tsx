import * as React from 'react';

import { cn } from '../../lib/cn';

type ToolbarProps = {
    children: React.ReactNode;
    className?: string;
};

type ToolbarSectionProps = {
    children: React.ReactNode;
    className?: string;
};

export function Toolbar({ children, className }: ToolbarProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/40 sm:flex-row sm:items-center sm:justify-between',
                className
            )}
        >
            {children}
        </div>
    );
}

export function ToolbarSection({ children, className }: ToolbarSectionProps) {
    return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}

export default Toolbar;

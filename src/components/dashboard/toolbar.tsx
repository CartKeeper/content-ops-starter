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
        <div className={cn('card card-stacked', className)}>
            <div className="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-lg-between gap-3">
                {children}
            </div>
        </div>
    );
}

export function ToolbarSection({ children, className }: ToolbarSectionProps) {
    return <div className={cn('d-flex flex-wrap align-items-center gap-3', className)}>{children}</div>;
}

export default Toolbar;

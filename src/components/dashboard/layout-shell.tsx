import * as React from 'react';

import { cn } from '../../lib/cn';

type LayoutShellProps = {
    children: React.ReactNode;
    className?: string;
};

export function LayoutShell({ children, className }: LayoutShellProps) {
    return (
        <div className={cn('mx-auto w-full max-w-7xl space-y-8 px-6 py-10 lg:px-8 lg:py-12', className)}>
            {children}
        </div>
    );
}

export default LayoutShell;

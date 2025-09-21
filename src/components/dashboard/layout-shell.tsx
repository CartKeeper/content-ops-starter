import * as React from 'react';

import { cn } from '../../lib/cn';

type LayoutShellProps = {
    children: React.ReactNode;
    className?: string;
};

export function LayoutShell({ children, className }: LayoutShellProps) {
    return <div className={cn('container-xl py-4', className)}>{children}</div>;
}

export default LayoutShell;

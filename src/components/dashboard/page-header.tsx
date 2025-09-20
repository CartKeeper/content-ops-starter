import * as React from 'react';

import { cn } from '../../lib/cn';

type PageHeaderProps = {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
};

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-4 text-slate-100 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                {description ? <p className="max-w-2xl text-sm text-slate-400">{description}</p> : null}
            </div>
            {children ? <div className="flex flex-none items-center gap-3">{children}</div> : null}
        </div>
    );
}

export default PageHeader;

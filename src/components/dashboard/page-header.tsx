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
        <div className={cn('page-header d-print-none', className)}>
            <div className="row align-items-center">
                <div className="col">
                    <h2 className="page-title">{title}</h2>
                    {description ? <div className="text-secondary mt-1">{description}</div> : null}
                </div>
                {children ? <div className="col-auto ms-auto d-print-none">{children}</div> : null}
            </div>
        </div>
    );
}

export default PageHeader;

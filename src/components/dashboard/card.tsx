import * as React from 'react';

import { cn } from '../../lib/cn';

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

export function DashboardCard({ children, className }: CardProps) {
    return (
        <div className={cn('card card-stacked h-100', className)}>
            <div className="card-body">{children}</div>
        </div>
    );
}

export default DashboardCard;

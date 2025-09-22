import * as React from 'react';

import { cn } from '../../lib/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
};

export function DashboardCard({ children, className, ...props }: CardProps) {
    return (
        <div
            {...props}
            className={cn(
                'card card-stacked h-100 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400/70 focus-visible:outline-offset-2',
                className
            )}
        >
            <div className="card-body">{children}</div>
        </div>
    );
}

export default DashboardCard;

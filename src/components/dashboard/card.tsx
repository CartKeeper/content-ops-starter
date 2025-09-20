import * as React from 'react';

import { cn } from '../../lib/cn';

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

export function DashboardCard({ children, className }: CardProps) {
    return (
        <div
            className={cn(
                'flex h-full flex-col rounded-3xl border border-slate-800/70 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40',
                className
            )}
        >
            {children}
        </div>
    );
}

export default DashboardCard;

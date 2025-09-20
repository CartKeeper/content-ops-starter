import * as React from 'react';

import { cn } from '../../lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'flex h-11 w-full appearance-none rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60',
            className
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';

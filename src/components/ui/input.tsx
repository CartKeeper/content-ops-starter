import * as React from 'react';

import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
    return (
        <input
            ref={ref}
            type={type}
            className={cn(
                'flex h-11 w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 text-sm text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60',
                className
            )}
            {...props}
        />
    );
});
Input.displayName = 'Input';
